"""
Test Phase 2 (School Operations - Inbox) and Phase 3 (Advanced Community) features
- Inbox: threads, routing rules, email templates, drafts, approval workflow
- School: programs, cohorts, members, materials, journey, assistant
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin token for authenticated requests"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@ariadne.training",
        "password": "admin123"
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture(scope="module")
def editor_token():
    """Get or create editor user and return token"""
    # Try to login first
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "arianna.perrone@ariadne.test",
        "password": "password123"
    })
    if res.status_code == 200:
        return res.json()["token"]
    # Register if not exists
    res = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": "arianna.perrone@ariadne.test",
        "password": "password123",
        "name": "Arianna Perrone Test"
    })
    assert res.status_code == 200, f"Editor registration failed: {res.text}"
    return res.json()["token"]

@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

@pytest.fixture
def editor_headers(editor_token):
    return {"Authorization": f"Bearer {editor_token}", "Content-Type": "application/json"}


# ==================== INBOX ROUTING RULES TESTS ====================
class TestInboxRules:
    """Test inbox routing rules CRUD"""
    
    def test_list_rules(self, admin_headers):
        """GET /api/inbox/rules returns seeded rules"""
        res = requests.get(f"{BASE_URL}/api/inbox/rules", headers=admin_headers)
        assert res.status_code == 200
        rules = res.json()
        assert isinstance(rules, list)
        # Should have seeded rules
        assert len(rules) >= 3, "Expected at least 3 seeded rules"
        
    def test_create_rule(self, admin_headers):
        """POST /api/inbox/rules creates new routing rule"""
        rule_data = {
            "name": f"TEST_rule_{uuid.uuid4().hex[:6]}",
            "enabled": True,
            "conditions": {
                "subject_keywords": ["test", "prova"],
                "body_keywords": ["verifica"],
                "from_contains": "@test.com"
            },
            "category": "supporto",
            "priority": 7,
            "sla_hours": 24,
            "assignee_user_id": "",
            "queue": "test_queue"
        }
        res = requests.post(f"{BASE_URL}/api/inbox/rules", headers=admin_headers, json=rule_data)
        assert res.status_code == 200
        created = res.json()
        assert created["name"] == rule_data["name"]
        assert created["category"] == "supporto"
        assert created["sla_hours"] == 24
        assert "rule_id" in created
        # Cleanup
        requests.delete(f"{BASE_URL}/api/inbox/rules/{created['rule_id']}", headers=admin_headers)
        
    def test_update_rule(self, admin_headers):
        """PUT /api/inbox/rules/{rule_id} updates rule"""
        # Create rule first
        res = requests.post(f"{BASE_URL}/api/inbox/rules", headers=admin_headers, json={
            "name": "TEST_update_rule",
            "enabled": True,
            "conditions": {},
            "category": "altro",
            "priority": 1
        })
        rule_id = res.json()["rule_id"]
        # Update
        res = requests.put(f"{BASE_URL}/api/inbox/rules/{rule_id}", headers=admin_headers, json={
            "name": "TEST_updated_rule",
            "enabled": False,
            "priority": 10
        })
        assert res.status_code == 200
        updated = res.json()
        assert updated["name"] == "TEST_updated_rule"
        assert updated["enabled"] == False
        assert updated["priority"] == 10
        # Cleanup
        requests.delete(f"{BASE_URL}/api/inbox/rules/{rule_id}", headers=admin_headers)
        
    def test_toggle_rule(self, admin_headers):
        """Rule toggle enabled/disabled works"""
        # Get existing rule
        res = requests.get(f"{BASE_URL}/api/inbox/rules", headers=admin_headers)
        rules = res.json()
        if rules:
            rule = rules[0]
            original_enabled = rule["enabled"]
            # Toggle
            res = requests.put(f"{BASE_URL}/api/inbox/rules/{rule['rule_id']}", headers=admin_headers, json={
                "enabled": not original_enabled
            })
            assert res.status_code == 200
            assert res.json()["enabled"] == (not original_enabled)
            # Restore
            requests.put(f"{BASE_URL}/api/inbox/rules/{rule['rule_id']}", headers=admin_headers, json={
                "enabled": original_enabled
            })

    def test_delete_rule(self, admin_headers):
        """DELETE /api/inbox/rules/{rule_id} deletes rule"""
        # Create rule
        res = requests.post(f"{BASE_URL}/api/inbox/rules", headers=admin_headers, json={
            "name": "TEST_delete_rule",
            "enabled": True,
            "conditions": {},
            "category": "altro"
        })
        rule_id = res.json()["rule_id"]
        # Delete
        res = requests.delete(f"{BASE_URL}/api/inbox/rules/{rule_id}", headers=admin_headers)
        assert res.status_code == 200
        assert res.json()["ok"] == True


# ==================== INBOX EMAIL TEMPLATES TESTS ====================
class TestInboxTemplates:
    """Test email templates CRUD"""
    
    def test_list_templates(self, admin_headers):
        """GET /api/inbox/templates returns seeded templates"""
        res = requests.get(f"{BASE_URL}/api/inbox/templates", headers=admin_headers)
        assert res.status_code == 200
        templates = res.json()
        assert isinstance(templates, list)
        assert len(templates) >= 3, "Expected at least 3 seeded templates"
        
    def test_create_template(self, admin_headers):
        """POST /api/inbox/templates creates new template"""
        template_data = {
            "name": f"TEST_template_{uuid.uuid4().hex[:6]}",
            "category": "info_corsi",
            "subject_template": "Re: Info su {{corso}}",
            "body_template": "Gentile {{nome}},\n\nGrazie per il tuo interesse.\n\nAriadne Training",
            "variables": ["nome", "corso"],
            "enabled": True
        }
        res = requests.post(f"{BASE_URL}/api/inbox/templates", headers=admin_headers, json=template_data)
        assert res.status_code == 200
        created = res.json()
        assert created["name"] == template_data["name"]
        assert created["category"] == "info_corsi"
        assert "{{corso}}" in created["subject_template"]
        assert "template_id" in created
        # Cleanup
        requests.delete(f"{BASE_URL}/api/inbox/templates/{created['template_id']}", headers=admin_headers)
        
    def test_update_template(self, admin_headers):
        """PUT /api/inbox/templates/{template_id} updates template"""
        # Create
        res = requests.post(f"{BASE_URL}/api/inbox/templates", headers=admin_headers, json={
            "name": "TEST_update_template",
            "category": "altro",
            "subject_template": "Original",
            "body_template": "Original body"
        })
        template_id = res.json()["template_id"]
        # Update
        res = requests.put(f"{BASE_URL}/api/inbox/templates/{template_id}", headers=admin_headers, json={
            "name": "TEST_updated_template",
            "subject_template": "Updated subject"
        })
        assert res.status_code == 200
        updated = res.json()
        assert updated["name"] == "TEST_updated_template"
        assert updated["subject_template"] == "Updated subject"
        # Cleanup
        requests.delete(f"{BASE_URL}/api/inbox/templates/{template_id}", headers=admin_headers)


# ==================== INBOX THREADS TESTS ====================
class TestInboxThreads:
    """Test inbox threads import, list, assign, status, archive"""
    
    def test_import_thread_with_auto_classification(self, admin_headers):
        """POST /api/inbox/threads/import creates thread with routing rule classification"""
        thread_data = {
            "subject": "Richiesta informazioni corso CCP TEST",
            "from_email": "test.user@gmail.com",
            "from_name": "Test User",
            "body_text": "Buongiorno, vorrei avere informazioni sui prossimi corsi di coaching. Grazie."
        }
        res = requests.post(f"{BASE_URL}/api/inbox/threads/import", headers=admin_headers, json=thread_data)
        assert res.status_code == 200
        thread = res.json()
        assert thread["subject"] == thread_data["subject"]
        assert thread["from_email"] == thread_data["from_email"]
        assert thread["status"] == "nuovo"
        assert "thread_id" in thread
        assert "category" in thread  # Should be auto-classified
        assert "sla_due_at" in thread
        return thread["thread_id"]
        
    def test_list_threads_all_views(self, admin_headers):
        """GET /api/inbox/threads returns threads with SLA info"""
        # Test all views
        for view in ["all", "mine", "unassigned", "approval"]:
            res = requests.get(f"{BASE_URL}/api/inbox/threads", headers=admin_headers, params={"view": view})
            assert res.status_code == 200
            threads = res.json()
            assert isinstance(threads, list)
            
    def test_get_thread_detail(self, admin_headers):
        """GET /api/inbox/threads/{id} returns thread + messages + draft"""
        # Import a thread first
        res = requests.post(f"{BASE_URL}/api/inbox/threads/import", headers=admin_headers, json={
            "subject": "TEST_detail_thread",
            "from_email": "detail@test.com",
            "body_text": "Test body for detail"
        })
        thread_id = res.json()["thread_id"]
        
        # Get detail
        res = requests.get(f"{BASE_URL}/api/inbox/threads/{thread_id}", headers=admin_headers)
        assert res.status_code == 200
        detail = res.json()
        assert "thread" in detail
        assert "messages" in detail
        assert "draft" in detail
        assert detail["thread"]["thread_id"] == thread_id
        assert len(detail["messages"]) >= 1  # Should have the imported message
        
    def test_assign_thread(self, admin_headers):
        """PUT /api/inbox/threads/{id}/assign assigns thread"""
        # Import thread
        res = requests.post(f"{BASE_URL}/api/inbox/threads/import", headers=admin_headers, json={
            "subject": "TEST_assign_thread",
            "from_email": "assign@test.com",
            "body_text": "Test body"
        })
        thread_id = res.json()["thread_id"]
        
        # Assign to admin
        res = requests.put(f"{BASE_URL}/api/inbox/threads/{thread_id}/assign", headers=admin_headers, json={
            "assigned_to": "user_admin"
        })
        assert res.status_code == 200
        assert res.json()["ok"] == True
        
        # Verify assignment
        res = requests.get(f"{BASE_URL}/api/inbox/threads/{thread_id}", headers=admin_headers)
        assert res.json()["thread"]["assigned_to"] == "user_admin"
        assert res.json()["thread"]["status"] == "in_lavorazione"
        
    def test_update_thread_status(self, admin_headers):
        """PUT /api/inbox/threads/{id}/status updates status"""
        # Import thread
        res = requests.post(f"{BASE_URL}/api/inbox/threads/import", headers=admin_headers, json={
            "subject": "TEST_status_thread",
            "from_email": "status@test.com",
            "body_text": "Test body"
        })
        thread_id = res.json()["thread_id"]
        
        # Update status
        res = requests.put(f"{BASE_URL}/api/inbox/threads/{thread_id}/status", headers=admin_headers, json={
            "status": "in_attesa"
        })
        assert res.status_code == 200
        
    def test_archive_thread(self, admin_headers):
        """POST /api/inbox/threads/{id}/archive archives thread"""
        # Import thread
        res = requests.post(f"{BASE_URL}/api/inbox/threads/import", headers=admin_headers, json={
            "subject": "TEST_archive_thread",
            "from_email": "archive@test.com",
            "body_text": "Test body"
        })
        thread_id = res.json()["thread_id"]
        
        # Archive
        res = requests.post(f"{BASE_URL}/api/inbox/threads/{thread_id}/archive", headers=admin_headers)
        assert res.status_code == 200
        
        # Verify archived
        res = requests.get(f"{BASE_URL}/api/inbox/threads/{thread_id}", headers=admin_headers)
        assert res.json()["thread"]["status"] == "archiviato"


# ==================== INBOX DRAFT & APPROVAL WORKFLOW TESTS ====================
class TestInboxDraftWorkflow:
    """Test draft generation, editing, submit for approval, and admin approval"""
    
    def test_generate_draft_ai(self, admin_headers):
        """POST /api/inbox/threads/{id}/draft/generate generates AI draft"""
        # Import thread
        res = requests.post(f"{BASE_URL}/api/inbox/threads/import", headers=admin_headers, json={
            "subject": "TEST_draft_gen_thread",
            "from_email": "draft@test.com",
            "body_text": "Vorrei informazioni sul corso CCP 2026"
        })
        thread_id = res.json()["thread_id"]
        
        # Generate draft (may return error if LLM key has no balance, but should still work functionally)
        res = requests.post(f"{BASE_URL}/api/inbox/threads/{thread_id}/draft/generate", headers=admin_headers, json={
            "template_id": ""
        })
        assert res.status_code == 200
        draft = res.json()
        assert "draft_id" in draft
        assert "subject" in draft
        assert "body" in draft
        assert draft["status"] == "draft"
        
    def test_update_draft(self, admin_headers):
        """PUT /api/inbox/threads/{id}/draft updates draft text"""
        # Import thread and generate draft
        res = requests.post(f"{BASE_URL}/api/inbox/threads/import", headers=admin_headers, json={
            "subject": "TEST_update_draft_thread",
            "from_email": "updatedraft@test.com",
            "body_text": "Test body"
        })
        thread_id = res.json()["thread_id"]
        res = requests.post(f"{BASE_URL}/api/inbox/threads/{thread_id}/draft/generate", headers=admin_headers, json={})
        
        # Update draft
        res = requests.put(f"{BASE_URL}/api/inbox/threads/{thread_id}/draft", headers=admin_headers, json={
            "subject": "Updated Subject TEST",
            "body": "Updated body content TEST"
        })
        assert res.status_code == 200
        
    def test_submit_for_approval(self, editor_headers, admin_headers):
        """POST /api/inbox/threads/{id}/draft/submit submits for approval"""
        # Import thread as editor
        res = requests.post(f"{BASE_URL}/api/inbox/threads/import", headers=editor_headers, json={
            "subject": "TEST_submit_approval_thread",
            "from_email": "submit@test.com",
            "body_text": "Test body for approval"
        })
        thread_id = res.json()["thread_id"]
        
        # Generate draft
        res = requests.post(f"{BASE_URL}/api/inbox/threads/{thread_id}/draft/generate", headers=editor_headers, json={})
        
        # Submit for approval
        res = requests.post(f"{BASE_URL}/api/inbox/threads/{thread_id}/draft/submit", headers=editor_headers)
        assert res.status_code == 200
        
        # Verify thread status changed
        res = requests.get(f"{BASE_URL}/api/inbox/threads/{thread_id}", headers=editor_headers)
        assert res.json()["thread"]["status"] == "in_approvazione"
        
    def test_approve_draft_admin_only(self, editor_headers, admin_headers):
        """POST /api/inbox/threads/{id}/draft/approve requires admin role"""
        # Import and submit as editor
        res = requests.post(f"{BASE_URL}/api/inbox/threads/import", headers=editor_headers, json={
            "subject": "TEST_approve_thread",
            "from_email": "approve@test.com",
            "body_text": "Test body"
        })
        thread_id = res.json()["thread_id"]
        requests.post(f"{BASE_URL}/api/inbox/threads/{thread_id}/draft/generate", headers=editor_headers, json={})
        requests.post(f"{BASE_URL}/api/inbox/threads/{thread_id}/draft/submit", headers=editor_headers)
        
        # Editor tries to approve - should fail
        res = requests.post(f"{BASE_URL}/api/inbox/threads/{thread_id}/draft/approve", headers=editor_headers)
        assert res.status_code == 403, "Editor should not be able to approve"
        
        # Admin approves
        res = requests.post(f"{BASE_URL}/api/inbox/threads/{thread_id}/draft/approve", headers=admin_headers)
        assert res.status_code == 200
        
        # Verify status changed to inviato
        res = requests.get(f"{BASE_URL}/api/inbox/threads/{thread_id}", headers=admin_headers)
        assert res.json()["thread"]["status"] == "inviato"


# ==================== SCHOOL PROGRAMS TESTS ====================
class TestSchoolPrograms:
    """Test programs CRUD"""
    
    def test_list_programs(self, admin_headers):
        """GET /api/school/programs returns programs"""
        res = requests.get(f"{BASE_URL}/api/school/programs", headers=admin_headers)
        assert res.status_code == 200
        programs = res.json()
        assert isinstance(programs, list)
        
    def test_create_program(self, admin_headers):
        """POST /api/school/programs creates program"""
        res = requests.post(f"{BASE_URL}/api/school/programs", headers=admin_headers, json={
            "name": f"TEST_program_{uuid.uuid4().hex[:6]}",
            "description": "Test program description",
            "active": True
        })
        assert res.status_code == 200
        program = res.json()
        assert "program_id" in program
        assert "TEST_program_" in program["name"]
        # Cleanup
        requests.delete(f"{BASE_URL}/api/school/programs/{program['program_id']}", headers=admin_headers)
        
    def test_update_program(self, admin_headers):
        """PUT /api/school/programs/{id} updates program"""
        # Create
        res = requests.post(f"{BASE_URL}/api/school/programs", headers=admin_headers, json={
            "name": "TEST_update_program",
            "description": "Original",
            "active": True
        })
        program_id = res.json()["program_id"]
        
        # Update
        res = requests.put(f"{BASE_URL}/api/school/programs/{program_id}", headers=admin_headers, json={
            "name": "TEST_updated_program",
            "description": "Updated description"
        })
        assert res.status_code == 200
        assert res.json()["name"] == "TEST_updated_program"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/school/programs/{program_id}", headers=admin_headers)


# ==================== SCHOOL COHORTS TESTS ====================
class TestSchoolCohorts:
    """Test cohorts CRUD with enrichment"""
    
    @pytest.fixture
    def test_program(self, admin_headers):
        """Create a test program for cohort tests"""
        res = requests.post(f"{BASE_URL}/api/school/programs", headers=admin_headers, json={
            "name": "TEST_cohort_program",
            "description": "For cohort tests",
            "active": True
        })
        program = res.json()
        yield program
        # Cleanup
        requests.delete(f"{BASE_URL}/api/school/programs/{program['program_id']}", headers=admin_headers)
    
    def test_list_cohorts_with_enrichment(self, admin_headers):
        """GET /api/school/cohorts returns cohorts with program_name, member_count, material_count"""
        res = requests.get(f"{BASE_URL}/api/school/cohorts", headers=admin_headers)
        assert res.status_code == 200
        cohorts = res.json()
        assert isinstance(cohorts, list)
        # If there are cohorts, verify enrichment fields
        for cohort in cohorts:
            assert "program_name" in cohort or "program_id" in cohort
            assert "member_count" in cohort
            assert "material_count" in cohort
            
    def test_create_cohort(self, admin_headers, test_program):
        """POST /api/school/cohorts creates cohort"""
        res = requests.post(f"{BASE_URL}/api/school/cohorts", headers=admin_headers, json={
            "program_id": test_program["program_id"],
            "name": "TEST_cohort_2026",
            "start_date": "2026-03-01",
            "end_date": "2026-06-30",
            "active": True
        })
        assert res.status_code == 200
        cohort = res.json()
        assert "cohort_id" in cohort
        assert cohort["name"] == "TEST_cohort_2026"
        # Cleanup
        requests.delete(f"{BASE_URL}/api/school/cohorts/{cohort['cohort_id']}", headers=admin_headers)


# ==================== SCHOOL MEMBERS TESTS ====================
class TestSchoolMembers:
    """Test cohort membership management"""
    
    @pytest.fixture
    def test_cohort(self, admin_headers):
        """Create test program and cohort"""
        # Create program
        prog_res = requests.post(f"{BASE_URL}/api/school/programs", headers=admin_headers, json={
            "name": "TEST_member_program",
            "active": True
        })
        program = prog_res.json()
        
        # Create cohort
        coh_res = requests.post(f"{BASE_URL}/api/school/cohorts", headers=admin_headers, json={
            "program_id": program["program_id"],
            "name": "TEST_member_cohort",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31"
        })
        cohort = coh_res.json()
        
        yield {"program": program, "cohort": cohort}
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/school/cohorts/{cohort['cohort_id']}", headers=admin_headers)
        requests.delete(f"{BASE_URL}/api/school/programs/{program['program_id']}", headers=admin_headers)
    
    def test_list_members(self, admin_headers, test_cohort):
        """GET /api/school/cohorts/{id}/members returns members with user info"""
        cohort_id = test_cohort["cohort"]["cohort_id"]
        res = requests.get(f"{BASE_URL}/api/school/cohorts/{cohort_id}/members", headers=admin_headers)
        assert res.status_code == 200
        members = res.json()
        assert isinstance(members, list)
        
    def test_add_member(self, admin_headers, test_cohort):
        """POST /api/school/cohorts/{id}/members adds member"""
        cohort_id = test_cohort["cohort"]["cohort_id"]
        res = requests.post(f"{BASE_URL}/api/school/cohorts/{cohort_id}/members", headers=admin_headers, json={
            "user_id": "user_admin",
            "role_in_cohort": "student"
        })
        assert res.status_code == 200
        assert res.json()["ok"] == True
        
        # Verify member added
        res = requests.get(f"{BASE_URL}/api/school/cohorts/{cohort_id}/members", headers=admin_headers)
        members = res.json()
        assert any(m["user_id"] == "user_admin" for m in members)
        
    def test_add_duplicate_member_fails(self, admin_headers, test_cohort):
        """Adding same user twice should fail"""
        cohort_id = test_cohort["cohort"]["cohort_id"]
        # Add first time
        requests.post(f"{BASE_URL}/api/school/cohorts/{cohort_id}/members", headers=admin_headers, json={
            "user_id": "user_admin"
        })
        # Add again - should fail
        res = requests.post(f"{BASE_URL}/api/school/cohorts/{cohort_id}/members", headers=admin_headers, json={
            "user_id": "user_admin"
        })
        assert res.status_code == 400
        
    def test_remove_member(self, admin_headers, test_cohort):
        """DELETE /api/school/cohorts/{id}/members/{user_id} removes member"""
        cohort_id = test_cohort["cohort"]["cohort_id"]
        # Add member first
        requests.post(f"{BASE_URL}/api/school/cohorts/{cohort_id}/members", headers=admin_headers, json={
            "user_id": "user_admin"
        })
        # Remove
        res = requests.delete(f"{BASE_URL}/api/school/cohorts/{cohort_id}/members/user_admin", headers=admin_headers)
        assert res.status_code == 200


# ==================== SCHOOL MATERIALS TESTS ====================
class TestSchoolMaterials:
    """Test materials access control"""
    
    def test_list_materials_admin(self, admin_headers):
        """GET /api/school/materials returns all materials for admin"""
        res = requests.get(f"{BASE_URL}/api/school/materials", headers=admin_headers)
        assert res.status_code == 200
        materials = res.json()
        assert isinstance(materials, list)
        # Materials should have enrichment fields
        for mat in materials:
            if mat:
                assert "cohort_name" in mat or mat.get("cohort_id") == ""


# ==================== SCHOOL JOURNEY TESTS ====================
class TestSchoolJourney:
    """Test journey templates and progress"""
    
    def test_list_journey_templates(self, admin_headers):
        """GET /api/school/journey/templates returns seeded templates"""
        res = requests.get(f"{BASE_URL}/api/school/journey/templates", headers=admin_headers)
        assert res.status_code == 200
        templates = res.json()
        assert isinstance(templates, list)
        assert len(templates) >= 3, "Expected 3 seeded journey templates (formazione, credenziale, business)"
        
        # Verify template structure
        types_found = set()
        for tmpl in templates:
            types_found.add(tmpl["type"])
            assert "steps" in tmpl
            assert len(tmpl["steps"]) > 0
            
        assert "formazione" in types_found
        assert "credenziale" in types_found
        assert "business" in types_found
        
    def test_journey_progress_with_templates(self, admin_headers):
        """GET /api/school/journey/progress returns templates with user progress"""
        res = requests.get(f"{BASE_URL}/api/school/journey/progress", headers=admin_headers)
        assert res.status_code == 200
        progress = res.json()
        assert isinstance(progress, list)
        
        # Each template should have steps with status
        for tmpl in progress:
            for step in tmpl.get("steps", []):
                assert "status" in step
                assert step["status"] in ["todo", "in_progress", "done"]
                
    def test_update_step_progress(self, admin_headers):
        """PUT /api/school/journey/progress/{step_id} updates progress"""
        # Get a step_id from templates
        res = requests.get(f"{BASE_URL}/api/school/journey/progress", headers=admin_headers)
        templates = res.json()
        
        # Find an editable step
        step_id = None
        for tmpl in templates:
            for step in tmpl.get("steps", []):
                if step.get("editable_by_user"):
                    step_id = step["step_id"]
                    break
            if step_id:
                break
                
        if step_id:
            # Update progress
            res = requests.put(f"{BASE_URL}/api/school/journey/progress/{step_id}", headers=admin_headers, json={
                "status": "in_progress",
                "value": "10",
                "notes": "TEST progress update"
            })
            assert res.status_code == 200
            assert res.json()["ok"] == True


# ==================== SCHOOL ASSISTANT TESTS ====================
class TestSchoolAssistant:
    """Test AI assistant chat"""
    
    def test_assistant_query(self, admin_headers):
        """POST /api/school/assistant/query returns AI answer"""
        res = requests.post(f"{BASE_URL}/api/school/assistant/query", headers=admin_headers, json={
            "question": "Quali sono i prossimi corsi disponibili?"
        })
        assert res.status_code == 200
        response = res.json()
        assert "answer" in response
        assert "sources_used" in response
        assert isinstance(response["answer"], str)
        assert len(response["answer"]) > 0
        
    def test_assistant_query_empty_fails(self, admin_headers):
        """POST /api/school/assistant/query with empty question fails"""
        res = requests.post(f"{BASE_URL}/api/school/assistant/query", headers=admin_headers, json={
            "question": ""
        })
        assert res.status_code == 400


# ==================== ACCESS CONTROL TESTS ====================
class TestAccessControl:
    """Test that inbox/school endpoints require proper roles"""
    
    @pytest.fixture
    def regular_user_token(self):
        """Create a regular user (role=user)"""
        email = f"test_regular_{uuid.uuid4().hex[:6]}@test.com"
        res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "password123",
            "name": "Test Regular User"
        })
        if res.status_code == 200:
            return res.json()["token"]
        return None
    
    def test_inbox_requires_admin_editor(self, regular_user_token):
        """Regular users cannot access inbox endpoints"""
        if not regular_user_token:
            pytest.skip("Could not create regular user")
        headers = {"Authorization": f"Bearer {regular_user_token}", "Content-Type": "application/json"}
        
        # Try to list threads
        res = requests.get(f"{BASE_URL}/api/inbox/threads", headers=headers)
        assert res.status_code == 403, "Regular user should not access inbox"
        
    def test_programs_readable_by_all(self, regular_user_token):
        """Programs list is readable by all authenticated users"""
        if not regular_user_token:
            pytest.skip("Could not create regular user")
        headers = {"Authorization": f"Bearer {regular_user_token}", "Content-Type": "application/json"}
        
        # Should be able to read programs
        res = requests.get(f"{BASE_URL}/api/school/programs", headers=headers)
        assert res.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
