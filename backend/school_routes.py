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

    # ===== COURSE CATALOG =====
    @router.get("/catalog")
    async def list_catalog(request: Request):
        user = await get_current_user(request)
        courses = await db.course_catalog.find({}, {"_id": 0}).sort("order", 1).to_list(100)
        if not courses:
            # Seed initial catalog
            seed = [
                {"course_id": "cat_cc2026", "category": "ariadne", "title": "Core Coaching Program 2026", "description": "Percorso base di coaching creativo-esperienziale riconosciuto ICF.", "key_points": ["Fondamenti del coaching", "Approccio creativo-esperienziale", "Supervisione e pratica", "Certificazione ICF"], "order": 1},
                {"course_id": "cat_adv", "category": "ariadne", "title": "Advanced Coaching Lab", "description": "Laboratorio avanzato per coach certificati. Tecniche avanzate e specializzazioni.", "key_points": ["Specializzazioni tematiche", "Supervisione avanzata", "Progettazione sessioni complesse"], "order": 2},
                {"course_id": "cat_mentor", "category": "ariadne", "title": "Mentoring per Coach", "description": "Percorso di mentoring individuale e di gruppo per lo sviluppo della pratica.", "key_points": ["Sessioni individuali", "Gruppo di pari", "Feedback strutturato", "Ore ICF riconosciute"], "order": 3},
                {"course_id": "cat_team", "category": "ariadne", "title": "Team Coaching", "description": "Modulo specialistico sul coaching di team e gruppi.", "key_points": ["Dinamiche di gruppo", "Facilitazione", "Co-creazione obiettivi team"], "order": 4},
                {"course_id": "cat_biz1", "category": "business", "title": "Business del Coach", "description": "Come avviare e gestire una pratica di coaching indipendente.", "key_points": ["Posizionamento", "Pricing", "Marketing etico", "Aspetti legali e fiscali"], "order": 10},
                {"course_id": "cat_biz2", "category": "business", "title": "Marketing per Coach", "description": "Strategie di comunicazione e acquisizione clienti per coach.", "key_points": ["Personal branding", "Social media", "Content strategy", "Networking"], "order": 11},
                {"course_id": "cat_biz3", "category": "business", "title": "Digital Presence", "description": "Costruire e gestire la propria presenza digitale professionale.", "key_points": ["Sito web", "LinkedIn strategy", "Newsletter", "SEO per coach"], "order": 12},
            ]
            for c in seed:
                await db.course_catalog.insert_one(c)
            courses = await db.course_catalog.find({}, {"_id": 0}).sort("order", 1).to_list(100)
        # Get user progress
        progress = await db.user_course_progress.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
        progress_map = {p["course_id"]: p["status"] for p in progress}
        for c in courses:
            c["user_status"] = progress_map.get(c["course_id"], "not_started")
        return courses

    @router.post("/catalog/progress")
    async def update_course_progress(request: Request):
        user = await get_current_user(request)
        body = await request.json()
        course_id = body.get("course_id")
        status = body.get("status", "not_started")
        if status not in ("not_started", "in_progress", "completed"):
            raise HTTPException(400, "Stato non valido")
        existing = await db.user_course_progress.find_one({"user_id": user["user_id"], "course_id": course_id})
        if existing:
            await db.user_course_progress.update_one(
                {"user_id": user["user_id"], "course_id": course_id},
                {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        else:
            await db.user_course_progress.insert_one({
                "user_id": user["user_id"], "course_id": course_id, "status": status,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        return {"ok": True}

    # ===== USER DETAILS (Billing/Profile) =====
    @router.get("/user-details")
    async def get_user_details(request: Request):
        user = await get_current_user(request)
        details = await db.user_details.find_one({"user_id": user["user_id"]}, {"_id": 0})
        return details or {"user_id": user["user_id"]}

    @router.post("/user-details")
    async def save_user_details(request: Request):
        user = await get_current_user(request)
        body = await request.json()
        update_data = {
            "user_id": user["user_id"],
            "fiscal_code": body.get("fiscal_code", ""),
            "vat_number": body.get("vat_number", ""),
            "address": body.get("address", ""),
            "city": body.get("city", ""),
            "zip_code": body.get("zip_code", ""),
            "province": body.get("province", ""),
            "phone": body.get("phone", ""),
            "billing_name": body.get("billing_name", ""),
            "sdi_code": body.get("sdi_code", ""),
            "pec": body.get("pec", ""),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.user_details.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_data},
            upsert=True
        )
        return {"ok": True}

    # ===== ADMIN: User Details & Payment Management =====
    @router.get("/admin/user-details/{user_id}")
    async def admin_get_user_details(request: Request, user_id: str):
        await require_admin_editor(request)
        user_info = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        if not user_info:
            raise HTTPException(404, "Utente non trovato")
        details = await db.user_details.find_one({"user_id": user_id}, {"_id": 0})
        installments = await db.payment_installments.find({"user_id": user_id}, {"_id": 0}).sort("due_date", 1).to_list(50)
        return {"user": user_info, "details": details or {}, "installments": installments}

    @router.post("/admin/user-details/{user_id}")
    async def admin_save_user_details(request: Request, user_id: str):
        await require_admin_editor(request)
        body = await request.json()
        update_data = {k: v for k, v in body.items() if k != "user_id"}
        update_data["user_id"] = user_id
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.user_details.update_one({"user_id": user_id}, {"$set": update_data}, upsert=True)
        return {"ok": True}

    @router.get("/admin/installments")
    async def admin_list_installments(request: Request):
        await require_admin_editor(request)
        installments = await db.payment_installments.find({}, {"_id": 0}).sort("due_date", 1).to_list(200)
        # Enrich with user names
        for inst in installments:
            u = await db.users.find_one({"user_id": inst.get("user_id", "")}, {"_id": 0, "password_hash": 0})
            inst["user_name"] = u.get("name", "") if u else ""
            inst["user_email"] = u.get("email", "") if u else ""
        return installments

    @router.post("/admin/installments")
    async def admin_create_installment(request: Request):
        await require_admin_editor(request)
        body = await request.json()
        inst = {
            "installment_id": f"inst_{uuid.uuid4().hex[:12]}",
            "user_id": body.get("user_id"),
            "description": body.get("description", ""),
            "amount": body.get("amount", 0),
            "due_date": body.get("due_date", ""),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.payment_installments.insert_one(inst)
        inst.pop("_id", None)
        return inst

    @router.put("/admin/installments/{installment_id}")
    async def admin_update_installment(request: Request, installment_id: str):
        await require_admin_editor(request)
        body = await request.json()
        update = {k: v for k, v in body.items() if k in ("status", "amount", "due_date", "description", "notes")}
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.payment_installments.update_one({"installment_id": installment_id}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(404, "Rata non trovata")
        return {"ok": True}

    @router.delete("/admin/installments/{installment_id}")
    async def admin_delete_installment(request: Request, installment_id: str):
        await require_admin_editor(request)
        result = await db.payment_installments.delete_one({"installment_id": installment_id})
        if result.deleted_count == 0:
            raise HTTPException(404, "Rata non trovata")
        return {"ok": True}

    # ===== USER: Payment alerts =====
    @router.get("/my-payments")
    async def my_payments(request: Request):
        user = await get_current_user(request)
        installments = await db.payment_installments.find({"user_id": user["user_id"]}, {"_id": 0}).sort("due_date", 1).to_list(50)
        return installments

    return router
