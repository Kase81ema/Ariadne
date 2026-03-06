import asyncio
import base64
import mimetypes
import os
import re
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

import aiofiles
import httpx
from PIL import Image, ImageDraw, ImageEnhance, ImageOps
from dotenv import load_dotenv
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

PUBLIC_BASE_URL = os.environ.get('PUBLIC_BASE_URL')
BUFFER_ACCESS_TOKEN = os.environ.get('BUFFER_ACCESS_TOKEN', '')
BUFFER_API_BASE_URL = os.environ.get('BUFFER_API_BASE_URL')
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

MEDIA_ROOT = ROOT_DIR / 'uploads' / 'media_assets'
MEDIA_ORIGINALS = MEDIA_ROOT / 'originals'
MEDIA_VARIANTS = MEDIA_ROOT / 'variants'
REPOSITORY_IMAGES_DIR = ROOT_DIR / 'uploads' / 'repository_images'

for directory in (MEDIA_ROOT, MEDIA_ORIGINALS, MEDIA_VARIANTS, REPOSITORY_IMAGES_DIR):
    directory.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_EXTS = {'jpg', 'jpeg', 'png', 'webp'}
VARIANT_SPECS = {
    'square': (1080, 1080),
    'portrait': (1080, 1350),
    'landscape': (1200, 628),
}
PLATFORM_VARIANTS = {
    'linkedin_company': 'landscape',
    'linkedin_personal': 'landscape',
    'instagram': 'portrait',
}

_media_jobs = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_tags(raw_tags):
    if isinstance(raw_tags, list):
        return [str(tag).strip().lower() for tag in raw_tags if str(tag).strip()]
    if not raw_tags:
        return []
    return [tag.strip().lower() for tag in str(raw_tags).split(',') if tag.strip()]


def _safe_ext(filename: str) -> str:
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(400, 'Formato immagine non supportato')
    return ext


def _asset_urls(asset_id: str):
    if not PUBLIC_BASE_URL:
        raise HTTPException(500, 'PUBLIC_BASE_URL non configurato')
    base = f"{PUBLIC_BASE_URL}/api/media/public/{asset_id}"
    return {
        'public_url': base,
        'variants': {
            'square_url': f'{base}/square',
            'portrait_url': f'{base}/portrait',
            'landscape_url': f'{base}/landscape',
        },
    }


def _word_set(*values):
    tokens = set()
    for value in values:
        if not value:
            continue
        if isinstance(value, list):
            value = ' '.join(str(v) for v in value)
        for match in re.findall(r"[a-zA-ZÀ-ÿ0-9]{4,}", str(value).lower()):
            tokens.add(match)
    return tokens


def _mime_for_path(path: str) -> str:
    guessed, _ = mimetypes.guess_type(path)
    return guessed or 'image/jpeg'


async def _write_file(path: Path, content: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(path, 'wb') as target:
        await target.write(content)


async def _upsert_job(db, job_id: str):
    job = _media_jobs[job_id]
    await db.studio_jobs.update_one({'job_id': job_id}, {'$set': job}, upsert=True)


async def _create_job(db, job_type: str, created_by: str, total: int = 1, meta: dict | None = None):
    job_id = f'job_{uuid.uuid4().hex[:12]}'
    _media_jobs[job_id] = {
        'job_id': job_id,
        'job_type': job_type,
        'status': 'queued',
        'current': 0,
        'total': total,
        'label': '',
        'meta': meta or {},
        'created_by': created_by,
        'created_at': _now_iso(),
        'updated_at': _now_iso(),
    }
    await _upsert_job(db, job_id)
    return job_id


async def _set_job(db, job_id: str, **updates):
    if job_id not in _media_jobs:
        return
    _media_jobs[job_id].update(updates)
    _media_jobs[job_id]['updated_at'] = _now_iso()
    await _upsert_job(db, job_id)


def _enhance_image(image: Image.Image, apply_improve: bool, overlay_text: bool):
    result = image.convert('RGB')
    if apply_improve:
        result = ImageEnhance.Contrast(result).enhance(1.06)
        result = ImageEnhance.Sharpness(result).enhance(1.08)
        result = ImageEnhance.Color(result).enhance(1.02)
    if overlay_text:
        draw = ImageDraw.Draw(result, 'RGBA')
        width, height = result.size
        box = (width - 180, height - 58, width - 18, height - 18)
        draw.rounded_rectangle(box, radius=16, fill=(24, 24, 24, 110))
        draw.text((width - 148, height - 46), 'Ariadne', fill=(255, 255, 255, 230))
    return result


def _process_variants_sync(original_path: str, asset_id: str, apply_improve: bool, overlay_text: bool):
    variants = {}
    with Image.open(original_path) as raw:
        image = ImageOps.exif_transpose(raw).convert('RGB')
        for variant_name, size in VARIANT_SPECS.items():
            processed = ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
            processed = _enhance_image(processed, apply_improve, overlay_text)
            variant_path = MEDIA_VARIANTS / f'{asset_id}_{variant_name}.jpg'
            processed.save(variant_path, format='JPEG', quality=88, optimize=True)
            variants[variant_name] = str(variant_path)
    return variants


async def _resolve_assignment_public_url(db, post_id: str, fallback_url: str = ''):
    assignment = await db.post_media_assignment.find_one({'post_id': post_id}, {'_id': 0})
    if not assignment or not assignment.get('media_asset_id'):
        return {'assignment': assignment, 'image_public_url': fallback_url, 'media_asset_id': ''}
    asset = await db.media_assets.find_one({'asset_id': assignment['media_asset_id']}, {'_id': 0})
    if not asset:
        return {'assignment': assignment, 'image_public_url': fallback_url, 'media_asset_id': ''}
    asset = _with_public_urls(asset)
    chosen_variant = assignment.get('variant', 'original')
    variants = asset.get('variants', {})
    variant_url_map = {
        'square': variants.get('square_url', ''),
        'portrait': variants.get('portrait_url', ''),
        'landscape': variants.get('landscape_url', ''),
        'original': asset.get('public_url', ''),
    }
    image_public_url = variant_url_map.get(chosen_variant) or asset.get('public_url', '') or fallback_url
    return {'assignment': assignment, 'image_public_url': image_public_url, 'media_asset_id': asset.get('asset_id', '')}


def _with_public_urls(asset: dict | None):
    if not asset:
        return asset
    urls = _asset_urls(asset['asset_id'])
    normalized = {**asset}
    normalized['public_url'] = urls['public_url']
    normalized['variants'] = urls['variants']
    return normalized


async def _ensure_asset_processing(db, asset_id: str, apply_improve: bool, overlay_text: bool):
    asset = await db.media_assets.find_one({'asset_id': asset_id}, {'_id': 0})
    if not asset or not asset.get('original_file_path'):
        raise HTTPException(404, 'Asset non trovato')
    urls = _asset_urls(asset_id)
    variant_paths = await asyncio.to_thread(
        _process_variants_sync,
        asset['original_file_path'],
        asset_id,
        apply_improve,
        overlay_text,
    )
    await db.media_assets.update_one(
        {'asset_id': asset_id},
        {'$set': {
            'status': 'ready',
            'variants': urls['variants'],
            'variant_paths': {
                'square': variant_paths.get('square', ''),
                'portrait': variant_paths.get('portrait', ''),
                'landscape': variant_paths.get('landscape', ''),
            },
            'updated_at': _now_iso(),
        }}
    )


async def _run_processing_job(db, job_id: str, asset_ids: list[str], apply_improve: bool, overlay_text: bool):
    await _set_job(db, job_id, status='processing', label='Avvio lavorazione immagini')
    try:
        total = len(asset_ids) or 1
        for index, asset_id in enumerate(asset_ids):
            await _set_job(db, job_id, current=index + 1, total=total, label=f'Asset {index + 1}/{total}')
            await db.media_assets.update_one({'asset_id': asset_id}, {'$set': {'status': 'processing', 'updated_at': _now_iso()}})
            await _ensure_asset_processing(db, asset_id, apply_improve, overlay_text)
        await _set_job(db, job_id, status='completed', label='Immagini pronte', result={'processed_assets': asset_ids})
    except Exception as exc:
        await _set_job(db, job_id, status='failed', error=str(exc), label='Errore durante la lavorazione')


async def _run_generation_job(db, job_id: str, asset_id: str, prompt: str, style: str, apply_improve: bool, overlay_text: bool):
    await _set_job(db, job_id, status='processing', current=1, total=2, label='Generazione immagine AI')
    try:
        full_prompt = f"{prompt.strip()}\n\nStile visivo: {style.strip() or 'sobrio, editoriale, elegante'}"
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f'media-gen-{uuid.uuid4().hex[:10]}',
            system_message='Sei un art director per Ariadne. Genera immagini eleganti, professionali, coerenti con formazione e coaching.',
        )
        chat.with_model('gemini', 'gemini-3-pro-image-preview').with_params(modalities=['image', 'text'])
        _, images = await chat.send_message_multimodal_response(UserMessage(text=full_prompt))
        if not images:
            raise ValueError('Nessuna immagine restituita dal generatore')

        image_bytes = base64.b64decode(images[0]['data'])
        original_path = MEDIA_ORIGINALS / f'{asset_id}.png'
        await _write_file(original_path, image_bytes)
        await db.media_assets.update_one(
            {'asset_id': asset_id},
            {'$set': {
                'original_file_path': str(original_path),
                'public_url': _asset_urls(asset_id)['public_url'],
                'metadata': {
                    'filename': f'{asset_id}.png',
                    'mime_type': 'image/png',
                    'size': len(image_bytes),
                    'prompt': prompt,
                    'style': style,
                },
                'updated_at': _now_iso(),
            }}
        )
        await _set_job(db, job_id, current=2, total=2, label='Salvataggio e varianti')
        await _ensure_asset_processing(db, asset_id, apply_improve, overlay_text)
        await _set_job(db, job_id, status='completed', label='Immagine AI pronta', result={'asset_id': asset_id})
    except Exception as exc:
        await db.media_assets.update_one({'asset_id': asset_id}, {'$set': {'status': 'failed', 'error_message': str(exc), 'updated_at': _now_iso()}})
        await _set_job(db, job_id, status='failed', error=str(exc), label='Errore generazione immagine')


async def _validate_public_image(url: str):
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        try:
            response = await client.head(url)
            if response.status_code >= 400:
                response = await client.get(url)
            if response.status_code >= 400:
                raise ValueError(f'URL immagine non raggiungibile ({response.status_code})')
            content_type = response.headers.get('content-type', '')
            if 'image' not in content_type:
                raise ValueError('URL raggiungibile ma non restituisce un contenuto immagine')
        except Exception as exc:
            raise ValueError(str(exc))


async def _buffer_get_profiles():
    if not BUFFER_ACCESS_TOKEN:
        raise HTTPException(400, 'BUFFER_ACCESS_TOKEN non configurato')
    if not BUFFER_API_BASE_URL:
        raise HTTPException(500, 'BUFFER_API_BASE_URL non configurato')
    url = f'{BUFFER_API_BASE_URL}/profiles.json'
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, headers={'Accept': 'application/json', 'Authorization': f'Bearer {BUFFER_ACCESS_TOKEN}'})
        if response.status_code >= 400:
            response = await client.get(url, params={'access_token': BUFFER_ACCESS_TOKEN}, headers={'Accept': 'application/json'})
        if response.status_code >= 400:
            raise HTTPException(response.status_code, f'Errore Buffer: {response.text}')
        return response.json()


def _scheduled_unix(post: dict):
    date_value = post.get('scheduled_date', '')
    if not date_value:
        return None
    time_value = post.get('scheduled_time') or '09:00'
    try:
        naive = datetime.fromisoformat(f'{date_value}T{time_value}:00')
        aware = naive.replace(tzinfo=timezone.utc)
        return int(aware.timestamp())
    except Exception:
        return None


async def _create_buffer_post(post: dict, buffer_profile_id: str, image_url: str):
    if not BUFFER_ACCESS_TOKEN:
        raise ValueError('Buffer non configurato')
    if not BUFFER_API_BASE_URL:
        raise ValueError('BUFFER_API_BASE_URL non configurato')

    scheduled_at = _scheduled_unix(post)
    api_url = f'{BUFFER_API_BASE_URL}/updates/create.json'
    async with httpx.AsyncClient(timeout=30.0) as client:
        if image_url:
            modern_payload = {
                'text': post.get('content', ''),
                'profile_ids': [buffer_profile_id],
                'assets': {'images': [{'url': image_url}]},
            }
            if scheduled_at:
                modern_payload['scheduled_at'] = scheduled_at
            modern_response = await client.post(
                api_url,
                json=modern_payload,
                headers={'Accept': 'application/json', 'Authorization': f'Bearer {BUFFER_ACCESS_TOKEN}'},
            )
            if modern_response.status_code >= 400:
                modern_response = await client.post(
                    api_url,
                    json=modern_payload,
                    params={'access_token': BUFFER_ACCESS_TOKEN},
                    headers={'Accept': 'application/json'},
                )
            if modern_response.status_code < 400:
                return modern_response.json()

        form_payload = {
            'text': post.get('content', ''),
            'profile_ids[0]': buffer_profile_id,
            'shorten': 'false',
        }
        if scheduled_at:
            form_payload['scheduled_at'] = str(scheduled_at)
        if image_url:
            form_payload['assets[images][0][url]'] = image_url
        response = await client.post(
            api_url,
            data=form_payload,
            headers={'Accept': 'application/json', 'Authorization': f'Bearer {BUFFER_ACCESS_TOKEN}'},
        )
        if response.status_code >= 400:
            legacy_payload = dict(form_payload)
            if image_url:
                legacy_payload.pop('assets[images][0][url]', None)
                legacy_payload['media[picture]'] = image_url
            response = await client.post(
                api_url,
                data=legacy_payload,
                params={'access_token': BUFFER_ACCESS_TOKEN},
                headers={'Accept': 'application/json'},
            )
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {'error': response.text}
        if response.status_code >= 400 or (isinstance(data, dict) and data.get('success') is False):
            raise ValueError(data.get('error') or data.get('message') or response.text or 'Errore Buffer')
        return data


async def _publish_post_to_buffer(db, post: dict):
    if post.get('status') != 'approved':
        raise ValueError('Il post deve essere approvato prima della pubblicazione su Buffer')
    profile = await db.social_profiles.find_one({'profile_id': post.get('profile_id', '')}, {'_id': 0})
    buffer_profile_id = (profile or {}).get('buffer_profile_id', '')
    if not buffer_profile_id:
        raise ValueError('Profilo Buffer non associato al canale selezionato')
    resolved = await _resolve_assignment_public_url(db, post['post_id'], post.get('image_url', ''))
    image_url = resolved.get('image_public_url', '')
    if image_url:
        await _validate_public_image(image_url)
    data = await _create_buffer_post(post, buffer_profile_id, image_url)
    buffer_post_id = data.get('id') or data.get('buffer_id') or ''
    await db.posts.update_one(
        {'post_id': post['post_id']},
        {'$set': {
            'buffer_post_id': buffer_post_id,
            'buffer_status': 'published',
            'buffer_error': '',
            'exported_image_url': image_url,
            'published_at': _now_iso(),
            'status': 'exported',
        }}
    )
    return {'buffer_post_id': buffer_post_id, 'buffer_status': 'published', 'image_public_url': image_url}


async def _run_publish_job(db, job_id: str, campaign_id: str):
    posts = await db.posts.find({'campaign_id': campaign_id, 'status': 'approved'}, {'_id': 0}).to_list(500)
    await _set_job(db, job_id, status='processing', total=len(posts) or 1, label='Pubblicazione su Buffer')
    published = []
    failed = []
    try:
        for index, post in enumerate(posts):
            await _set_job(db, job_id, current=index + 1, label=f"Post {index + 1}/{len(posts) or 1}")
            try:
                result = await _publish_post_to_buffer(db, post)
                published.append({'post_id': post['post_id'], **result})
            except Exception as exc:
                failed.append({'post_id': post['post_id'], 'error': str(exc)})
                await db.posts.update_one(
                    {'post_id': post['post_id']},
                    {'$set': {'buffer_status': 'failed', 'buffer_error': str(exc), 'published_at': _now_iso()}}
                )
        await _set_job(db, job_id, status='completed', result={'published': published, 'failed': failed}, label='Pubblicazione completata')
    except Exception as exc:
        await _set_job(db, job_id, status='failed', error=str(exc), label='Errore pubblicazione Buffer')


async def _run_auto_assignment_job(db, job_id: str, campaign_id: str, source_scope: str, apply_process: bool, apply_improve: bool, platform_preferences: dict):
    campaign = await db.campaigns.find_one({'campaign_id': campaign_id}, {'_id': 0})
    if not campaign:
        await _set_job(db, job_id, status='failed', error='Campagna non trovata')
        return
    posts = await db.posts.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(500)
    query = {'status': 'ready'}
    if source_scope == 'course_only' and campaign.get('course_id'):
        query['course_id'] = campaign.get('course_id')
    assets = await db.media_assets.find(query, {'_id': 0}).sort('created_at', -1).to_list(500)
    if not assets and source_scope == 'course_only':
        assets = await db.media_assets.find({'status': 'ready'}, {'_id': 0}).sort('created_at', -1).to_list(500)
    if not assets:
        await _set_job(db, job_id, status='failed', error='Nessuna immagine pronta in libreria')
        return

    await _set_job(db, job_id, status='processing', total=len(posts) or 1, label='Abbinamento immagini')
    processed_assets = set()
    preview = []
    for index, post in enumerate(posts):
        await _set_job(db, job_id, current=index + 1, label=f"Post {index + 1}/{len(posts) or 1}")
        profile_variant = platform_preferences.get(post.get('platform', ''), platform_preferences.get('default', PLATFORM_VARIANTS.get(post.get('platform', ''), 'square')))
        post_words = _word_set(post.get('content', ''), post.get('content_short', ''), post.get('intention', ''), campaign.get('title', ''))
        best_asset = None
        best_score = -1
        for asset in assets:
            asset_words = _word_set(asset.get('title', ''), asset.get('description', ''), asset.get('tags', []))
            overlap = len(post_words & asset_words)
            score = overlap * 10
            if campaign.get('course_id') and asset.get('course_id') == campaign.get('course_id'):
                score += 50
            if asset.get('created_at'):
                score += 1
            if score > best_score:
                best_asset = asset
                best_score = score
        if not best_asset:
            continue
        await db.post_media_assignment.update_one(
            {'post_id': post['post_id']},
            {'$set': {
                'post_id': post['post_id'],
                'media_asset_id': best_asset['asset_id'],
                'variant': profile_variant,
                'auto_assigned': True,
                'updated_at': _now_iso(),
            }},
            upsert=True,
        )
        preview.append({'post_id': post['post_id'], 'media_asset_id': best_asset['asset_id'], 'variant': profile_variant})
        if apply_process and best_asset['asset_id'] not in processed_assets:
            processed_assets.add(best_asset['asset_id'])
            await db.media_assets.update_one({'asset_id': best_asset['asset_id']}, {'$set': {'status': 'processing', 'updated_at': _now_iso()}})
            await _ensure_asset_processing(db, best_asset['asset_id'], apply_improve, False)

    await _set_job(db, job_id, status='completed', label='Abbinamento completato', result={'assignments': preview})


def create_media_router(db, get_current_user, log_audit):
    router = APIRouter()

    @router.get('/api/media/public/{asset_id}')
    async def serve_media_original(asset_id: str):
        asset = await db.media_assets.find_one({'asset_id': asset_id}, {'_id': 0})
        if not asset or not asset.get('original_file_path') or not os.path.exists(asset['original_file_path']):
            raise HTTPException(404, 'Asset non trovato')
        return FileResponse(asset['original_file_path'], media_type=_mime_for_path(asset['original_file_path']))

    @router.get('/api/media/public/{asset_id}/{variant}')
    async def serve_media_variant(asset_id: str, variant: str):
        asset = await db.media_assets.find_one({'asset_id': asset_id}, {'_id': 0})
        if not asset:
            raise HTTPException(404, 'Asset non trovato')
        if variant == 'original':
            path = asset.get('original_file_path', '')
        else:
            path = (asset.get('variant_paths') or {}).get(variant, '')
        if not path or not os.path.exists(path):
            raise HTTPException(404, 'Variante non disponibile')
        return FileResponse(path, media_type=_mime_for_path(path))

    @router.get('/api/media/assets')
    async def list_media_assets(request: Request, course_id: str = '', source_type: str = '', status: str = ''):
        await get_current_user(request)
        query = {}
        if course_id:
            query['course_id'] = course_id
        if source_type:
            query['source_type'] = source_type
        if status:
            query['status'] = status
        assets = await db.media_assets.find(query, {'_id': 0}).sort('created_at', -1).to_list(500)
        for asset in assets:
            normalized = _with_public_urls(asset)
            asset.update(normalized)
            asset['usage_count'] = await db.post_media_assignment.count_documents({'media_asset_id': asset['asset_id']})
        return assets

    @router.post('/api/media/assets/upload')
    async def upload_media_asset(
        request: Request,
        file: UploadFile = File(...),
        title: str = Form(''),
        description: str = Form(''),
        tags: str = Form(''),
        course_id: str = Form(''),
        auto_process: bool = Form(False),
        auto_improve: bool = Form(False),
        overlay_brand: bool = Form(False),
    ):
        user = await get_current_user(request)
        ext = _safe_ext(file.filename)
        content = await file.read()
        if len(content) > 15 * 1024 * 1024:
            raise HTTPException(400, 'Immagine troppo grande (max 15MB)')
        asset_id = f'media_{uuid.uuid4().hex[:12]}'
        urls = _asset_urls(asset_id)
        original_path = MEDIA_ORIGINALS / f'{asset_id}.{ext}'
        await _write_file(original_path, content)
        asset = {
            'asset_id': asset_id,
            'id': asset_id,
            'source_type': 'manual_upload',
            'course_id': course_id or None,
            'title': title or file.filename,
            'description': description,
            'tags': _parse_tags(tags),
            'original_file_path': str(original_path),
            'public_url': urls['public_url'],
            'created_by': user['user_id'],
            'created_at': _now_iso(),
            'updated_at': _now_iso(),
            'status': 'processing' if auto_process else 'ready',
            'variants': urls['variants'] if auto_process else {},
            'variant_paths': {},
            'metadata': {'filename': file.filename, 'mime_type': file.content_type or _mime_for_path(str(original_path)), 'size': len(content)},
        }
        await db.media_assets.insert_one(asset)
        await log_audit(user['user_id'], 'media_asset_upload', {'asset_id': asset_id})
        if auto_process:
            job_id = await _create_job(db, 'process_media_assets', user['user_id'], total=1, meta={'asset_ids': [asset_id]})
            asyncio.create_task(_run_processing_job(db, job_id, [asset_id], auto_improve, overlay_brand))
            return {'asset_id': asset_id, 'job_id': job_id, 'status': 'processing'}
        return await db.media_assets.find_one({'asset_id': asset_id}, {'_id': 0})

    @router.post('/api/media/assets/generate')
    async def generate_media_asset(request: Request):
        user = await get_current_user(request)
        body = await request.json()
        prompt = body.get('prompt', '').strip()
        if not prompt:
            raise HTTPException(400, 'Prompt obbligatorio')
        asset_id = f'media_{uuid.uuid4().hex[:12]}'
        urls = _asset_urls(asset_id)
        asset = {
            'asset_id': asset_id,
            'id': asset_id,
            'source_type': 'ai_generated',
            'course_id': body.get('course_id') or None,
            'title': body.get('title') or prompt[:80],
            'description': body.get('description', ''),
            'tags': _parse_tags(body.get('tags', [])),
            'original_file_path': '',
            'public_url': urls['public_url'],
            'created_by': user['user_id'],
            'created_at': _now_iso(),
            'updated_at': _now_iso(),
            'status': 'processing',
            'variants': urls['variants'],
            'variant_paths': {},
            'metadata': {'prompt': prompt, 'style': body.get('style', '')},
        }
        await db.media_assets.insert_one(asset)
        job_id = await _create_job(db, 'generate_ai_image', user['user_id'], total=2, meta={'asset_id': asset_id})
        asyncio.create_task(_run_generation_job(db, job_id, asset_id, prompt, body.get('style', ''), bool(body.get('auto_improve')), bool(body.get('overlay_brand'))))
        await log_audit(user['user_id'], 'media_asset_generate_ai', {'asset_id': asset_id, 'job_id': job_id})
        return {'asset_id': asset_id, 'job_id': job_id, 'status': 'processing'}

    @router.post('/api/media/assets/process')
    async def process_media_assets(request: Request):
        user = await get_current_user(request)
        body = await request.json()
        asset_ids = body.get('asset_ids', [])
        if not asset_ids:
            raise HTTPException(400, 'Seleziona almeno un asset')
        job_id = await _create_job(db, 'process_media_assets', user['user_id'], total=len(asset_ids), meta={'asset_ids': asset_ids})
        asyncio.create_task(_run_processing_job(db, job_id, asset_ids, bool(body.get('apply_improve')), bool(body.get('overlay_brand'))))
        await log_audit(user['user_id'], 'media_process_start', {'asset_ids': asset_ids, 'job_id': job_id})
        return {'job_id': job_id}

    @router.get('/api/media/jobs/{job_id}')
    async def get_media_job(request: Request, job_id: str):
        await get_current_user(request)
        job = _media_jobs.get(job_id)
        if job:
            return job
        saved = await db.studio_jobs.find_one({'job_id': job_id}, {'_id': 0})
        if not saved:
            raise HTTPException(404, 'Job non trovato')
        return saved

    @router.post('/api/media/repository-images/upload')
    async def upload_repository_image(
        request: Request,
        file: UploadFile = File(...),
        course_id: str = Form(''),
        tags: str = Form(''),
        title: str = Form(''),
    ):
        user = await get_current_user(request)
        ext = _safe_ext(file.filename)
        file_id = f'file_{uuid.uuid4().hex[:12]}'
        stored_name = f'{file_id}.{ext}'
        file_path = REPOSITORY_IMAGES_DIR / stored_name
        content = await file.read()
        await _write_file(file_path, content)
        public_url = f'{PUBLIC_BASE_URL}/api/uploads/repository_images/{stored_name}'
        doc = {
            'file_id': file_id,
            'name': title or file.filename,
            'category': 'repository_immagini',
            'kind': 'image',
            'course_id': course_id or None,
            'tags': _parse_tags(tags),
            'path': str(file_path),
            'size': len(content),
            'content_extract': '',
            'uploaded_by': user['user_id'],
            'created_at': _now_iso(),
            'public_url': public_url,
        }
        await db.repository_files.insert_one(doc)
        await db.repository_images_index.update_one(
            {'file_path': str(file_path)},
            {'$set': {
                'id': f'rimg_{uuid.uuid4().hex[:12]}',
                'course_id': course_id or None,
                'file_path': str(file_path),
                'filename': title or file.filename,
                'tags': _parse_tags(tags),
                'created_at': _now_iso(),
                'public_url': public_url,
                'source_file_id': file_id,
            }},
            upsert=True,
        )
        await log_audit(user['user_id'], 'repository_image_upload', {'file_id': file_id})
        return await db.repository_files.find_one({'file_id': file_id}, {'_id': 0})

    @router.get('/api/media/repository-images')
    async def list_repository_images(request: Request, course_id: str = ''):
        await get_current_user(request)
        query = {}
        if course_id:
            query['course_id'] = course_id
        return await db.repository_images_index.find(query, {'_id': 0}).sort('created_at', -1).to_list(500)

    @router.post('/api/media/repository-images/index')
    async def index_repository_images(request: Request):
        user = await get_current_user(request)
        repo_images = await db.repository_files.find({'category': 'repository_immagini'}, {'_id': 0}).to_list(500)
        indexed = 0
        for item in repo_images:
            await db.repository_images_index.update_one(
                {'file_path': item.get('path', '')},
                {'$set': {
                    'id': item.get('file_id', f'rimg_{uuid.uuid4().hex[:12]}'),
                    'course_id': item.get('course_id'),
                    'file_path': item.get('path', ''),
                    'filename': item.get('name', ''),
                    'tags': item.get('tags', []),
                    'created_at': item.get('created_at', _now_iso()),
                    'public_url': item.get('public_url', ''),
                    'source_file_id': item.get('file_id', ''),
                }},
                upsert=True,
            )
            indexed += 1
        await log_audit(user['user_id'], 'repository_images_index', {'count': indexed})
        return {'indexed': indexed}

    @router.post('/api/media/repository-images/{index_id}/import')
    async def import_repository_image(request: Request, index_id: str):
        user = await get_current_user(request)
        item = await db.repository_images_index.find_one({'id': index_id}, {'_id': 0})
        if not item or not item.get('file_path') or not os.path.exists(item['file_path']):
            raise HTTPException(404, 'Immagine repository non trovata')
        asset_id = f'media_{uuid.uuid4().hex[:12]}'
        ext = Path(item['file_path']).suffix or '.jpg'
        original_path = MEDIA_ORIGINALS / f'{asset_id}{ext}'
        shutil.copyfile(item['file_path'], original_path)
        urls = _asset_urls(asset_id)
        asset = {
            'asset_id': asset_id,
            'id': asset_id,
            'source_type': 'repository',
            'course_id': item.get('course_id'),
            'title': item.get('filename', ''),
            'description': 'Importata dal repository immagini',
            'tags': item.get('tags', []),
            'original_file_path': str(original_path),
            'public_url': urls['public_url'],
            'created_by': user['user_id'],
            'created_at': _now_iso(),
            'updated_at': _now_iso(),
            'status': 'ready',
            'variants': {},
            'variant_paths': {},
            'metadata': {'filename': item.get('filename', ''), 'mime_type': _mime_for_path(str(original_path))},
        }
        await db.media_assets.insert_one(asset)
        await log_audit(user['user_id'], 'media_import_repository', {'asset_id': asset_id, 'index_id': index_id})
        return await db.media_assets.find_one({'asset_id': asset_id}, {'_id': 0})

    @router.get('/api/media/assignments')
    async def list_assignments(request: Request, campaign_id: str = ''):
        await get_current_user(request)
        query = {}
        if campaign_id:
            posts = await db.posts.find({'campaign_id': campaign_id}, {'_id': 0, 'post_id': 1}).to_list(500)
            query['post_id'] = {'$in': [post['post_id'] for post in posts]}
        assignments = await db.post_media_assignment.find(query, {'_id': 0}).to_list(500)
        enriched = []
        for assignment in assignments:
            asset = await db.media_assets.find_one({'asset_id': assignment.get('media_asset_id', '')}, {'_id': 0})
            enriched.append({**assignment, 'asset': _with_public_urls(asset) if asset else None})
        return enriched

    @router.post('/api/media/assignments/auto-match')
    async def auto_match_assignments(request: Request):
        user = await get_current_user(request)
        body = await request.json()
        campaign_id = body.get('campaign_id', '')
        if not campaign_id:
            raise HTTPException(400, 'campaign_id obbligatorio')
        source_scope = body.get('source_scope', 'library')
        platform_preferences = body.get('platform_preferences') or {'default': 'square', **PLATFORM_VARIANTS}
        job_id = await _create_job(db, 'auto_match_images', user['user_id'], meta={'campaign_id': campaign_id})
        asyncio.create_task(
            _run_auto_assignment_job(
                db,
                job_id,
                campaign_id,
                source_scope,
                bool(body.get('apply_process')),
                bool(body.get('apply_improve')),
                platform_preferences,
            )
        )
        await log_audit(user['user_id'], 'media_auto_assign_start', {'campaign_id': campaign_id, 'job_id': job_id})
        return {'job_id': job_id}

    @router.put('/api/media/assignments/{post_id}')
    async def upsert_assignment(request: Request, post_id: str):
        user = await get_current_user(request)
        body = await request.json()
        media_asset_id = body.get('media_asset_id', '')
        if not media_asset_id:
            await db.post_media_assignment.delete_one({'post_id': post_id})
            await log_audit(user['user_id'], 'media_assignment_remove', {'post_id': post_id})
            return {'ok': True}
        asset = await db.media_assets.find_one({'asset_id': media_asset_id}, {'_id': 0})
        if not asset:
            raise HTTPException(404, 'Asset non trovato')
        assignment = {
            'post_id': post_id,
            'media_asset_id': media_asset_id,
            'variant': body.get('variant', 'original'),
            'auto_assigned': bool(body.get('auto_assigned', False)),
            'updated_at': _now_iso(),
        }
        await db.post_media_assignment.update_one({'post_id': post_id}, {'$set': assignment}, upsert=True)
        await log_audit(user['user_id'], 'media_assignment_upsert', {'post_id': post_id, 'media_asset_id': media_asset_id})
        return {**assignment, 'asset': asset}

    @router.delete('/api/media/assignments/{post_id}')
    async def delete_assignment(request: Request, post_id: str):
        user = await get_current_user(request)
        await db.post_media_assignment.delete_one({'post_id': post_id})
        await log_audit(user['user_id'], 'media_assignment_delete', {'post_id': post_id})
        return {'ok': True}

    @router.get('/api/buffer/profiles')
    async def buffer_profiles(request: Request):
        await get_current_user(request)
        return await _buffer_get_profiles()

    @router.post('/api/buffer/publish-post/{post_id}')
    async def publish_post_to_buffer(request: Request, post_id: str):
        user = await get_current_user(request)
        post = await db.posts.find_one({'post_id': post_id}, {'_id': 0})
        if not post:
            raise HTTPException(404, 'Post non trovato')
        try:
            result = await _publish_post_to_buffer(db, post)
            await log_audit(user['user_id'], 'buffer_publish_post', {'post_id': post_id})
            return {'post_id': post_id, **result}
        except Exception as exc:
            await db.posts.update_one({'post_id': post_id}, {'$set': {'buffer_status': 'failed', 'buffer_error': str(exc)}})
            raise HTTPException(400, str(exc))

    @router.post('/api/buffer/publish-campaign/{campaign_id}')
    async def publish_campaign_to_buffer(request: Request, campaign_id: str):
        user = await get_current_user(request)
        job_id = await _create_job(db, 'buffer_publish_campaign', user['user_id'], meta={'campaign_id': campaign_id})
        asyncio.create_task(_run_publish_job(db, job_id, campaign_id))
        await log_audit(user['user_id'], 'buffer_publish_campaign_start', {'campaign_id': campaign_id, 'job_id': job_id})
        return {'job_id': job_id}

    return router