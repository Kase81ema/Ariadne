#!/usr/bin/env python3
"""
Backend Smoke Test per Ariadne Editorial Studio
Test specifici per gli endpoint richiesti usando la preview URL.
"""
import requests
import json
from datetime import datetime

# Configurazione
BASE_URL = "https://content-academy-12.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Credenziali
EDITOR_EMAIL = "arianna.perrone@ariadne.test"
EDITOR_PASSWORD = "password123"

class AriadneSmokeTest:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.auth_headers = {}
        self.test_results = []
    
    def log_test(self, test_name, passed, details=""):
        """Log del risultato test"""
        status = "✅ PASS" if passed else "❌ FAIL" 
        result = f"{status} | {test_name}"
        if details:
            result += f" | {details}"
        self.test_results.append(result)
        print(result)
        return passed
    
    def test_login(self):
        """Test 1: POST /api/auth/login"""
        print("\n=== TEST 1: Login Editor ===")
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json={
                    "email": EDITOR_EMAIL,
                    "password": EDITOR_PASSWORD
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.auth_token = data["token"]
                    self.auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
                    user_info = data["user"]
                    return self.log_test(
                        "Login Editor",
                        True,
                        f"Token ricevuto, user: {user_info.get('name', 'N/A')} ({user_info.get('role', 'N/A')})"
                    )
                else:
                    return self.log_test("Login Editor", False, "Risposta mancante token o user")
            else:
                return self.log_test("Login Editor", False, f"HTTP {response.status_code}: {response.text[:200]}")
                
        except Exception as e:
            return self.log_test("Login Editor", False, f"Errore: {str(e)}")
    
    def test_dashboard_stats(self):
        """Test 2: GET /api/dashboard/stats"""
        print("\n=== TEST 2: Dashboard Stats ===")
        try:
            if not self.auth_token:
                return self.log_test("Dashboard Stats", False, "Nessun token di autenticazione")
                
            response = self.session.get(
                f"{API_BASE}/dashboard/stats",
                headers=self.auth_headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_posts", "total_campaigns", "active_campaigns"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    return self.log_test(
                        "Dashboard Stats",
                        True, 
                        f"Stats: {data.get('total_posts', 0)} post, {data.get('active_campaigns', 0)} campagne attive"
                    )
                else:
                    return self.log_test("Dashboard Stats", False, f"Campi mancanti: {missing_fields}")
            else:
                return self.log_test("Dashboard Stats", False, f"HTTP {response.status_code}: {response.text[:200]}")
                
        except Exception as e:
            return self.log_test("Dashboard Stats", False, f"Errore: {str(e)}")
    
    def test_school_catalog(self):
        """Test 3: GET /api/school/catalog"""
        print("\n=== TEST 3: School Catalog ===")
        try:
            if not self.auth_token:
                return self.log_test("School Catalog", False, "Nessun token di autenticazione")
                
            response = self.session.get(
                f"{API_BASE}/school/catalog",
                headers=self.auth_headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Verifica categorie richieste
                    categories = set(course.get("category") for course in data)
                    expected_categories = {"ariadne", "tecnica", "business"}
                    found_categories = categories.intersection(expected_categories)
                    
                    if found_categories:
                        return self.log_test(
                            "School Catalog", 
                            True,
                            f"{len(data)} corsi trovati nelle categorie: {', '.join(found_categories)}"
                        )
                    else:
                        return self.log_test("School Catalog", False, f"Categorie trovate: {categories}, attese: {expected_categories}")
                else:
                    return self.log_test("School Catalog", False, "Nessun corso nel catalogo")
            else:
                return self.log_test("School Catalog", False, f"HTTP {response.status_code}: {response.text[:200]}")
                
        except Exception as e:
            return self.log_test("School Catalog", False, f"Errore: {str(e)}")
    
    def test_catalog_progress_update(self):
        """Test 4: POST /api/school/catalog/progress"""
        print("\n=== TEST 4: Catalog Progress Update ===")
        try:
            if not self.auth_token:
                return self.log_test("Catalog Progress Update", False, "Nessun token di autenticazione")
            
            # Prima ottieni il catalogo per avere un course_id valido
            catalog_response = self.session.get(
                f"{API_BASE}/school/catalog",
                headers=self.auth_headers,
                timeout=10
            )
            
            if catalog_response.status_code != 200:
                return self.log_test("Catalog Progress Update", False, "Impossibile ottenere catalogo")
            
            courses = catalog_response.json()
            if not courses:
                return self.log_test("Catalog Progress Update", False, "Nessun corso disponibile per test")
            
            # Usa il primo corso per il test
            test_course_id = courses[0].get("course_id")
            if not test_course_id:
                return self.log_test("Catalog Progress Update", False, "Nessun course_id disponibile")
            
            # Prova ad aggiornare il progresso
            response = self.session.post(
                f"{API_BASE}/school/catalog/progress",
                headers=self.auth_headers,
                json={
                    "course_id": test_course_id,
                    "status": "in_progress"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                return self.log_test(
                    "Catalog Progress Update",
                    True,
                    f"Progresso aggiornato per corso {test_course_id} -> in_progress"
                )
            else:
                return self.log_test("Catalog Progress Update", False, f"HTTP {response.status_code}: {response.text[:200]}")
                
        except Exception as e:
            return self.log_test("Catalog Progress Update", False, f"Errore: {str(e)}")
    
    def test_community_feed(self):
        """Test 5: GET /api/community/feed"""
        print("\n=== TEST 5: Community Feed ===")
        try:
            if not self.auth_token:
                return self.log_test("Community Feed", False, "Nessun token di autenticazione")
                
            response = self.session.get(
                f"{API_BASE}/community/feed",
                headers=self.auth_headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    posts_count = len(data)
                    posts_with_content = sum(1 for post in data if post.get("content"))
                    
                    return self.log_test(
                        "Community Feed",
                        True,
                        f"{posts_count} post nel feed, {posts_with_content} con contenuto"
                    )
                else:
                    return self.log_test("Community Feed", False, "Risposta non è una lista di post")
            else:
                return self.log_test("Community Feed", False, f"HTTP {response.status_code}: {response.text[:200]}")
                
        except Exception as e:
            return self.log_test("Community Feed", False, f"Errore: {str(e)}")
    
    def test_community_dashboard(self):
        """Test 6: GET /api/community/dashboard"""
        print("\n=== TEST 6: Community Dashboard ===")
        try:
            if not self.auth_token:
                return self.log_test("Community Dashboard", False, "Nessun token di autenticazione")
                
            response = self.session.get(
                f"{API_BASE}/community/dashboard",
                headers=self.auth_headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                expected_sections = ["onboarded", "banners", "upcoming_events", "recent_posts"]
                present_sections = [section for section in expected_sections if section in data]
                
                if len(present_sections) >= 3:  # Almeno 3/4 sezioni presenti
                    return self.log_test(
                        "Community Dashboard",
                        True,
                        f"Dashboard caricata con sezioni: {', '.join(present_sections)}"
                    )
                else:
                    return self.log_test("Community Dashboard", False, f"Sezioni mancanti. Presenti: {present_sections}")
            else:
                return self.log_test("Community Dashboard", False, f"HTTP {response.status_code}: {response.text[:200]}")
                
        except Exception as e:
            return self.log_test("Community Dashboard", False, f"Errore: {str(e)}")
    
    def run_smoke_test(self):
        """Esegue tutti i test smoke"""
        print("🚀 ARIADNE EDITORIAL STUDIO - BACKEND SMOKE TEST")
        print(f"URL: {BASE_URL}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        # Sequenza test
        tests = [
            self.test_login,
            self.test_dashboard_stats,
            self.test_school_catalog,
            self.test_catalog_progress_update,
            self.test_community_feed,
            self.test_community_dashboard
        ]
        
        passed_count = 0
        total_tests = len(tests)
        
        for test_func in tests:
            if test_func():
                passed_count += 1
        
        # Riepilogo finale
        print("\n" + "=" * 60)
        print("📊 RIEPILOGO SMOKE TEST")
        print(f"Passati: {passed_count}/{total_tests}")
        
        if passed_count == total_tests:
            print("🎉 SMOKE TEST COMPLETATO CON SUCCESSO")
            return True
        else:
            print("⚠️  SMOKE TEST COMPLETATO CON ERRORI")
            print("\nDettagli fallimenti:")
            for result in self.test_results:
                if "❌ FAIL" in result:
                    print(f"  - {result}")
            return False

def main():
    """Funzione principale"""
    tester = AriadneSmokeTest()
    success = tester.run_smoke_test()
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)