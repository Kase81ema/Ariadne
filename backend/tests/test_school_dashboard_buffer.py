"""
Backend tests for School Dashboard redesign and Buffer integration
Tests: Community dashboard API (upcoming_events with course_id and user_interest),
       Buffer profiles API, Buffer publishing, Social profiles linking
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    def test_login_editor(self):
        """Test editor login - arianna.perrone@ariadne.test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "arianna.perrone@ariadne.test",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "arianna.perrone@ariadne.test"
        assert data["user"]["role"] == "editor"
        print("PASS: Editor login successful")

    def test_login_admin(self):
        """Test admin login - admin@ariadne.training"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print("PASS: Admin login successful")


class TestCommunityDashboard:
    """Tests for School Dashboard API - upcoming_events with course_id and user_interest"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "arianna.perrone@ariadne.test",
            "password": "password123"
        })
        return response.json()["token"]
    
    def test_dashboard_returns_upcoming_events(self, auth_token):
        """Verify dashboard returns upcoming_events array"""
        response = requests.get(
            f"{BASE_URL}/api/community/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "upcoming_events" in data
        assert isinstance(data["upcoming_events"], list)
        print(f"PASS: Dashboard returns upcoming_events ({len(data['upcoming_events'])} events)")
    
    def test_upcoming_events_have_course_id(self, auth_token):
        """Verify each event has course_id field"""
        response = requests.get(
            f"{BASE_URL}/api/community/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        events = data.get("upcoming_events", [])
        
        for event in events:
            assert "course_id" in event, f"Event '{event.get('title')}' missing course_id"
            assert isinstance(event["course_id"], str)
        print(f"PASS: All {len(events)} events have course_id field")
    
    def test_upcoming_events_have_user_interest(self, auth_token):
        """Verify each event has user_interest field"""
        response = requests.get(
            f"{BASE_URL}/api/community/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        events = data.get("upcoming_events", [])
        
        for event in events:
            assert "user_interest" in event, f"Event '{event.get('title')}' missing user_interest"
        print(f"PASS: All {len(events)} events have user_interest field")
    
    def test_dashboard_returns_banners(self, auth_token):
        """Verify dashboard returns banners for cards (Benvenuto, Iscrizioni aperte)"""
        response = requests.get(
            f"{BASE_URL}/api/community/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "banners" in data
        assert isinstance(data["banners"], list)
        print(f"PASS: Dashboard returns {len(data['banners'])} banners")
    
    def test_dashboard_returns_recent_posts(self, auth_token):
        """Verify dashboard returns recent_posts for 'Dalla bacheca' section"""
        response = requests.get(
            f"{BASE_URL}/api/community/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "recent_posts" in data
        assert isinstance(data["recent_posts"], list)
        print(f"PASS: Dashboard returns {len(data['recent_posts'])} recent posts")


class TestBufferIntegration:
    """Tests for Buffer API integration"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "arianna.perrone@ariadne.test",
            "password": "password123"
        })
        return response.json()["token"]
    
    def test_buffer_profiles_endpoint(self, auth_token):
        """Verify GET /api/buffer/profiles returns profiles"""
        response = requests.get(
            f"{BASE_URL}/api/buffer/profiles",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Buffer profiles returns {len(data)} profiles")
    
    def test_buffer_profiles_contains_emanuele_casero(self, auth_token):
        """Verify Buffer profiles includes Emanuele Casero LinkedIn profile"""
        response = requests.get(
            f"{BASE_URL}/api/buffer/profiles",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        emanuele_profile = None
        for profile in data:
            if "emanuele" in profile.get("name", "").lower() or "casero" in profile.get("display_name", "").lower():
                emanuele_profile = profile
                break
        
        assert emanuele_profile is not None, "Emanuele Casero profile not found in Buffer"
        assert emanuele_profile["service"] == "linkedin"
        assert emanuele_profile["id"] == "69aabbc93f3b94a121205244"
        print(f"PASS: Found Emanuele Casero LinkedIn profile with id {emanuele_profile['id']}")
    
    def test_social_profile_linked_to_buffer(self, auth_token):
        """Verify prof_casero_li social profile is linked to Buffer"""
        response = requests.get(
            f"{BASE_URL}/api/social-profiles",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        casero_profile = None
        for profile in data:
            if profile.get("profile_id") == "prof_casero_li":
                casero_profile = profile
                break
        
        assert casero_profile is not None, "prof_casero_li not found"
        assert casero_profile.get("buffer_profile_id") == "69aabbc93f3b94a121205244", \
            f"buffer_profile_id mismatch: expected 69aabbc93f3b94a121205244, got {casero_profile.get('buffer_profile_id')}"
        print(f"PASS: prof_casero_li linked to Buffer profile 69aabbc93f3b94a121205244")
    
    def test_previously_published_buffer_post(self, auth_token):
        """Verify test post was successfully published to Buffer"""
        response = requests.get(
            f"{BASE_URL}/api/posts?status=exported",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find the test post
        test_post = None
        for post in data:
            if post.get("post_id") == "post_bad04ab3e572":
                test_post = post
                break
        
        assert test_post is not None, "Test post post_bad04ab3e572 not found"
        assert test_post.get("buffer_post_id") == "69aacbee94a16103613fb1ba"
        assert test_post.get("buffer_status") == "published"
        print(f"PASS: Test post successfully published to Buffer with id {test_post['buffer_post_id']}")


class TestSocialProfiles:
    """Tests for social profiles management"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "arianna.perrone@ariadne.test",
            "password": "password123"
        })
        return response.json()["token"]
    
    def test_list_social_profiles(self, auth_token):
        """Verify GET /api/social-profiles returns profiles"""
        response = requests.get(
            f"{BASE_URL}/api/social-profiles",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"PASS: Social profiles returns {len(data)} profiles")
    
    def test_profile_structure(self, auth_token):
        """Verify profile has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/social-profiles",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for profile in data:
            assert "profile_id" in profile
            assert "name" in profile
            assert "platform" in profile
            assert "active" in profile
        print(f"PASS: All profiles have required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
