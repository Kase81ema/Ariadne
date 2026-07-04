import os
import uuid

import aiofiles
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from datetime import datetime, timedelta, timezone
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

    def _category_label(raw_category: str, accreditation: str = "", tags=None):
        raw = (raw_category or "").strip().lower()
        tags = [str(tag).strip().lower() for tag in (tags or [])]
        text = " ".join([raw, accreditation.lower(), " ".join(tags)])
        if "external" in text or "trainer esterno" in text:
            return "Trainer esterni"
        if "icf" in text:
            return "ICF"
        if raw in ("ariadne", "formazione coach", "coach"):
            return "Ariadne"
        if raw == "tecnica":
            return "Tecnica"
        if raw == "business":
            return "Business"
        return raw_category.title() if raw_category else "Ariadne"

    def _timing_status(dates):
        today = datetime.now(timezone.utc).date()
        parsed_dates = []
        for item in dates or []:
            if not item.get("date"):
                continue
            try:
                start_date = datetime.fromisoformat(item["date"]).date()
                end_raw = item.get("end_date") or item.get("date")
                end_date = datetime.fromisoformat(end_raw).date()
                parsed_dates.append((start_date, end_date))
            except Exception:
                continue
        if not parsed_dates:
            return "always_available"
        earliest = min(item[0] for item in parsed_dates)
        latest = max(item[1] for item in parsed_dates)
        if latest < today:
            return "completed"
        if earliest > today:
            return "upcoming"
        return "ongoing"

    async def _ensure_catalog_seed():
        seed = [
            {"course_id": "cat_cc2026", "category": "ariadne", "title": "Programma Core Coaching 2026", "description": "Percorso base di coaching creativo-esperienziale riconosciuto ICF. 200 ore di formazione pratica.", "key_points": ["Fondamenti del coaching ICF", "Approccio creativo-esperienziale", "Supervisione e pratica", "Certificazione ICF ACC"], "order": 1},
            {"course_id": "cat_adv", "category": "ariadne", "title": "Laboratorio avanzato di coaching", "description": "Laboratorio avanzato per coach certificati. Tecniche avanzate e specializzazioni per il livello PCC.", "key_points": ["Specializzazioni tematiche", "Supervisione avanzata", "Progettazione sessioni complesse", "Preparazione PCC"], "order": 2},
            {"course_id": "cat_mentor", "category": "ariadne", "title": "Mentoring per Coach", "description": "Percorso di mentoring individuale e di gruppo per lo sviluppo della pratica professionale.", "key_points": ["Sessioni individuali", "Gruppo di pari", "Feedback strutturato", "Ore ICF riconosciute"], "order": 3},
            {"course_id": "cat_team", "category": "ariadne", "title": "Team coaching ICF", "description": "Modulo specialistico sul coaching di team e gruppi secondo le competenze ICF.", "key_points": ["Dinamiche di gruppo", "Facilitazione", "Co-creazione obiettivi team", "Competenze ICF team"], "order": 4},
            {"course_id": "cat_tec1", "category": "tecnica", "title": "Coaching con tecniche creative", "description": "Utilizzo di arte, movimento e metafore nel processo di coaching.", "key_points": ["Art-based coaching", "Movimento corporeo", "Metafore e storytelling", "Visualizzazione guidata"], "order": 20},
            {"course_id": "cat_tec2", "category": "tecnica", "title": "Coaching e Mindfulness", "description": "Integrazione di pratiche di mindfulness e presenza nel coaching.", "key_points": ["Meditazione per coach", "Ascolto consapevole", "Gestione dello stress", "Presenza nel processo"], "order": 21},
            {"course_id": "cat_tec3", "category": "tecnica", "title": "Assessment e strumenti diagnostici", "description": "Utilizzo di strumenti di assessment e diagnostica nel percorso di coaching.", "key_points": ["Test di personalita", "360 feedback", "Strumenti di autovalutazione", "Interpretazione risultati"], "order": 22},
            {"course_id": "cat_biz1", "category": "business", "title": "Business del Coach", "description": "Come avviare e gestire una pratica di coaching indipendente.", "key_points": ["Posizionamento", "Pricing", "Marketing etico", "Aspetti legali e fiscali"], "order": 30},
            {"course_id": "cat_biz2", "category": "business", "title": "Marketing per Coach", "description": "Strategie di comunicazione e acquisizione clienti per coach.", "key_points": ["Personal branding", "Social media", "Content strategy", "Networking"], "order": 31},
            {"course_id": "cat_biz3", "category": "business", "title": "Presenza digitale per coach", "description": "Costruire e gestire la propria presenza digitale professionale.", "key_points": ["Sito web", "Strategia LinkedIn", "Newsletter", "SEO per coach"], "order": 32},
        ]
        for course in seed:
            await db.course_catalog.update_one({"course_id": course["course_id"]}, {"$set": course}, upsert=True)
        return await db.course_catalog.find({}, {"_id": 0}).sort("order", 1).to_list(100)

    async def _collect_training_courses():
        catalog_courses = await _ensure_catalog_seed()
        event_courses = await db.courses_events.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
        items = []
        for course in catalog_courses:
            category_label = _category_label(course.get("category", ""), tags=course.get("tags", []))
            items.append({
                "course_id": course["course_id"],
                "source": "catalog",
                "title": course.get("title", ""),
                "description": course.get("description", ""),
                "category": category_label,
                "category_key": course.get("category", ""),
                "course_type": "training_program",
                "timing_status": "always_available",
                "dates": [],
                "trainers": course.get("trainers", []),
                "price": course.get("price", ""),
                "location": course.get("location", ""),
                "accreditation": course.get("accreditation", ""),
                "tags": course.get("tags", []),
                "key_points": course.get("key_points", []),
                "link": course.get("link", ""),
                "planned_label": "Offerta continuativa",
            })

        for course in event_courses:
            category_label = _category_label(course.get("tags", [""])[0] if course.get("tags") else "", course.get("accreditation", ""), course.get("tags", []))
            timing_status = _timing_status(course.get("dates", []))
            items.append({
                "course_id": course["course_id"],
                "source": "studio_course",
                "title": course.get("title", ""),
                "description": course.get("description", ""),
                "category": category_label,
                "category_key": category_label.lower().replace(" ", "_"),
                "course_type": course.get("type", "course_multi"),
                "timing_status": timing_status,
                "dates": course.get("dates", []),
                "trainers": course.get("trainers", []),
                "price": course.get("price", ""),
                "location": course.get("location", ""),
                "accreditation": course.get("accreditation", ""),
                "tags": course.get("tags", []),
                "key_points": [],
                "link": course.get("link", ""),
                "planned_label": {
                    "upcoming": "In programma",
                    "ongoing": "In corso",
                    "completed": "Concluso",
                    "always_available": "Sempre disponibile",
                }.get(timing_status, "In programma"),
            })
        items.sort(key=lambda item: (item["timing_status"] == "completed", item.get("title", "")))
        return items

    async def _collect_course_admin_summary(course_id: str):
        cohorts = await db.cohorts.find({"course_id": course_id}, {"_id": 0}).sort("start_date", 1).to_list(100)
        summary = {"interested": 0, "confirmed": 0, "enrolled": 0}
        editions = []
        membership_user_ids = set()
        for cohort in cohorts:
            memberships = await db.cohort_memberships.find({"cohort_id": cohort["cohort_id"]}, {"_id": 0}).to_list(300)
            enriched_members = []
            for member in memberships:
                membership_user_ids.add(member["user_id"])
                user_doc = await db.users.find_one({"user_id": member["user_id"]}, {"_id": 0, "password_hash": 0})
                status = member.get("participation_status", "enrolled")
                summary[status] = summary.get(status, 0) + 1
                installments = await db.payment_installments.find({"user_id": member["user_id"], "cohort_id": cohort["cohort_id"]}, {"_id": 0}).sort("due_date", 1).to_list(20)
                enriched_members.append({
                    **member,
                    "user_name": user_doc.get("name", "") if user_doc else "",
                    "user_email": user_doc.get("email", "") if user_doc else "",
                    "installments": installments,
                })
            editions.append({
                **cohort,
                "members": enriched_members,
            })

        prospects_raw = await db.course_interest_status.find({"course_id": course_id}, {"_id": 0}).sort("updated_at", -1).to_list(300)
        prospects = []
        for item in prospects_raw:
            if item.get("user_id") in membership_user_ids:
                continue
            user_doc = await db.users.find_one({"user_id": item["user_id"]}, {"_id": 0, "password_hash": 0})
            status = item.get("status", "interested")
            summary[status] = summary.get(status, 0) + 1
            prospects.append({
                **item,
                "user_name": user_doc.get("name", "") if user_doc else "",
                "user_email": user_doc.get("email", "") if user_doc else "",
            })

        return {"summary": summary, "editions": editions, "prospects": prospects}

    async def _get_current_user_course_status(course_id: str, user_id: str):
        cohorts = await db.cohorts.find({"course_id": course_id}, {"_id": 0, "cohort_id": 1}).to_list(100)
        cohort_ids = [item["cohort_id"] for item in cohorts]
        if cohort_ids:
            membership = await db.cohort_memberships.find_one({"user_id": user_id, "cohort_id": {"$in": cohort_ids}}, {"_id": 0})
            if membership:
                return membership.get("participation_status", "enrolled")
        interest = await db.course_interest_status.find_one({"course_id": course_id, "user_id": user_id}, {"_id": 0})
        if interest:
            return interest.get("status", "interested")
        return ""

    # ===== PROGRAMS =====
    @router.get("/programs")
    async def list_programs(request: Request):
        await get_current_user(request)
        return await db.programs.find({}, {"_id": 0}).sort("name", 1).to_list(100)

    @router.post("/programs")
    async def create_program(request: Request):
        await require_admin_editor(request)
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
            linked_course = await db.courses_events.find_one({"course_id": c.get("course_id", "")}, {"_id": 0})
            c["course_title"] = linked_course.get("title", "") if linked_course else ""
            c["member_count"] = await db.cohort_memberships.count_documents({"cohort_id": c["cohort_id"]})
            c["material_count"] = await db.materials.count_documents({"cohort_id": c["cohort_id"]})
        return cohorts

    @router.post("/cohorts")
    async def create_cohort(request: Request):
        await require_admin_editor(request)
        body = await request.json()
        cohort = {
            "cohort_id": f"coh_{uuid.uuid4().hex[:12]}",
            "program_id": body.get("program_id", ""),
            "course_id": body.get("course_id", ""),
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
        allowed = ("name", "program_id", "course_id", "start_date", "end_date", "active")
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
            m["participation_status"] = m.get("participation_status", "enrolled")
            installments = await db.payment_installments.find({"user_id": m["user_id"], "cohort_id": cohort_id}, {"_id": 0}).sort("due_date", 1).to_list(20)
            m["installments"] = installments
        return memberships

    @router.post("/cohorts/{cohort_id}/members")
    async def add_member(request: Request, cohort_id: str):
        user = await require_admin_editor(request)
        body = await request.json()
        user_id = body.get("user_id")
        role_in_cohort = body.get("role_in_cohort", "student")
        participation_status = body.get("participation_status", "enrolled")
        cohort = await db.cohorts.find_one({"cohort_id": cohort_id}, {"_id": 0})
        existing = await db.cohort_memberships.find_one({"cohort_id": cohort_id, "user_id": user_id})
        if existing:
            raise HTTPException(400, "Utente gia membro")
        await db.cohort_memberships.insert_one({
            "cohort_id": cohort_id, "user_id": user_id,
            "role_in_cohort": role_in_cohort,
            "participation_status": participation_status,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
        })
        if cohort and cohort.get("course_id"):
            await db.course_interest_status.delete_many({"course_id": cohort["course_id"], "user_id": user_id})
        await log_audit(user["user_id"], "add_cohort_member", {"cohort_id": cohort_id, "member": user_id})
        return {"ok": True}

    @router.put("/cohorts/{cohort_id}/members/{user_id}")
    async def update_member(request: Request, cohort_id: str, user_id: str):
        admin_user = await require_admin_editor(request)
        body = await request.json()
        cohort = await db.cohorts.find_one({"cohort_id": cohort_id}, {"_id": 0})
        updates = {
            k: v for k, v in body.items()
            if k in ("role_in_cohort", "participation_status")
        }
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.cohort_memberships.update_one({"cohort_id": cohort_id, "user_id": user_id}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(404, "Partecipante non trovato")
        if cohort and cohort.get("course_id"):
            await db.course_interest_status.delete_many({"course_id": cohort["course_id"], "user_id": user_id})
        await log_audit(admin_user["user_id"], "update_cohort_member", {"cohort_id": cohort_id, "member": user_id})
        membership = await db.cohort_memberships.find_one({"cohort_id": cohort_id, "user_id": user_id}, {"_id": 0})
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        membership["user_name"] = user_doc.get("name", "") if user_doc else ""
        membership["user_email"] = user_doc.get("email", "") if user_doc else ""
        membership["installments"] = await db.payment_installments.find({"user_id": user_id, "cohort_id": cohort_id}, {"_id": 0}).sort("due_date", 1).to_list(20)
        return membership

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
        await require_admin_editor(request)
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
        await require_admin_editor(request)
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
                {"course_id": "cat_cc2026", "category": "ariadne", "title": "Core Coaching Program 2026", "description": "Percorso base di coaching creativo-esperienziale riconosciuto ICF. 200 ore di formazione pratica.", "key_points": ["Fondamenti del coaching ICF", "Approccio creativo-esperienziale", "Supervisione e pratica", "Certificazione ICF ACC"], "order": 1},
                {"course_id": "cat_adv", "category": "ariadne", "title": "Advanced Coaching Lab", "description": "Laboratorio avanzato per coach certificati. Tecniche avanzate e specializzazioni per il livello PCC.", "key_points": ["Specializzazioni tematiche", "Supervisione avanzata", "Progettazione sessioni complesse", "Preparazione PCC"], "order": 2},
                {"course_id": "cat_mentor", "category": "ariadne", "title": "Mentoring per Coach", "description": "Percorso di mentoring individuale e di gruppo per lo sviluppo della pratica professionale.", "key_points": ["Sessioni individuali", "Gruppo di pari", "Feedback strutturato", "Ore ICF riconosciute"], "order": 3},
                {"course_id": "cat_team", "category": "ariadne", "title": "Team Coaching ICF", "description": "Modulo specialistico sul coaching di team e gruppi secondo le competenze ICF.", "key_points": ["Dinamiche di gruppo", "Facilitazione", "Co-creazione obiettivi team", "Competenze ICF team"], "order": 4},
                {"course_id": "cat_tec1", "category": "tecnica", "title": "Coaching con tecniche creative", "description": "Utilizzo di arte, movimento e metafore nel processo di coaching.", "key_points": ["Art-based coaching", "Movimento corporeo", "Metafore e storytelling", "Visualizzazione guidata"], "order": 20},
                {"course_id": "cat_tec2", "category": "tecnica", "title": "Coaching e Mindfulness", "description": "Integrazione di pratiche di mindfulness e presenza nel coaching.", "key_points": ["Meditazione per coach", "Ascolto consapevole", "Gestione dello stress", "Presenza nel processo"], "order": 21},
                {"course_id": "cat_tec3", "category": "tecnica", "title": "Assessment e strumenti diagnostici", "description": "Utilizzo di strumenti di assessment e diagnostica nel percorso di coaching.", "key_points": ["Test di personalita", "360 feedback", "Strumenti di autovalutazione", "Interpretazione risultati"], "order": 22},
                {"course_id": "cat_biz1", "category": "business", "title": "Business del Coach", "description": "Come avviare e gestire una pratica di coaching indipendente.", "key_points": ["Posizionamento", "Pricing", "Marketing etico", "Aspetti legali e fiscali"], "order": 30},
                {"course_id": "cat_biz2", "category": "business", "title": "Marketing per Coach", "description": "Strategie di comunicazione e acquisizione clienti per coach.", "key_points": ["Personal branding", "Social media", "Content strategy", "Networking"], "order": 31},
                {"course_id": "cat_biz3", "category": "business", "title": "Digital Presence", "description": "Costruire e gestire la propria presenza digitale professionale.", "key_points": ["Sito web", "LinkedIn strategy", "Newsletter", "SEO per coach"], "order": 32},
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

    @router.get("/training-courses")
    async def list_training_courses(request: Request):
        await get_current_user(request)
        return await _collect_training_courses()

    @router.get("/training-courses/{course_id}")
    async def get_training_course_detail(request: Request, course_id: str):
        user = await get_current_user(request)
        items = await _collect_training_courses()
        item = next((course for course in items if course["course_id"] == course_id), None)
        if not item:
            raise HTTPException(404, "Corso non trovato")
        item["current_user_status"] = await _get_current_user_course_status(course_id, user["user_id"])
        return item

    @router.get("/training-courses/{course_id}/admin-summary")
    async def get_training_course_admin_summary(request: Request, course_id: str):
        await require_admin_editor(request)
        return await _collect_course_admin_summary(course_id)

    @router.post("/training-courses/{course_id}/interest")
    async def save_training_course_interest(request: Request, course_id: str):
        user = await get_current_user(request)
        current_status = await _get_current_user_course_status(course_id, user["user_id"])
        if current_status in ("confirmed", "enrolled"):
            return {"status": current_status, "message": "Il tuo stato su questo percorso era gia aggiornato."}

        body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
        status = body.get("status", "interested")
        if status not in ("interested", "confirmed"):
            status = "interested"

        record = {
            "course_id": course_id,
            "user_id": user["user_id"],
            "status": status,
            "source": body.get("source", "course_page"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.course_interest_status.update_one(
            {"course_id": course_id, "user_id": user["user_id"]},
            {"$set": record, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        await log_audit(user["user_id"], "save_course_interest", {"course_id": course_id, "status": status})
        return {"status": status, "message": "Abbiamo registrato il tuo interesse per questo percorso."}

    @router.put("/training-courses/{course_id}/interest/{user_id}")
    async def update_training_course_interest(request: Request, course_id: str, user_id: str):
        admin_user = await require_admin_editor(request)
        body = await request.json()
        status = body.get("status", "interested")
        if status not in ("interested", "confirmed", "enrolled"):
            raise HTTPException(400, "Stato non valido")
        record = {
            "course_id": course_id,
            "user_id": user_id,
            "status": status,
            "source": "admin_course_detail",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.course_interest_status.update_one(
            {"course_id": course_id, "user_id": user_id},
            {"$set": record, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        await log_audit(admin_user["user_id"], "update_course_interest", {"course_id": course_id, "user_id": user_id, "status": status})
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        return {**record, "user_name": user_doc.get("name", "") if user_doc else "", "user_email": user_doc.get("email", "") if user_doc else ""}

    # ===== USER DETAILS (Billing/Profile) =====
    ALLOWED_DETAIL_FIELDS = {
        "first_name", "last_name", "birth_date", "birth_place",
        "fiscal_code", "vat_number", "address", "city", "zip_code",
        "province", "phone", "billing_name", "billing_type",
        "sdi_code", "pec",
    }

    @router.get("/user-details")
    async def get_user_details(request: Request):
        user = await get_current_user(request)
        details = await db.user_details.find_one({"user_id": user["user_id"]}, {"_id": 0})
        return details or {"user_id": user["user_id"]}

    @router.post("/user-details")
    async def save_user_details(request: Request):
        user = await get_current_user(request)
        body = await request.json()
        update_data = {"user_id": user["user_id"], "updated_at": datetime.now(timezone.utc).isoformat()}
        for field in ALLOWED_DETAIL_FIELDS:
            if field in body:
                update_data[field] = body[field]
        await db.user_details.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_data},
            upsert=True
        )
        return {"ok": True}

    # ===== ENROLLMENTS =====
    @router.post("/enrollments")
    async def create_enrollment(request: Request):
        user = await get_current_user(request)
        body = await request.json()
        course_id = body.get("course_id", "")
        if not course_id:
            raise HTTPException(400, "course_id obbligatorio")
        existing = await db.enrollments.find_one({"user_id": user["user_id"], "course_id": course_id, "status": {"$nin": ["completed", "cancelled"]}}, {"_id": 0})
        if existing:
            return existing
        enrollment = {
            "enrollment_id": f"enr_{uuid.uuid4().hex[:12]}",
            "user_id": user["user_id"],
            "course_id": course_id,
            "status": "in_progress",
            "current_step": 1,
            "motivation": "",
            "background": "",
            "referral_source": "",
            "referral_detail": "",
            "payment_plan": [],
            "contract_accepted": False,
            "contract_signed_at": "",
            "consents": {},
            "signature_text": "",
            "documents": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.enrollments.insert_one(enrollment)
        enrollment.pop("_id", None)
        await log_audit(user["user_id"], "create_enrollment", {"course_id": course_id, "enrollment_id": enrollment["enrollment_id"]})
        return enrollment

    @router.get("/enrollments/my")
    async def my_enrollments(request: Request):
        user = await get_current_user(request)
        enrollments = await db.enrollments.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
        for enr in enrollments:
            course = await db.course_catalog.find_one({"course_id": enr.get("course_id")}, {"_id": 0})
            if not course:
                course = await db.courses_events.find_one({"course_id": enr.get("course_id")}, {"_id": 0})
            enr["course_title"] = course.get("title", "") if course else ""
            enr["course_description"] = course.get("description", "") if course else ""
            cohort = await db.cohorts.find_one({"cohort_id": enr.get("cohort_id", "")}, {"_id": 0})
            enr["edition_name"] = cohort.get("name", "") if cohort else ""
            installments = await db.installments.find({"user_id": user["user_id"], "course_id": enr.get("course_id")}, {"_id": 0}).sort("due_date", 1).to_list(20)
            if not installments:
                installments = await db.payment_installments.find({"user_id": user["user_id"], "course_id": enr.get("course_id")}, {"_id": 0}).sort("due_date", 1).to_list(20)
            enr["installments"] = installments
        return enrollments

    @router.get("/enrollments/{enrollment_id}")
    async def get_enrollment(request: Request, enrollment_id: str):
        user = await get_current_user(request)
        query = {"enrollment_id": enrollment_id}
        if user.get("role") != "admin":
            query["user_id"] = user["user_id"]
        enrollment = await db.enrollments.find_one(query, {"_id": 0})
        if not enrollment:
            raise HTTPException(404, "Iscrizione non trovata")
        return enrollment

    @router.put("/enrollments/{enrollment_id}")
    async def update_enrollment(request: Request, enrollment_id: str):
        user = await get_current_user(request)
        body = await request.json()
        enrollment = await db.enrollments.find_one({"enrollment_id": enrollment_id, "user_id": user["user_id"]})
        if not enrollment:
            raise HTTPException(404, "Iscrizione non trovata")
        allowed = {"current_step", "motivation", "background", "referral_source", "referral_detail", "payment_plan", "status"}
        updates = {k: v for k, v in body.items() if k in allowed}
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.enrollments.update_one({"enrollment_id": enrollment_id}, {"$set": updates})
        return await db.enrollments.find_one({"enrollment_id": enrollment_id}, {"_id": 0})

    @router.post("/enrollments/{enrollment_id}/contract")
    async def save_enrollment_contract(request: Request, enrollment_id: str):
        user = await get_current_user(request)
        body = await request.json()
        enrollment = await db.enrollments.find_one({"enrollment_id": enrollment_id, "user_id": user["user_id"]})
        if not enrollment:
            raise HTTPException(404, "Iscrizione non trovata")
        contract_data = {
            "contract_accepted": True,
            "contract_signed_at": datetime.now(timezone.utc).isoformat(),
            "contract_ip": request.client.host if request.client else "",
            "contract_user_agent": request.headers.get("user-agent", ""),
            "consents": body.get("consents", {}),
            "signature_text": body.get("signature_text", ""),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.enrollments.update_one({"enrollment_id": enrollment_id}, {"$set": contract_data})
        await log_audit(user["user_id"], "sign_enrollment_contract", {"enrollment_id": enrollment_id})
        return {"ok": True}

    @router.post("/enrollments/{enrollment_id}/documents")
    async def upload_enrollment_document(request: Request, enrollment_id: str, file: UploadFile = File(...), doc_type: str = Form("identity")):
        user = await get_current_user(request)
        enrollment = await db.enrollments.find_one({"enrollment_id": enrollment_id, "user_id": user["user_id"]})
        if not enrollment:
            raise HTTPException(404, "Iscrizione non trovata")
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(400, "File troppo grande (max 10MB)")
        enr_upload_dir = UPLOAD_DIR / "enrollments"
        enr_upload_dir.mkdir(parents=True, exist_ok=True)
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = enr_upload_dir / filename
        async with aiofiles.open(filepath, "wb") as f:
            await f.write(content)
        doc_entry = {
            "doc_type": doc_type,
            "file_path": f"/api/uploads/enrollments/{filename}",
            "file_name": file.filename,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.enrollments.update_one(
            {"enrollment_id": enrollment_id},
            {"$push": {"documents": doc_entry}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"ok": True, "document": doc_entry}

    @router.post("/enrollments/{enrollment_id}/confirm")
    async def confirm_enrollment(request: Request, enrollment_id: str):
        user = await get_current_user(request)
        enrollment = await db.enrollments.find_one({"enrollment_id": enrollment_id, "user_id": user["user_id"]})
        if not enrollment:
            raise HTTPException(404, "Iscrizione non trovata")
        course_id = enrollment.get("course_id", "")
        payment_plan = enrollment.get("payment_plan", [])
        for i, item in enumerate(payment_plan):
            inst = {
                "installment_id": f"inst_{uuid.uuid4().hex[:12]}",
                "user_id": user["user_id"],
                "course_id": course_id,
                "enrollment_id": enrollment_id,
                "description": item.get("description", f"Rata {i + 1}"),
                "amount": float(item.get("amount", 0) or 0),
                "due_date": item.get("due_date", ""),
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.installments.insert_one(inst)
        now = datetime.now(timezone.utc).isoformat()
        await db.enrollments.update_one(
            {"enrollment_id": enrollment_id},
            {"$set": {"status": "confirmed", "confirmed_at": now, "current_step": 6, "updated_at": now}}
        )
        updated = await db.enrollments.find_one({"enrollment_id": enrollment_id}, {"_id": 0})
        await log_audit(user["user_id"], "confirm_enrollment", {"enrollment_id": enrollment_id, "course_id": course_id})
        return updated

    @router.get("/admin/enrollment-pipeline")
    async def admin_enrollment_pipeline(request: Request):
        await require_admin_editor(request)
        enrollments = await db.enrollments.find({"status": "in_progress"}, {"_id": 0}).sort("updated_at", -1).to_list(200)
        for enr in enrollments:
            user_doc = await db.users.find_one({"user_id": enr.get("user_id", "")}, {"_id": 0, "password_hash": 0})
            enr["user_name"] = user_doc.get("name", "") if user_doc else ""
            enr["user_email"] = user_doc.get("email", "") if user_doc else ""
            course = await db.course_catalog.find_one({"course_id": enr.get("course_id")}, {"_id": 0})
            if not course:
                course = await db.courses_events.find_one({"course_id": enr.get("course_id")}, {"_id": 0})
            if not course:
                course = await db.training_courses_cache.find_one({"course_id": enr.get("course_id")}, {"_id": 0})
            enr["course_title"] = course.get("title", "") if course else ""
        return enrollments

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
            course = await db.courses_events.find_one({"course_id": inst.get("course_id", "")}, {"_id": 0})
            cohort = await db.cohorts.find_one({"cohort_id": inst.get("cohort_id", "")}, {"_id": 0})
            inst["course_title"] = course.get("title", "") if course else ""
            inst["edition_name"] = cohort.get("name", "") if cohort else ""
            try:
                due_date = datetime.fromisoformat(inst.get("due_date", "")).date()
                inst["overdue"] = inst.get("status") != "paid" and due_date < datetime.now(timezone.utc).date()
            except Exception:
                inst["overdue"] = False
        return installments

    @router.get("/admin/payment-overview")
    async def admin_payment_overview(request: Request):
        await require_admin_editor(request)
        installments = await db.payment_installments.find({}, {"_id": 0}).sort("due_date", 1).to_list(500)
        pending_rows = []
        total_pending_amount = 0
        upcoming_amount = 0
        overdue_amount = 0
        people_with_due = set()
        today = datetime.now(timezone.utc).date()
        upcoming_limit = today + timedelta(days=30)

        for inst in installments:
            user_doc = await db.users.find_one({"user_id": inst.get("user_id", "")}, {"_id": 0, "password_hash": 0})
            course = await db.courses_events.find_one({"course_id": inst.get("course_id", "")}, {"_id": 0})
            cohort = await db.cohorts.find_one({"cohort_id": inst.get("cohort_id", "")}, {"_id": 0})
            row = {
                **inst,
                "user_name": user_doc.get("name", "") if user_doc else "",
                "user_email": user_doc.get("email", "") if user_doc else "",
                "course_title": course.get("title", "") if course else "",
                "edition_name": cohort.get("name", "") if cohort else "",
            }
            if inst.get("status") != "paid":
                people_with_due.add(inst.get("user_id", ""))
                total_pending_amount += float(inst.get("amount", 0) or 0)
                try:
                    due_date = datetime.fromisoformat(inst.get("due_date", "")).date()
                    row["overdue"] = due_date < today
                    if row["overdue"]:
                        overdue_amount += float(inst.get("amount", 0) or 0)
                    if today <= due_date <= upcoming_limit:
                        upcoming_amount += float(inst.get("amount", 0) or 0)
                except Exception:
                    row["overdue"] = False
                pending_rows.append(row)

        return {
            "summary": {
                "pending_count": len(pending_rows),
                "people_with_due": len([person for person in people_with_due if person]),
                "total_pending_amount": round(total_pending_amount, 2),
                "upcoming_amount_30d": round(upcoming_amount, 2),
                "overdue_amount": round(overdue_amount, 2),
            },
            "rows": pending_rows,
        }

    @router.post("/admin/installments")
    async def admin_create_installment(request: Request):
        await require_admin_editor(request)
        body = await request.json()
        inst = {
            "installment_id": f"inst_{uuid.uuid4().hex[:12]}",
            "user_id": body.get("user_id"),
            "course_id": body.get("course_id", ""),
            "cohort_id": body.get("cohort_id", ""),
            "description": body.get("description", ""),
            "amount": body.get("amount", 0),
            "due_date": body.get("due_date", ""),
            "status": body.get("status", "pending"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.payment_installments.insert_one(inst)
        inst.pop("_id", None)
        return inst

    @router.post("/admin/installments/bulk")
    async def admin_create_installments_bulk(request: Request):
        admin_user = await require_admin_editor(request)
        body = await request.json()
        course_id = body.get("course_id", "")
        cohort_id = body.get("cohort_id", "")
        plans = body.get("plans", [])
        replace_existing = bool(body.get("replace_existing", True))
        created_count = 0

        for plan in plans:
            user_id = plan.get("user_id", "")
            installments = plan.get("installments", [])
            if not user_id or not installments:
                continue
            if replace_existing:
                await db.payment_installments.delete_many({
                    "user_id": user_id,
                    "course_id": course_id,
                    "cohort_id": cohort_id,
                    "status": {"$ne": "paid"},
                })
            for item in installments:
                if not item.get("due_date"):
                    continue
                inst = {
                    "installment_id": f"inst_{uuid.uuid4().hex[:12]}",
                    "user_id": user_id,
                    "course_id": course_id,
                    "cohort_id": cohort_id,
                    "description": item.get("description", "Rata formazione"),
                    "amount": float(item.get("amount", 0) or 0),
                    "due_date": item.get("due_date", ""),
                    "status": item.get("status", "pending"),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "created_by": admin_user["user_id"],
                }
                await db.payment_installments.insert_one(inst)
                created_count += 1

        await log_audit(admin_user["user_id"], "bulk_create_installments", {"course_id": course_id, "cohort_id": cohort_id, "created_count": created_count})
        return {"ok": True, "created_count": created_count}

    @router.put("/admin/installments/{installment_id}")
    async def admin_update_installment(request: Request, installment_id: str):
        await require_admin_editor(request)
        body = await request.json()
        update = {k: v for k, v in body.items() if k in ("status", "amount", "due_date", "description", "notes", "course_id", "cohort_id")}
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
