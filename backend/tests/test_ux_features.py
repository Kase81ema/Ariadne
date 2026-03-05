"""
Test suite for Ariadne Editorial Studio - UX Refactor Features
Focus on: readiness endpoint, agents preset, course clone
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://content-academy-12.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "arianna.perrone@ariadne.test"
TEST_PASSWORD = "password123"
ADMIN_EMAIL = "admin@ariadne.training"
ADMIN_PASSWORD = "admin123"


class TestAuthenticationFlow:
    """Test login with test user credentials"""
    
    def test_login_with_test_user(self):
        """Test login with arianna.perrone@ariadne.test / password123"""
        # First try test user - if not exists, create it
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 401:
            # User doesn't exist, create it first
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Arianna Perrone"
            })
            assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
            data = reg_response.json()
            assert "token" in data
            assert "user" in data
            print(f"Created test user: {TEST_EMAIL}")
            return data["token"]
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"Login successful for {TEST_EMAIL}")
        return data["token"]
    
    def test_login_with_admin(self):
        """Fallback: login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print("Admin login successful")
        return data["token"]


@pytest.fixture
def auth_token():
    """Get authentication token"""
    # First try test user
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    
    # If test user doesn't exist, create it
    reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": "Arianna Perrone"
    })
    if reg_response.status_code == 200:
        return reg_response.json()["token"]
    
    # Fallback to admin
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    
    pytest.skip("Could not authenticate")


class TestSetupReadiness:
    """Tests for /api/setup/readiness endpoint"""
    
    def test_readiness_endpoint_returns_expected_fields(self, auth_token):
        """Test /api/setup/readiness returns all expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/setup/readiness",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check all expected fields
        assert "profiles_active_count" in data
        assert "rules_count" in data
        assert "agents_active_count" in data
        assert "repository_total" in data
        assert "ready" in data
        assert "missing" in data
        
        # Validate data types
        assert isinstance(data["profiles_active_count"], int)
        assert isinstance(data["rules_count"], int)
        assert isinstance(data["agents_active_count"], int)
        assert isinstance(data["repository_total"], int)
        assert isinstance(data["ready"], bool)
        assert isinstance(data["missing"], list)
        
        print(f"Readiness data: profiles={data['profiles_active_count']}, rules={data['rules_count']}, agents={data['agents_active_count']}, repo={data['repository_total']}, ready={data['ready']}")
    
    def test_readiness_counts_match_actual_data(self, auth_token):
        """Verify readiness counts match actual data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get readiness
        readiness = requests.get(f"{BASE_URL}/api/setup/readiness", headers=headers).json()
        
        # Get actual profiles
        profiles = requests.get(f"{BASE_URL}/api/social-profiles", headers=headers).json()
        active_profiles = len([p for p in profiles if p.get("active")])
        
        # Get actual rules
        rules = requests.get(f"{BASE_URL}/api/planning-rules", headers=headers).json()
        
        # Get actual agents
        agents = requests.get(f"{BASE_URL}/api/agents", headers=headers).json()
        active_agents = len([a for a in agents if a.get("active")])
        
        # Verify counts match
        assert readiness["profiles_active_count"] == active_profiles, f"Profile count mismatch: {readiness['profiles_active_count']} vs {active_profiles}"
        assert readiness["rules_count"] == len(rules), f"Rules count mismatch: {readiness['rules_count']} vs {len(rules)}"
        assert readiness["agents_active_count"] == active_agents, f"Agents count mismatch: {readiness['agents_active_count']} vs {active_agents}"
        
        print(f"Verified counts match: profiles={active_profiles}, rules={len(rules)}, agents={active_agents}")


class TestAgentsPreset:
    """Tests for /api/agents/preset endpoint"""
    
    def test_apply_veloce_preset(self, auth_token):
        """Test applying 'veloce' preset"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/agents/preset",
            headers=headers,
            json={"preset": "veloce"}
        )
        assert response.status_code == 200
        agents = response.json()
        
        # Veloce preset should have: planner, writer_linkedin_company, writer_linkedin_personal, writer_instagram, quality_reviewer, formatter_export
        veloce_agents = ["planner", "writer_linkedin_company", "writer_linkedin_personal", "writer_instagram", "quality_reviewer", "formatter_export"]
        
        for agent in agents:
            if agent["agent_id"] in veloce_agents:
                assert agent["active"] == True, f"Agent {agent['agent_id']} should be active in veloce preset"
        
        print(f"Veloce preset applied: {len([a for a in agents if a['active']])} agents active")
    
    def test_apply_standard_preset(self, auth_token):
        """Test applying 'standard' preset"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/agents/preset",
            headers=headers,
            json={"preset": "standard"}
        )
        assert response.status_code == 200
        agents = response.json()
        
        # Standard preset should have veloce + compliance_icf
        standard_agents = ["planner", "writer_linkedin_company", "writer_linkedin_personal", "writer_instagram", "quality_reviewer", "compliance_icf", "formatter_export"]
        
        active_ids = [a["agent_id"] for a in agents if a["active"]]
        for agent_id in standard_agents:
            assert agent_id in active_ids, f"Agent {agent_id} should be active in standard preset"
        
        print(f"Standard preset applied: {len(active_ids)} agents active")
    
    def test_apply_alta_qualita_preset(self, auth_token):
        """Test applying 'alta_qualita' preset"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/agents/preset",
            headers=headers,
            json={"preset": "alta_qualita"}
        )
        assert response.status_code == 200
        agents = response.json()
        
        # Alta qualita should have all agents
        alta_agents = ["planner", "writer_linkedin_company", "writer_linkedin_personal", "writer_instagram", 
                      "deep_research", "compliance_icf", "quality_reviewer", "grammar_editor", "hashtag_curator", "formatter_export"]
        
        active_ids = [a["agent_id"] for a in agents if a["active"]]
        for agent_id in alta_agents:
            assert agent_id in active_ids, f"Agent {agent_id} should be active in alta_qualita preset"
        
        print(f"Alta qualita preset applied: {len(active_ids)} agents active")


class TestAgentsToggle:
    """Tests for individual agent toggling"""
    
    def test_toggle_agent_on_off(self, auth_token):
        """Test toggling a non-always-on agent"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get agents list
        agents = requests.get(f"{BASE_URL}/api/agents", headers=headers).json()
        
        # Find a non-always-on agent
        toggleable = [a for a in agents if not a.get("always_on")]
        assert len(toggleable) > 0, "No toggleable agents found"
        
        test_agent = toggleable[0]
        original_state = test_agent["active"]
        
        # Toggle OFF
        response = requests.put(
            f"{BASE_URL}/api/agents/{test_agent['agent_id']}",
            headers=headers,
            json={"active": False}
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated["active"] == False
        
        # Toggle ON
        response = requests.put(
            f"{BASE_URL}/api/agents/{test_agent['agent_id']}",
            headers=headers,
            json={"active": True}
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated["active"] == True
        
        # Restore original state
        requests.put(
            f"{BASE_URL}/api/agents/{test_agent['agent_id']}",
            headers=headers,
            json={"active": original_state}
        )
        
        print(f"Agent {test_agent['agent_id']} toggled successfully")


class TestCourseClone:
    """Tests for /api/courses-events/:id/clone endpoint"""
    
    def test_clone_course_creates_copy(self, auth_token):
        """Test cloning a course creates a duplicate with '(copia)' suffix"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get existing courses
        courses = requests.get(f"{BASE_URL}/api/courses-events", headers=headers).json()
        assert len(courses) > 0, "No courses found to clone"
        
        original = courses[0]
        original_id = original["course_id"]
        original_title = original["title"]
        
        # Clone the course
        response = requests.post(
            f"{BASE_URL}/api/courses-events/{original_id}/clone",
            headers=headers
        )
        assert response.status_code == 200
        cloned = response.json()
        
        # Verify clone properties
        assert cloned["course_id"] != original_id, "Clone should have different ID"
        assert cloned["title"] == f"{original_title} (copia)", f"Clone title should be '{original_title} (copia)', got '{cloned['title']}'"
        assert cloned["type"] == original["type"], "Clone should have same type"
        
        # Verify it exists in the list
        courses_after = requests.get(f"{BASE_URL}/api/courses-events", headers=headers).json()
        assert len(courses_after) > len(courses), "Course count should increase after clone"
        
        # Cleanup - delete the clone
        requests.delete(f"{BASE_URL}/api/courses-events/{cloned['course_id']}", headers=headers)
        
        print(f"Course '{original_title}' cloned successfully as '{cloned['title']}'")
    
    def test_clone_nonexistent_course_returns_404(self, auth_token):
        """Test cloning non-existent course returns 404"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/courses-events/nonexistent_id/clone",
            headers=headers
        )
        assert response.status_code == 404


class TestAgentsList:
    """Tests for /api/agents endpoint"""
    
    def test_agents_list_returns_10_agents(self, auth_token):
        """Test that agents list returns all 10 agents"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/agents", headers=headers)
        assert response.status_code == 200
        agents = response.json()
        
        # Should have 10 agents
        assert len(agents) == 10, f"Expected 10 agents, got {len(agents)}"
        
        # Check each agent has required fields
        for agent in agents:
            assert "agent_id" in agent
            assert "name" in agent
            assert "description" in agent
            assert "active" in agent
        
        agent_ids = [a["agent_id"] for a in agents]
        expected_ids = ["planner", "writer_linkedin_company", "writer_linkedin_personal", "writer_instagram",
                       "deep_research", "compliance_icf", "quality_reviewer", "grammar_editor", 
                       "hashtag_curator", "formatter_export"]
        
        for expected_id in expected_ids:
            assert expected_id in agent_ids, f"Missing agent: {expected_id}"
        
        print(f"Found all 10 agents: {agent_ids}")


class TestPlanningRulesAPI:
    """Tests for creating planning rules via API (used by StartCampaignPage quick action)"""
    
    def test_create_base_rule(self, auth_token):
        """Test creating a base rule like StartCampaignPage does"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        rule_data = {
            "name": "TEST_Regola base",
            "days": ["mon", "tue", "wed", "thu", "fri"],
            "time_slots": ["09:00", "17:00"],
            "max_per_day": 2,
            "min_gap_hours": 4,
            "coordinate_partners": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/planning-rules",
            headers=headers,
            json=rule_data
        )
        assert response.status_code == 200
        created = response.json()
        
        assert created["name"] == rule_data["name"]
        assert created["days"] == rule_data["days"]
        assert "rule_id" in created
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/planning-rules/{created['rule_id']}", headers=headers)
        
        print(f"Created and deleted test rule: {created['rule_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
