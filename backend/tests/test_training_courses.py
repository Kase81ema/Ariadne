"""
Backend Tests for Training Courses Feature (Iteration 10)
Tests:
- Role-based access control: /api/courses-events and /api/repository/files return 403 for regular user
- Training courses endpoint returns 200 for all authenticated users
- Admin/editor operations: create cohort, add/update member participation status
- Bulk installments creation and payment overview endpoint
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
    """Authentication helper methods"""
    
    @staticmethod
    def login(email: str, password: str):
        """Login and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    @staticmethod
    def register_user(email: str, password: str, name: str = ""):
        """Register a new user"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": password,
            "name": name or email.split("@")[0]
        })
        return response


class TestRoleBasedAccess:
    """Test role-based access control - regular user should NOT access /api/courses-events and /api/repository/files"""
    
    @pytest.fixture
    def regular_user_token(self):
        """Get token for regular user"""
        token = TestAuth.login(REGULAR_USER_EMAIL, REGULAR_USER_PASSWORD)
        if not token:
            # Create user if doesn't exist
            TestAuth.register_user(REGULAR_USER_EMAIL, REGULAR_USER_PASSWORD, "Repo Check User")
            token = TestAuth.login(REGULAR_USER_EMAIL, REGULAR_USER_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate regular user")
        return token
    
    @pytest.fixture
    def editor_token(self):
        """Get token for editor user"""
        token = TestAuth.login(EDITOR_EMAIL, EDITOR_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate editor user")
        return token
    
    def test_regular_user_cannot_access_courses_events(self, regular_user_token):
        """Regular user gets 403 on /api/courses-events"""
        response = requests.get(
            f"{BASE_URL}/api/courses-events",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Regular user correctly blocked from /api/courses-events (403)")
    
    def test_regular_user_cannot_access_repository_files(self, regular_user_token):
        """Regular user gets 403 on /api/repository/files"""
        response = requests.get(
            f"{BASE_URL}/api/repository/files",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Regular user correctly blocked from /api/repository/files (403)")
    
    def test_regular_user_can_access_training_courses(self, regular_user_token):
        """Regular user gets 200 on /api/school/training-courses"""
        response = requests.get(
            f"{BASE_URL}/api/school/training-courses",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Training courses should return a list"
        print(f"PASS: Regular user can access training courses ({len(data)} courses)")
    
    def test_editor_can_access_courses_events(self, editor_token):
        """Editor gets 200 on /api/courses-events"""
        response = requests.get(
            f"{BASE_URL}/api/courses-events",
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Editor can access /api/courses-events (200)")
    
    def test_editor_can_access_repository_files(self, editor_token):
        """Editor gets 200 on /api/repository/files"""
        response = requests.get(
            f"{BASE_URL}/api/repository/files",
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Editor can access /api/repository/files (200)")


class TestTrainingCoursesOperations:
    """Test admin/editor training course operations: cohorts, members, installments"""
    
    @pytest.fixture
    def editor_token(self):
        """Get token for editor user"""
        token = TestAuth.login(EDITOR_EMAIL, EDITOR_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate editor user")
        return token
    
    @pytest.fixture
    def test_course_id(self, editor_token):
        """Get or create a test course"""
        response = requests.get(
            f"{BASE_URL}/api/courses-events",
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        if response.status_code == 200:
            courses = response.json()
            if courses:
                return courses[0]["course_id"]
        # Create a test course
        create_response = requests.post(
            f"{BASE_URL}/api/courses-events",
            headers={"Authorization": f"Bearer {editor_token}"},
            json={
                "title": "TEST_Training_Course",
                "type": "course_multi",
                "description": "Test course for training operations"
            }
        )
        if create_response.status_code in [200, 201]:
            return create_response.json()["course_id"]
        pytest.skip("Could not create test course")
    
    def test_list_cohorts(self, editor_token):
        """List all cohorts"""
        response = requests.get(
            f"{BASE_URL}/api/school/cohorts",
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Cohorts should return a list"
        print(f"PASS: Listed {len(data)} cohorts")
    
    def test_create_cohort_with_course_id(self, editor_token, test_course_id):
        """Create a cohort (edition) linked to a course"""
        response = requests.post(
            f"{BASE_URL}/api/school/cohorts",
            headers={"Authorization": f"Bearer {editor_token}"},
            json={
                "course_id": test_course_id,
                "name": "TEST_Edition_2026",
                "start_date": "2026-02-01",
                "end_date": "2026-06-30",
                "active": True
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "cohort_id" in data, "Cohort should have cohort_id"
        assert data["course_id"] == test_course_id, "Cohort should be linked to course"
        print(f"PASS: Created cohort {data['cohort_id']} linked to course {test_course_id}")
        return data["cohort_id"]
    
    def test_add_member_with_participation_status(self, editor_token, test_course_id):
        """Add member to cohort with participation status (interested/confirmed/enrolled)"""
        # First create a cohort
        cohort_response = requests.post(
            f"{BASE_URL}/api/school/cohorts",
            headers={"Authorization": f"Bearer {editor_token}"},
            json={
                "course_id": test_course_id,
                "name": "TEST_Edition_Members",
                "active": True
            }
        )
        assert cohort_response.status_code == 200
        cohort_id = cohort_response.json()["cohort_id"]
        
        # Get a user to add
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        assert users_response.status_code == 200
        users = users_response.json()
        test_user = next((u for u in users if u["role"] != "admin"), None)
        if not test_user:
            pytest.skip("No non-admin user found for testing")
        
        # Add member with 'interested' status
        add_response = requests.post(
            f"{BASE_URL}/api/school/cohorts/{cohort_id}/members",
            headers={"Authorization": f"Bearer {editor_token}"},
            json={
                "user_id": test_user["user_id"],
                "role_in_cohort": "student",
                "participation_status": "interested"
            }
        )
        assert add_response.status_code == 200, f"Expected 200, got {add_response.status_code}: {add_response.text}"
        print(f"PASS: Added member with 'interested' status to cohort {cohort_id}")
        
        return cohort_id, test_user["user_id"]
    
    def test_update_member_participation_status(self, editor_token, test_course_id):
        """Update member participation status from interested to enrolled"""
        # Create cohort and add member
        cohort_response = requests.post(
            f"{BASE_URL}/api/school/cohorts",
            headers={"Authorization": f"Bearer {editor_token}"},
            json={
                "course_id": test_course_id,
                "name": "TEST_Edition_Status_Update",
                "active": True
            }
        )
        cohort_id = cohort_response.json()["cohort_id"]
        
        # Get a user
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        users = users_response.json()
        test_user = next((u for u in users if u["role"] != "admin"), None)
        if not test_user:
            pytest.skip("No non-admin user found")
        
        # Add member
        requests.post(
            f"{BASE_URL}/api/school/cohorts/{cohort_id}/members",
            headers={"Authorization": f"Bearer {editor_token}"},
            json={
                "user_id": test_user["user_id"],
                "participation_status": "interested"
            }
        )
        
        # Update status to enrolled
        update_response = requests.put(
            f"{BASE_URL}/api/school/cohorts/{cohort_id}/members/{test_user['user_id']}",
            headers={"Authorization": f"Bearer {editor_token}"},
            json={
                "participation_status": "enrolled"
            }
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        data = update_response.json()
        assert data.get("participation_status") == "enrolled", "Status should be updated to 'enrolled'"
        print("PASS: Updated member participation status to 'enrolled'")
        
        return cohort_id, test_user["user_id"]
    
    def test_bulk_create_installments(self, editor_token, test_course_id):
        """Bulk create installments for enrolled participants"""
        # Setup: create cohort and add enrolled member
        cohort_response = requests.post(
            f"{BASE_URL}/api/school/cohorts",
            headers={"Authorization": f"Bearer {editor_token}"},
            json={
                "course_id": test_course_id,
                "name": "TEST_Edition_Installments",
                "active": True
            }
        )
        cohort_id = cohort_response.json()["cohort_id"]
        
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        users = users_response.json()
        test_user = next((u for u in users if u["role"] != "admin"), None)
        if not test_user:
            pytest.skip("No non-admin user found")
        
        requests.post(
            f"{BASE_URL}/api/school/cohorts/{cohort_id}/members",
            headers={"Authorization": f"Bearer {editor_token}"},
            json={
                "user_id": test_user["user_id"],
                "participation_status": "enrolled"
            }
        )
        
        # Bulk create installments (1-5 installments with due dates)
        bulk_response = requests.post(
            f"{BASE_URL}/api/school/admin/installments/bulk",
            headers={"Authorization": f"Bearer {editor_token}"},
            json={
                "course_id": test_course_id,
                "cohort_id": cohort_id,
                "plans": [
                    {
                        "user_id": test_user["user_id"],
                        "installments": [
                            {"description": "Rata 1", "amount": 500, "due_date": "2026-02-15"},
                            {"description": "Rata 2", "amount": 500, "due_date": "2026-03-15"},
                            {"description": "Rata 3", "amount": 500, "due_date": "2026-04-15"}
                        ]
                    }
                ],
                "replace_existing": True
            }
        )
        assert bulk_response.status_code == 200, f"Expected 200, got {bulk_response.status_code}: {bulk_response.text}"
        data = bulk_response.json()
        assert data.get("ok") == True, "Bulk installments should succeed"
        assert data.get("created_count") == 3, f"Should create 3 installments, got {data.get('created_count')}"
        print(f"PASS: Bulk created {data.get('created_count')} installments")
    
    def test_payment_overview(self, editor_token):
        """Get aggregated payment overview"""
        response = requests.get(
            f"{BASE_URL}/api/school/admin/payment-overview",
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "summary" in data, "Payment overview should have 'summary'"
        assert "rows" in data, "Payment overview should have 'rows'"
        summary = data["summary"]
        assert "pending_count" in summary, "Summary should have pending_count"
        assert "total_pending_amount" in summary, "Summary should have total_pending_amount"
        assert "overdue_amount" in summary, "Summary should have overdue_amount"
        print(f"PASS: Payment overview - {summary.get('pending_count')} pending, €{summary.get('total_pending_amount')} total")


class TestTrainingCoursesCatalog:
    """Test training courses catalog structure"""
    
    @pytest.fixture
    def editor_token(self):
        """Get token for editor user"""
        token = TestAuth.login(EDITOR_EMAIL, EDITOR_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate editor user")
        return token
    
    def test_training_courses_structure(self, editor_token):
        """Verify training courses response structure for filtering"""
        response = requests.get(
            f"{BASE_URL}/api/school/training-courses",
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        assert response.status_code == 200
        courses = response.json()
        assert len(courses) > 0, "Should have at least one course"
        
        # Check course structure
        course = courses[0]
        required_fields = ["course_id", "title", "category", "timing_status", "source"]
        for field in required_fields:
            assert field in course, f"Course should have '{field}' field"
        
        # Verify timing_status values
        valid_statuses = ["upcoming", "ongoing", "completed", "always_available"]
        for c in courses:
            assert c.get("timing_status") in valid_statuses, f"Invalid timing_status: {c.get('timing_status')}"
        
        print(f"PASS: Training courses have correct structure ({len(courses)} courses)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
