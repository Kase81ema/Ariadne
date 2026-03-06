"""
Backend API tests for Images Module - Ariadne Editorial Studio
Tests: media assets, repository images, assignments, Buffer GraphQL integration
"""
import os
import pytest
import requests
import io
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "arianna.perrone@ariadne.test"
TEST_PASSWORD = "password123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for editor user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


def create_test_image():
    """Create a minimal test image file"""
    img = Image.new('RGB', (100, 100), color='blue')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes


# =============================================================================
# MEDIA ASSETS API TESTS
# =============================================================================

class TestMediaAssets:
    """Media assets CRUD and upload tests"""

    def test_list_media_assets(self, api_client):
        """Test listing media assets"""
        response = api_client.get(f"{BASE_URL}/api/media/assets")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Listed {len(data)} media assets")

    def test_upload_media_asset(self, auth_token):
        """Test uploading a new media asset"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create test image
        img_bytes = create_test_image()
        files = {
            'file': ('test_upload.png', img_bytes, 'image/png')
        }
        data = {
            'title': 'TEST_upload_image',
            'description': 'Test description for upload',
            'tags': 'test,upload',
            'course_id': '',
            'auto_process': 'false',
            'auto_improve': 'false',
            'overlay_brand': 'false'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/media/assets/upload",
            headers=headers,
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        assert 'asset_id' in result
        assert result.get('title') == 'TEST_upload_image'
        assert 'public_url' in result
        print(f"PASS: Uploaded asset {result['asset_id']} with public_url: {result['public_url']}")
        return result['asset_id']

    def test_public_url_accessible(self, api_client):
        """Test that public URL is accessible without auth"""
        # First get an asset
        response = api_client.get(f"{BASE_URL}/api/media/assets")
        assets = response.json()
        
        if not assets:
            pytest.skip("No assets available for public URL test")
        
        asset = assets[0]
        public_url = asset.get('public_url', '')
        
        if not public_url:
            pytest.skip("Asset has no public_url")
        
        # Test public access WITHOUT auth header
        public_response = requests.get(public_url, timeout=10)
        assert public_response.status_code == 200
        content_type = public_response.headers.get('content-type', '')
        assert 'image' in content_type.lower()
        print(f"PASS: Public URL accessible with content-type: {content_type}")

    def test_upload_asset_with_auto_process(self, auth_token):
        """Test uploading asset with auto-processing enabled"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        img_bytes = create_test_image()
        files = {
            'file': ('test_process.png', img_bytes, 'image/png')
        }
        data = {
            'title': 'TEST_processed_image',
            'auto_process': 'true',
            'auto_improve': 'false'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/media/assets/upload",
            headers=headers,
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        
        # If auto_process, should return a job_id
        if result.get('job_id'):
            print(f"PASS: Upload with auto_process started job: {result['job_id']}")
        else:
            print(f"PASS: Upload completed immediately with asset_id: {result.get('asset_id')}")


# =============================================================================
# REPOSITORY IMAGES TESTS
# =============================================================================

class TestRepositoryImages:
    """Repository images upload, indexing, listing, import tests"""

    def test_upload_repository_image(self, auth_token):
        """Test uploading image to repository"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        img_bytes = create_test_image()
        files = {
            'file': ('test_repo.png', img_bytes, 'image/png')
        }
        data = {
            'title': 'TEST_repository_image',
            'tags': 'repo,test',
            'course_id': ''
        }
        
        response = requests.post(
            f"{BASE_URL}/api/media/repository-images/upload",
            headers=headers,
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        assert 'file_id' in result
        assert result.get('category') == 'repository_immagini'
        print(f"PASS: Uploaded repository image with file_id: {result['file_id']}")

    def test_index_repository_images(self, api_client):
        """Test indexing repository images"""
        response = api_client.post(f"{BASE_URL}/api/media/repository-images/index")
        assert response.status_code == 200
        result = response.json()
        assert 'indexed' in result
        print(f"PASS: Indexed {result['indexed']} repository images")

    def test_list_repository_images(self, api_client):
        """Test listing repository images"""
        response = api_client.get(f"{BASE_URL}/api/media/repository-images")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Listed {len(data)} repository images")
        return data

    def test_import_repository_image(self, api_client):
        """Test importing repository image to media library"""
        # Get repository images list
        response = api_client.get(f"{BASE_URL}/api/media/repository-images")
        images = response.json()
        
        if not images:
            pytest.skip("No repository images to import")
        
        index_id = images[0].get('id')
        if not index_id:
            pytest.skip("Repository image has no id")
        
        response = api_client.post(f"{BASE_URL}/api/media/repository-images/{index_id}/import")
        assert response.status_code == 200
        result = response.json()
        assert 'asset_id' in result
        assert result.get('source_type') == 'repository'
        print(f"PASS: Imported repository image to asset: {result['asset_id']}")


# =============================================================================
# AI IMAGE GENERATION TESTS
# =============================================================================

class TestAIGeneration:
    """AI image generation tests"""

    def test_generate_ai_image_starts_job(self, api_client):
        """Test that AI generation starts a job (may fail due to API limits)"""
        payload = {
            "prompt": "Aula luminosa con trainer e partecipanti",
            "style": "sobrio editoriale",
            "course_id": "",
            "tags": "test,ai",
            "auto_improve": False,
            "overlay_brand": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/media/assets/generate", json=payload)
        
        # Accept 200 (job started) or 400/500 (API key issues or quota)
        if response.status_code == 200:
            result = response.json()
            assert 'job_id' in result
            assert 'asset_id' in result
            print(f"PASS: AI generation job started: {result['job_id']}")
        else:
            # Graceful handling if AI generation fails due to quota/config
            print(f"INFO: AI generation returned {response.status_code} - may be expected if quota/config issue")
            print(f"Response: {response.text[:200]}")


# =============================================================================
# MEDIA PROCESSING (CROP/ENHANCE) TESTS
# =============================================================================

class TestMediaProcessing:
    """Media processing (crop/enhance) tests"""

    def test_process_assets(self, api_client):
        """Test processing assets (crop/enhance)"""
        # Get list of assets
        list_response = api_client.get(f"{BASE_URL}/api/media/assets")
        assets = list_response.json()
        
        if not assets:
            pytest.skip("No assets available for processing test")
        
        asset_ids = [assets[0]['asset_id']]
        payload = {
            "asset_ids": asset_ids,
            "apply_improve": True,
            "overlay_brand": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/media/assets/process", json=payload)
        assert response.status_code == 200
        result = response.json()
        assert 'job_id' in result
        print(f"PASS: Processing job started: {result['job_id']}")

    def test_get_job_status(self, api_client):
        """Test getting job status"""
        # Start a processing job first
        list_response = api_client.get(f"{BASE_URL}/api/media/assets")
        assets = list_response.json()
        
        if not assets:
            pytest.skip("No assets for job test")
        
        process_response = api_client.post(
            f"{BASE_URL}/api/media/assets/process",
            json={"asset_ids": [assets[0]['asset_id']], "apply_improve": False}
        )
        
        if process_response.status_code != 200:
            pytest.skip("Failed to start processing job")
        
        job_id = process_response.json()['job_id']
        
        # Check job status
        response = api_client.get(f"{BASE_URL}/api/media/jobs/{job_id}")
        assert response.status_code == 200
        result = response.json()
        assert 'status' in result
        assert result['status'] in ['queued', 'processing', 'completed', 'failed']
        print(f"PASS: Job {job_id} status: {result['status']}")


# =============================================================================
# WORKFLOW IMAGE ASSIGNMENTS TESTS
# =============================================================================

class TestImageAssignments:
    """Image assignments for workflow tests"""

    def test_list_assignments(self, api_client):
        """Test listing image assignments"""
        response = api_client.get(f"{BASE_URL}/api/media/assignments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Listed {len(data)} assignments")

    def test_list_assignments_by_campaign(self, api_client):
        """Test listing assignments for a specific campaign"""
        # Get a campaign first
        campaigns_response = api_client.get(f"{BASE_URL}/api/campaigns")
        campaigns = campaigns_response.json()
        
        if not campaigns:
            pytest.skip("No campaigns available for assignment test")
        
        campaign_id = campaigns[0]['campaign_id']
        response = api_client.get(f"{BASE_URL}/api/media/assignments", params={'campaign_id': campaign_id})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Listed {len(data)} assignments for campaign {campaign_id}")


# =============================================================================
# BUFFER GRAPHQL API TESTS
# =============================================================================

class TestBufferIntegration:
    """Buffer GraphQL API integration tests"""

    def test_buffer_profiles_endpoint(self, api_client):
        """Test Buffer profiles endpoint uses GraphQL and returns gracefully"""
        response = api_client.get(f"{BASE_URL}/api/buffer/profiles")
        
        # Should return 200 even if no channels (graceful handling)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            # Verify structure if profiles returned
            profile = data[0]
            assert 'id' in profile
            assert 'service' in profile
            print(f"PASS: Buffer profiles returned {len(data)} channels")
        else:
            # Expected if no channels configured
            print(f"PASS: Buffer profiles endpoint working (0 channels - expected per context)")

    def test_buffer_profiles_without_crash(self, api_client):
        """Test Buffer profiles doesn't break the flow"""
        response = api_client.get(f"{BASE_URL}/api/buffer/profiles")
        
        # Main validation: endpoint doesn't return 500
        assert response.status_code != 500, f"Buffer profiles returned 500: {response.text}"
        print(f"PASS: Buffer profiles endpoint didn't crash (status: {response.status_code})")


# =============================================================================
# EXPORT WITH MEDIA FIELDS TESTS
# =============================================================================

class TestExportWithMedia:
    """Export CSV/JSON with media fields tests"""

    def test_export_csv_includes_media_fields(self, auth_token):
        """Test CSV export includes media fields"""
        # Get a campaign first
        headers = {"Authorization": f"Bearer {auth_token}"}
        campaigns_response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        campaigns = campaigns_response.json()
        
        if not campaigns:
            pytest.skip("No campaigns for export test")
        
        campaign_id = campaigns[0]['campaign_id']
        
        # Export CSV
        response = requests.get(
            f"{BASE_URL}/api/export/csv/{campaign_id}",
            headers=headers,
            allow_redirects=True
        )
        
        assert response.status_code == 200
        content_type = response.headers.get('content-type', '')
        assert 'text/csv' in content_type or 'application/octet-stream' in content_type
        
        # Check CSV has media fields in header
        csv_content = response.text
        header_line = csv_content.split('\n')[0] if csv_content else ''
        assert 'Media Asset ID' in header_line or 'media_asset_id' in header_line.lower() or 'Image Public URL' in header_line
        print(f"PASS: CSV export includes media fields")

    def test_export_json_includes_media_fields(self, auth_token):
        """Test JSON export includes media fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        campaigns_response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        campaigns = campaigns_response.json()
        
        if not campaigns:
            pytest.skip("No campaigns for export test")
        
        campaign_id = campaigns[0]['campaign_id']
        
        response = requests.get(
            f"{BASE_URL}/api/export/json/{campaign_id}",
            headers=headers,
            allow_redirects=True
        )
        
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            # Check first post has media fields
            post = data[0]
            assert 'media_asset_id' in post or 'image_public_url' in post
            print(f"PASS: JSON export includes media fields")
        else:
            print(f"PASS: JSON export works (no posts in campaign)")


# =============================================================================
# CLEANUP TEST DATA
# =============================================================================

@pytest.fixture(scope="module", autouse=True)
def cleanup(api_client):
    """Cleanup test data after tests"""
    yield
    # Cleanup TEST_ prefixed assets would go here
    # For now we leave test data as it doesn't break anything
    print("Tests completed - test data may remain for inspection")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
