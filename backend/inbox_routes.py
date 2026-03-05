from fastapi import APIRouter, HTTPException, Request
import uuid, os
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

THREAD_STATUSES = ['nuovo', 'in_lavorazione', 'in_attesa', 'in_approvazione', 'inviato', 'archiviato']
CATEGORIES = ['info_corsi', 'iscrizione', 'collaborazione', 'richiesta_call', 'supporto', 'altro']


def create_inbox_router(db, get_current_user, log_audit):
    router = APIRouter(prefix="/api/inbox")

    async def require_admin_editor(request):
        user = await get_current_user(request)
        if user["role"] not in ("admin", "editor"):
            raise HTTPException(403, "Non autorizzato")
        return user

    def apply_rules(rules, subject, body, from_email):
        for r in sorted(rules, key=lambda x: x.get("priority", 0), reverse=True):
            if not r.get("enabled"):
                continue
            conds = r.get("conditions", {})
            match = True
            subj_kw = conds.get("subject_keywords", [])
            if subj_kw and not any(kw.lower() in subject.lower() for kw in subj_kw):
                match = False
            body_kw = conds.get("body_keywords", [])
            if body_kw and not any(kw.lower() in body.lower() for kw in body_kw):
                match = False
            from_c = conds.get("from_contains", "")
            if from_c and from_c.lower() not in from_email.lower():
                match = False
            if match:
                return r
        return None

    # ===== THREADS =====
    @router.get("/threads")
    async def list_threads(request: Request, view: str = "all", category: str = "", status: str = ""):
        user = await require_admin_editor(request)
        query = {}
        if view == "mine":
            query["assigned_to"] = user["user_id"]
        elif view == "unassigned":
            query["$or"] = [{"assigned_to": ""}, {"assigned_to": None}]
        elif view == "approval":
            query["status"] = "in_approvazione"
        if category:
            query["category"] = category
        if status:
            query["status"] = status
        threads = await db.inbox_threads.find(query, {"_id": 0}).sort("last_message_at", -1).to_list(200)
        # Enrich with assignee name
        for t in threads:
            if t.get("assigned_to"):
                assignee = await db.users.find_one({"user_id": t["assigned_to"]}, {"_id": 0, "password_hash": 0})
                t["assignee_name"] = assignee.get("name", "") if assignee else ""
            # Check SLA
            if t.get("sla_due_at"):
                due = datetime.fromisoformat(t["sla_due_at"])
                if due.tzinfo is None:
                    due = due.replace(tzinfo=timezone.utc)
                now = datetime.now(timezone.utc)
                t["sla_overdue"] = now > due
                t["sla_hours_left"] = max(0, (due - now).total_seconds() / 3600)
        return threads

    @router.get("/threads/{thread_id}")
    async def get_thread(request: Request, thread_id: str):
        await require_admin_editor(request)
        thread = await db.inbox_threads.find_one({"thread_id": thread_id}, {"_id": 0})
        if not thread:
            raise HTTPException(404, "Thread non trovato")
        messages = await db.inbox_messages.find({"thread_id": thread_id}, {"_id": 0}).sort("received_at", 1).to_list(100)
        draft = await db.inbox_drafts.find_one({"thread_id": thread_id, "status": {"$ne": "sent"}}, {"_id": 0})
        return {"thread": thread, "messages": messages, "draft": draft}

    @router.post("/threads/import")
    async def import_thread(request: Request):
        user = await require_admin_editor(request)
        body = await request.json()
        subject = body.get("subject", "").strip()
        from_email = body.get("from_email", "").strip()
        from_name = body.get("from_name", "").strip()
        body_text = body.get("body_text", "").strip()
        received_at = body.get("received_at", datetime.now(timezone.utc).isoformat())
        if not subject or not body_text:
            raise HTTPException(400, "Oggetto e testo obbligatori")

        # Apply routing rules
        rules = await db.inbox_rules.find({"enabled": True}, {"_id": 0}).to_list(50)
        matched_rule = apply_rules(rules, subject, body_text, from_email)

        thread_id = f"thr_{uuid.uuid4().hex[:12]}"
        category = matched_rule["category"] if matched_rule else "altro"
        sla_hours = matched_rule.get("sla_hours", 48) if matched_rule else 48
        sla_due = (datetime.now(timezone.utc) + timedelta(hours=sla_hours)).isoformat()

        thread = {
            "thread_id": thread_id,
            "subject": subject,
            "from_email": from_email,
            "from_name": from_name,
            "category": category,
            "status": "nuovo",
            "assigned_to": matched_rule.get("assignee_user_id", "") if matched_rule else "",
            "queue": matched_rule.get("queue", "") if matched_rule else "",
            "priority": matched_rule.get("priority", "media") if matched_rule else "media",
            "sla_due_at": sla_due,
            "last_message_at": received_at,
            "import_mode": "manual",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.inbox_threads.insert_one(thread)
        thread.pop("_id", None)

        msg = {
            "message_id": f"msg_{uuid.uuid4().hex[:12]}",
            "thread_id": thread_id,
            "body_text": body_text,
            "snippet": body_text[:200],
            "from_email": from_email,
            "to_email": "",
            "direction": "inbound",
            "received_at": received_at,
        }
        await db.inbox_messages.insert_one(msg)

        await log_audit(user["user_id"], "import_thread", {"thread_id": thread_id, "rule_matched": matched_rule["name"] if matched_rule else None})
        return thread

    @router.put("/threads/{thread_id}/status")
    async def update_thread_status(request: Request, thread_id: str):
        user = await require_admin_editor(request)
        body = await request.json()
        new_status = body.get("status")
        if new_status not in THREAD_STATUSES:
            raise HTTPException(400, f"Stato non valido. Validi: {THREAD_STATUSES}")
        await db.inbox_threads.update_one({"thread_id": thread_id}, {"$set": {"status": new_status}})
        await log_audit(user["user_id"], "update_thread_status", {"thread_id": thread_id, "status": new_status})
        return {"ok": True}

    @router.put("/threads/{thread_id}/assign")
    async def assign_thread(request: Request, thread_id: str):
        user = await require_admin_editor(request)
        body = await request.json()
        assignee = body.get("assigned_to", "")
        await db.inbox_threads.update_one({"thread_id": thread_id}, {"$set": {"assigned_to": assignee, "status": "in_lavorazione"}})
        await log_audit(user["user_id"], "assign_thread", {"thread_id": thread_id, "assigned_to": assignee})
        return {"ok": True}

    @router.post("/threads/{thread_id}/archive")
    async def archive_thread(request: Request, thread_id: str):
        user = await require_admin_editor(request)
        await db.inbox_threads.update_one({"thread_id": thread_id}, {"$set": {"status": "archiviato"}})
        await log_audit(user["user_id"], "archive_thread", {"thread_id": thread_id})
        return {"ok": True}

    # ===== DRAFTS =====
    @router.post("/threads/{thread_id}/draft/generate")
    async def generate_draft(request: Request, thread_id: str):
        user = await require_admin_editor(request)
        body = await request.json()
        template_id = body.get("template_id", "")

        thread = await db.inbox_threads.find_one({"thread_id": thread_id}, {"_id": 0})
        if not thread:
            raise HTTPException(404, "Thread non trovato")
        messages = await db.inbox_messages.find({"thread_id": thread_id}, {"_id": 0}).sort("received_at", 1).to_list(50)
        conversation = "\n---\n".join([f"Da: {m['from_email']}\n{m['body_text']}" for m in messages])

        # Get template if specified
        template_text = ""
        if template_id:
            tmpl = await db.inbox_templates.find_one({"template_id": template_id}, {"_id": 0})
            if tmpl:
                template_text = f"Template da seguire:\nOggetto: {tmpl['subject_template']}\nCorpo: {tmpl['body_template']}\nVariabili: {', '.join(tmpl.get('variables', []))}"

        # Get repository context
        repo_context = ""
        repo_files = await db.repository_files.find({}, {"_id": 0, "content": 1, "category": 1}).to_list(20)
        if repo_files:
            repo_context = "\n".join([f"[{f.get('category', '')}] {f.get('content', '')[:500]}" for f in repo_files])

        # Get courses info
        courses = await db.courses_events.find({}, {"_id": 0}).to_list(20)
        courses_info = "\n".join([f"- {c['title']} ({c.get('type', '')}, date: {', '.join([d['date'] for d in c.get('dates', [])])})" for c in courses])

        system_msg = """Sei l'assistente email di Ariadne Training, scuola di coaching creativo-esperienziale.
Scrivi bozze email professionali, calde e precise. Regole:
- Lingua: italiano corretto
- Tono: professionale ma accogliente, stile Ariadne
- NON inventare informazioni (prezzi, date, luoghi) se non fornite
- Se mancano dati critici, inserisci [DATO MANCANTE: descrizione]
- Firma con il nome della scuola
- Sii conciso e chiaro

Se ci sono rischi o informazioni mancanti, aggiungile in una sezione "NOTE DI ATTENZIONE:" alla fine."""

        user_msg = f"""Genera una bozza di risposta per questo thread email.

CONVERSAZIONE:
{conversation}

CATEGORIA: {thread.get('category', 'altro')}

{template_text}

INFORMAZIONI CORSI ARIADNE:
{courses_info}

{f'CONTESTO REPOSITORY: {repo_context[:2000]}' if repo_context else ''}

Rispondi con formato:
OGGETTO: [oggetto della risposta]
---
[corpo della email]
---
NOTE DI ATTENZIONE: [eventuali note, oppure "Nessuna"]"""

        try:
            chat = LlmChat(
                api_key=EMERGENT_KEY,
                session_id=f"ariadne-draft-{uuid.uuid4().hex[:8]}",
                system_message=system_msg
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            response = await chat.send_message(UserMessage(text=user_msg))

            # Parse response
            lines = response.strip().split("\n")
            subject_line = ""
            body_lines = []
            notes = ""
            section = "subject"
            for line in lines:
                if line.strip().startswith("OGGETTO:"):
                    subject_line = line.replace("OGGETTO:", "").strip()
                elif line.strip() == "---":
                    if section == "subject":
                        section = "body"
                    elif section == "body":
                        section = "notes"
                elif section == "body":
                    body_lines.append(line)
                elif section == "notes":
                    if line.strip().startswith("NOTE DI ATTENZIONE:"):
                        notes = line.replace("NOTE DI ATTENZIONE:", "").strip()
                    else:
                        notes += " " + line.strip()

            draft_body = "\n".join(body_lines).strip()
            if not subject_line:
                subject_line = f"Re: {thread['subject']}"
            if not draft_body:
                draft_body = response

        except Exception as e:
            subject_line = f"Re: {thread['subject']}"
            draft_body = f"[Errore generazione AI: {str(e)}]\n\nBozza manuale necessaria."
            notes = f"Errore AI: {str(e)}"

        draft = {
            "draft_id": f"drf_{uuid.uuid4().hex[:12]}",
            "thread_id": thread_id,
            "created_by": user["user_id"],
            "subject": subject_line,
            "body": draft_body,
            "template_id": template_id,
            "status": "draft",
            "ai_notes": notes.strip() if notes else "Nessuna",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Upsert - replace existing draft for this thread
        await db.inbox_drafts.delete_many({"thread_id": thread_id, "status": "draft"})
        await db.inbox_drafts.insert_one(draft)
        draft.pop("_id", None)

        await db.inbox_threads.update_one({"thread_id": thread_id}, {"$set": {"status": "in_lavorazione"}})
        await log_audit(user["user_id"], "generate_draft", {"thread_id": thread_id, "draft_id": draft["draft_id"]})
        return draft

    @router.put("/threads/{thread_id}/draft")
    async def update_draft(request: Request, thread_id: str):
        user = await require_admin_editor(request)
        body = await request.json()
        updates = {}
        if "subject" in body:
            updates["subject"] = body["subject"]
        if "body" in body:
            updates["body"] = body["body"]
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.inbox_drafts.update_one({"thread_id": thread_id, "status": {"$in": ["draft", "pending_approval"]}}, {"$set": updates})
        return {"ok": True}

    @router.post("/threads/{thread_id}/draft/submit")
    async def submit_draft_for_approval(request: Request, thread_id: str):
        user = await require_admin_editor(request)
        await db.inbox_drafts.update_one({"thread_id": thread_id, "status": "draft"}, {"$set": {"status": "pending_approval", "updated_at": datetime.now(timezone.utc).isoformat()}})
        await db.inbox_threads.update_one({"thread_id": thread_id}, {"$set": {"status": "in_approvazione"}})
        await log_audit(user["user_id"], "submit_draft", {"thread_id": thread_id})
        return {"ok": True}

    @router.post("/threads/{thread_id}/draft/approve")
    async def approve_draft(request: Request, thread_id: str):
        user = await require_admin_editor(request)
        if user["role"] != "admin":
            raise HTTPException(403, "Solo admin puo approvare")
        draft = await db.inbox_drafts.find_one({"thread_id": thread_id, "status": "pending_approval"}, {"_id": 0})
        if not draft:
            raise HTTPException(404, "Nessuna bozza in approvazione")
        await db.inbox_drafts.update_one({"draft_id": draft["draft_id"]}, {"$set": {"status": "approved", "updated_at": datetime.now(timezone.utc).isoformat()}})
        await db.inbox_threads.update_one({"thread_id": thread_id}, {"$set": {"status": "inviato"}})
        # Save as outbound message
        await db.inbox_messages.insert_one({
            "message_id": f"msg_{uuid.uuid4().hex[:12]}",
            "thread_id": thread_id,
            "body_text": draft["body"],
            "snippet": draft["body"][:200],
            "from_email": "ariadne@ariadne.training",
            "to_email": "",
            "direction": "outbound",
            "received_at": datetime.now(timezone.utc).isoformat(),
        })
        await log_audit(user["user_id"], "approve_draft", {"thread_id": thread_id, "draft_id": draft["draft_id"]})
        return {"ok": True}

    # ===== ROUTING RULES =====
    @router.get("/rules")
    async def list_rules(request: Request):
        await require_admin_editor(request)
        return await db.inbox_rules.find({}, {"_id": 0}).sort("priority", -1).to_list(50)

    @router.post("/rules")
    async def create_rule(request: Request):
        user = await require_admin_editor(request)
        body = await request.json()
        rule = {
            "rule_id": f"irl_{uuid.uuid4().hex[:12]}",
            "name": body.get("name", ""),
            "enabled": body.get("enabled", True),
            "conditions": body.get("conditions", {}),
            "category": body.get("category", "altro"),
            "priority": body.get("priority", 0),
            "sla_hours": body.get("sla_hours", 48),
            "assignee_user_id": body.get("assignee_user_id", ""),
            "queue": body.get("queue", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.inbox_rules.insert_one(rule)
        await log_audit(user["user_id"], "create_inbox_rule", {"rule_id": rule["rule_id"]})
        return await db.inbox_rules.find_one({"rule_id": rule["rule_id"]}, {"_id": 0})

    @router.put("/rules/{rule_id}")
    async def update_rule(request: Request, rule_id: str):
        user = await require_admin_editor(request)
        body = await request.json()
        allowed = ("name", "enabled", "conditions", "category", "priority", "sla_hours", "assignee_user_id", "queue")
        updates = {k: v for k, v in body.items() if k in allowed}
        await db.inbox_rules.update_one({"rule_id": rule_id}, {"$set": updates})
        return await db.inbox_rules.find_one({"rule_id": rule_id}, {"_id": 0})

    @router.delete("/rules/{rule_id}")
    async def delete_rule(request: Request, rule_id: str):
        user = await require_admin_editor(request)
        await db.inbox_rules.delete_one({"rule_id": rule_id})
        return {"ok": True}

    # ===== EMAIL TEMPLATES =====
    @router.get("/templates")
    async def list_templates(request: Request):
        await require_admin_editor(request)
        return await db.inbox_templates.find({}, {"_id": 0}).sort("category", 1).to_list(50)

    @router.post("/templates")
    async def create_template(request: Request):
        user = await require_admin_editor(request)
        body = await request.json()
        tmpl = {
            "template_id": f"etpl_{uuid.uuid4().hex[:12]}",
            "name": body.get("name", ""),
            "category": body.get("category", "altro"),
            "subject_template": body.get("subject_template", ""),
            "body_template": body.get("body_template", ""),
            "variables": body.get("variables", []),
            "enabled": body.get("enabled", True),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.inbox_templates.insert_one(tmpl)
        return await db.inbox_templates.find_one({"template_id": tmpl["template_id"]}, {"_id": 0})

    @router.put("/templates/{template_id}")
    async def update_template(request: Request, template_id: str):
        await require_admin_editor(request)
        body = await request.json()
        allowed = ("name", "category", "subject_template", "body_template", "variables", "enabled")
        updates = {k: v for k, v in body.items() if k in allowed}
        await db.inbox_templates.update_one({"template_id": template_id}, {"$set": updates})
        return await db.inbox_templates.find_one({"template_id": template_id}, {"_id": 0})

    @router.delete("/templates/{template_id}")
    async def delete_template(request: Request, template_id: str):
        await require_admin_editor(request)
        await db.inbox_templates.delete_one({"template_id": template_id})
        return {"ok": True}

    # ===== GMAIL STATUS (placeholder) =====
    @router.get("/gmail-status")
    async def gmail_status(request: Request):
        await require_admin_editor(request)
        return {"connected": False, "mode": "manual", "message": "Modalita manuale attiva. Importa i thread manualmente."}

    return router
