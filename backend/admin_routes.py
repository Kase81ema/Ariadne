from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone


def create_admin_router(db, get_current_user, log_audit):
    router = APIRouter(prefix="/api/admin")

    @router.get("/users")
    async def list_users(request: Request):
        user = await get_current_user(request)
        if user["role"] not in ("admin", "editor"):
            raise HTTPException(403, "Non autorizzato")
        users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
        for u in users:
            profile = await db.user_profiles.find_one({"user_id": u["user_id"]}, {"_id": 0})
            u["community_profile"] = profile
            u["post_count"] = await db.feed_posts.count_documents({"author_id": u["user_id"], "deleted": {"$ne": True}})
        return users

    @router.put("/users/{user_id}/role")
    async def change_role(request: Request, user_id: str):
        user = await get_current_user(request)
        if user["role"] != "admin":
            raise HTTPException(403, "Solo admin")
        body = await request.json()
        new_role = body.get("role")
        if new_role not in ("admin", "editor", "user"):
            raise HTTPException(400, "Ruolo non valido")
        target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not target:
            raise HTTPException(404, "Utente non trovato")
        await db.users.update_one({"user_id": user_id}, {"$set": {"role": new_role}})
        await log_audit(user["user_id"], "change_role", {"target_user": user_id, "new_role": new_role})
        return {"ok": True, "role": new_role}

    @router.put("/users/{user_id}/suspend")
    async def toggle_suspend(request: Request, user_id: str):
        user = await get_current_user(request)
        if user["role"] != "admin":
            raise HTTPException(403, "Solo admin")
        target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not target:
            raise HTTPException(404, "Utente non trovato")
        new_status = not target.get("suspended", False)
        await db.users.update_one({"user_id": user_id}, {"$set": {"suspended": new_status}})
        await log_audit(user["user_id"], "toggle_suspend", {"target_user": user_id, "suspended": new_status})
        return {"ok": True, "suspended": new_status}

    @router.delete("/users/{user_id}/content")
    async def remove_user_content(request: Request, user_id: str):
        user = await get_current_user(request)
        if user["role"] != "admin":
            raise HTTPException(403, "Solo admin")
        r1 = await db.feed_posts.update_many({"author_id": user_id}, {"$set": {"deleted": True}})
        r2 = await db.feed_comments.update_many({"author_id": user_id}, {"$set": {"deleted": True}})
        await log_audit(user["user_id"], "remove_user_content", {"target_user": user_id, "posts": r1.modified_count, "comments": r2.modified_count})
        return {"ok": True, "posts_removed": r1.modified_count, "comments_removed": r2.modified_count}

    return router
