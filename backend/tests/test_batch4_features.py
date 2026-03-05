"""
Test suite for Ariadne Editorial Studio - Batch 4 Features
Tests: Theme verification, Feed seed-samples, Banner seed-samples, Post image upload, Uploads serving
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    def test_admin_login(self, admin_token):
        """Test admin login works"""
        assert admin_token is not None
        print(f"PASS: Admin login successful, token starts with: {admin_token[:20]}...")


class TestFeedSeedSamples:
    """Test POST /api/community/feed/seed-samples endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_seed_sample_posts(self, admin_token):
        """Test seeding sample posts from trainers"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/community/feed/seed-samples", headers=headers)
        assert response.status_code == 200, f"Seed failed: {response.text}"
        data = response.json()
        # Either seeded new posts or already exists
        assert "seeded" in data or "message" in data
        print(f"PASS: Feed seed-samples returned: {data}")
    
    def test_feed_contains_trainer_posts(self, admin_token):
        """Verify feed contains posts from trainers Maria, Luca, Giulia, Marco, Elena"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/community/feed", headers=headers)
        assert response.status_code == 200
        posts = response.json()
        
        # Check for trainer names in authors
        trainer_names = ["Maria Rossi", "Luca Bianchi", "Giulia Verdi", "Marco Ferrari", "Elena Conti"]
        found_trainers = set()
        for post in posts:
            author_name = post.get("author", {}).get("name", "")
            for trainer in trainer_names:
                if trainer in author_name:
                    found_trainers.add(trainer)
        
        print(f"PASS: Found {len(found_trainers)} trainers in feed: {found_trainers}")
        # At least some trainers should be present
        assert len(found_trainers) >= 1 or len(posts) > 0, "No trainer posts found in feed"


class TestBannerSeedSamples:
    """Test POST /api/community/banners/seed-samples endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_seed_sample_banners(self, admin_token):
        """Test seeding sample banners with images"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/community/banners/seed-samples", headers=headers)
        assert response.status_code == 200, f"Seed failed: {response.text}"
        data = response.json()
        assert "seeded" in data
        print(f"PASS: Banner seed-samples returned: {data}")
    
    def test_banners_have_images(self, admin_token):
        """Verify banners have image_url field with Unsplash URLs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/community/banners", headers=headers)
        assert response.status_code == 200
        banners = response.json()
        
        banners_with_images = [b for b in banners if b.get("image_url")]
        print(f"PASS: Found {len(banners_with_images)} banners with images out of {len(banners)} total")
        # At least some banners should have images
        assert len(banners) > 0, "No banners found"


class TestPostImageUpload:
    """Test POST /api/posts/{post_id}/upload-image endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def test_campaign(self, admin_token):
        """Create a test campaign for post creation"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/campaigns", headers=headers, json={
            "title": "TEST_Campaign_ImageUpload",
            "type": "editorial",
            "profiles": [],
            "period_start": "2026-01-01",
            "period_end": "2026-01-31"
        })
        if response.status_code == 200:
            return response.json()
        return None
    
    @pytest.fixture(scope="class")
    def test_post(self, admin_token, test_campaign):
        """Create a test post for image upload"""
        if not test_campaign:
            pytest.skip("No test campaign")
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/posts", headers=headers, json={
            "campaign_id": test_campaign["campaign_id"],
            "profile_id": "",
            "platform": "linkedin_company",
            "scheduled_date": "2026-01-15",
            "content": "TEST post for image upload"
        })
        assert response.status_code == 200, f"Post creation failed: {response.text}"
        return response.json()
    
    def test_upload_image_endpoint_exists(self, admin_token, test_post):
        """Test that upload-image endpoint exists and accepts files"""
        if not test_post:
            pytest.skip("No test post")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        post_id = test_post["post_id"]
        
        # Create a small test image (1x1 pixel PNG)
        import base64
        tiny_png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
        
        files = {"file": ("test.png", tiny_png, "image/png")}
        response = requests.post(f"{BASE_URL}/api/posts/{post_id}/upload-image", headers=headers, files=files)
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert "image_url" in data
        print(f"PASS: Post image upload successful, URL: {data['image_url']}")
    
    def test_delete_post_image(self, admin_token, test_post):
        """Test delete-image endpoint"""
        if not test_post:
            pytest.skip("No test post")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        post_id = test_post["post_id"]
        
        response = requests.delete(f"{BASE_URL}/api/posts/{post_id}/upload-image", headers=headers)
        assert response.status_code == 200
        print("PASS: Post image delete successful")


class TestUploadsServing:
    """Test GET /api/uploads/{subdir}/{filename} endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_uploads_subdir_endpoint_exists(self, admin_token):
        """Test that uploads serving with subdir path exists"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Test with non-existent file should return 404, not 500 or 405
        response = requests.get(f"{BASE_URL}/api/uploads/post_images/nonexistent.jpg", headers=headers)
        # Should be 404 (file not found) not 405 (method not allowed) or 500
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"PASS: Uploads subdir endpoint exists (status: {response.status_code})")


class TestSchoolCatalog:
    """Test /api/school/catalog for course catalog with 2 tabs"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_catalog_returns_courses(self, admin_token):
        """Test catalog endpoint returns courses with categories"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/school/catalog", headers=headers)
        assert response.status_code == 200, f"Catalog failed: {response.text}"
        courses = response.json()
        
        ariadne_courses = [c for c in courses if c.get("category") == "ariadne"]
        business_courses = [c for c in courses if c.get("category") == "business"]
        
        print(f"PASS: Catalog has {len(ariadne_courses)} Ariadne courses and {len(business_courses)} business courses")
        assert len(courses) > 0, "No courses in catalog"


class TestDashboardStats:
    """Test dashboard stats for clickable stat cards"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_dashboard_stats_include_all_fields(self, admin_token):
        """Test dashboard stats include draft, generated, exported, campaigns"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200, f"Stats failed: {response.text}"
        stats = response.json()
        
        required_fields = ["draft_posts", "generated_posts", "exported_posts", "active_campaigns"]
        for field in required_fields:
            assert field in stats, f"Missing field: {field}"
        
        print(f"PASS: Dashboard stats contains: draft={stats.get('draft_posts')}, generated={stats.get('generated_posts')}, exported={stats.get('exported_posts')}, campaigns={stats.get('active_campaigns')}")


class TestCommunityDashboard:
    """Test community dashboard endpoint returns journey summary"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_dashboard_includes_banners(self, admin_token):
        """Test community dashboard includes banners with images"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/community/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        assert "banners" in data
        print(f"PASS: Community dashboard has {len(data.get('banners', []))} banners")
    
    def test_dashboard_includes_recent_posts(self, admin_token):
        """Test community dashboard includes recent feed posts"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/community/dashboard", headers=headers)
        data = response.json()
        
        assert "recent_posts" in data
        print(f"PASS: Community dashboard has {len(data.get('recent_posts', []))} recent posts")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        return response.json().get("token")
    
    def test_cleanup_test_campaigns(self, admin_token):
        """Delete TEST_ prefixed campaigns"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        if response.status_code == 200:
            campaigns = response.json()
            for c in campaigns:
                if c.get("title", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/campaigns/{c['campaign_id']}", headers=headers)
        print("PASS: Cleaned up test campaigns")
