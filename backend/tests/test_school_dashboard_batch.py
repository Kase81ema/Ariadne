"""
Backend Tests for School Dashboard Redesign & Interest/Admin Features (Iteration 12)
Tests:
- /api/school/training-courses: Returns 200 with Italian titles
- /api/school/training-courses/{course_id}: Returns course detail with current_user_status
- /api/school/training-courses/{course_id}/interest: Save interest (POST), returns status
- /api/school/training-courses/{course_id}/admin-summary: Admin summary with prospects and editions
- /api/school/training-courses/{course_id}/interest/{user_id}: Admin update status (PUT)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
EDITOR_EMAIL = "arianna.perrone@ariadne.test"
EDITOR_PASSWORD = "password123"
REGULAR_USER_EMAIL = "repo_check_user@ariadne.test"
REGULAR_USER_PASSWORD = "password123"

class TestAuth:
    @staticmethod
    def login(email: str, password: str):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json()
        return None
    
    @staticmethod
    def register_user(email: str, password: str, name: str = ""):
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": password,
            "name": name or email.split("@")[0]
        })
        return response


class TestTrainingCoursesEndpoints:
    """Test training courses list and detail endpoints"""
    
    @pytest.fixture
    def editor_auth(self):
        result = TestAuth.login(EDITOR_EMAIL, EDITOR_PASSWORD)
        if not result:
            pytest.skip("Could not authenticate editor")
        return {"token": result["token"], "user_id": result.get("user", {}).get("user_id", "")}
    
    @pytest.fixture
    def regular_user_auth(self):
        result = TestAuth.login(REGULAR_USER_EMAIL, REGULAR_USER_PASSWORD)
        if not result:
            # Create user if doesn't exist
            TestAuth.register_user(REGULAR_USER_EMAIL, REGULAR_USER_PASSWORD, "Repo Check User")
            result = TestAuth.login(REGULAR_USER_EMAIL, REGULAR_USER_PASSWORD)
        if not result:
            pytest.skip("Could not authenticate regular user")
        return {"token": result["token"], "user_id": result.get("user", {}).get("user_id", "")}
    
    def test_training_courses_list_200(self, editor_auth):
        """GET /api/school/training-courses returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/school/training-courses",
            headers={"Authorization": f"Bearer {editor_auth['token']}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        assert len(data) > 0, "Should have at least one course"
        
        # Check Italian titles are present
        titles = [c["title"] for c in data]
        italian_keywords = ["Programma", "Coaching", "Assessment", "Business", "Marketing", "Presenza digitale"]
        found_italian = any(any(kw.lower() in t.lower() for kw in italian_keywords) for t in titles)
        assert found_italian, f"Should have Italian course titles. Found: {titles[:5]}"
        print(f"PASS: Training courses list returns {len(data)} courses with Italian titles")
    
    def test_training_course_detail_200(self, editor_auth):
        """GET /api/school/training-courses/{course_id} returns 200 with current_user_status"""
        # First get list
        list_response = requests.get(
            f"{BASE_URL}/api/school/training-courses",
            headers={"Authorization": f"Bearer {editor_auth['token']}"}
        )
        courses = list_response.json()
        test_course_id = courses[0]["course_id"] if courses else "cat_tec3"
        
        # Get detail
        response = requests.get(
            f"{BASE_URL}/api/school/training-courses/{test_course_id}",
            headers={"Authorization": f"Bearer {editor_auth['token']}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "course_id" in data, "Response should have course_id"
        assert "current_user_status" in data, "Response should have current_user_status field"
        print(f"PASS: Course detail for {test_course_id} returns with current_user_status='{data.get('current_user_status')}'")
    
    def test_save_interest_200(self, regular_user_auth):
        """POST /api/school/training-courses/{course_id}/interest saves interest"""
        course_id = "cat_tec3"  # Test course for interest
        
        response = requests.post(
            f"{BASE_URL}/api/school/training-courses/{course_id}/interest",
            headers={"Authorization": f"Bearer {regular_user_auth['token']}"},
            json={"source": "course_detail"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "status" in data, "Response should have status"
        assert data["status"] in ["interested", "confirmed", "enrolled"], f"Status should be valid, got {data['status']}"
        print(f"PASS: Interest saved for {course_id}, status={data['status']}")
    
    def test_interest_persists_in_detail(self, regular_user_auth):
        """After saving interest, course detail should return current_user_status"""
        course_id = "cat_tec3"
        
        # Save interest first
        requests.post(
            f"{BASE_URL}/api/school/training-courses/{course_id}/interest",
            headers={"Authorization": f"Bearer {regular_user_auth['token']}"},
            json={"source": "test"}
        )
        
        # Get detail and verify status
        response = requests.get(
            f"{BASE_URL}/api/school/training-courses/{course_id}",
            headers={"Authorization": f"Bearer {regular_user_auth['token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("current_user_status") in ["interested", "confirmed", "enrolled"], \
            f"Current user status should reflect saved interest, got {data.get('current_user_status')}"
        print(f"PASS: Course detail shows persisted current_user_status='{data.get('current_user_status')}'")


class TestAdminSummaryEndpoints:
    """Test admin summary and inline status update endpoints"""
    
    @pytest.fixture
    def editor_auth(self):
        result = TestAuth.login(EDITOR_EMAIL, EDITOR_PASSWORD)
        if not result:
            pytest.skip("Could not authenticate editor")
        return {"token": result["token"], "user_id": result.get("user", {}).get("user_id", "")}
    
    @pytest.fixture
    def regular_user_auth(self):
        result = TestAuth.login(REGULAR_USER_EMAIL, REGULAR_USER_PASSWORD)
        if not result:
            TestAuth.register_user(REGULAR_USER_EMAIL, REGULAR_USER_PASSWORD, "Repo Check User")
            result = TestAuth.login(REGULAR_USER_EMAIL, REGULAR_USER_PASSWORD)
        if not result:
            pytest.skip("Could not authenticate regular user")
        return {"token": result["token"], "user_id": result.get("user", {}).get("user_id", "")}
    
    def test_admin_summary_200(self, editor_auth):
        """GET /api/school/training-courses/{course_id}/admin-summary returns 200"""
        course_id = "cat_tec3"
        
        response = requests.get(
            f"{BASE_URL}/api/school/training-courses/{course_id}/admin-summary",
            headers={"Authorization": f"Bearer {editor_auth['token']}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "summary" in data, "Should have summary field"
        assert "editions" in data, "Should have editions list"
        assert "prospects" in data, "Should have prospects list"
        
        summary = data["summary"]
        assert "interested" in summary, "Summary should have interested count"
        assert "confirmed" in summary, "Summary should have confirmed count"
        assert "enrolled" in summary, "Summary should have enrolled count"
        
        print(f"PASS: Admin summary for {course_id}: interested={summary['interested']}, confirmed={summary['confirmed']}, enrolled={summary['enrolled']}")
    
    def test_admin_summary_includes_prospects(self, editor_auth, regular_user_auth):
        """Admin summary includes prospects (users with interest but no edition)"""
        course_id = "cat_tec3"
        
        # First ensure regular user has expressed interest
        requests.post(
            f"{BASE_URL}/api/school/training-courses/{course_id}/interest",
            headers={"Authorization": f"Bearer {regular_user_auth['token']}"},
            json={"source": "test"}
        )
        
        # Get admin summary
        response = requests.get(
            f"{BASE_URL}/api/school/training-courses/{course_id}/admin-summary",
            headers={"Authorization": f"Bearer {editor_auth['token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        prospects = data.get("prospects", [])
        # Verify prospects have required fields
        if prospects:
            prospect = prospects[0]
            assert "user_id" in prospect, "Prospect should have user_id"
            assert "user_name" in prospect, "Prospect should have user_name"
            assert "status" in prospect, "Prospect should have status"
        
        print(f"PASS: Admin summary has {len(prospects)} prospects")
    
    def test_admin_update_interest_status(self, editor_auth, regular_user_auth):
        """PUT /api/school/training-courses/{course_id}/interest/{user_id} updates status"""
        course_id = "cat_tec3"
        user_id = regular_user_auth["user_id"]
        
        # Ensure user has expressed interest first
        requests.post(
            f"{BASE_URL}/api/school/training-courses/{course_id}/interest",
            headers={"Authorization": f"Bearer {regular_user_auth['token']}"},
            json={"source": "test"}
        )
        
        # Admin updates status
        response = requests.put(
            f"{BASE_URL}/api/school/training-courses/{course_id}/interest/{user_id}",
            headers={"Authorization": f"Bearer {editor_auth['token']}"},
            json={"status": "confirmed"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "confirmed", f"Status should be 'confirmed', got {data.get('status')}"
        print(f"PASS: Admin updated interest status for user {user_id} to 'confirmed'")


class TestUserAdminDeepLink:
    """Test users admin deep-link functionality"""
    
    @pytest.fixture
    def editor_auth(self):
        result = TestAuth.login(EDITOR_EMAIL, EDITOR_PASSWORD)
        if not result:
            pytest.skip("Could not authenticate editor")
        return {"token": result["token"], "user_id": result.get("user", {}).get("user_id", "")}
    
    def test_admin_users_list(self, editor_auth):
        """GET /api/admin/users returns list for building deep-links"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {editor_auth['token']}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Should return list"
        if data:
            user = data[0]
            assert "user_id" in user, "User should have user_id for deep-link"
        print(f"PASS: Admin users list returns {len(data)} users for deep-linking")
    
    def test_admin_user_details(self, editor_auth):
        """GET /api/school/admin/user-details/{user_id} returns user details"""
        # First get a user
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {editor_auth['token']}"}
        )
        users = users_response.json()
        if not users:
            pytest.skip("No users found")
        
        test_user_id = users[0]["user_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/school/admin/user-details/{test_user_id}",
            headers={"Authorization": f"Bearer {editor_auth['token']}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "user" in data, "Should have user info"
        assert "details" in data, "Should have billing details"
        assert "installments" in data, "Should have installments"
        print(f"PASS: User details endpoint returns user, details, and installments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
