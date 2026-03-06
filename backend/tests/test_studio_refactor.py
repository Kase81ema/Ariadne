"""
Test suite for Studio architectural refactor (iteration 13)
- Dashboard (Centro di controllo) API with campaign pipeline and recent campaigns
- Campaigns (EditorialPage) API with enriched data
- Workflow page support (save-notes endpoint)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for editor user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "arianna.perrone@ariadne.test",
        "password": "password123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data
    return data["token"]

@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with authentication"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }

class TestDashboardStats:
    """Test Dashboard (Centro di controllo) API"""
    
    def test_dashboard_stats_returns_200(self, headers):
        """Dashboard stats endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200
    
    def test_dashboard_stats_has_campaign_pipeline(self, headers):
        """Dashboard stats should return campaign pipeline counts"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Verify campaign pipeline fields exist
        assert "campaigns_draft" in data
        assert "campaigns_planning" in data
        assert "campaigns_review" in data
        assert "campaigns_exported" in data
        # Values should be integers >= 0
        assert isinstance(data["campaigns_draft"], int)
        assert isinstance(data["campaigns_planning"], int)
        assert isinstance(data["campaigns_review"], int)
        assert isinstance(data["campaigns_exported"], int)
    
    def test_dashboard_stats_has_recent_campaigns(self, headers):
        """Dashboard stats should return recent_campaigns array"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "recent_campaigns" in data
        assert isinstance(data["recent_campaigns"], list)
        # If there are recent campaigns, verify they have enriched data
        if len(data["recent_campaigns"]) > 0:
            rc = data["recent_campaigns"][0]
            assert "campaign_id" in rc
            assert "title" in rc
            assert "posts_total" in rc
            assert "posts_approved" in rc
            assert isinstance(rc["posts_total"], int)
            assert isinstance(rc["posts_approved"], int)
    
    def test_dashboard_stats_has_active_campaigns(self, headers):
        """Dashboard stats should return active_campaigns count"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "active_campaigns" in data
        assert isinstance(data["active_campaigns"], int)

class TestCampaignsAPI:
    """Test Campaigns list API with enriched data"""
    
    def test_campaigns_list_returns_200(self, headers):
        """GET /api/campaigns should return 200"""
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_campaigns_list_has_post_counts(self, headers):
        """Campaigns should have posts_total, posts_draft, posts_approved counts"""
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        assert response.status_code == 200
        campaigns = response.json()
        if len(campaigns) > 0:
            c = campaigns[0]
            assert "posts_total" in c, "Missing posts_total field"
            assert "posts_draft" in c, "Missing posts_draft field"
            assert "posts_approved" in c, "Missing posts_approved field"
            assert isinstance(c["posts_total"], int)
            assert isinstance(c["posts_draft"], int)
            assert isinstance(c["posts_approved"], int)
    
    def test_campaigns_list_has_course_title(self, headers):
        """Campaigns should have course_title field"""
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        assert response.status_code == 200
        campaigns = response.json()
        if len(campaigns) > 0:
            c = campaigns[0]
            assert "course_title" in c, "Missing course_title field"
    
    def test_campaigns_list_has_type_field(self, headers):
        """Campaigns should have type field (course_based or editorial)"""
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        assert response.status_code == 200
        campaigns = response.json()
        if len(campaigns) > 0:
            for c in campaigns[:3]:
                assert "type" in c, "Missing type field"
                assert c["type"] in ["course_based", "editorial", ""], f"Unexpected type: {c['type']}"
    
    def test_campaign_get_single_enriched(self, headers):
        """GET /api/campaigns/{id} should return enriched data"""
        # First get list to find an existing campaign
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        assert response.status_code == 200
        campaigns = response.json()
        if len(campaigns) == 0:
            pytest.skip("No campaigns available to test")
        
        campaign_id = campaigns[0]["campaign_id"]
        response = requests.get(f"{BASE_URL}/api/campaigns/{campaign_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "posts_total" in data
        assert "posts_approved" in data
        assert "course_title" in data

class TestSaveNotesAPI:
    """Test save-notes endpoint for Workflow page"""
    
    def test_save_notes_returns_200(self, headers):
        """POST /api/campaigns/{id}/save-notes should return 200"""
        # Get an existing campaign
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        campaigns = response.json()
        if len(campaigns) == 0:
            pytest.skip("No campaigns available to test")
        
        campaign_id = campaigns[0]["campaign_id"]
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{campaign_id}/save-notes",
            headers=headers,
            json={
                "notes": "Test notes from pytest",
                "title": "Test Notes Title"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert "file_id" in data
    
    def test_save_notes_empty_fails(self, headers):
        """POST /api/campaigns/{id}/save-notes with empty notes should fail"""
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        campaigns = response.json()
        if len(campaigns) == 0:
            pytest.skip("No campaigns available to test")
        
        campaign_id = campaigns[0]["campaign_id"]
        response = requests.post(
            f"{BASE_URL}/api/campaigns/{campaign_id}/save-notes",
            headers=headers,
            json={
                "notes": "",
                "title": "Empty Notes"
            }
        )
        # Empty notes should return 400
        assert response.status_code == 400

class TestWorkflowSupportAPIs:
    """Test APIs that support Workflow page functionality"""
    
    def test_courses_list_returns_200(self, headers):
        """GET /api/courses-events should return 200"""
        response = requests.get(f"{BASE_URL}/api/courses-events", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_profiles_list_returns_200(self, headers):
        """GET /api/social-profiles should return 200"""
        response = requests.get(f"{BASE_URL}/api/social-profiles", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_rules_list_returns_200(self, headers):
        """GET /api/planning-rules should return 200"""
        response = requests.get(f"{BASE_URL}/api/planning-rules", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_agents_list_returns_200(self, headers):
        """GET /api/agents should return 200"""
        response = requests.get(f"{BASE_URL}/api/agents", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_posts_by_campaign_returns_200(self, headers):
        """GET /api/posts?campaign_id={id} should return 200"""
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        campaigns = response.json()
        if len(campaigns) == 0:
            pytest.skip("No campaigns available to test")
        
        campaign_id = campaigns[0]["campaign_id"]
        response = requests.get(f"{BASE_URL}/api/posts?campaign_id={campaign_id}", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
