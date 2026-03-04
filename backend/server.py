from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Form, Depends
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, uuid, logging, json, csv, io, hashlib, aiofiles
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import bcrypt, jwt, requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
JWT_SECRET = os.environ.get('JWT_SECRET', 'ariadne-secret')
UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Ariadne Editorial Studio API")
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ===== PYDANTIC MODELS =====
class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class SocialProfileCreate(BaseModel):
    name: str
    platform: str
    owner: str = ""
    active: bool = True
    notes: str = ""
    priority: int = 1
    style_guide: str = ""

class CourseEventCreate(BaseModel):
    title: str
    type: str = "course_multi"
    description: str = ""
    dates: list = []
    trainers: list = []
    price: str = ""
    location: str = ""
    accreditation: str = ""
    link: str = ""
    tags: list = []
    template_id: str = ""

class CampaignCreate(BaseModel):
    title: str
    type: str = "editorial"
    course_id: str = ""
    profiles: list = []
    period_start: str = ""
    period_end: str = ""
    posts_per_profile: int = 3
    mix_intentions: dict = {}
    rules_id: str = ""

class PostCreate(BaseModel):
    campaign_id: str
    profile_id: str
    platform: str = ""
    scheduled_date: str = ""
    scheduled_time: str = ""
    content: str = ""
    content_short: str = ""
    intention: str = "annuncio"
    cta: str = ""
    link: str = ""
    hashtags: list = []

class PostUpdate(BaseModel):
    content: Optional[str] = None
    content_short: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    intention: Optional[str] = None
    cta: Optional[str] = None
    link: Optional[str] = None
    hashtags: Optional[list] = None
    status: Optional[str] = None
    locked: Optional[bool] = None

class PlanningRuleCreate(BaseModel):
    name: str
    days: list = []
    time_slots: list = []
    max_per_day: int = 2
    min_gap_hours: int = 4
    coordinate_partners: bool = True

class TemplateCreate(BaseModel):
    name: str
    platform: str = ""
    intention: str = ""
    structure: str = ""
    example: str = ""

class GeneratePlanRequest(BaseModel):
    campaign_id: str
    active_agents: list = []

class GenerateTextsRequest(BaseModel):
    campaign_id: str
    post_ids: list = []
    active_agents: list = []

class RegeneratePostRequest(BaseModel):
    active_agents: list = []

# ===== AUTH HELPERS =====
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt(user_id: str, email: str, role: str) -> str:
    return jwt.encode({"user_id": user_id, "email": email, "role": role, "exp": datetime.now(timezone.utc) + timedelta(days=7)}, JWT_SECRET, algorithm="HS256")

async def get_current_user(request: Request) -> dict:
    # Check cookie first (Google OAuth)
    token = request.cookies.get("session_token")
    if token:
        session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at and expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
    # Check Authorization header (JWT)
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=["HS256"])
            user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
            if user:
                return user
        except Exception:
            pass
    raise HTTPException(status_code=401, detail="Non autenticato")

async def log_audit(user_id: str, action: str, details: dict = {}):
    await db.audit_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "action": action,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

# ===== AUTH ROUTES =====
@api_router.post("/auth/register")
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Email gia registrata")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id, "email": data.email, "name": data.name,
        "password_hash": hash_password(data.password), "role": "editor",
        "picture": "", "auth_type": "jwt",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    token = create_jwt(user_id, data.email, "editor")
    return {"token": token, "user": {"user_id": user_id, "email": data.email, "name": data.name, "role": "editor", "picture": ""}}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(401, "Credenziali non valide")
    token = create_jwt(user["user_id"], user["email"], user.get("role", "editor"))
    return {"token": token, "user": {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "role": user.get("role", "editor"), "picture": user.get("picture", "")}}

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(400, "session_id mancante")
    try:
        r = requests.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", headers={"X-Session-ID": session_id})
        if r.status_code != 200:
            raise HTTPException(401, "Sessione non valida")
        data = r.json()
    except Exception as e:
        raise HTTPException(401, f"Errore validazione sessione: {str(e)}")
    email = data.get("email", "")
    name = data.get("name", "")
    picture = data.get("picture", "")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "role": "editor", "auth_type": "google", "password_hash": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    session_token = f"sess_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    response.set_cookie("session_token", session_token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*3600)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return safe_user

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {k: v for k, v in user.items() if k != "password_hash"}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

# ===== SOCIAL PROFILES =====
@api_router.get("/social-profiles")
async def list_profiles(request: Request):
    await get_current_user(request)
    profiles = await db.social_profiles.find({}, {"_id": 0}).to_list(100)
    return profiles

@api_router.post("/social-profiles")
async def create_profile(data: SocialProfileCreate, request: Request):
    user = await get_current_user(request)
    profile = {
        "profile_id": f"prof_{uuid.uuid4().hex[:12]}",
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.social_profiles.insert_one(profile)
    await log_audit(user["user_id"], "create_profile", {"profile_id": profile["profile_id"]})
    created = await db.social_profiles.find_one({"profile_id": profile["profile_id"]}, {"_id": 0})
    return created

@api_router.put("/social-profiles/{profile_id}")
async def update_profile(profile_id: str, data: SocialProfileCreate, request: Request):
    user = await get_current_user(request)
    await db.social_profiles.update_one({"profile_id": profile_id}, {"$set": data.model_dump()})
    await log_audit(user["user_id"], "update_profile", {"profile_id": profile_id})
    updated = await db.social_profiles.find_one({"profile_id": profile_id}, {"_id": 0})
    return updated

@api_router.delete("/social-profiles/{profile_id}")
async def delete_profile(profile_id: str, request: Request):
    user = await get_current_user(request)
    await db.social_profiles.delete_one({"profile_id": profile_id})
    await log_audit(user["user_id"], "delete_profile", {"profile_id": profile_id})
    return {"ok": True}

# ===== COURSES & EVENTS =====
@api_router.get("/courses-events")
async def list_courses(request: Request):
    await get_current_user(request)
    return await db.courses_events.find({}, {"_id": 0}).to_list(200)

@api_router.post("/courses-events")
async def create_course(data: CourseEventCreate, request: Request):
    user = await get_current_user(request)
    course = {"course_id": f"course_{uuid.uuid4().hex[:12]}", **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat(), "created_by": user["user_id"]}
    await db.courses_events.insert_one(course)
    await log_audit(user["user_id"], "create_course", {"course_id": course["course_id"]})
    return await db.courses_events.find_one({"course_id": course["course_id"]}, {"_id": 0})

@api_router.put("/courses-events/{course_id}")
async def update_course(course_id: str, data: CourseEventCreate, request: Request):
    user = await get_current_user(request)
    await db.courses_events.update_one({"course_id": course_id}, {"$set": data.model_dump()})
    await log_audit(user["user_id"], "update_course", {"course_id": course_id})
    return await db.courses_events.find_one({"course_id": course_id}, {"_id": 0})

@api_router.delete("/courses-events/{course_id}")
async def delete_course(course_id: str, request: Request):
    user = await get_current_user(request)
    await db.courses_events.delete_one({"course_id": course_id})
    await log_audit(user["user_id"], "delete_course", {"course_id": course_id})
    return {"ok": True}

@api_router.post("/courses-events/{course_id}/clone")
async def clone_course(course_id: str, request: Request):
    user = await get_current_user(request)
    original = await db.courses_events.find_one({"course_id": course_id}, {"_id": 0})
    if not original:
        raise HTTPException(404, "Corso non trovato")
    clone = {**original, "course_id": f"course_{uuid.uuid4().hex[:12]}", "title": f"{original['title']} (copia)", "created_at": datetime.now(timezone.utc).isoformat(), "created_by": user["user_id"]}
    await db.courses_events.insert_one(clone)
    await log_audit(user["user_id"], "clone_course", {"original": course_id, "clone": clone["course_id"]})
    return await db.courses_events.find_one({"course_id": clone["course_id"]}, {"_id": 0})

# ===== CAMPAIGNS =====
@api_router.get("/campaigns")
async def list_campaigns(request: Request):
    await get_current_user(request)
    return await db.campaigns.find({}, {"_id": 0}).to_list(200)

@api_router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, request: Request):
    await get_current_user(request)
    c = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Campagna non trovata")
    return c

@api_router.post("/campaigns")
async def create_campaign(data: CampaignCreate, request: Request):
    user = await get_current_user(request)
    campaign = {"campaign_id": f"camp_{uuid.uuid4().hex[:12]}", **data.model_dump(), "status": "draft", "created_by": user["user_id"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.campaigns.insert_one(campaign)
    await log_audit(user["user_id"], "create_campaign", {"campaign_id": campaign["campaign_id"]})
    return await db.campaigns.find_one({"campaign_id": campaign["campaign_id"]}, {"_id": 0})

@api_router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    body.pop("campaign_id", None)
    await db.campaigns.update_one({"campaign_id": campaign_id}, {"$set": body})
    await log_audit(user["user_id"], "update_campaign", {"campaign_id": campaign_id})
    return await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})

@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, request: Request):
    user = await get_current_user(request)
    await db.campaigns.delete_one({"campaign_id": campaign_id})
    await db.posts.delete_many({"campaign_id": campaign_id})
    await log_audit(user["user_id"], "delete_campaign", {"campaign_id": campaign_id})
    return {"ok": True}

# ===== POSTS =====
@api_router.get("/posts")
async def list_posts(request: Request, campaign_id: str = "", status: str = "", profile_id: str = ""):
    await get_current_user(request)
    query = {}
    if campaign_id:
        query["campaign_id"] = campaign_id
    if status:
        query["status"] = status
    if profile_id:
        query["profile_id"] = profile_id
    return await db.posts.find(query, {"_id": 0}).to_list(500)

@api_router.get("/posts/{post_id}")
async def get_post(post_id: str, request: Request):
    await get_current_user(request)
    p = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Post non trovato")
    return p

@api_router.post("/posts")
async def create_post(data: PostCreate, request: Request):
    user = await get_current_user(request)
    post = {"post_id": f"post_{uuid.uuid4().hex[:12]}", **data.model_dump(), "status": "draft", "version": 1, "locked": False, "quality_issues": [], "created_by": user["user_id"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.posts.insert_one(post)
    await log_audit(user["user_id"], "create_post", {"post_id": post["post_id"]})
    return await db.posts.find_one({"post_id": post["post_id"]}, {"_id": 0})

@api_router.put("/posts/{post_id}")
async def update_post(post_id: str, data: PostUpdate, request: Request):
    user = await get_current_user(request)
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        # Save version before update
        existing = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
        if existing:
            await db.post_versions.insert_one({
                "version_id": f"ver_{uuid.uuid4().hex[:12]}", "post_id": post_id,
                "content": existing.get("content", ""), "content_short": existing.get("content_short", ""),
                "version": existing.get("version", 1), "edited_by": user["user_id"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            updates["version"] = existing.get("version", 1) + 1
        await db.posts.update_one({"post_id": post_id}, {"$set": updates})
    await log_audit(user["user_id"], "update_post", {"post_id": post_id})
    return await db.posts.find_one({"post_id": post_id}, {"_id": 0})

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, request: Request):
    user = await get_current_user(request)
    await db.posts.delete_one({"post_id": post_id})
    await log_audit(user["user_id"], "delete_post", {"post_id": post_id})
    return {"ok": True}

@api_router.post("/posts/{post_id}/approve")
async def approve_post(post_id: str, request: Request):
    user = await get_current_user(request)
    await db.posts.update_one({"post_id": post_id}, {"$set": {"status": "approved"}})
    await log_audit(user["user_id"], "approve_post", {"post_id": post_id})
    return await db.posts.find_one({"post_id": post_id}, {"_id": 0})

@api_router.post("/posts/batch-approve")
async def batch_approve(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    post_ids = body.get("post_ids", [])
    await db.posts.update_many({"post_id": {"$in": post_ids}}, {"$set": {"status": "approved"}})
    await log_audit(user["user_id"], "batch_approve", {"count": len(post_ids)})
    return {"ok": True, "approved": len(post_ids)}

@api_router.get("/posts/{post_id}/versions")
async def get_post_versions(post_id: str, request: Request):
    await get_current_user(request)
    return await db.post_versions.find({"post_id": post_id}, {"_id": 0}).sort("version", -1).to_list(50)

@api_router.post("/posts/{post_id}/comment")
async def add_comment(post_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    comment = {"comment_id": f"com_{uuid.uuid4().hex[:8]}", "post_id": post_id, "user_id": user["user_id"], "user_name": user["name"], "text": body.get("text", ""), "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.post_comments.insert_one(comment)
    return await db.post_comments.find({"post_id": post_id}, {"_id": 0}).to_list(100)

@api_router.get("/posts/{post_id}/comments")
async def get_comments(post_id: str, request: Request):
    await get_current_user(request)
    return await db.post_comments.find({"post_id": post_id}, {"_id": 0}).to_list(100)

# ===== PLANNING RULES =====
@api_router.get("/planning-rules")
async def list_rules(request: Request):
    await get_current_user(request)
    return await db.planning_rules.find({}, {"_id": 0}).to_list(50)

@api_router.post("/planning-rules")
async def create_rule(data: PlanningRuleCreate, request: Request):
    user = await get_current_user(request)
    rule = {"rule_id": f"rule_{uuid.uuid4().hex[:12]}", **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.planning_rules.insert_one(rule)
    await log_audit(user["user_id"], "create_rule", {"rule_id": rule["rule_id"]})
    return await db.planning_rules.find_one({"rule_id": rule["rule_id"]}, {"_id": 0})

@api_router.put("/planning-rules/{rule_id}")
async def update_rule(rule_id: str, data: PlanningRuleCreate, request: Request):
    user = await get_current_user(request)
    await db.planning_rules.update_one({"rule_id": rule_id}, {"$set": data.model_dump()})
    await log_audit(user["user_id"], "update_rule", {"rule_id": rule_id})
    return await db.planning_rules.find_one({"rule_id": rule_id}, {"_id": 0})

@api_router.delete("/planning-rules/{rule_id}")
async def delete_rule(rule_id: str, request: Request):
    user = await get_current_user(request)
    await db.planning_rules.delete_one({"rule_id": rule_id})
    return {"ok": True}

# ===== TEMPLATES =====
@api_router.get("/templates")
async def list_templates(request: Request):
    await get_current_user(request)
    return await db.templates.find({}, {"_id": 0}).to_list(100)

@api_router.post("/templates")
async def create_template(data: TemplateCreate, request: Request):
    user = await get_current_user(request)
    tmpl = {"template_id": f"tmpl_{uuid.uuid4().hex[:12]}", **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.templates.insert_one(tmpl)
    return await db.templates.find_one({"template_id": tmpl["template_id"]}, {"_id": 0})

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, request: Request):
    await get_current_user(request)
    await db.templates.delete_one({"template_id": template_id})
    return {"ok": True}

# ===== REPOSITORY =====
@api_router.get("/repository/files")
async def list_repo_files(request: Request, category: str = ""):
    await get_current_user(request)
    query = {}
    if category:
        query["category"] = category
    return await db.repository_files.find(query, {"_id": 0}).to_list(200)

@api_router.post("/repository/upload")
async def upload_repo_file(request: Request, file: UploadFile = File(...), category: str = Form("generale")):
    user = await get_current_user(request)
    cat_dir = UPLOAD_DIR / category
    cat_dir.mkdir(exist_ok=True)
    file_id = f"file_{uuid.uuid4().hex[:12]}"
    ext = Path(file.filename).suffix
    save_path = cat_dir / f"{file_id}{ext}"
    content = await file.read()
    async with aiofiles.open(save_path, 'wb') as f:
        await f.write(content)
    # Try to extract text content
    text_content = ""
    try:
        text_content = content.decode('utf-8')[:5000]
    except Exception:
        text_content = "[Contenuto binario - estrazione testo non disponibile]"
    doc = {
        "file_id": file_id, "name": file.filename, "category": category,
        "path": str(save_path), "size": len(content),
        "content_extract": text_content, "uploaded_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.repository_files.insert_one(doc)
    await log_audit(user["user_id"], "upload_file", {"file_id": file_id, "category": category})
    return await db.repository_files.find_one({"file_id": file_id}, {"_id": 0})

@api_router.delete("/repository/files/{file_id}")
async def delete_repo_file(file_id: str, request: Request):
    user = await get_current_user(request)
    f = await db.repository_files.find_one({"file_id": file_id}, {"_id": 0})
    if f and os.path.exists(f.get("path", "")):
        os.remove(f["path"])
    await db.repository_files.delete_one({"file_id": file_id})
    return {"ok": True}

@api_router.get("/repository/categories")
async def list_categories(request: Request):
    await get_current_user(request)
    categories = [
        {"id": "tone_of_voice", "name": "Tone of Voice", "description": "Linee guida sul tono di comunicazione"},
        {"id": "regole_calendario", "name": "Regole Calendario", "description": "Vincoli e regole per la pianificazione"},
        {"id": "buzz_words", "name": "Buzz Words", "description": "Parole chiave e terminologia"},
        {"id": "parole_da_evitare", "name": "Parole da Evitare", "description": "Termini da non utilizzare"},
        {"id": "esempi_post", "name": "Esempi Post", "description": "Esempi di post di riferimento"},
        {"id": "compliance_icf", "name": "Compliance ICF", "description": "Linee guida ICF e disclaimer"},
        {"id": "rubriche", "name": "Rubriche", "description": "Rubriche editoriali ricorrenti"},
        {"id": "loghi", "name": "Loghi", "description": "Loghi e risorse visual"},
        {"id": "generale", "name": "Generale", "description": "Documenti generali"},
    ]
    return categories

@api_router.get("/repository/context")
async def get_repo_context(request: Request):
    """Get consolidated repository context for AI agents."""
    await get_current_user(request)
    files = await db.repository_files.find({}, {"_id": 0}).to_list(100)
    context_parts = []
    for f in files:
        if f.get("content_extract"):
            context_parts.append(f"[{f['category'].upper()}] {f['name']}:\n{f['content_extract'][:2000]}")
    return {"context": "\n\n---\n\n".join(context_parts)}

# ===== AGENT CONFIGS =====
@api_router.get("/agents")
async def list_agents(request: Request):
    await get_current_user(request)
    agents = await db.agent_configs.find({}, {"_id": 0}).to_list(20)
    if not agents:
        from agents import AGENT_DEFINITIONS
        for a in AGENT_DEFINITIONS:
            await db.agent_configs.insert_one({**a})
        agents = await db.agent_configs.find({}, {"_id": 0}).to_list(20)
    return agents

@api_router.put("/agents/{agent_id}")
async def toggle_agent(agent_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    await db.agent_configs.update_one({"agent_id": agent_id}, {"$set": {"active": body.get("active", False)}})
    await log_audit(user["user_id"], "toggle_agent", {"agent_id": agent_id, "active": body.get("active")})
    return await db.agent_configs.find_one({"agent_id": agent_id}, {"_id": 0})

# ===== GENERATION =====
@api_router.post("/generate/plan")
async def gen_plan(data: GeneratePlanRequest, request: Request):
    user = await get_current_user(request)
    from agents import generate_plan
    campaign = await db.campaigns.find_one({"campaign_id": data.campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(404, "Campagna non trovata")
    profiles = await db.social_profiles.find({"profile_id": {"$in": campaign.get("profiles", [])}}, {"_id": 0}).to_list(20)
    rules = []
    if campaign.get("rules_id"):
        rule = await db.planning_rules.find_one({"rule_id": campaign["rules_id"]}, {"_id": 0})
        if rule:
            rules = [rule]
    if not rules:
        rules = await db.planning_rules.find({}, {"_id": 0}).to_list(5)
    course = None
    if campaign.get("course_id"):
        course = await db.courses_events.find_one({"course_id": campaign["course_id"]}, {"_id": 0})
    repo_ctx = await get_repo_context_str()
    context = {
        "campaign_title": campaign.get("title", ""),
        "campaign_type": campaign.get("type", ""),
        "course_title": course.get("title", "") if course else "",
        "course_description": course.get("description", "") if course else "",
        "course_dates": str(course.get("dates", [])) if course else "",
        "trainers": course.get("trainers", []) if course else [],
        "profiles": [{"id": p["profile_id"], "name": p["name"], "platform": p["platform"]} for p in profiles],
        "rules": json.dumps(rules, default=str),
        "period_start": campaign.get("period_start", ""),
        "period_end": campaign.get("period_end", ""),
        "posts_per_profile": campaign.get("posts_per_profile", 3),
        "mix_intentions": str(campaign.get("mix_intentions", {})),
    }
    plan_text = await generate_plan(context, repo_ctx)
    await db.campaigns.update_one({"campaign_id": data.campaign_id}, {"$set": {"status": "planning"}})
    await log_audit(user["user_id"], "generate_plan", {"campaign_id": data.campaign_id})
    # Try to parse plan into posts
    posts_created = []
    try:
        import re
        json_match = re.search(r'\[.*\]', plan_text, re.DOTALL)
        if json_match:
            plan_items = json.loads(json_match.group())
            for item in plan_items:
                prof_id = item.get("profile_id", "")
                profile = next((p for p in profiles if p["profile_id"] == prof_id), profiles[0] if profiles else None)
                if not profile:
                    continue
                post = {
                    "post_id": f"post_{uuid.uuid4().hex[:12]}", "campaign_id": data.campaign_id,
                    "profile_id": prof_id, "platform": profile.get("platform", ""),
                    "scheduled_date": item.get("date", ""), "scheduled_time": item.get("time", "09:00"),
                    "content": "", "content_short": "", "intention": item.get("intention", "annuncio"),
                    "cta": "", "link": "", "hashtags": [], "status": "draft", "version": 1,
                    "locked": False, "quality_issues": [], "created_by": user["user_id"],
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.posts.insert_one(post)
                posts_created.append(post["post_id"])
    except Exception as e:
        logger.warning(f"Could not parse plan into posts: {e}")
    return {"plan_text": plan_text, "posts_created": posts_created}

@api_router.post("/generate/texts")
async def gen_texts(data: GenerateTextsRequest, request: Request):
    user = await get_current_user(request)
    from agents import generate_post_text
    campaign = await db.campaigns.find_one({"campaign_id": data.campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(404, "Campagna non trovata")
    course = None
    if campaign.get("course_id"):
        course = await db.courses_events.find_one({"course_id": campaign["course_id"]}, {"_id": 0})
    repo_ctx = await get_repo_context_str()
    post_ids = data.post_ids
    if not post_ids:
        posts = await db.posts.find({"campaign_id": data.campaign_id, "status": "draft"}, {"_id": 0}).to_list(50)
        post_ids = [p["post_id"] for p in posts]
    results = []
    for pid in post_ids:
        post = await db.posts.find_one({"post_id": pid}, {"_id": 0})
        if not post or post.get("locked"):
            continue
        profile = await db.social_profiles.find_one({"profile_id": post.get("profile_id", "")}, {"_id": 0})
        context = {
            "campaign_title": campaign.get("title", ""),
            "campaign_type": campaign.get("type", ""),
            "course_title": course.get("title", "") if course else "",
            "course_description": course.get("description", "") if course else "",
            "course_dates": str(course.get("dates", [])) if course else "",
            "trainers": course.get("trainers", []) if course else [],
            "location": course.get("location", "") if course else "",
            "price": course.get("price", "") if course else "",
            "link": course.get("link", "") if course else "",
            "profile_name": profile.get("name", "") if profile else "",
            "style_guide": profile.get("style_guide", "") if profile else "",
        }
        result = await generate_post_text(
            platform=post.get("platform", "linkedin_company"),
            intention=post.get("intention", "annuncio"),
            context=context,
            active_agents=data.active_agents,
            repository_context=repo_ctx
        )
        await db.posts.update_one({"post_id": pid}, {"$set": {
            "content": result["content"], "content_short": result["content_short"],
            "hashtags": result["hashtags"], "quality_issues": result["quality_issues"],
            "status": "generated"
        }})
        results.append({"post_id": pid, "agents_used": result["agents_used"]})
    await db.campaigns.update_one({"campaign_id": data.campaign_id}, {"$set": {"status": "review"}})
    await log_audit(user["user_id"], "generate_texts", {"campaign_id": data.campaign_id, "count": len(results)})
    return {"generated": results}

@api_router.post("/posts/{post_id}/regenerate")
async def regenerate_post(post_id: str, data: RegeneratePostRequest, request: Request):
    user = await get_current_user(request)
    from agents import generate_post_text
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Post non trovato")
    campaign = await db.campaigns.find_one({"campaign_id": post["campaign_id"]}, {"_id": 0})
    course = None
    if campaign and campaign.get("course_id"):
        course = await db.courses_events.find_one({"course_id": campaign["course_id"]}, {"_id": 0})
    profile = await db.social_profiles.find_one({"profile_id": post.get("profile_id", "")}, {"_id": 0})
    repo_ctx = await get_repo_context_str()
    context = {
        "campaign_title": campaign.get("title", "") if campaign else "",
        "campaign_type": campaign.get("type", "") if campaign else "",
        "course_title": course.get("title", "") if course else "",
        "course_description": course.get("description", "") if course else "",
        "profile_name": profile.get("name", "") if profile else "",
        "style_guide": profile.get("style_guide", "") if profile else "",
    }
    # Save version before regenerate
    await db.post_versions.insert_one({
        "version_id": f"ver_{uuid.uuid4().hex[:12]}", "post_id": post_id,
        "content": post.get("content", ""), "content_short": post.get("content_short", ""),
        "version": post.get("version", 1), "edited_by": user["user_id"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    result = await generate_post_text(
        platform=post.get("platform", "linkedin_company"),
        intention=post.get("intention", "annuncio"),
        context=context, active_agents=data.active_agents, repository_context=repo_ctx
    )
    await db.posts.update_one({"post_id": post_id}, {"$set": {
        "content": result["content"], "content_short": result["content_short"],
        "hashtags": result["hashtags"], "quality_issues": result["quality_issues"],
        "status": "generated", "version": post.get("version", 1) + 1
    }})
    await log_audit(user["user_id"], "regenerate_post", {"post_id": post_id})
    return await db.posts.find_one({"post_id": post_id}, {"_id": 0})

async def get_repo_context_str() -> str:
    files = await db.repository_files.find({}, {"_id": 0}).to_list(50)
    parts = []
    for f in files:
        if f.get("content_extract"):
            parts.append(f"[{f['category'].upper()}] {f['name']}:\n{f['content_extract'][:1500]}")
    return "\n---\n".join(parts) if parts else ""

# ===== EXPORT =====
@api_router.get("/export/csv/{campaign_id}")
async def export_csv(campaign_id: str, request: Request):
    user = await get_current_user(request)
    posts = await db.posts.find({"campaign_id": campaign_id, "status": {"$in": ["approved", "generated", "review"]}}, {"_id": 0}).to_list(500)
    profiles_list = await db.social_profiles.find({}, {"_id": 0}).to_list(100)
    profiles_map = {p["profile_id"]: p for p in profiles_list}
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Time", "Profile", "Platform", "Content", "Content Short", "CTA", "Link", "Hashtags", "Status", "Intention"])
    for p in posts:
        prof = profiles_map.get(p.get("profile_id", ""), {})
        writer.writerow([
            p.get("scheduled_date", ""), p.get("scheduled_time", ""),
            prof.get("name", ""), p.get("platform", ""),
            p.get("content", ""), p.get("content_short", ""),
            p.get("cta", ""), p.get("link", ""),
            " ".join(p.get("hashtags", [])), p.get("status", ""), p.get("intention", "")
        ])
    await db.campaigns.update_one({"campaign_id": campaign_id}, {"$set": {"status": "exported"}})
    await log_audit(user["user_id"], "export_csv", {"campaign_id": campaign_id})
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=ariadne_export_{campaign_id}.csv"})

@api_router.get("/export/json/{campaign_id}")
async def export_json(campaign_id: str, request: Request):
    user = await get_current_user(request)
    posts = await db.posts.find({"campaign_id": campaign_id, "status": {"$in": ["approved", "generated", "review"]}}, {"_id": 0}).to_list(500)
    profiles_list = await db.social_profiles.find({}, {"_id": 0}).to_list(100)
    profiles_map = {p["profile_id"]: p for p in profiles_list}
    export_data = []
    for p in posts:
        prof = profiles_map.get(p.get("profile_id", ""), {})
        export_data.append({
            "date": p.get("scheduled_date", ""), "time": p.get("scheduled_time", ""),
            "profile": prof.get("name", ""), "platform": p.get("platform", ""),
            "content": p.get("content", ""), "content_short": p.get("content_short", ""),
            "cta": p.get("cta", ""), "link": p.get("link", ""),
            "hashtags": p.get("hashtags", []), "intention": p.get("intention", "")
        })
    await db.campaigns.update_one({"campaign_id": campaign_id}, {"$set": {"status": "exported"}})
    await log_audit(user["user_id"], "export_json", {"campaign_id": campaign_id})
    content = json.dumps(export_data, ensure_ascii=False, indent=2)
    return StreamingResponse(io.BytesIO(content.encode()), media_type="application/json", headers={"Content-Disposition": f"attachment; filename=ariadne_export_{campaign_id}.json"})

@api_router.get("/export/copy-pack/{campaign_id}")
async def export_copy_pack(campaign_id: str, request: Request):
    user = await get_current_user(request)
    posts = await db.posts.find({"campaign_id": campaign_id, "status": {"$in": ["approved", "generated", "review"]}}, {"_id": 0}).to_list(500)
    profiles_list = await db.social_profiles.find({}, {"_id": 0}).to_list(100)
    profiles_map = {p["profile_id"]: p for p in profiles_list}
    sections = {}
    for p in posts:
        prof = profiles_map.get(p.get("profile_id", ""), {})
        key = f"{prof.get('name', 'Sconosciuto')} ({p.get('platform', '')})"
        if key not in sections:
            sections[key] = []
        sections[key].append(p)
    lines = ["ARIADNE EDITORIAL STUDIO - COPY PACK", f"Campagna: {campaign_id}", f"Data export: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}", "=" * 60, ""]
    for section, sposts in sections.items():
        lines.append(f"\n{'=' * 40}")
        lines.append(f"  {section}")
        lines.append(f"{'=' * 40}\n")
        for p in sorted(sposts, key=lambda x: x.get("scheduled_date", "")):
            lines.append(f"--- {p.get('scheduled_date', '')} {p.get('scheduled_time', '')} | {p.get('intention', '')} ---")
            lines.append(f"\n{p.get('content', '')}\n")
            if p.get("content_short"):
                lines.append(f"[VERSIONE BREVE]\n{p['content_short']}\n")
            if p.get("hashtags"):
                lines.append(f"Hashtags: {' '.join('#' + h for h in p['hashtags'])}\n")
            lines.append("")
    await log_audit(user["user_id"], "export_copy_pack", {"campaign_id": campaign_id})
    content = "\n".join(lines)
    return StreamingResponse(io.BytesIO(content.encode()), media_type="text/plain", headers={"Content-Disposition": f"attachment; filename=copy_pack_{campaign_id}.txt"})

# ===== DASHBOARD =====
@api_router.get("/dashboard/stats")
async def dashboard_stats(request: Request):
    await get_current_user(request)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    from datetime import timedelta as td
    week_start = (datetime.now(timezone.utc) - td(days=datetime.now(timezone.utc).weekday())).strftime("%Y-%m-%d")
    week_end = (datetime.now(timezone.utc) + td(days=6 - datetime.now(timezone.utc).weekday())).strftime("%Y-%m-%d")
    total_posts = await db.posts.count_documents({})
    today_posts = await db.posts.count_documents({"scheduled_date": today})
    week_posts = await db.posts.count_documents({"scheduled_date": {"$gte": week_start, "$lte": week_end}})
    draft_posts = await db.posts.count_documents({"status": "draft"})
    generated_posts = await db.posts.count_documents({"status": "generated"})
    review_posts = await db.posts.count_documents({"status": "review"})
    approved_posts = await db.posts.count_documents({"status": "approved"})
    exported_posts = await db.posts.count_documents({"status": "exported"})
    total_campaigns = await db.campaigns.count_documents({})
    active_campaigns = await db.campaigns.count_documents({"status": {"$nin": ["exported", "archived"]}})
    return {
        "total_posts": total_posts, "today_posts": today_posts, "week_posts": week_posts,
        "draft_posts": draft_posts, "generated_posts": generated_posts,
        "review_posts": review_posts, "approved_posts": approved_posts, "exported_posts": exported_posts,
        "total_campaigns": total_campaigns, "active_campaigns": active_campaigns,
    }

@api_router.get("/dashboard/calendar")
async def dashboard_calendar(request: Request, month: str = "", profile_id: str = ""):
    await get_current_user(request)
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    query = {"scheduled_date": {"$regex": f"^{month}"}}
    if profile_id:
        query["profile_id"] = profile_id
    posts = await db.posts.find(query, {"_id": 0}).to_list(500)
    profiles = await db.social_profiles.find({}, {"_id": 0}).to_list(100)
    profiles_map = {p["profile_id"]: p["name"] for p in profiles}
    for p in posts:
        p["profile_name"] = profiles_map.get(p.get("profile_id", ""), "")
    return posts

# ===== AUDIT =====
@api_router.get("/audit-logs")
async def list_audit_logs(request: Request, limit: int = 50):
    user = await get_current_user(request)
    return await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)

# ===== SEED DATA =====
async def seed_data():
    """Initialize database with sample data if empty."""
    if await db.social_profiles.count_documents({}) > 0:
        return
    logger.info("Seeding initial data...")
    profiles = [
        {"profile_id": "prof_ariadne_li", "name": "Ariadne Training", "platform": "linkedin_company", "owner": "", "active": True, "notes": "Pagina aziendale LinkedIn", "priority": 1, "style_guide": "Tono istituzionale, professionale ma caldo. Voce di Ariadne come scuola.", "created_at": datetime.now(timezone.utc).isoformat()},
        {"profile_id": "prof_arianna_li", "name": "Arianna Perrone", "platform": "linkedin_personal", "owner": "Arianna Perrone", "active": True, "notes": "MCC ICF, 2500+ ore coaching", "priority": 2, "style_guide": "Tono personale, esperienziale, empatico. Parla delle proprie esperienze di coaching e formazione. Prospettiva femminile, matura, autorevole.", "created_at": datetime.now(timezone.utc).isoformat()},
        {"profile_id": "prof_ciccarelli_li", "name": "Emanuele Ciccarelli", "platform": "linkedin_personal", "owner": "Emanuele Ciccarelli", "active": True, "notes": "Integral Coach, fondatore Laborintus", "priority": 2, "style_guide": "Tono personale, creativo, visionario. Parla di innovazione nel coaching, metodi creativi, esperienze con Kaospilot e Lego Serious Play.", "created_at": datetime.now(timezone.utc).isoformat()},
        {"profile_id": "prof_casero_li", "name": "Emanuele Casero", "platform": "linkedin_personal", "owner": "Emanuele Casero", "active": True, "notes": "Socio Ariadne", "priority": 2, "style_guide": "Tono personale, pragmatico, orientato ai risultati. Prospettiva di business e sviluppo organizzativo.", "created_at": datetime.now(timezone.utc).isoformat()},
        {"profile_id": "prof_ariadne_ig", "name": "Ariadne Instagram", "platform": "instagram", "owner": "", "active": True, "notes": "Canale Instagram, solo caption testo", "priority": 3, "style_guide": "Sintetico, coinvolgente, accessibile. CTA chiare.", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    for p in profiles:
        await db.social_profiles.insert_one(p)
    courses = [
        {
            "course_id": "course_ccp_2026", "title": "Core Coaching Program - Edizione 2026",
            "type": "course_multi", "description": "Percorso di formazione in Coaching creativo-esperienziale di primo livello, riconosciuto da ICF: 60 ore sui fondamenti del coaching + 10 ore di Mentor Coaching.",
            "dates": [
                {"date": "2026-03-13", "end_date": "2026-03-14", "label": "Modulo 1"},
                {"date": "2026-05-08", "end_date": "2026-05-09", "label": "Modulo 2"},
                {"date": "2026-06-05", "end_date": "2026-06-06", "label": "Modulo 3"},
                {"date": "2026-06-26", "end_date": "2026-06-27", "label": "Modulo 4"},
            ],
            "trainers": ["Arianna Perrone", "Emanuele Ciccarelli"],
            "price": "", "location": "", "accreditation": "ICF Level 1",
            "link": "https://www.ariadne.training/core-coaching-program",
            "tags": ["coaching", "ICF", "formazione", "livello 1"],
            "template_id": "", "created_at": datetime.now(timezone.utc).isoformat(), "created_by": "system"
        },
        {
            "course_id": "course_webinar_q1", "title": "Webinar introduttivo: il coaching creativo-esperienziale",
            "type": "event_single", "description": "Un webinar gratuito per scoprire l'approccio creativo-esperienziale al coaching di Ariadne.",
            "dates": [{"date": "2026-02-28", "end_date": "2026-02-28", "label": "Webinar"}],
            "trainers": ["Arianna Perrone"], "price": "Gratuito", "location": "Online",
            "accreditation": "", "link": "https://www.ariadne.training",
            "tags": ["webinar", "introduttivo", "gratuito"],
            "template_id": "", "created_at": datetime.now(timezone.utc).isoformat(), "created_by": "system"
        }
    ]
    for c in courses:
        await db.courses_events.insert_one(c)
    rules = [
        {"rule_id": "rule_standard", "name": "Standard LinkedIn", "days": ["mon", "tue", "wed", "thu", "fri"], "time_slots": ["09:00", "12:00", "17:00"], "max_per_day": 2, "min_gap_hours": 4, "coordinate_partners": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"rule_id": "rule_instagram", "name": "Instagram regolare", "days": ["tue", "thu", "sat"], "time_slots": ["10:00", "18:00"], "max_per_day": 1, "min_gap_hours": 24, "coordinate_partners": False, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    for r in rules:
        await db.planning_rules.insert_one(r)
    from agents import AGENT_DEFINITIONS
    for a in AGENT_DEFINITIONS:
        await db.agent_configs.insert_one({**a})
    templates = [
        {"template_id": "tmpl_annuncio_corso", "name": "Annuncio corso", "platform": "linkedin_company", "intention": "annuncio", "structure": "Hook iniziale → Descrizione breve → Dettagli (date, trainer) → CTA → Link", "example": "Un percorso che trasforma la tua visione del coaching...", "created_at": datetime.now(timezone.utc).isoformat()},
        {"template_id": "tmpl_valore", "name": "Post di valore", "platform": "linkedin_company", "intention": "valore", "structure": "Insight/riflessione → Connessione con il coaching → Domanda aperta o invito", "example": "Cosa significa davvero sviluppare il proprio potenziale?...", "created_at": datetime.now(timezone.utc).isoformat()},
        {"template_id": "tmpl_reminder", "name": "Reminder iscrizioni", "platform": "linkedin_company", "intention": "reminder", "structure": "Urgenza gentile → Dettaglio pratico → CTA diretta", "example": "Le iscrizioni al Core Coaching Program si chiudono tra...", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    for t in templates:
        await db.templates.insert_one(t)
    # Create admin user
    admin_exists = await db.users.find_one({"email": "admin@ariadne.training"}, {"_id": 0})
    if not admin_exists:
        await db.users.insert_one({
            "user_id": "user_admin", "email": "admin@ariadne.training", "name": "Admin Ariadne",
            "password_hash": hash_password("admin123"), "role": "admin", "picture": "", "auth_type": "jwt",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    logger.info("Seed data initialized.")

# ===== APP SETUP =====
app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','), allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup():
    await seed_data()

@app.on_event("shutdown")
async def shutdown():
    client.close()
