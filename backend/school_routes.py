from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
import uuid, os, aiofiles
from datetime import datetime, timezone
from pathlib import Path
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env')
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
UPLOAD_DIR = Path(__file__).parent / 'uploads'


def create_school_router(db, get_current_user, log_audit):
    router = APIRouter(prefix="/api/school")

    async def require_admin_editor(request):
        user = await get_current_user(request)
        if user["role"] not in ("admin", "editor"):
            raise HTTPException(403, "Non autorizzato")
        return user

    # ===== PROGRAMS =====
    @router.get("/programs")
    async def list_programs(request: Request):
        await get_current_user(request)
        return await db.programs.find({}, {"_id": 0}).sort("name", 1).to_list(100)

    @router.post("/programs")
    async def create_program(request: Request):
        user = await require_admin_editor(request)
        body = await request.json()
        prog = {
            "program_id": f"prg_{uuid.uuid4().hex[:12]}",
            "name": body.get("name", ""),
            "description": body.get("description", ""),
            "active": body.get("active", True),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.programs.insert_one(prog)
        return await db.programs.find_one({"program_id": prog["program_id"]}, {"_id": 0})

    @router.put("/programs/{program_id}")
    async def update_program(request: Request, program_id: str):
        await require_admin_editor(request)
        body = await request.json()
        allowed = ("name", "description", "active")
        updates = {k: v for k, v in body.items() if k in allowed}
        await db.programs.update_one({"program_id": program_id}, {"$set": updates})
        return await db.programs.find_one({"program_id": program_id}, {"_id": 0})

    @router.delete("/programs/{program_id}")
    async def delete_program(request: Request, program_id: str):
        await require_admin_editor(request)
        await db.programs.delete_one({"program_id": program_id})
        return {"ok": True}

    # ===== COHORTS =====
    @router.get("/cohorts")
    async def list_cohorts(request: Request):
        await get_current_user(request)
        cohorts = await db.cohorts.find({}, {"_id": 0}).sort("start_date", -1).to_list(100)
        for c in cohorts:
            prog = await db.programs.find_one({"program_id": c.get("program_id")}, {"_id": 0})
            c["program_name"] = prog["name"] if prog else ""
            c["member_count"] = await db.cohort_memberships.count_documents({"cohort_id": c["cohort_id"]})
            c["material_count"] = await db.materials.count_documents({"cohort_id": c["cohort_id"]})
        return cohorts

    @router.post("/cohorts")
    async def create_cohort(request: Request):
        user = await require_admin_editor(request)
        body = await request.json()
        cohort = {
            "cohort_id": f"coh_{uuid.uuid4().hex[:12]}",
            "program_id": body.get("program_id", ""),
            "name": body.get("name", ""),
            "start_date": body.get("start_date", ""),
            "end_date": body.get("end_date", ""),
            "active": body.get("active", True),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.cohorts.insert_one(cohort)
        return await db.cohorts.find_one({"cohort_id": cohort["cohort_id"]}, {"_id": 0})

    @router.put("/cohorts/{cohort_id}")
    async def update_cohort(request: Request, cohort_id: str):
        await require_admin_editor(request)
        body = await request.json()
        allowed = ("name", "program_id", "start_date", "end_date", "active")
        updates = {k: v for k, v in body.items() if k in allowed}
        await db.cohorts.update_one({"cohort_id": cohort_id}, {"$set": updates})
        return await db.cohorts.find_one({"cohort_id": cohort_id}, {"_id": 0})

    @router.delete("/cohorts/{cohort_id}")
    async def delete_cohort(request: Request, cohort_id: str):
        await require_admin_editor(request)
        await db.cohorts.delete_one({"cohort_id": cohort_id})
        await db.cohort_memberships.delete_many({"cohort_id": cohort_id})
        return {"ok": True}

    # ===== MEMBERSHIPS =====
    @router.get("/cohorts/{cohort_id}/members")
    async def list_members(request: Request, cohort_id: str):
        await require_admin_editor(request)
        memberships = await db.cohort_memberships.find({"cohort_id": cohort_id}, {"_id": 0}).to_list(500)
        for m in memberships:
            user_doc = await db.users.find_one({"user_id": m["user_id"]}, {"_id": 0, "password_hash": 0})
            m["user_name"] = user_doc.get("name", "") if user_doc else ""
            m["user_email"] = user_doc.get("email", "") if user_doc else ""
        return memberships

    @router.post("/cohorts/{cohort_id}/members")
    async def add_member(request: Request, cohort_id: str):
        user = await require_admin_editor(request)
        body = await request.json()
        user_id = body.get("user_id")
        role_in_cohort = body.get("role_in_cohort", "student")
        existing = await db.cohort_memberships.find_one({"cohort_id": cohort_id, "user_id": user_id})
        if existing:
            raise HTTPException(400, "Utente gia membro")
        await db.cohort_memberships.insert_one({
            "cohort_id": cohort_id, "user_id": user_id,
            "role_in_cohort": role_in_cohort,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
        })
        await log_audit(user["user_id"], "add_cohort_member", {"cohort_id": cohort_id, "member": user_id})
        return {"ok": True}

    @router.delete("/cohorts/{cohort_id}/members/{user_id}")
    async def remove_member(request: Request, cohort_id: str, user_id: str):
        await require_admin_editor(request)
        await db.cohort_memberships.delete_one({"cohort_id": cohort_id, "user_id": user_id})
        return {"ok": True}

    # ===== MATERIALS =====
    @router.get("/materials")
    async def list_materials(request: Request):
        user = await get_current_user(request)
        if user["role"] in ("admin", "editor"):
            mats = await db.materials.find({}, {"_id": 0}).sort("uploaded_at", -1).to_list(500)
        else:
            # User can only see materials from their cohorts
            memberships = await db.cohort_memberships.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
            cohort_ids = [m["cohort_id"] for m in memberships]
            if cohort_ids:
                mats = await db.materials.find({"cohort_id": {"$in": cohort_ids}}, {"_id": 0}).sort("uploaded_at", -1).to_list(500)
            else:
                mats = []
        # Enrich
        for m in mats:
            cohort = await db.cohorts.find_one({"cohort_id": m.get("cohort_id")}, {"_id": 0})
            m["cohort_name"] = cohort["name"] if cohort else ""
            if cohort:
                prog = await db.programs.find_one({"program_id": cohort.get("program_id")}, {"_id": 0})
                m["program_name"] = prog["name"] if prog else ""
        return mats

    @router.post("/materials/upload")
    async def upload_material(request: Request, file: UploadFile = File(...), cohort_id: str = Form(""), title: str = Form(""), description: str = Form("")):
        user = await require_admin_editor(request)
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(400, "File troppo grande (max 50MB)")
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
        filename = f"mat_{uuid.uuid4().hex[:12]}.{ext}"
        filepath = UPLOAD_DIR / filename
        async with aiofiles.open(filepath, "wb") as f:
            await f.write(content)
        mat = {
            "material_id": f"mat_{uuid.uuid4().hex[:12]}",
            "cohort_id": cohort_id,
            "title": title or file.filename,
            "description": description,
            "file_path": f"/api/uploads/{filename}",
            "file_name": file.filename,
            "file_size": len(content),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.materials.insert_one(mat)
        return await db.materials.find_one({"material_id": mat["material_id"]}, {"_id": 0})

    @router.delete("/materials/{material_id}")
    async def delete_material(request: Request, material_id: str):
        await require_admin_editor(request)
        await db.materials.delete_one({"material_id": material_id})
        return {"ok": True}

    # ===== JOURNEY TEMPLATES =====
    @router.get("/journey/templates")
    async def list_journey_templates(request: Request):
        await get_current_user(request)
        return await db.journey_templates.find({}, {"_id": 0}).to_list(20)

    @router.post("/journey/templates")
    async def create_journey_template(request: Request):
        user = await require_admin_editor(request)
        body = await request.json()
        tmpl = {
            "template_id": f"jtpl_{uuid.uuid4().hex[:12]}",
            "type": body.get("type", "formazione"),
            "name": body.get("name", ""),
            "steps": body.get("steps", []),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        # Ensure steps have IDs
        for i, step in enumerate(tmpl["steps"]):
            if not step.get("step_id"):
                step["step_id"] = f"js_{uuid.uuid4().hex[:8]}"
            step.setdefault("order", i)
            step.setdefault("editable_by_user", True)
            step.setdefault("requires_admin_validation", False)
        await db.journey_templates.insert_one(tmpl)
        return await db.journey_templates.find_one({"template_id": tmpl["template_id"]}, {"_id": 0})

    @router.put("/journey/templates/{template_id}")
    async def update_journey_template(request: Request, template_id: str):
        await require_admin_editor(request)
        body = await request.json()
        allowed = ("name", "type", "steps")
        updates = {k: v for k, v in body.items() if k in allowed}
        if "steps" in updates:
            for i, step in enumerate(updates["steps"]):
                if not step.get("step_id"):
                    step["step_id"] = f"js_{uuid.uuid4().hex[:8]}"
                step.setdefault("order", i)
        await db.journey_templates.update_one({"template_id": template_id}, {"$set": updates})
        return await db.journey_templates.find_one({"template_id": template_id}, {"_id": 0})

    @router.delete("/journey/templates/{template_id}")
    async def delete_journey_template(request: Request, template_id: str):
        await require_admin_editor(request)
        await db.journey_templates.delete_one({"template_id": template_id})
        return {"ok": True}

    # ===== JOURNEY PROGRESS =====
    @router.get("/journey/progress")
    async def get_journey_progress(request: Request):
        user = await get_current_user(request)
        templates = await db.journey_templates.find({}, {"_id": 0}).to_list(20)
        progress = await db.journey_progress.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(200)
        progress_map = {p["step_id"]: p for p in progress}
        result = []
        for tmpl in templates:
            steps_with_progress = []
            for step in tmpl.get("steps", []):
                p = progress_map.get(step["step_id"], {})
                steps_with_progress.append({
                    **step,
                    "status": p.get("status", "todo"),
                    "value": p.get("value", ""),
                    "notes": p.get("notes", ""),
                    "updated_at": p.get("updated_at", ""),
                    "validated_by": p.get("validated_by", ""),
                })
            result.append({**tmpl, "steps": steps_with_progress})
        return result

    @router.put("/journey/progress/{step_id}")
    async def update_step_progress(request: Request, step_id: str):
        user = await get_current_user(request)
        body = await request.json()
        updates = {
            "user_id": user["user_id"],
            "step_id": step_id,
            "status": body.get("status", "in_progress"),
            "value": body.get("value", ""),
            "notes": body.get("notes", ""),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.journey_progress.update_one(
            {"user_id": user["user_id"], "step_id": step_id},
            {"$set": updates}, upsert=True
        )
        return {"ok": True}

    @router.put("/journey/progress/{step_id}/validate")
    async def validate_step(request: Request, step_id: str):
        user = await require_admin_editor(request)
        body = await request.json()
        target_user_id = body.get("user_id")
        if not target_user_id:
            raise HTTPException(400, "user_id obbligatorio")
        await db.journey_progress.update_one(
            {"user_id": target_user_id, "step_id": step_id},
            {"$set": {"validated_by": user["user_id"], "status": "done", "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"ok": True}

    # ===== ASSISTANT =====
    @router.post("/assistant/query")
    async def assistant_query(request: Request):
        user = await get_current_user(request)
        body = await request.json()
        question = body.get("question", "").strip()
        if not question:
            raise HTTPException(400, "Domanda obbligatoria")

        # Build context based on user's access
        repo_files = await db.repository_files.find({}, {"_id": 0}).to_list(20)
        repo_context = "\n".join([f"[{f.get('category', '')}] {f.get('content', '')[:500]}" for f in repo_files]) if repo_files else ""

        courses = await db.courses_events.find({}, {"_id": 0}).to_list(20)
        courses_info = "\n".join([f"- {c['title']}: {c.get('description', '')[:200]} (date: {', '.join([d['date'] for d in c.get('dates', [])])})" for c in courses])

        # Materials accessible to user
        materials_info = ""
        if user["role"] in ("admin", "editor"):
            mats = await db.materials.find({}, {"_id": 0}).to_list(100)
        else:
            memberships = await db.cohort_memberships.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
            cohort_ids = [m["cohort_id"] for m in memberships]
            mats = await db.materials.find({"cohort_id": {"$in": cohort_ids}}, {"_id": 0}).to_list(100) if cohort_ids else []
        if mats:
            materials_info = "\n".join([f"- {m['title']}: {m.get('description', '')[:200]}" for m in mats])

        system_msg = """Sei l'assistente della community Ariadne Training, scuola di coaching creativo-esperienziale.

REGOLE INVIOLABILI:
- Rispondi SOLO con informazioni presenti nel contesto fornito (corsi, materiali, repository).
- Se non hai l'informazione richiesta, rispondi: "Non trovo questa informazione nei materiali disponibili. Ti consiglio di contattare la segreteria Ariadne per assistenza."
- NON inventare informazioni, date, prezzi, luoghi o dettagli non presenti nel contesto.
- Lingua: italiano corretto, tono amichevole e professionale.
- Sii conciso e utile."""

        user_msg = f"""Domanda dell'utente: {question}

CORSI E EVENTI ARIADNE:
{courses_info}

MATERIALI DISPONIBILI:
{materials_info or "Nessun materiale disponibile per questo utente."}

REPOSITORY ARIADNE:
{repo_context or "Nessun documento nel repository."}"""

        try:
            chat = LlmChat(
                api_key=EMERGENT_KEY,
                session_id=f"ariadne-assistant-{uuid.uuid4().hex[:8]}",
                system_message=system_msg
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            answer = await chat.send_message(UserMessage(text=user_msg))
        except Exception as e:
            answer = f"Mi dispiace, al momento non riesco a rispondere. Errore: {str(e)}\nTi consiglio di contattare la segreteria Ariadne per assistenza."

        return {"answer": answer, "sources_used": bool(repo_context or courses_info or materials_info)}

    return router
