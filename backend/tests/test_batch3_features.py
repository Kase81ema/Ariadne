"""
Backend Tests for Ariadne Editorial Studio - Batch 3 Features
Tests: async job system, course catalog, user details, payment installments, community members
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_auth():
    """Get admin authentication token."""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@ariadne.training", "password": "admin123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return {"Authorization": f"Bearer {r.json()['token']}"}


class TestAuth:
    """Test authentication endpoints."""
    
    def test_login_admin(self):
        """Test admin login returns token and user info."""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@ariadne.training", "password": "admin123"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@ariadne.training"
        assert data["user"]["role"] == "admin"
    
    def test_register_email_only(self):
        """Test simplified registration with only email (generates password)."""
        import uuid
        test_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={"email": test_email})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert "generated_password" in data  # Password should be auto-generated
        assert len(data["generated_password"]) >= 8


class TestAsyncJobSystem:
    """Test async text generation job system."""
    
    def test_start_texts_job(self, admin_auth):
        """Test starting an async text generation job."""
        # First create a campaign
        campaign_data = {"title": "TEST_Job_Campaign", "type": "editorial", "profiles": []}
        r = requests.post(f"{BASE_URL}/api/campaigns", json=campaign_data, headers=admin_auth)
        assert r.status_code == 200
        campaign_id = r.json()["campaign_id"]
        
        # Start async job
        r = requests.post(f"{BASE_URL}/api/generate/texts-job", json={"campaign_id": campaign_id, "post_ids": [], "active_agents": []}, headers=admin_auth)
        assert r.status_code == 200
        data = r.json()
        assert "job_id" in data
        job_id = data["job_id"]
        assert job_id.startswith("job_")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/campaigns/{campaign_id}", headers=admin_auth)
        return job_id
    
    def test_poll_job_status(self, admin_auth):
        """Test polling job status."""
        # Create campaign and start job
        campaign_data = {"title": "TEST_Poll_Campaign", "type": "editorial"}
        r = requests.post(f"{BASE_URL}/api/campaigns", json=campaign_data, headers=admin_auth)
        campaign_id = r.json()["campaign_id"]
        
        r = requests.post(f"{BASE_URL}/api/generate/texts-job", json={"campaign_id": campaign_id, "post_ids": [], "active_agents": []}, headers=admin_auth)
        job_id = r.json()["job_id"]
        
        # Poll status
        r = requests.get(f"{BASE_URL}/api/generate/texts-job/{job_id}", headers=admin_auth)
        assert r.status_code == 200
        data = r.json()
        assert "status" in data
        assert "total" in data
        assert "current" in data
        assert data["status"] in ["running", "completed", "error"]
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/campaigns/{campaign_id}", headers=admin_auth)
    
    def test_job_not_found(self, admin_auth):
        """Test getting status of non-existent job."""
        r = requests.get(f"{BASE_URL}/api/generate/texts-job/job_nonexistent", headers=admin_auth)
        assert r.status_code == 404


class TestCourseCatalog:
    """Test course catalog endpoints (auto-seeding 7 courses)."""
    
    def test_get_catalog_seeds_courses(self, admin_auth):
        """Test /api/school/catalog returns 7 seeded courses."""
        r = requests.get(f"{BASE_URL}/api/school/catalog", headers=admin_auth)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 7  # Should have 7 seeded courses
        
        # Check course structure
        course = data[0]
        assert "course_id" in course
        assert "title" in course
        assert "description" in course
        assert "category" in course
        assert "user_status" in course
        
        # Check categories
        ariadne_courses = [c for c in data if c["category"] == "ariadne"]
        business_courses = [c for c in data if c["category"] == "business"]
        assert len(ariadne_courses) >= 4
        assert len(business_courses) >= 3
    
    def test_update_course_progress(self, admin_auth):
        """Test updating course progress status."""
        r = requests.get(f"{BASE_URL}/api/school/catalog", headers=admin_auth)
        courses = r.json()
        course_id = courses[0]["course_id"]
        
        # Update to in_progress
        r = requests.post(f"{BASE_URL}/api/school/catalog/progress", json={"course_id": course_id, "status": "in_progress"}, headers=admin_auth)
        assert r.status_code == 200
        
        # Verify
        r = requests.get(f"{BASE_URL}/api/school/catalog", headers=admin_auth)
        updated = next(c for c in r.json() if c["course_id"] == course_id)
        assert updated["user_status"] == "in_progress"


class TestUserDetails:
    """Test user details (billing info) endpoints."""
    
    def test_admin_get_user_details(self, admin_auth):
        """Test admin getting user details with billing and installments."""
        # Get users list first
        r = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_auth)
        users = r.json()
        user_id = users[0]["user_id"]
        
        # Get user details
        r = requests.get(f"{BASE_URL}/api/school/admin/user-details/{user_id}", headers=admin_auth)
        assert r.status_code == 200
        data = r.json()
        assert "user" in data
        assert "details" in data
        assert "installments" in data
        assert isinstance(data["installments"], list)
    
    def test_admin_save_user_details(self, admin_auth):
        """Test saving user billing details."""
        r = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_auth)
        user_id = r.json()[0]["user_id"]
        
        billing_data = {
            "fiscal_code": "TEST123456",
            "vat_number": "IT12345678901",
            "address": "Via Test 123",
            "city": "Roma"
        }
        r = requests.post(f"{BASE_URL}/api/school/admin/user-details/{user_id}", json=billing_data, headers=admin_auth)
        assert r.status_code == 200
        
        # Verify
        r = requests.get(f"{BASE_URL}/api/school/admin/user-details/{user_id}", headers=admin_auth)
        details = r.json()["details"]
        assert details.get("fiscal_code") == "TEST123456"
        assert details.get("city") == "Roma"


class TestPaymentInstallments:
    """Test payment installments CRUD."""
    
    def test_create_installment(self, admin_auth):
        """Test creating a payment installment."""
        r = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_auth)
        user_id = r.json()[0]["user_id"]
        
        inst_data = {
            "user_id": user_id,
            "description": "TEST_Rata 1",
            "amount": 500.00,
            "due_date": "2026-03-15"
        }
        r = requests.post(f"{BASE_URL}/api/school/admin/installments", json=inst_data, headers=admin_auth)
        assert r.status_code == 200
        data = r.json()
        assert "installment_id" in data
        assert data["amount"] == 500.00
        assert data["status"] == "pending"
        return data["installment_id"]
    
    def test_update_installment(self, admin_auth):
        """Test updating installment status."""
        # Create first
        r = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_auth)
        user_id = r.json()[0]["user_id"]
        
        r = requests.post(f"{BASE_URL}/api/school/admin/installments", json={
            "user_id": user_id, "description": "TEST_Update_Rata", "amount": 300, "due_date": "2026-04-01"
        }, headers=admin_auth)
        inst_id = r.json()["installment_id"]
        
        # Update to paid
        r = requests.put(f"{BASE_URL}/api/school/admin/installments/{inst_id}", json={"status": "paid"}, headers=admin_auth)
        assert r.status_code == 200
        
        # Verify via user details
        r = requests.get(f"{BASE_URL}/api/school/admin/user-details/{user_id}", headers=admin_auth)
        inst = next((i for i in r.json()["installments"] if i["installment_id"] == inst_id), None)
        assert inst is not None
        assert inst["status"] == "paid"
    
    def test_delete_installment(self, admin_auth):
        """Test deleting an installment."""
        r = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_auth)
        user_id = r.json()[0]["user_id"]
        
        r = requests.post(f"{BASE_URL}/api/school/admin/installments", json={
            "user_id": user_id, "description": "TEST_Delete_Rata", "amount": 100, "due_date": "2026-05-01"
        }, headers=admin_auth)
        inst_id = r.json()["installment_id"]
        
        r = requests.delete(f"{BASE_URL}/api/school/admin/installments/{inst_id}", headers=admin_auth)
        assert r.status_code == 200
    
    def test_list_all_installments(self, admin_auth):
        """Test listing all installments (admin view)."""
        r = requests.get(f"{BASE_URL}/api/school/admin/installments", headers=admin_auth)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)


class TestCommunityDashboard:
    """Test community dashboard with member chips."""
    
    def test_dashboard_has_community_members(self, admin_auth):
        """Test dashboard returns community_members array."""
        r = requests.get(f"{BASE_URL}/api/community/dashboard", headers=admin_auth)
        assert r.status_code == 200
        data = r.json()
        assert "community_members" in data
        # Even if empty, should be a list
        assert isinstance(data["community_members"], list)


class TestSidebarAndThemes:
    """Test sidebar navigation groups."""
    
    def test_auth_me_returns_role(self, admin_auth):
        """Test /auth/me returns role for area selector logic."""
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_auth)
        assert r.status_code == 200
        data = r.json()
        assert "role" in data
        assert data["role"] in ["admin", "editor", "user"]


class TestFeedImageUpload:
    """Test feed image upload functionality."""
    
    def test_feed_list_works(self, admin_auth):
        """Test feed endpoint works."""
        r = requests.get(f"{BASE_URL}/api/community/feed", headers=admin_auth)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestCleanup:
    """Clean up test data."""
    
    def test_cleanup_test_campaigns(self, admin_auth):
        """Remove test campaigns."""
        r = requests.get(f"{BASE_URL}/api/campaigns", headers=admin_auth)
        for c in r.json():
            if c["title"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/campaigns/{c['campaign_id']}", headers=admin_auth)
        assert True
