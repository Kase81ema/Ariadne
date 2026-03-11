"""
Test suite for Iteration 15 features:
- School dashboard Benvenuto card with 4 categories
- Welcome page sections and audience categories
- Gmail integration API endpoints
- Payment management CSV export
- Community dashboard events with course_id and user_interest
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthFlow:
    """Test authentication for admin user"""
    
    def test_admin_login(self):
        """Login as admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Admin login successful: {data['user'].get('name', data['user']['email'])}")
        return data["token"]


class TestGmailIntegration:
    """Test Gmail integration endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_gmail_status_returns_correct_structure(self):
        """GET /api/inbox/gmail-status should return correct status"""
        response = requests.get(f"{BASE_URL}/api/inbox/gmail-status", headers=self.headers)
        assert response.status_code == 200, f"Gmail status failed: {response.text}"
        data = response.json()
        # Should have connected, configured, and message fields
        assert "connected" in data
        assert "configured" in data
        assert "message" in data
        # Since GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are empty, configured should be False
        assert data["configured"] == False, f"Expected configured=false since no Google credentials"
        print(f"✓ Gmail status: connected={data['connected']}, configured={data['configured']}")
        print(f"  Message: {data['message']}")
    
    def test_gmail_connect_returns_400_when_not_configured(self):
        """GET /api/inbox/gmail/connect should return 400 when credentials not configured"""
        response = requests.get(f"{BASE_URL}/api/inbox/gmail/connect", headers=self.headers)
        # Should return 400 because GOOGLE_CLIENT_ID is empty
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"✓ Gmail connect correctly returns 400 when not configured")


class TestCommunityDashboard:
    """Test community dashboard returns events with course_id and user_interest"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_returns_upcoming_events_with_required_fields(self):
        """GET /api/community/dashboard should return events with course_id and user_interest"""
        response = requests.get(f"{BASE_URL}/api/community/dashboard", headers=self.headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        assert "upcoming_events" in data
        # Check structure of events
        events = data["upcoming_events"]
        print(f"✓ Dashboard returned {len(events)} upcoming events")
        for event in events:
            # Every event should have course_id field (can be empty string)
            assert "course_id" in event, f"Event missing course_id: {event}"
            # Every event should have user_interest field
            assert "user_interest" in event, f"Event missing user_interest: {event}"
            print(f"  - {event.get('title', 'Unknown')}: course_id={event.get('course_id', '')}, user_interest={event.get('user_interest', '')}")


class TestPaymentOverviewEndpoint:
    """Test payment overview endpoint for CSV export data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_payment_overview_returns_rows_for_csv(self):
        """GET /api/school/admin/payment-overview should return data for CSV export"""
        response = requests.get(f"{BASE_URL}/api/school/admin/payment-overview", headers=self.headers)
        assert response.status_code == 200, f"Payment overview failed: {response.text}"
        data = response.json()
        assert "summary" in data
        assert "rows" in data
        print(f"✓ Payment overview: {len(data['rows'])} payment rows")
        print(f"  Summary: {data['summary']}")


class TestInboxThreadsAPI:
    """Test inbox threads API for Gmail panel integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_inbox_threads_list(self):
        """GET /api/inbox/threads should return thread list"""
        response = requests.get(f"{BASE_URL}/api/inbox/threads", headers=self.headers)
        assert response.status_code == 200, f"Inbox threads failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Inbox threads: {len(data)} threads found")


class TestTrainingCoursesAPI:
    """Test training courses API returns proper data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_training_courses_list(self):
        """GET /api/school/training-courses should return courses"""
        response = requests.get(f"{BASE_URL}/api/school/training-courses", headers=self.headers)
        assert response.status_code == 200, f"Training courses failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Training courses: {len(data)} courses found")
        for course in data[:3]:
            print(f"  - {course.get('title', 'Unknown')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
