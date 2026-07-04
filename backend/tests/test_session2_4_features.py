"""
Test Suite for Sessions 2-4 Features:
- ProfilePage (user-details endpoints)
- MyEnrollmentsPage (enrollments/my endpoint)
- EnrollmentWizardPage (enrollment CRUD + contract + documents + confirm)
- AdminEnrollmentsPage (admin/enrollment-pipeline, admin/payment-overview)
- AdminCommsPage (inbox, rules, templates - existing endpoints)
- Admin KPI widgets on dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthAndSetup:
    """Authentication tests - run first"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    def test_admin_login(self, admin_token):
        """Test admin can login successfully"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print(f"SUCCESS: Admin login successful, token length: {len(admin_token)}")
    
    def test_admin_me_endpoint(self, admin_token):
        """Test /auth/me returns admin user info"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        assert data.get("email") == "admin@ariadne.training"
        assert data.get("role") == "admin"
        print(f"SUCCESS: Admin user verified - {data.get('email')}, role: {data.get('role')}")


class TestProfilePage:
    """Tests for ProfilePage - user-details endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_get_user_details_empty(self, admin_token):
        """Test GET /school/user-details returns user_id when no details exist"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/school/user-details", headers=headers)
        assert response.status_code == 200, f"Get user details failed: {response.text}"
        data = response.json()
        assert "user_id" in data or data == {}, f"Unexpected response: {data}"
        print(f"SUCCESS: GET user-details returned: {list(data.keys())}")
    
    def test_save_user_details(self, admin_token):
        """Test POST /school/user-details saves profile data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        profile_data = {
            "first_name": "Admin",
            "last_name": "Test",
            "birth_date": "1990-01-15",
            "birth_place": "Milano",
            "fiscal_code": "TSTADM90A15F205X",
            "phone": "+39 333 1234567",
            "address": "Via Roma 1",
            "city": "Milano",
            "zip_code": "20100",
            "province": "MI",
            "billing_type": "individual",
            "pec": "admin@pec.it",
            "sdi_code": "0000000"
        }
        response = requests.post(f"{BASE_URL}/api/school/user-details", json=profile_data, headers=headers)
        assert response.status_code == 200, f"Save user details failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, f"Save did not return ok: {data}"
        print("SUCCESS: User details saved successfully")
    
    def test_get_user_details_after_save(self, admin_token):
        """Test GET /school/user-details returns saved data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/school/user-details", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("first_name") == "Admin", f"First name mismatch: {data.get('first_name')}"
        assert data.get("last_name") == "Test", f"Last name mismatch: {data.get('last_name')}"
        assert data.get("fiscal_code") == "TSTADM90A15F205X"
        print(f"SUCCESS: User details retrieved - {data.get('first_name')} {data.get('last_name')}")


class TestMyEnrollmentsPage:
    """Tests for MyEnrollmentsPage - enrollments/my endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_get_my_enrollments(self, admin_token):
        """Test GET /school/enrollments/my returns user's enrollments"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/school/enrollments/my", headers=headers)
        assert response.status_code == 200, f"Get my enrollments failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        print(f"SUCCESS: My enrollments returned {len(data)} items")
    
    def test_get_my_payments(self, admin_token):
        """Test GET /school/my-payments returns user's payment installments"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/school/my-payments", headers=headers)
        assert response.status_code == 200, f"Get my payments failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        print(f"SUCCESS: My payments returned {len(data)} items")


class TestEnrollmentWizard:
    """Tests for EnrollmentWizardPage - enrollment CRUD endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_create_enrollment(self, admin_token):
        """Test POST /school/enrollments creates new enrollment"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/school/enrollments", json={
            "course_id": "cat_cc2026"
        }, headers=headers)
        assert response.status_code == 200, f"Create enrollment failed: {response.text}"
        data = response.json()
        assert "enrollment_id" in data, f"No enrollment_id in response: {data}"
        assert data.get("course_id") == "cat_cc2026"
        assert data.get("status") == "onboarding"
        assert data.get("current_step") == 1
        print(f"SUCCESS: Enrollment created - {data.get('enrollment_id')}")
        return data.get("enrollment_id")
    
    def test_get_enrollment(self, admin_token):
        """Test GET /school/enrollments/{id} returns enrollment details"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # First create an enrollment
        create_resp = requests.post(f"{BASE_URL}/api/school/enrollments", json={
            "course_id": "cat_cc2026"
        }, headers=headers)
        enrollment_id = create_resp.json().get("enrollment_id")
        
        # Then get it
        response = requests.get(f"{BASE_URL}/api/school/enrollments/{enrollment_id}", headers=headers)
        assert response.status_code == 200, f"Get enrollment failed: {response.text}"
        data = response.json()
        assert data.get("enrollment_id") == enrollment_id
        print(f"SUCCESS: Enrollment retrieved - {enrollment_id}")
    
    def test_update_enrollment(self, admin_token):
        """Test PUT /school/enrollments/{id} updates enrollment"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # First create an enrollment
        create_resp = requests.post(f"{BASE_URL}/api/school/enrollments", json={
            "course_id": "cat_adv"
        }, headers=headers)
        enrollment_id = create_resp.json().get("enrollment_id")
        
        # Update it
        response = requests.put(f"{BASE_URL}/api/school/enrollments/{enrollment_id}", json={
            "current_step": 2,
            "motivation": "Test motivation text for enrollment",
            "background": "Test background",
            "referral_source": "google"
        }, headers=headers)
        assert response.status_code == 200, f"Update enrollment failed: {response.text}"
        data = response.json()
        assert data.get("current_step") == 2
        assert data.get("motivation") == "Test motivation text for enrollment"
        print(f"SUCCESS: Enrollment updated - step {data.get('current_step')}")
    
    def test_save_enrollment_contract(self, admin_token):
        """Test POST /school/enrollments/{id}/contract saves contract data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # First create an enrollment
        create_resp = requests.post(f"{BASE_URL}/api/school/enrollments", json={
            "course_id": "cat_mentor"
        }, headers=headers)
        enrollment_id = create_resp.json().get("enrollment_id")
        
        # Save contract
        response = requests.post(f"{BASE_URL}/api/school/enrollments/{enrollment_id}/contract", json={
            "consents": {
                "contract": True,
                "clauses": True,
                "privacy": True
            },
            "signature_text": "Admin Test"
        }, headers=headers)
        assert response.status_code == 200, f"Save contract failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        print(f"SUCCESS: Contract saved for enrollment {enrollment_id}")


class TestAdminEnrollmentsPage:
    """Tests for AdminEnrollmentsPage - admin enrollment pipeline and payments"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_admin_enrollment_pipeline(self, admin_token):
        """Test GET /school/admin/enrollment-pipeline returns all enrollments"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/school/admin/enrollment-pipeline", headers=headers)
        assert response.status_code == 200, f"Get enrollment pipeline failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        # Check enriched data
        if len(data) > 0:
            assert "user_name" in data[0], "Missing user_name in pipeline data"
            assert "user_email" in data[0], "Missing user_email in pipeline data"
            assert "course_title" in data[0], "Missing course_title in pipeline data"
        print(f"SUCCESS: Enrollment pipeline returned {len(data)} enrollments")
    
    def test_admin_payment_overview(self, admin_token):
        """Test GET /school/admin/payment-overview returns payment summary"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/school/admin/payment-overview", headers=headers)
        assert response.status_code == 200, f"Get payment overview failed: {response.text}"
        data = response.json()
        assert "summary" in data, f"Missing summary in response: {data}"
        assert "rows" in data, f"Missing rows in response: {data}"
        summary = data["summary"]
        assert "pending_count" in summary
        assert "total_pending_amount" in summary
        assert "overdue_amount" in summary
        print(f"SUCCESS: Payment overview - {summary.get('pending_count')} pending, €{summary.get('total_pending_amount')} total")
    
    def test_admin_list_installments(self, admin_token):
        """Test GET /school/admin/installments returns all installments"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/school/admin/installments", headers=headers)
        assert response.status_code == 200, f"Get installments failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        print(f"SUCCESS: Admin installments returned {len(data)} items")
    
    def test_admin_create_installment(self, admin_token):
        """Test POST /school/admin/installments creates new installment"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Get admin user_id first
        me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        user_id = me_resp.json().get("user_id")
        
        response = requests.post(f"{BASE_URL}/api/school/admin/installments", json={
            "user_id": user_id,
            "course_id": "cat_cc2026",
            "description": "Test installment",
            "amount": 500.00,
            "due_date": "2026-03-15",
            "status": "pending"
        }, headers=headers)
        assert response.status_code == 200, f"Create installment failed: {response.text}"
        data = response.json()
        assert "installment_id" in data
        assert data.get("amount") == 500.00
        print(f"SUCCESS: Installment created - {data.get('installment_id')}")


class TestTrainingCourses:
    """Tests for TrainingCoursesPage and CourseDetailPage"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_list_training_courses(self, admin_token):
        """Test GET /school/training-courses returns course catalog"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/school/training-courses", headers=headers)
        assert response.status_code == 200, f"List training courses failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        assert len(data) > 0, "No training courses returned"
        # Check course structure
        course = data[0]
        assert "course_id" in course
        assert "title" in course
        assert "category" in course
        print(f"SUCCESS: Training courses returned {len(data)} courses")
    
    def test_get_training_course_detail(self, admin_token):
        """Test GET /school/training-courses/{id} returns course detail"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/school/training-courses/cat_cc2026", headers=headers)
        assert response.status_code == 200, f"Get course detail failed: {response.text}"
        data = response.json()
        assert data.get("course_id") == "cat_cc2026"
        assert "title" in data
        assert "current_user_status" in data  # Should include user's interest status
        print(f"SUCCESS: Course detail - {data.get('title')}")
    
    def test_get_training_course_admin_summary(self, admin_token):
        """Test GET /school/training-courses/{id}/admin-summary returns admin view"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/school/training-courses/cat_cc2026/admin-summary", headers=headers)
        assert response.status_code == 200, f"Get admin summary failed: {response.text}"
        data = response.json()
        assert "summary" in data
        assert "editions" in data
        assert "prospects" in data
        summary = data["summary"]
        assert "interested" in summary
        assert "confirmed" in summary
        assert "enrolled" in summary
        print(f"SUCCESS: Admin summary - interested: {summary.get('interested')}, enrolled: {summary.get('enrolled')}")
    
    def test_save_training_course_interest(self, admin_token):
        """Test POST /school/training-courses/{id}/interest saves user interest"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/school/training-courses/cat_biz1/interest", json={
            "source": "test"
        }, headers=headers)
        assert response.status_code == 200, f"Save interest failed: {response.text}"
        data = response.json()
        assert "status" in data
        assert "message" in data
        print(f"SUCCESS: Interest saved - status: {data.get('status')}")


class TestAdminCommsPage:
    """Tests for AdminCommsPage - inbox, rules, templates"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_list_inbox_threads(self, admin_token):
        """Test GET /inbox/threads returns inbox threads"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/inbox/threads", headers=headers)
        assert response.status_code == 200, f"List threads failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        print(f"SUCCESS: Inbox threads returned {len(data)} items")
    
    def test_list_routing_rules(self, admin_token):
        """Test GET /inbox/rules returns routing rules"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/inbox/rules", headers=headers)
        assert response.status_code == 200, f"List rules failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        print(f"SUCCESS: Routing rules returned {len(data)} items")
    
    def test_list_email_templates(self, admin_token):
        """Test GET /inbox/templates returns email templates"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/inbox/templates", headers=headers)
        assert response.status_code == 200, f"List templates failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        print(f"SUCCESS: Email templates returned {len(data)} items")


class TestCommunityDashboard:
    """Tests for CommunityDashboardPage - including admin KPI widgets"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_community_dashboard(self, admin_token):
        """Test GET /community/dashboard returns dashboard data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/community/dashboard", headers=headers)
        assert response.status_code == 200, f"Get dashboard failed: {response.text}"
        data = response.json()
        assert "profile" in data or "onboarded" in data, f"Missing expected fields: {list(data.keys())}"
        print(f"SUCCESS: Dashboard data returned - keys: {list(data.keys())}")
    
    def test_admin_users_list(self, admin_token):
        """Test GET /admin/users returns user list (for KPI widget)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200, f"List users failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        print(f"SUCCESS: Admin users returned {len(data)} users")


class TestCohortOperations:
    """Tests for cohort operations in AdminEnrollmentsPage"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_list_cohorts(self, admin_token):
        """Test GET /school/cohorts returns cohorts list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/school/cohorts", headers=headers)
        assert response.status_code == 200, f"List cohorts failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        print(f"SUCCESS: Cohorts returned {len(data)} items")
    
    def test_create_cohort(self, admin_token):
        """Test POST /school/cohorts creates new cohort"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/school/cohorts", json={
            "course_id": "cat_cc2026",
            "name": "Test Edition 2026",
            "start_date": "2026-04-01",
            "end_date": "2026-12-31",
            "active": True
        }, headers=headers)
        assert response.status_code == 200, f"Create cohort failed: {response.text}"
        data = response.json()
        assert "cohort_id" in data
        assert data.get("name") == "Test Edition 2026"
        print(f"SUCCESS: Cohort created - {data.get('cohort_id')}")
        return data.get("cohort_id")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
