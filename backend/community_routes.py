from fastapi import APIRouter, HTTPException, Request, UploadFile, File
import uuid, aiofiles
from datetime import datetime, timezone
from pathlib import Path

UPLOAD_DIR = Path(__file__).parent / 'uploads'


def create_community_router(db, get_current_user, log_audit):
    router = APIRouter(prefix="/api/community")

    # ===== ONBOARDING =====
    @router.get("/profile")
    async def get_community_profile(request: Request):
        user = await get_current_user(request)
        profile = await db.user_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
        return profile or {"user_id": user["user_id"], "onboarded": False}

    @router.post("/onboarding")
    async def save_onboarding(request: Request):
        user = await get_current_user(request)
        body = await request.json()
        profile = {
            "user_id": user["user_id"],
            "display_name": body.get("display_name", user.get("name", "")),
            "objective": body.get("objective", ""),
            "level": body.get("level", "interessato"),
            "onboarded": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.user_profiles.update_one({"user_id": user["user_id"]}, {"$set": profile}, upsert=True)
        return profile

    # ===== COMMUNITY DASHBOARD =====
    @router.get("/dashboard")
    async def community_dashboard(request: Request):
        user = await get_current_user(request)
        profile = await db.user_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
        onboarded = profile.get("onboarded", False) if profile else False

        # Banners
        bquery = {"enabled": True}
        if user["role"] not in ("admin", "editor"):
            level = profile.get("level", "interessato") if profile else "interessato"
            bquery["$or"] = [{"audience": "all"}, {"audience": level}]
        banners = await db.suggestion_banners.find(bquery, {"_id": 0}).sort("priority", -1).limit(3).to_list(3)

        # Upcoming events from courses_events
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        events = await db.courses_events.find({}, {"_id": 0}).to_list(100)
        upcoming = []
        for e in events:
            for d in e.get("dates", []):
                if d.get("date", "") >= today:
                    upcoming.append({"title": e["title"], "date": d["date"], "label": d.get("label", ""), "type": e.get("type", ""), "course_id": e.get("course_id", "")})
                    break
        upcoming.sort(key=lambda x: x["date"])
        upcoming = upcoming[:5]
        # Enrich with user interest status
        user_interests = await db.course_interest_status.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
        interest_map = {i["course_id"]: i.get("status", "") for i in user_interests}
        for ev in upcoming:
            ev["user_interest"] = interest_map.get(ev.get("course_id", ""), "")

        # Recent feed posts
        recent_posts = await db.feed_posts.find({"deleted": {"$ne": True}}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
        for post in recent_posts:
            author = await db.users.find_one({"user_id": post["author_id"]}, {"_id": 0, "password_hash": 0})
            post["author"] = {"name": author.get("name", ""), "role": author.get("role", "user"), "picture": author.get("picture", "")} if author else {}
            post["like_count"] = await db.feed_likes.count_documents({"post_id": post["post_id"]})
            post["comment_count"] = await db.feed_comments.count_documents({"post_id": post["post_id"], "deleted": {"$ne": True}})

        # Community members (volti della community)
        members_raw = await db.users.find({"suspended": {"$ne": True}}, {"_id": 0, "password_hash": 0}).limit(20).to_list(20)
        community_members = [{"name": m.get("name", ""), "picture": m.get("picture", ""), "role": m.get("role", "user")} for m in members_raw if m.get("name")]

        # Journey summary
        journey_progress = await db.journey_progress.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
        total_steps = len(journey_progress)
        completed_steps = sum(1 for j in journey_progress if j.get("status") == "completed")

        return {
            "onboarded": onboarded,
            "profile": profile,
            "banners": banners,
            "upcoming_events": upcoming,
            "recent_posts": recent_posts,
            "community_members": community_members,
            "journey_summary": {"total_steps": total_steps, "completed_steps": completed_steps},
        }

    # ===== FEED =====
    @router.post("/feed/seed-samples")
    async def seed_sample_posts(request: Request):
        """Seed 5 sample posts from trainers for demo purposes"""
        user = await get_current_user(request)
        existing = await db.feed_posts.count_documents({"is_sample": True})
        if existing >= 5:
            return {"seeded": 0, "message": "Post di esempio gia presenti"}
        # Create trainer users if not exist
        trainers = [
            {"user_id": "trainer_maria", "email": "maria.rossi@ariadne.training", "name": "Maria Rossi", "role": "editor", "auth_type": "jwt", "picture": "", "suspended": False},
            {"user_id": "trainer_luca", "email": "luca.bianchi@ariadne.training", "name": "Luca Bianchi", "role": "editor", "auth_type": "jwt", "picture": "", "suspended": False},
            {"user_id": "trainer_giulia", "email": "giulia.verdi@ariadne.training", "name": "Giulia Verdi", "role": "editor", "auth_type": "jwt", "picture": "", "suspended": False},
            {"user_id": "trainer_marco", "email": "marco.ferrari@ariadne.training", "name": "Marco Ferrari", "role": "editor", "auth_type": "jwt", "picture": "", "suspended": False},
            {"user_id": "trainer_elena", "email": "elena.conti@ariadne.training", "name": "Elena Conti", "role": "editor", "auth_type": "jwt", "picture": "", "suspended": False},
        ]
        for t in trainers:
            ex = await db.users.find_one({"user_id": t["user_id"]})
            if not ex:
                t["password_hash"] = "not_set"
                t["created_at"] = datetime.now(timezone.utc).isoformat()
                await db.users.insert_one(t)
        sample_posts = [
            {"author_id": "trainer_maria", "content": "Oggi abbiamo concluso il modulo sull'ascolto attivo nel Core Coaching Program. Vedere i partecipanti applicare subito le tecniche nelle esercitazioni pratiche e stato emozionante! Il coaching creativo-esperienziale funziona perche non e solo teoria: e un'esperienza che trasforma. Chi di voi ha provato l'esercizio del 'silenzio generativo'? Condividete le vostre riflessioni!", "image_url": ""},
            {"author_id": "trainer_luca", "content": "Riflessione dalla sessione di ieri sull'Advanced Coaching Lab: quando un coach impara a 'stare nel non sapere', succede la magia. Il cliente trova le proprie risposte, non quelle che noi pensiamo siano giuste. Questo e il cuore dell'approccio Ariadne. Grazie a tutti i partecipanti per il coraggio di mettersi in gioco!", "image_url": ""},
            {"author_id": "trainer_giulia", "content": "Vi presento il nuovo percorso 'Business del Coach' che parte il mese prossimo! Dopo anni di esperienza nel coaching indipendente, ho raccolto le strategie piu efficaci per avviare e far crescere la propria pratica. Parleremo di posizionamento, pricing etico, e come costruire una presenza autentica. I posti sono limitati a 15 partecipanti per garantire un lavoro personalizzato.", "image_url": ""},
            {"author_id": "trainer_marco", "content": "Oggi al Team Coaching Lab abbiamo lavorato sulle dinamiche di gruppo con un'attivita che ha sorpreso tutti: la 'scultura del team'. Ogni partecipante ha posizionato fisicamente i colleghi nello spazio per rappresentare le relazioni del proprio team. Le intuizioni emerse sono state potentissime. Il corpo sa cose che la mente non dice.", "image_url": ""},
            {"author_id": "trainer_elena", "content": "Condivido con voi una citazione che mi accompagna sempre nel mio lavoro di mentoring: 'Il mentore non ti dice dove andare, ti aiuta a vedere dove stai andando.' Nelle sessioni di questa settimana ho visto tre coach alle prime armi fare un salto di qualita incredibile. La supervisione tra pari e uno strumento potente. Se non l'avete ancora provata, vi consiglio di iniziare!", "image_url": ""},
        ]
        seeded = 0
        for sp in sample_posts:
            sp["post_id"] = f"fp_{uuid.uuid4().hex[:12]}"
            sp["is_sample"] = True
            sp["deleted"] = False
            sp["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.feed_posts.insert_one(sp)
            seeded += 1
        return {"seeded": seeded}

    @router.get("/feed")
    async def list_feed_posts(request: Request, skip: int = 0, limit: int = 20):
        user = await get_current_user(request)
        posts = await db.feed_posts.find({"deleted": {"$ne": True}}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        for post in posts:
            author = await db.users.find_one({"user_id": post["author_id"]}, {"_id": 0, "password_hash": 0})
            post["author"] = {"name": author.get("name", ""), "role": author.get("role", "user"), "picture": author.get("picture", "")} if author else {}
            post["like_count"] = await db.feed_likes.count_documents({"post_id": post["post_id"]})
            post["comment_count"] = await db.feed_comments.count_documents({"post_id": post["post_id"], "deleted": {"$ne": True}})
            post["user_liked"] = await db.feed_likes.count_documents({"post_id": post["post_id"], "user_id": user["user_id"]}) > 0
        return posts

    @router.post("/feed")
    async def create_feed_post(request: Request):
        user = await get_current_user(request)
        if user.get("suspended"):
            raise HTTPException(403, "Account sospeso")
        body = await request.json()
        content = body.get("content", "").strip()
        if not content:
            raise HTTPException(400, "Contenuto obbligatorio")
        post = {
            "post_id": f"fp_{uuid.uuid4().hex[:12]}",
            "author_id": user["user_id"],
            "content": content,
            "image_url": body.get("image_url", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "deleted": False,
        }
        await db.feed_posts.insert_one(post)
        post.pop("_id", None)
        post["author"] = {"name": user.get("name", ""), "role": user.get("role", "user"), "picture": user.get("picture", "")}
        post["like_count"] = 0
        post["comment_count"] = 0
        post["user_liked"] = False
        return post

    @router.post("/feed/upload-image")
    async def upload_feed_image(request: Request, file: UploadFile = File(...)):
        user = await get_current_user(request)
        if user.get("suspended"):
            raise HTTPException(403, "Account sospeso")
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
        if ext not in ("jpg", "jpeg", "png", "gif", "webp"):
            raise HTTPException(400, "Formato immagine non supportato")
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(400, "Immagine troppo grande (max 5MB)")
        filename = f"feed_{uuid.uuid4().hex[:12]}.{ext}"
        filepath = UPLOAD_DIR / filename
        async with aiofiles.open(filepath, "wb") as f:
            await f.write(content)
        return {"url": f"/api/uploads/{filename}"}

    @router.delete("/feed/{post_id}")
    async def delete_feed_post(request: Request, post_id: str):
        user = await get_current_user(request)
        post = await db.feed_posts.find_one({"post_id": post_id}, {"_id": 0})
        if not post:
            raise HTTPException(404, "Post non trovato")
        if user["role"] != "admin" and post["author_id"] != user["user_id"]:
            raise HTTPException(403, "Non autorizzato")
        await db.feed_posts.update_one({"post_id": post_id}, {"$set": {"deleted": True}})
        await log_audit(user["user_id"], "feed_delete_post", {"post_id": post_id})
        return {"ok": True}

    @router.post("/feed/{post_id}/like")
    async def toggle_like(request: Request, post_id: str):
        user = await get_current_user(request)
        existing = await db.feed_likes.find_one({"post_id": post_id, "user_id": user["user_id"]})
        if existing:
            await db.feed_likes.delete_one({"post_id": post_id, "user_id": user["user_id"]})
            liked = False
        else:
            await db.feed_likes.insert_one({"post_id": post_id, "user_id": user["user_id"], "created_at": datetime.now(timezone.utc).isoformat()})
            liked = True
        count = await db.feed_likes.count_documents({"post_id": post_id})
        return {"liked": liked, "count": count}

    @router.get("/feed/{post_id}/comments")
    async def list_comments(request: Request, post_id: str):
        await get_current_user(request)
        comments = await db.feed_comments.find({"post_id": post_id, "deleted": {"$ne": True}}, {"_id": 0}).sort("created_at", 1).to_list(100)
        for c in comments:
            author = await db.users.find_one({"user_id": c["author_id"]}, {"_id": 0, "password_hash": 0})
            c["author"] = {"name": author.get("name", ""), "role": author.get("role", "user"), "picture": author.get("picture", "")} if author else {}
        return comments

    @router.post("/feed/{post_id}/comments")
    async def add_comment(request: Request, post_id: str):
        user = await get_current_user(request)
        if user.get("suspended"):
            raise HTTPException(403, "Account sospeso")
        body = await request.json()
        content = body.get("content", "").strip()
        if not content:
            raise HTTPException(400, "Commento vuoto")
        comment = {
            "comment_id": f"fc_{uuid.uuid4().hex[:12]}",
            "post_id": post_id,
            "author_id": user["user_id"],
            "content": content,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "deleted": False,
        }
        await db.feed_comments.insert_one(comment)
        comment.pop("_id", None)
        comment["author"] = {"name": user.get("name", ""), "role": user.get("role", "user"), "picture": user.get("picture", "")}
        return comment

    @router.delete("/feed/comments/{comment_id}")
    async def delete_comment(request: Request, comment_id: str):
        user = await get_current_user(request)
        comment = await db.feed_comments.find_one({"comment_id": comment_id}, {"_id": 0})
        if not comment:
            raise HTTPException(404, "Commento non trovato")
        if user["role"] != "admin" and comment["author_id"] != user["user_id"]:
            raise HTTPException(403, "Non autorizzato")
        await db.feed_comments.update_one({"comment_id": comment_id}, {"$set": {"deleted": True}})
        return {"ok": True}

    # ===== BANNERS =====
    @router.get("/banners")
    async def list_banners(request: Request):
        user = await get_current_user(request)
        query = {"enabled": True}
        if user["role"] not in ("admin", "editor"):
            profile = await db.user_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
            level = profile.get("level", "interessato") if profile else "interessato"
            query["$or"] = [{"audience": "all"}, {"audience": level}]
        banners = await db.suggestion_banners.find(query, {"_id": 0}).sort("priority", -1).to_list(50)
        return banners

    @router.get("/banners/all")
    async def list_all_banners(request: Request):
        user = await get_current_user(request)
        if user["role"] not in ("admin", "editor"):
            raise HTTPException(403, "Non autorizzato")
        return await db.suggestion_banners.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

    @router.post("/banners")
    async def create_banner(request: Request):
        user = await get_current_user(request)
        if user["role"] not in ("admin", "editor"):
            raise HTTPException(403, "Non autorizzato")
        body = await request.json()
        banner = {
            "banner_id": f"ban_{uuid.uuid4().hex[:12]}",
            "title": body.get("title", ""),
            "body": body.get("body", ""),
            "link": body.get("link", ""),
            "cta_text": body.get("cta_text", "Scopri"),
            "image_url": body.get("image_url", ""),
            "audience": body.get("audience", "all"),
            "enabled": body.get("enabled", True),
            "priority": body.get("priority", 0),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.suggestion_banners.insert_one(banner)
        await log_audit(user["user_id"], "create_banner", {"banner_id": banner["banner_id"]})
        return await db.suggestion_banners.find_one({"banner_id": banner["banner_id"]}, {"_id": 0})

    @router.put("/banners/{banner_id}")
    async def update_banner(request: Request, banner_id: str):
        user = await get_current_user(request)
        if user["role"] not in ("admin", "editor"):
            raise HTTPException(403, "Non autorizzato")
        body = await request.json()
        allowed = ("title", "body", "link", "cta_text", "image_url", "audience", "enabled", "priority")
        updates = {k: v for k, v in body.items() if k in allowed}
        if not updates:
            raise HTTPException(400, "Nessun campo da aggiornare")
        await db.suggestion_banners.update_one({"banner_id": banner_id}, {"$set": updates})
        return await db.suggestion_banners.find_one({"banner_id": banner_id}, {"_id": 0})

    @router.delete("/banners/{banner_id}")
    async def delete_banner(request: Request, banner_id: str):
        user = await get_current_user(request)
        if user["role"] != "admin":
            raise HTTPException(403, "Solo admin")
        result = await db.suggestion_banners.delete_one({"banner_id": banner_id})
        if result.deleted_count == 0:
            raise HTTPException(404, "Banner non trovato")
        return {"ok": True}

    @router.post("/banners/seed-samples")
    async def seed_sample_banners(request: Request):
        """Seed 3 sample banners with images for demo"""
        user = await get_current_user(request)
        existing = await db.suggestion_banners.count_documents({"is_sample": True})
        if existing >= 3:
            return {"seeded": 0}
        sample_banners = [
            {
                "banner_id": f"ban_{uuid.uuid4().hex[:12]}",
                "title": "Core Coaching Program 2026 - Iscrizioni aperte!",
                "body": "Il percorso di formazione in coaching creativo-esperienziale riconosciuto ICF. 200 ore di formazione pratica con supervisione. Prossima edizione: Aprile 2026.",
                "link": "#",
                "cta_text": "Scopri il programma",
                "image_url": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=300&fit=crop",
                "audience": "interessato",
                "enabled": True,
                "priority": 10,
                "is_sample": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "banner_id": f"ban_{uuid.uuid4().hex[:12]}",
                "title": "Nuovo: Corso Digital Presence per Coach",
                "body": "Impara a costruire la tua presenza online professionale. Sito web, LinkedIn, newsletter e SEO. Il corso perfetto per chi vuole far crescere la propria pratica.",
                "link": "#",
                "cta_text": "Scopri di piu",
                "image_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=300&fit=crop",
                "audience": "studente",
                "enabled": True,
                "priority": 8,
                "is_sample": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "banner_id": f"ban_{uuid.uuid4().hex[:12]}",
                "title": "Rete Alumni - Evento annuale 2026",
                "body": "Unisciti alla community degli alumni Ariadne per l'evento annuale di networking e formazione continua. Guest speaker internazionali e workshop esclusivi.",
                "link": "#",
                "cta_text": "Partecipa",
                "image_url": "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&h=300&fit=crop",
                "audience": "all",
                "enabled": True,
                "priority": 6,
                "is_sample": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        ]
        for b in sample_banners:
            await db.suggestion_banners.insert_one(b)
        return {"seeded": 3}

    # ===== COMMUNITY EVENTS (read-only view) =====
    @router.get("/events")
    async def list_community_events(request: Request):
        await get_current_user(request)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        events = await db.courses_events.find({}, {"_id": 0}).to_list(100)
        upcoming = []
        for e in events:
            future_dates = [d for d in e.get("dates", []) if d.get("date", "") >= today]
            if future_dates:
                upcoming.append({**e, "next_date": future_dates[0]["date"]})
        upcoming.sort(key=lambda x: x.get("next_date", "9999"))
        return upcoming

    return router
