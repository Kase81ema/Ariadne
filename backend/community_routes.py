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
                    upcoming.append({"title": e["title"], "date": d["date"], "label": d.get("label", ""), "type": e.get("type", "")})
                    break
        upcoming.sort(key=lambda x: x["date"])
        upcoming = upcoming[:5]

        # Recent feed posts
        recent_posts = await db.feed_posts.find({"deleted": {"$ne": True}}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
        for post in recent_posts:
            author = await db.users.find_one({"user_id": post["author_id"]}, {"_id": 0, "password_hash": 0})
            post["author"] = {"name": author.get("name", ""), "role": author.get("role", "user"), "picture": author.get("picture", "")} if author else {}
            post["like_count"] = await db.feed_likes.count_documents({"post_id": post["post_id"]})
            post["comment_count"] = await db.feed_comments.count_documents({"post_id": post["post_id"], "deleted": {"$ne": True}})

        return {
            "onboarded": onboarded,
            "profile": profile,
            "banners": banners,
            "upcoming_events": upcoming,
            "recent_posts": recent_posts,
            "journey_summary": {"total_steps": 0, "completed_steps": 0},
        }

    # ===== FEED =====
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
        allowed = ("title", "body", "link", "cta_text", "audience", "enabled", "priority")
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
