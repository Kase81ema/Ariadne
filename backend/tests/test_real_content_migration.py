"""
Test suite for Iteration 19: Real Content Migration
Tests the migration from placeholder content to real data:
- 7 real courses (3 ICF + 4 enrichment)
- 3 real events
- Real trainer names
- No events mixed in training courses
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRealContentMigration:
    """Tests for real content migration - courses and events"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ariadne.training",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    # ===== TRAINING COURSES TESTS =====
    
    def test_training_courses_returns_exactly_7_courses(self):
        """GET /api/school/training-courses returns exactly 7 courses"""
        response = requests.get(f"{BASE_URL}/api/school/training-courses", headers=self.headers)
        assert response.status_code == 200
        courses = response.json()
        assert len(courses) == 7, f"Expected 7 courses, got {len(courses)}"
    
    def test_training_courses_has_3_icf_courses(self):
        """Training courses has 3 ICF path courses"""
        response = requests.get(f"{BASE_URL}/api/school/training-courses", headers=self.headers)
        assert response.status_code == 200
        courses = response.json()
        icf_courses = [c for c in courses if c.get('section') == 'icf']
        assert len(icf_courses) == 3, f"Expected 3 ICF courses, got {len(icf_courses)}"
        
        # Verify specific ICF courses
        icf_ids = {c['course_id'] for c in icf_courses}
        assert 'cat_cc2026' in icf_ids, "Core Coaching Program missing"
        assert 'cat_pcp2026' in icf_ids, "Professional Coaching Program missing"
        assert 'cat_tcp2026' in icf_ids, "Team Coaching Program missing"
    
    def test_training_courses_has_4_enrichment_courses(self):
        """Training courses has 4 enrichment courses"""
        response = requests.get(f"{BASE_URL}/api/school/training-courses", headers=self.headers)
        assert response.status_code == 200
        courses = response.json()
        enrichment_courses = [c for c in courses if c.get('section') == 'enrichment']
        assert len(enrichment_courses) == 4, f"Expected 4 enrichment courses, got {len(enrichment_courses)}"
        
        # Verify specific enrichment courses
        enrichment_ids = {c['course_id'] for c in enrichment_courses}
        assert 'cat_cqpro' in enrichment_ids, "Core Quadrant Pro Training missing"
        assert 'cat_visual' in enrichment_ids, "Visual Coaching missing"
        assert 'cat_teen' in enrichment_ids, "Teen Coaching missing"
        assert 'cat_advanced' in enrichment_ids, "Advanced Coaching missing"
    
    def test_training_courses_no_events_mixed_in(self):
        """Training courses should NOT contain events (evt_ prefix)"""
        response = requests.get(f"{BASE_URL}/api/school/training-courses", headers=self.headers)
        assert response.status_code == 200
        courses = response.json()
        event_courses = [c for c in courses if c.get('course_id', '').startswith('evt_')]
        assert len(event_courses) == 0, f"Found {len(event_courses)} events mixed in training courses"
    
    # ===== CORE COACHING PROGRAM DETAIL TESTS =====
    
    def test_core_coaching_detail_title(self):
        """Core Coaching Program has correct title"""
        response = requests.get(f"{BASE_URL}/api/school/training-courses/cat_cc2026", headers=self.headers)
        assert response.status_code == 200
        course = response.json()
        assert course['title'] == 'Core Coaching Program'
    
    def test_core_coaching_detail_subtitle(self):
        """Core Coaching Program has correct subtitle"""
        response = requests.get(f"{BASE_URL}/api/school/training-courses/cat_cc2026", headers=self.headers)
        assert response.status_code == 200
        course = response.json()
        assert 'Livello 1 ICF' in course['subtitle']
        assert 'ACC' in course['subtitle']
    
    def test_core_coaching_detail_price(self):
        """Core Coaching Program has price €2.900"""
        response = requests.get(f"{BASE_URL}/api/school/training-courses/cat_cc2026", headers=self.headers)
        assert response.status_code == 200
        course = response.json()
        assert course['price'] == '2.900'
    
    def test_core_coaching_detail_trainers(self):
        """Core Coaching Program has Arianna Perrone & Emanuele Ciccarelli as trainers"""
        response = requests.get(f"{BASE_URL}/api/school/training-courses/cat_cc2026", headers=self.headers)
        assert response.status_code == 200
        course = response.json()
        trainers = course.get('trainers', [])
        assert 'Arianna Perrone' in trainers, "Arianna Perrone not in trainers"
        assert 'Emanuele Ciccarelli' in trainers, "Emanuele Ciccarelli not in trainers"
    
    def test_core_coaching_detail_prerequisites(self):
        """Core Coaching Program has prerequisites 'Nessuno — aperto a tutti'"""
        response = requests.get(f"{BASE_URL}/api/school/training-courses/cat_cc2026", headers=self.headers)
        assert response.status_code == 200
        course = response.json()
        assert 'Nessuno' in course['prerequisites'] or 'aperto a tutti' in course['prerequisites']
    
    def test_core_coaching_detail_next_edition(self):
        """Core Coaching Program has next edition 'Settembre 2026'"""
        response = requests.get(f"{BASE_URL}/api/school/training-courses/cat_cc2026", headers=self.headers)
        assert response.status_code == 200
        course = response.json()
        assert course['next_edition'] == 'Settembre 2026'
    
    # ===== EVENTS TESTS =====
    
    def test_events_returns_3_real_events(self):
        """GET /api/community/events returns 3 real events"""
        response = requests.get(f"{BASE_URL}/api/community/events", headers=self.headers)
        assert response.status_code == 200
        events = response.json()
        assert len(events) == 3, f"Expected 3 events, got {len(events)}"
    
    def test_events_has_core_quadrant_pro_training(self):
        """Events includes Core Quadrant Pro Training"""
        response = requests.get(f"{BASE_URL}/api/community/events", headers=self.headers)
        assert response.status_code == 200
        events = response.json()
        cq_events = [e for e in events if 'Core Quadrant' in e.get('title', '')]
        assert len(cq_events) >= 1, "Core Quadrant Pro Training event not found"
    
    def test_events_has_webinar_demo(self):
        """Events includes Webinar demo Ariadne"""
        response = requests.get(f"{BASE_URL}/api/community/events", headers=self.headers)
        assert response.status_code == 200
        events = response.json()
        webinar_events = [e for e in events if 'Webinar demo' in e.get('title', '')]
        assert len(webinar_events) >= 1, "Webinar demo Ariadne event not found"
    
    def test_events_has_aperitivo_coaching(self):
        """Events includes Aperitivo coaching Ariadne"""
        response = requests.get(f"{BASE_URL}/api/community/events", headers=self.headers)
        assert response.status_code == 200
        events = response.json()
        aperitivo_events = [e for e in events if 'Aperitivo coaching' in e.get('title', '')]
        assert len(aperitivo_events) >= 1, "Aperitivo coaching Ariadne event not found"
    
    # ===== REAL TRAINER NAMES TESTS =====
    
    def test_trainers_arianna_perrone_in_courses(self):
        """Arianna Perrone appears as trainer in courses"""
        response = requests.get(f"{BASE_URL}/api/school/training-courses", headers=self.headers)
        assert response.status_code == 200
        courses = response.json()
        courses_with_arianna = [c for c in courses if 'Arianna Perrone' in c.get('trainers', [])]
        assert len(courses_with_arianna) >= 1, "Arianna Perrone not found as trainer in any course"
    
    def test_trainers_emanuele_ciccarelli_in_courses(self):
        """Emanuele Ciccarelli appears as trainer in courses"""
        response = requests.get(f"{BASE_URL}/api/school/training-courses", headers=self.headers)
        assert response.status_code == 200
        courses = response.json()
        courses_with_emanuele = [c for c in courses if 'Emanuele Ciccarelli' in c.get('trainers', [])]
        assert len(courses_with_emanuele) >= 1, "Emanuele Ciccarelli not found as trainer in any course"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
