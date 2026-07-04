"""
Test enrollment endpoints for Ariadne e-learning platform.
Tests: POST /api/school/enrollments, GET /api/school/enrollments/my, 
       GET /api/school/enrollments/{id}, PUT /api/school/enrollments/{id},
       POST /api/school/enrollments/{id}/contract, POST /api/school/enrollments/{id}/confirm,
       GET /api/school/admin/enrollment-pipeline
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@ariadne.training"
ADMIN_PASSWORD = "admin123"
TEST_COURSE_ID = "cat_cc2026"


class TestEnrollmentEndpoints:
    """Test enrollment CRUD operations and workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token")
        assert token, "No token received"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.user_id = login_response.json().get("user", {}).get("user_id")
        yield
        self.session.close()

    # ===== POST /api/school/enrollments =====
    def test_create_enrollment_returns_in_progress_status(self):
        """POST /api/school/enrollments with course_id creates enrollment with status 'in_progress' and current_step 1"""
        # Use a unique course_id to avoid conflicts with existing enrollments
        test_course_id = f"test_course_{uuid.uuid4().hex[:8]}"
        
        response = self.session.post(f"{BASE_URL}/api/school/enrollments", json={
            "course_id": test_course_id
        })
        
        assert response.status_code == 200, f"Create enrollment failed: {response.text}"
        data = response.json()
        
        # Verify status is 'in_progress'
        assert data.get("status") == "in_progress", f"Expected status 'in_progress', got '{data.get('status')}'"
        
        # Verify current_step is 1
        assert data.get("current_step") == 1, f"Expected current_step 1, got {data.get('current_step')}"
        
        # Verify enrollment_id is generated
        assert "enrollment_id" in data, "enrollment_id not in response"
        assert data["enrollment_id"].startswith("enr_"), f"enrollment_id format incorrect: {data['enrollment_id']}"
        
        # Verify course_id matches
        assert data.get("course_id") == test_course_id, f"course_id mismatch"
        
        print(f"✓ Created enrollment with status='in_progress', current_step=1, id={data['enrollment_id']}")

    def test_create_enrollment_same_course_returns_existing(self):
        """POST /api/school/enrollments with same course_id returns existing enrollment (resume flow)"""
        # First create an enrollment
        test_course_id = f"test_resume_{uuid.uuid4().hex[:8]}"
        
        response1 = self.session.post(f"{BASE_URL}/api/school/enrollments", json={
            "course_id": test_course_id
        })
        assert response1.status_code == 200
        enrollment1 = response1.json()
        enrollment_id = enrollment1.get("enrollment_id")
        
        # Try to create another enrollment for the same course
        response2 = self.session.post(f"{BASE_URL}/api/school/enrollments", json={
            "course_id": test_course_id
        })
        assert response2.status_code == 200
        enrollment2 = response2.json()
        
        # Should return the same enrollment (resume flow)
        assert enrollment2.get("enrollment_id") == enrollment_id, \
            f"Expected same enrollment_id {enrollment_id}, got {enrollment2.get('enrollment_id')}"
        
        print(f"✓ Resume flow works - same enrollment returned: {enrollment_id}")

    def test_create_enrollment_requires_course_id(self):
        """POST /api/school/enrollments without course_id returns 400"""
        response = self.session.post(f"{BASE_URL}/api/school/enrollments", json={})
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ course_id validation works - returns 400 when missing")

    # ===== GET /api/school/enrollments/my =====
    def test_get_my_enrollments_returns_list_with_course_title(self):
        """GET /api/school/enrollments/my returns user's enrollments with course_title and installments"""
        response = self.session.get(f"{BASE_URL}/api/school/enrollments/my")
        
        assert response.status_code == 200, f"Get my enrollments failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        # If there are enrollments, verify structure
        if len(data) > 0:
            enrollment = data[0]
            assert "enrollment_id" in enrollment, "enrollment_id missing"
            assert "course_id" in enrollment, "course_id missing"
            assert "status" in enrollment, "status missing"
            assert "course_title" in enrollment, "course_title missing (should be enriched)"
            assert "installments" in enrollment, "installments missing (should be enriched)"
            
            print(f"✓ My enrollments returned {len(data)} enrollments with course_title and installments")
        else:
            print("✓ My enrollments endpoint works (no enrollments found)")

    # ===== GET /api/school/enrollments/{id} =====
    def test_get_enrollment_by_id(self):
        """GET /api/school/enrollments/{id} returns the enrollment for the user"""
        # First create an enrollment
        test_course_id = f"test_get_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/school/enrollments", json={
            "course_id": test_course_id
        })
        assert create_response.status_code == 200
        enrollment_id = create_response.json().get("enrollment_id")
        
        # Get the enrollment by ID
        response = self.session.get(f"{BASE_URL}/api/school/enrollments/{enrollment_id}")
        
        assert response.status_code == 200, f"Get enrollment failed: {response.text}"
        data = response.json()
        
        assert data.get("enrollment_id") == enrollment_id
        assert data.get("course_id") == test_course_id
        
        print(f"✓ Get enrollment by ID works: {enrollment_id}")

    def test_get_enrollment_not_found(self):
        """GET /api/school/enrollments/{id} returns 404 for non-existent enrollment"""
        response = self.session.get(f"{BASE_URL}/api/school/enrollments/enr_nonexistent123")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Get non-existent enrollment returns 404")

    # ===== PUT /api/school/enrollments/{id} =====
    def test_update_enrollment_draft_fields(self):
        """PUT /api/school/enrollments/{id} updates draft fields (motivation, background, payment_plan, current_step)"""
        # First create an enrollment
        test_course_id = f"test_update_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/school/enrollments", json={
            "course_id": test_course_id
        })
        assert create_response.status_code == 200
        enrollment_id = create_response.json().get("enrollment_id")
        
        # Update the enrollment
        update_data = {
            "motivation": "Test motivation text",
            "background": "Test background text",
            "payment_plan": [
                {"description": "Rata 1", "amount": 1000, "due_date": "2026-02-01"},
                {"description": "Rata 2", "amount": 1000, "due_date": "2026-05-01"},
                {"description": "Rata 3", "amount": 1000, "due_date": "2026-08-01"}
            ],
            "current_step": 3
        }
        
        response = self.session.put(f"{BASE_URL}/api/school/enrollments/{enrollment_id}", json=update_data)
        
        assert response.status_code == 200, f"Update enrollment failed: {response.text}"
        data = response.json()
        
        assert data.get("motivation") == "Test motivation text", "motivation not updated"
        assert data.get("background") == "Test background text", "background not updated"
        assert data.get("current_step") == 3, "current_step not updated"
        assert len(data.get("payment_plan", [])) == 3, "payment_plan not updated"
        
        print(f"✓ Update enrollment works: motivation, background, payment_plan, current_step updated")

    # ===== POST /api/school/enrollments/{id}/contract =====
    def test_save_enrollment_contract(self):
        """POST /api/school/enrollments/{id}/contract saves consents, signature_text, contract_signed_at, contract_ip, contract_user_agent"""
        # First create an enrollment
        test_course_id = f"test_contract_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/school/enrollments", json={
            "course_id": test_course_id
        })
        assert create_response.status_code == 200
        enrollment_id = create_response.json().get("enrollment_id")
        
        # Save contract
        contract_data = {
            "consents": {
                "contract": True,
                "clauses": True,
                "privacy": True,
                "images": False
            },
            "signature_text": "Test User"
        }
        
        response = self.session.post(f"{BASE_URL}/api/school/enrollments/{enrollment_id}/contract", json=contract_data)
        
        assert response.status_code == 200, f"Save contract failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Contract save did not return ok=True"
        
        # Verify contract was saved by getting the enrollment
        get_response = self.session.get(f"{BASE_URL}/api/school/enrollments/{enrollment_id}")
        assert get_response.status_code == 200
        enrollment = get_response.json()
        
        assert enrollment.get("contract_accepted") == True, "contract_accepted not set"
        assert enrollment.get("contract_signed_at"), "contract_signed_at not set"
        assert enrollment.get("signature_text") == "Test User", "signature_text not saved"
        assert enrollment.get("consents", {}).get("contract") == True, "consents not saved"
        
        print(f"✓ Contract saved with consents, signature_text, contract_signed_at")

    # ===== POST /api/school/enrollments/{id}/confirm =====
    def test_confirm_enrollment_sets_confirmed_status(self):
        """POST /api/school/enrollments/{id}/confirm sets status to 'confirmed', sets confirmed_at, creates installments in 'installments' collection"""
        # First create an enrollment with payment plan
        test_course_id = f"test_confirm_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/school/enrollments", json={
            "course_id": test_course_id
        })
        assert create_response.status_code == 200
        enrollment_id = create_response.json().get("enrollment_id")
        
        # Update with payment plan
        update_data = {
            "payment_plan": [
                {"description": "Acconto", "amount": 1440, "due_date": "2026-02-01"},
                {"description": "Seconda rata", "amount": 1680, "due_date": "2026-05-01"},
                {"description": "Saldo", "amount": 1680, "due_date": "2026-08-01"}
            ]
        }
        self.session.put(f"{BASE_URL}/api/school/enrollments/{enrollment_id}", json=update_data)
        
        # Confirm the enrollment
        response = self.session.post(f"{BASE_URL}/api/school/enrollments/{enrollment_id}/confirm")
        
        assert response.status_code == 200, f"Confirm enrollment failed: {response.text}"
        data = response.json()
        
        # Verify status is 'confirmed'
        assert data.get("status") == "confirmed", f"Expected status 'confirmed', got '{data.get('status')}'"
        
        # Verify confirmed_at is set
        assert data.get("confirmed_at"), "confirmed_at not set"
        
        # Verify current_step is 6
        assert data.get("current_step") == 6, f"Expected current_step 6, got {data.get('current_step')}"
        
        print(f"✓ Enrollment confirmed with status='confirmed', confirmed_at set, current_step=6")

    def test_confirm_enrollment_creates_installments(self):
        """POST /api/school/enrollments/{id}/confirm creates installments in 'installments' collection"""
        # Create and confirm an enrollment with payment plan
        test_course_id = f"test_inst_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/school/enrollments", json={
            "course_id": test_course_id
        })
        assert create_response.status_code == 200
        enrollment_id = create_response.json().get("enrollment_id")
        
        # Update with payment plan (3 installments)
        update_data = {
            "payment_plan": [
                {"description": "Acconto", "amount": 1440, "due_date": "2026-02-01"},
                {"description": "Seconda rata", "amount": 1680, "due_date": "2026-05-01"},
                {"description": "Saldo", "amount": 1680, "due_date": "2026-08-01"}
            ]
        }
        self.session.put(f"{BASE_URL}/api/school/enrollments/{enrollment_id}", json=update_data)
        
        # Confirm the enrollment
        self.session.post(f"{BASE_URL}/api/school/enrollments/{enrollment_id}/confirm")
        
        # Get my enrollments to check installments
        my_enrollments_response = self.session.get(f"{BASE_URL}/api/school/enrollments/my")
        assert my_enrollments_response.status_code == 200
        enrollments = my_enrollments_response.json()
        
        # Find our enrollment
        our_enrollment = next((e for e in enrollments if e.get("enrollment_id") == enrollment_id), None)
        assert our_enrollment, "Enrollment not found in my enrollments"
        
        # Check installments are present
        installments = our_enrollment.get("installments", [])
        assert len(installments) == 3, f"Expected 3 installments, got {len(installments)}"
        
        print(f"✓ Confirm enrollment created {len(installments)} installments in 'installments' collection")

    # ===== GET /api/school/admin/enrollment-pipeline =====
    def test_admin_enrollment_pipeline_returns_in_progress_only(self):
        """GET /api/school/admin/enrollment-pipeline returns only enrollments with status 'in_progress'"""
        # First create an in_progress enrollment
        test_course_id = f"test_pipeline_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/school/enrollments", json={
            "course_id": test_course_id
        })
        assert create_response.status_code == 200
        in_progress_enrollment_id = create_response.json().get("enrollment_id")
        
        # Get pipeline
        response = self.session.get(f"{BASE_URL}/api/school/admin/enrollment-pipeline")
        
        assert response.status_code == 200, f"Get pipeline failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        # Verify all returned enrollments have status 'in_progress'
        for enrollment in data:
            assert enrollment.get("status") == "in_progress", \
                f"Pipeline should only return 'in_progress' enrollments, found '{enrollment.get('status')}'"
        
        # Verify our in_progress enrollment is in the list
        our_enrollment = next((e for e in data if e.get("enrollment_id") == in_progress_enrollment_id), None)
        assert our_enrollment, "Our in_progress enrollment should be in the pipeline"
        
        # Verify enriched fields
        assert "user_name" in our_enrollment, "user_name should be enriched"
        assert "user_email" in our_enrollment, "user_email should be enriched"
        
        print(f"✓ Pipeline returns only 'in_progress' enrollments ({len(data)} found)")

    def test_admin_enrollment_pipeline_excludes_confirmed(self):
        """GET /api/school/admin/enrollment-pipeline excludes confirmed enrollments"""
        # Create and confirm an enrollment
        test_course_id = f"test_pipeline_exc_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/school/enrollments", json={
            "course_id": test_course_id
        })
        assert create_response.status_code == 200
        enrollment_id = create_response.json().get("enrollment_id")
        
        # Confirm it
        self.session.post(f"{BASE_URL}/api/school/enrollments/{enrollment_id}/confirm")
        
        # Get pipeline
        response = self.session.get(f"{BASE_URL}/api/school/admin/enrollment-pipeline")
        assert response.status_code == 200
        data = response.json()
        
        # Verify our confirmed enrollment is NOT in the pipeline
        our_enrollment = next((e for e in data if e.get("enrollment_id") == enrollment_id), None)
        assert our_enrollment is None, "Confirmed enrollment should NOT be in the pipeline"
        
        print(f"✓ Pipeline correctly excludes confirmed enrollments")


class TestProfileEndpoint:
    """Test profile/user-details endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()

    def test_get_user_details(self):
        """GET /api/school/user-details returns user profile data"""
        response = self.session.get(f"{BASE_URL}/api/school/user-details")
        
        assert response.status_code == 200, f"Get user details failed: {response.text}"
        data = response.json()
        
        assert "user_id" in data, "user_id should be in response"
        print(f"✓ Get user details works")

    def test_save_user_details(self):
        """POST /api/school/user-details saves profile data"""
        profile_data = {
            "first_name": "Test",
            "last_name": "Admin",
            "phone": "+39 333 1234567"
        }
        
        response = self.session.post(f"{BASE_URL}/api/school/user-details", json=profile_data)
        
        assert response.status_code == 200, f"Save user details failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        
        # Verify data was saved
        get_response = self.session.get(f"{BASE_URL}/api/school/user-details")
        assert get_response.status_code == 200
        saved_data = get_response.json()
        
        assert saved_data.get("first_name") == "Test", "first_name not saved"
        assert saved_data.get("last_name") == "Admin", "last_name not saved"
        
        print(f"✓ Save user details works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
