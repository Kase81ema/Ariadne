#!/usr/bin/env python3
"""
Backend API Testing for Ariadne Editorial Studio
Tests all core functionality including auth, profiles, courses, dashboard stats, etc.
"""

import requests
import sys
import json
from datetime import datetime

class AriadneAPITester:
    def __init__(self, base_url="https://content-academy-12.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 200:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            self.failed_tests.append(f"{name}: Request timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_authentication(self):
        """Test JWT authentication with admin credentials"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Test login with admin credentials
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@ariadne.training", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            print(f"   🔑 Token obtained: {self.token[:20]}...")
            
            # Test /auth/me endpoint
            self.run_test(
                "Get Current User",
                "GET", 
                "auth/me",
                200
            )
            return True
        else:
            print("❌ Failed to get authentication token")
            return False

    def test_social_profiles(self):
        """Test social profiles API endpoints"""
        print("\n=== SOCIAL PROFILES TESTS ===")
        
        # List profiles (should return 5 seeded profiles)
        success, profiles = self.run_test(
            "List Social Profiles",
            "GET",
            "social-profiles", 
            200
        )
        
        if success:
            print(f"   📊 Found {len(profiles)} profiles")
            expected_profiles = ["Ariadne Training", "Arianna Perrone", "Emanuele Ciccarelli", "Emanuele Casero", "Ariadne Instagram"]
            found_names = [p.get('name', '') for p in profiles]
            for expected in expected_profiles:
                if expected in found_names:
                    print(f"   ✅ Found profile: {expected}")
                else:
                    print(f"   ❌ Missing profile: {expected}")
                    self.failed_tests.append(f"Missing social profile: {expected}")

    def test_courses_events(self):
        """Test courses and events API endpoints"""
        print("\n=== COURSES & EVENTS TESTS ===")
        
        # List courses (should return 2 seeded courses)
        success, courses = self.run_test(
            "List Courses/Events",
            "GET",
            "courses-events",
            200
        )
        
        if success:
            print(f"   📚 Found {len(courses)} courses")
            if len(courses) >= 2:
                print("   ✅ Expected number of seeded courses found")
                # Test clone functionality with first course
                if courses:
                    course_id = courses[0].get('course_id')
                    if course_id:
                        self.run_test(
                            "Clone Course",
                            "POST",
                            f"courses-events/{course_id}/clone",
                            200
                        )
            else:
                print(f"   ❌ Expected at least 2 courses, found {len(courses)}")
                self.failed_tests.append(f"Expected 2+ courses, found {len(courses)}")

    def test_planning_rules(self):
        """Test planning rules API endpoints"""
        print("\n=== PLANNING RULES TESTS ===")
        
        success, rules = self.run_test(
            "List Planning Rules", 
            "GET",
            "planning-rules",
            200
        )
        
        if success:
            print(f"   📋 Found {len(rules)} planning rules")
            if len(rules) >= 2:
                print("   ✅ Expected number of seeded rules found")
            else:
                print(f"   ❌ Expected at least 2 rules, found {len(rules)}")
                self.failed_tests.append(f"Expected 2+ rules, found {len(rules)}")

    def test_agents(self):
        """Test agents API endpoints"""
        print("\n=== AGENTS TESTS ===")
        
        success, agents = self.run_test(
            "List Agents",
            "GET", 
            "agents",
            200
        )
        
        if success:
            print(f"   🤖 Found {len(agents)} agents")
            if len(agents) >= 10:
                print("   ✅ Expected number of agents found")
            else:
                print(f"   ❌ Expected at least 10 agents, found {len(agents)}")
                self.failed_tests.append(f"Expected 10+ agents, found {len(agents)}")

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n=== DASHBOARD TESTS ===")
        
        success, stats = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats", 
            200
        )
        
        if success:
            expected_keys = ['total_posts', 'today_posts', 'week_posts', 'total_campaigns', 'active_campaigns']
            for key in expected_keys:
                if key in stats:
                    print(f"   ✅ {key}: {stats[key]}")
                else:
                    print(f"   ❌ Missing stat: {key}")
                    self.failed_tests.append(f"Missing dashboard stat: {key}")

    def test_templates(self):
        """Test templates API endpoints"""
        print("\n=== TEMPLATES TESTS ===")
        
        success, templates = self.run_test(
            "List Templates",
            "GET",
            "templates",
            200
        )
        
        if success:
            print(f"   📝 Found {len(templates)} templates")
            if len(templates) >= 3:
                print("   ✅ Expected number of templates found")
            else:
                print(f"   ❌ Expected at least 3 templates, found {len(templates)}")
                self.failed_tests.append(f"Expected 3+ templates, found {len(templates)}")

    def test_repository(self):
        """Test repository endpoints"""
        print("\n=== REPOSITORY TESTS ===")
        
        # Test categories
        self.run_test(
            "Repository Categories",
            "GET",
            "repository/categories",
            200
        )
        
        # Test files list
        self.run_test(
            "Repository Files", 
            "GET",
            "repository/files",
            200
        )

    def test_campaigns_posts(self):
        """Test campaigns and posts endpoints"""
        print("\n=== CAMPAIGNS & POSTS TESTS ===")
        
        # List campaigns
        self.run_test(
            "List Campaigns",
            "GET", 
            "campaigns",
            200
        )
        
        # List posts
        self.run_test(
            "List Posts",
            "GET",
            "posts",
            200
        )

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*60}")
        print(f"📊 TEST SUMMARY")
        print(f"{'='*60}")
        print(f"✅ Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print(f"\n🔴 FAILED TESTS:")
            for i, failure in enumerate(self.failed_tests, 1):
                print(f"   {i}. {failure}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80  # Consider 80%+ as passing


def main():
    """Main test execution"""
    print("🚀 Starting Ariadne Editorial Studio Backend API Tests")
    print("=" * 60)
    
    tester = AriadneAPITester()
    
    # Run authentication first - required for other tests
    if not tester.test_authentication():
        print("\n❌ Authentication failed - stopping tests")
        return 1
    
    # Run all other tests
    tester.test_social_profiles()
    tester.test_courses_events() 
    tester.test_planning_rules()
    tester.test_agents()
    tester.test_dashboard_stats()
    tester.test_templates()
    tester.test_repository()
    tester.test_campaigns_posts()
    
    # Print final summary
    success = tester.print_summary()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())