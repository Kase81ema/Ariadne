"""
Test suite for Ariadne Editorial Studio - Phase 1: Scuola e Community features
Tests: Role system, Community dashboard, Onboarding, Feed, Comments, Likes, Banners, Events, Admin user management
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthRoleSystem:
    """Test role assignment on registration and login"""
    
    def test_register_assigns_user_role_by_default(self):
        """New users should get role=user, not role=editor"""
        unique_email = f"test_user_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test User"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert data["user"]["role"] == "user", f"Expected role=user, got role={data['user']['role']}"
        assert data["user"]["email"] == unique_email
        assert "token" in data
        
    def test_login_returns_correct_user_data_with_role(self):
        """Login should return complete user data including role field"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert "role" in data["user"], "User data missing role field"
        assert data["user"]["role"] == "admin"
        assert "token" in data
        assert data["user"]["email"] == "admin@ariadne.training"

    def test_login_editor_user(self):
        """Test login for editor user"""
        # First register/create editor user if not exists
        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "arianna.perrone@ariadne.test",
            "password": "password123",
            "name": "Arianna Perrone"
        })
        # Login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "arianna.perrone@ariadne.test",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "role" in data["user"]


class TestCommunityDashboard:
    """Test community dashboard endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
        
    def test_dashboard_returns_expected_fields(self, admin_token):
        """Dashboard should return onboarded, banners, upcoming_events, recent_posts, journey_summary"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/community/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Verify all expected fields
        assert "onboarded" in data, "Missing onboarded field"
        assert "banners" in data, "Missing banners field"
        assert "upcoming_events" in data, "Missing upcoming_events field"
        assert "recent_posts" in data, "Missing recent_posts field"
        assert "journey_summary" in data, "Missing journey_summary field"
        
        # journey_summary structure
        assert "total_steps" in data["journey_summary"]
        assert "completed_steps" in data["journey_summary"]
        
    def test_dashboard_banners_are_list(self, admin_token):
        """Banners should be a list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/community/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["banners"], list)


class TestOnboarding:
    """Test onboarding flow"""
    
    @pytest.fixture
    def new_user_token(self):
        """Create a new user for testing onboarding"""
        unique_email = f"test_onboard_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Onboarding Test User"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("User creation failed")
        
    def test_profile_returns_onboarded_false_for_new_user(self, new_user_token):
        """New users should have onboarded=false"""
        headers = {"Authorization": f"Bearer {new_user_token}"}
        response = requests.get(f"{BASE_URL}/api/community/profile", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("onboarded") == False or "onboarded" not in data or data.get("onboarded") is False
        
    def test_save_onboarding_profile(self, new_user_token):
        """Onboarding should save display_name, objective, level"""
        headers = {"Authorization": f"Bearer {new_user_token}"}
        onboarding_data = {
            "display_name": "Test Display Name",
            "objective": "crescita_personale",
            "level": "interessato"
        }
        response = requests.post(f"{BASE_URL}/api/community/onboarding", 
                                 headers=headers, json=onboarding_data)
        assert response.status_code == 200, f"Onboarding failed: {response.text}"
        data = response.json()
        assert data["display_name"] == "Test Display Name"
        assert data["objective"] == "crescita_personale"
        assert data["level"] == "interessato"
        assert data["onboarded"] == True
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/community/profile", headers=headers)
        assert get_response.status_code == 200
        profile = get_response.json()
        assert profile["onboarded"] == True
        assert profile["display_name"] == "Test Display Name"


class TestFeed:
    """Test feed endpoints (posts, likes, comments)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
        
    @pytest.fixture
    def user_token(self):
        """Create a regular user for testing"""
        unique_email = f"test_feed_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Feed Test User"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("User creation failed")
    
    def test_get_feed_returns_enriched_posts(self, admin_token):
        """Feed should return posts with author, like_count, comment_count, user_liked"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/community/feed", headers=headers)
        assert response.status_code == 200
        posts = response.json()
        assert isinstance(posts, list)
        # If there are posts, verify structure
        if len(posts) > 0:
            post = posts[0]
            assert "author" in post
            assert "like_count" in post
            assert "comment_count" in post
            assert "user_liked" in post
            
    def test_create_post_returns_enriched_post(self, user_token):
        """Creating a post should return enriched post with author info"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{BASE_URL}/api/community/feed", 
                                 headers=headers, json={"content": "TEST_This is a test post"})
        assert response.status_code == 200, f"Create post failed: {response.text}"
        data = response.json()
        assert "post_id" in data
        assert data["content"] == "TEST_This is a test post"
        assert "author" in data
        assert data["like_count"] == 0
        assert data["comment_count"] == 0
        assert data["user_liked"] == False
        return data["post_id"]
        
    def test_create_post_empty_content_fails(self, user_token):
        """Creating a post with empty content should fail"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{BASE_URL}/api/community/feed", 
                                 headers=headers, json={"content": ""})
        assert response.status_code == 400
        
    def test_toggle_like(self, user_token):
        """Like toggle should return liked status and count"""
        headers = {"Authorization": f"Bearer {user_token}"}
        # Create a post first
        create_resp = requests.post(f"{BASE_URL}/api/community/feed", 
                                    headers=headers, json={"content": "TEST_Like test post"})
        assert create_resp.status_code == 200
        post_id = create_resp.json()["post_id"]
        
        # Like the post
        like_resp = requests.post(f"{BASE_URL}/api/community/feed/{post_id}/like", headers=headers)
        assert like_resp.status_code == 200
        like_data = like_resp.json()
        assert "liked" in like_data
        assert "count" in like_data
        assert like_data["liked"] == True
        assert like_data["count"] == 1
        
        # Unlike the post
        unlike_resp = requests.post(f"{BASE_URL}/api/community/feed/{post_id}/like", headers=headers)
        assert unlike_resp.status_code == 200
        unlike_data = unlike_resp.json()
        assert unlike_data["liked"] == False
        assert unlike_data["count"] == 0
        
    def test_add_comment_with_author(self, user_token):
        """Adding a comment should return comment with author info"""
        headers = {"Authorization": f"Bearer {user_token}"}
        # Create a post first
        create_resp = requests.post(f"{BASE_URL}/api/community/feed", 
                                    headers=headers, json={"content": "TEST_Comment test post"})
        assert create_resp.status_code == 200
        post_id = create_resp.json()["post_id"]
        
        # Add a comment
        comment_resp = requests.post(f"{BASE_URL}/api/community/feed/{post_id}/comments", 
                                     headers=headers, json={"content": "TEST_This is a test comment"})
        assert comment_resp.status_code == 200, f"Add comment failed: {comment_resp.text}"
        comment_data = comment_resp.json()
        assert "comment_id" in comment_data
        assert comment_data["content"] == "TEST_This is a test comment"
        assert "author" in comment_data
        
    def test_delete_post_soft_deletes(self, user_token):
        """Delete post should soft-delete (author can delete own posts)"""
        headers = {"Authorization": f"Bearer {user_token}"}
        # Create a post first
        create_resp = requests.post(f"{BASE_URL}/api/community/feed", 
                                    headers=headers, json={"content": "TEST_Delete test post"})
        assert create_resp.status_code == 200
        post_id = create_resp.json()["post_id"]
        
        # Delete the post
        delete_resp = requests.delete(f"{BASE_URL}/api/community/feed/{post_id}", headers=headers)
        assert delete_resp.status_code == 200
        assert delete_resp.json()["ok"] == True
        
    def test_admin_can_delete_any_post(self, admin_token, user_token):
        """Admin should be able to delete any user's post"""
        user_headers = {"Authorization": f"Bearer {user_token}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a post as regular user
        create_resp = requests.post(f"{BASE_URL}/api/community/feed", 
                                    headers=user_headers, json={"content": "TEST_Admin delete test"})
        assert create_resp.status_code == 200
        post_id = create_resp.json()["post_id"]
        
        # Delete as admin
        delete_resp = requests.delete(f"{BASE_URL}/api/community/feed/{post_id}", headers=admin_headers)
        assert delete_resp.status_code == 200
        
    def test_delete_comment_soft_deletes(self, user_token):
        """Delete comment should soft-delete"""
        headers = {"Authorization": f"Bearer {user_token}"}
        # Create a post and comment
        post_resp = requests.post(f"{BASE_URL}/api/community/feed", 
                                  headers=headers, json={"content": "TEST_Comment delete test"})
        post_id = post_resp.json()["post_id"]
        comment_resp = requests.post(f"{BASE_URL}/api/community/feed/{post_id}/comments", 
                                     headers=headers, json={"content": "TEST_Comment to delete"})
        comment_id = comment_resp.json()["comment_id"]
        
        # Delete comment
        delete_resp = requests.delete(f"{BASE_URL}/api/community/feed/comments/{comment_id}", headers=headers)
        assert delete_resp.status_code == 200


class TestBanners:
    """Test banner management endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
        
    @pytest.fixture
    def user_token(self):
        """Create a regular user"""
        unique_email = f"test_banner_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Banner Test User"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("User creation failed")
    
    def test_get_banners_filtered_for_user(self, user_token):
        """Regular users should get filtered banners based on audience"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/community/banners", headers=headers)
        assert response.status_code == 200
        banners = response.json()
        assert isinstance(banners, list)
        
    def test_get_all_banners_admin_only(self, admin_token, user_token):
        """Only admin/editor can access all banners"""
        # Admin should succeed
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        admin_resp = requests.get(f"{BASE_URL}/api/community/banners/all", headers=admin_headers)
        assert admin_resp.status_code == 200
        
        # Regular user should fail
        user_headers = {"Authorization": f"Bearer {user_token}"}
        user_resp = requests.get(f"{BASE_URL}/api/community/banners/all", headers=user_headers)
        assert user_resp.status_code == 403
        
    def test_create_banner_admin_editor(self, admin_token):
        """Admin/editor can create banners"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        banner_data = {
            "title": "TEST_Test Banner",
            "body": "This is a test banner body",
            "link": "/test",
            "cta_text": "Test CTA",
            "audience": "all",
            "enabled": True,
            "priority": 5
        }
        response = requests.post(f"{BASE_URL}/api/community/banners", headers=headers, json=banner_data)
        assert response.status_code == 200, f"Create banner failed: {response.text}"
        data = response.json()
        assert data["title"] == "TEST_Test Banner"
        assert "banner_id" in data
        return data["banner_id"]
        
    def test_update_banner(self, admin_token):
        """Update banner fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Create banner first
        create_resp = requests.post(f"{BASE_URL}/api/community/banners", headers=headers, json={
            "title": "TEST_Banner to Update",
            "body": "Original body"
        })
        banner_id = create_resp.json()["banner_id"]
        
        # Update
        update_resp = requests.put(f"{BASE_URL}/api/community/banners/{banner_id}", 
                                   headers=headers, json={"title": "TEST_Updated Banner"})
        assert update_resp.status_code == 200
        assert update_resp.json()["title"] == "TEST_Updated Banner"
        
    def test_delete_banner_admin_only(self, admin_token):
        """Only admin can delete banners"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Create banner
        create_resp = requests.post(f"{BASE_URL}/api/community/banners", headers=headers, json={
            "title": "TEST_Banner to Delete",
            "body": "Will be deleted"
        })
        banner_id = create_resp.json()["banner_id"]
        
        # Delete
        delete_resp = requests.delete(f"{BASE_URL}/api/community/banners/{banner_id}", headers=headers)
        assert delete_resp.status_code == 200
        assert delete_resp.json()["ok"] == True


class TestCommunityEvents:
    """Test community events endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_get_upcoming_events(self, admin_token):
        """Should return upcoming courses/events"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/community/events", headers=headers)
        assert response.status_code == 200
        events = response.json()
        assert isinstance(events, list)
        # Verify structure if events exist
        if len(events) > 0:
            event = events[0]
            assert "title" in event
            assert "next_date" in event


class TestAdminUserManagement:
    """Test admin user management endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
        
    @pytest.fixture
    def test_user(self):
        """Create a test user for admin operations"""
        unique_email = f"test_admin_target_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Admin Target User"
        })
        if response.status_code == 200:
            return response.json()["user"]["user_id"]
        pytest.skip("Test user creation failed")
    
    def test_list_users_returns_enriched_data(self, admin_token):
        """List users should return users with community_profile and post_count"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0  # At least admin user exists
        
        # Verify structure
        user = users[0]
        assert "community_profile" in user
        assert "post_count" in user
        assert "role" in user
        
    def test_change_role_admin_only(self, admin_token, test_user):
        """Only admin can change roles"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/api/admin/users/{test_user}/role", 
                                headers=headers, json={"role": "editor"})
        assert response.status_code == 200
        assert response.json()["role"] == "editor"
        
        # Change back to user
        response2 = requests.put(f"{BASE_URL}/api/admin/users/{test_user}/role", 
                                 headers=headers, json={"role": "user"})
        assert response2.status_code == 200
        assert response2.json()["role"] == "user"
        
    def test_change_role_invalid_role_fails(self, admin_token, test_user):
        """Invalid role should fail"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/api/admin/users/{test_user}/role", 
                                headers=headers, json={"role": "superadmin"})
        assert response.status_code == 400
        
    def test_toggle_suspend(self, admin_token, test_user):
        """Toggle suspend should work"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Suspend
        response = requests.put(f"{BASE_URL}/api/admin/users/{test_user}/suspend", headers=headers)
        assert response.status_code == 200
        assert response.json()["suspended"] == True
        
        # Unsuspend
        response2 = requests.put(f"{BASE_URL}/api/admin/users/{test_user}/suspend", headers=headers)
        assert response2.status_code == 200
        assert response2.json()["suspended"] == False
        
    def test_remove_user_content(self, admin_token, test_user):
        """Remove user content should work"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.delete(f"{BASE_URL}/api/admin/users/{test_user}/content", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "ok" in data
        assert "posts_removed" in data
        assert "comments_removed" in data
        
    def test_non_admin_cannot_change_roles(self):
        """Regular users cannot change roles"""
        # Create a regular user
        unique_email = f"test_nonadmin_{uuid.uuid4().hex[:8]}@test.com"
        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Non Admin User"
        })
        user_token = register_resp.json()["token"]
        user_id = register_resp.json()["user"]["user_id"]
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.put(f"{BASE_URL}/api/admin/users/{user_id}/role", 
                                headers=headers, json={"role": "admin"})
        assert response.status_code == 403


# Run tests if called directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
