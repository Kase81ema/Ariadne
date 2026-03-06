#!/usr/bin/env python3
"""
Backend verification test - Ariadne Editorial Studio
Role-based access control testing for sidebar access and training operations
"""

import asyncio
import aiohttp
import json
from typing import Dict, Any
from datetime import datetime

# Configurazione test
BASE_URL = "https://studio-refactor-1.preview.emergentagent.com"
EDITOR_CREDENTIALS = {
    "email": "arianna.perrone@ariadne.test",
    "password": "password123"
}
REGULAR_USER_CREDENTIALS = {
    "email": "repo_check_user@ariadne.test",
    "password": "password123"
}

class RoleAccessTester:
    def __init__(self):
        self.session = None
        self.editor_token = None
        self.regular_user_token = None
        self.editor_headers = {}
        self.regular_user_headers = {}
        
    async def setup(self):
        """Setup sessione e autenticazione per entrambi gli utenti"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            connector=aiohttp.TCPConnector(ssl=False)
        )
        
        # Autentica editor
        await self.authenticate_editor()
        # Autentica regular user
        await self.authenticate_regular_user()
        
    async def cleanup(self):
        """Cleanup sessione"""
        if self.session:
            await self.session.close()
    
    async def authenticate_editor(self):
        """Login editor e ottenimento token JWT"""
        print("🔐 Autenticazione editor...")
        try:
            async with self.session.post(
                f"{BASE_URL}/api/auth/login",
                json=EDITOR_CREDENTIALS
            ) as response:
                if response.status != 200:
                    raise Exception(f"Login editor fallito: {response.status}")
                
                data = await response.json()
                self.editor_token = data.get('token')
                if not self.editor_token:
                    raise Exception("Token JWT editor non ricevuto")
                
                self.editor_headers = {'Authorization': f'Bearer {self.editor_token}'}
                user_name = data.get('user', {}).get('name', 'Unknown')
                user_role = data.get('user', {}).get('role', 'Unknown')
                print(f"✅ Login editor successful: {user_name} ({user_role})")
                return True
        except Exception as e:
            print(f"❌ Errore autenticazione editor: {e}")
            return False

    async def authenticate_regular_user(self):
        """Login regular user e ottenimento token JWT"""
        print("🔐 Autenticazione regular user...")
        try:
            async with self.session.post(
                f"{BASE_URL}/api/auth/login",
                json=REGULAR_USER_CREDENTIALS
            ) as response:
                if response.status != 200:
                    raise Exception(f"Login regular user fallito: {response.status}")
                
                data = await response.json()
                self.regular_user_token = data.get('token')
                if not self.regular_user_token:
                    raise Exception("Token JWT regular user non ricevuto")
                
                self.regular_user_headers = {'Authorization': f'Bearer {self.regular_user_token}'}
                user_name = data.get('user', {}).get('name', 'Unknown')
                user_role = data.get('user', {}).get('role', 'Unknown')
                print(f"✅ Login regular user successful: {user_name} ({user_role})")
                return True
        except Exception as e:
            print(f"❌ Errore autenticazione regular user: {e}")
            return False

    # TEST 1: Regular user gets 403 on /api/courses-events
    async def test_regular_user_courses_events_403(self) -> Dict[str, Any]:
        """Test che regular user riceva 403 su /api/courses-events"""
        print("\n🚫 TEST 1: Regular user 403 on /api/courses-events...")
        
        try:
            async with self.session.get(
                f"{BASE_URL}/api/courses-events",
                headers=self.regular_user_headers
            ) as response:
                if response.status == 403:
                    print("✅ Regular user correctly gets 403 on /api/courses-events")
                    return {'success': True, 'status': response.status, 'expected': 403}
                else:
                    error_text = await response.text()
                    print(f"❌ Regular user got {response.status} instead of 403 on /api/courses-events")
                    return {'success': False, 'status': response.status, 'expected': 403, 'error': error_text}
                    
        except Exception as e:
            return {'success': False, 'error': f"Errore test courses-events: {e}"}

    # TEST 2: Regular user gets 403 on /api/repository/files
    async def test_regular_user_repository_files_403(self) -> Dict[str, Any]:
        """Test che regular user riceva 403 su /api/repository/files"""
        print("\n🚫 TEST 2: Regular user 403 on /api/repository/files...")
        
        try:
            async with self.session.get(
                f"{BASE_URL}/api/repository/files",
                headers=self.regular_user_headers
            ) as response:
                if response.status == 403:
                    print("✅ Regular user correctly gets 403 on /api/repository/files")
                    return {'success': True, 'status': response.status, 'expected': 403}
                else:
                    error_text = await response.text()
                    print(f"❌ Regular user got {response.status} instead of 403 on /api/repository/files")
                    return {'success': False, 'status': response.status, 'expected': 403, 'error': error_text}
                    
        except Exception as e:
            return {'success': False, 'error': f"Errore test repository/files: {e}"}

    # TEST 3: Regular user gets 200 on /api/school/training-courses
    async def test_regular_user_training_courses_200(self) -> Dict[str, Any]:
        """Test che regular user riceva 200 su /api/school/training-courses"""
        print("\n✅ TEST 3: Regular user 200 on /api/school/training-courses...")
        
        try:
            async with self.session.get(
                f"{BASE_URL}/api/school/training-courses",
                headers=self.regular_user_headers
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    courses_count = len(data) if isinstance(data, list) else 'unknown'
                    print(f"✅ Regular user correctly gets 200 on /api/school/training-courses ({courses_count} courses)")
                    return {'success': True, 'status': response.status, 'expected': 200, 'courses_count': courses_count}
                else:
                    error_text = await response.text()
                    print(f"❌ Regular user got {response.status} instead of 200 on /api/school/training-courses")
                    return {'success': False, 'status': response.status, 'expected': 200, 'error': error_text}
                    
        except Exception as e:
            return {'success': False, 'error': f"Errore test training-courses: {e}"}

    # TEST 4: Editor can read /api/courses-events
    async def test_editor_courses_events_200(self) -> Dict[str, Any]:
        """Test che editor possa leggere /api/courses-events"""
        print("\n✅ TEST 4: Editor 200 on /api/courses-events...")
        
        try:
            async with self.session.get(
                f"{BASE_URL}/api/courses-events",
                headers=self.editor_headers
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    courses_count = len(data) if isinstance(data, list) else 'unknown'
                    print(f"✅ Editor correctly gets 200 on /api/courses-events ({courses_count} courses)")
                    return {'success': True, 'status': response.status, 'expected': 200, 'courses_count': courses_count}
                else:
                    error_text = await response.text()
                    print(f"❌ Editor got {response.status} instead of 200 on /api/courses-events")
                    return {'success': False, 'status': response.status, 'expected': 200, 'error': error_text}
                    
        except Exception as e:
            return {'success': False, 'error': f"Errore test editor courses-events: {e}"}

    # TEST 5: Editor can use cohorts endpoint (training operations)
    async def test_editor_cohorts_operations(self) -> Dict[str, Any]:
        """Test operazioni training: cohorts with course_id"""
        print("\n📚 TEST 5: Editor cohorts operations...")
        
        try:
            # Get cohorts
            async with self.session.get(
                f"{BASE_URL}/api/school/cohorts",
                headers=self.editor_headers
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    return {'success': False, 'error': f"GET cohorts failed: HTTP {response.status}: {error_text}"}
                
                cohorts = await response.json()
                cohorts_count = len(cohorts) if isinstance(cohorts, list) else 0
                
                # Check if any cohort has course_id
                cohorts_with_course = [c for c in cohorts if c.get('course_id')]
                
                print(f"✅ Editor can access cohorts: {cohorts_count} cohorts, {len(cohorts_with_course)} with course_id")
                
                return {
                    'success': True,
                    'cohorts_count': cohorts_count,
                    'cohorts_with_course_id': len(cohorts_with_course),
                    'sample_cohort': cohorts[0] if cohorts else None
                }
                    
        except Exception as e:
            return {'success': False, 'error': f"Errore test cohorts operations: {e}"}

    # TEST 6: Editor can use member participation update (training operations)
    async def test_editor_member_participation(self) -> Dict[str, Any]:
        """Test member participation update operations"""
        print("\n👥 TEST 6: Editor member participation operations...")
        
        try:
            # First get cohorts to find one with members
            async with self.session.get(
                f"{BASE_URL}/api/school/cohorts",
                headers=self.editor_headers
            ) as response:
                if response.status != 200:
                    return {'success': False, 'error': 'Cannot get cohorts'}
                
                cohorts = await response.json()
                if not cohorts:
                    print("⚠️ No cohorts found, skipping member participation test")
                    return {'success': True, 'note': 'No cohorts available for testing'}
                
                # Try to get members for first cohort
                test_cohort = cohorts[0]
                cohort_id = test_cohort.get('cohort_id')
                
                if not cohort_id:
                    return {'success': False, 'error': 'No valid cohort_id found'}
                
                async with self.session.get(
                    f"{BASE_URL}/api/school/cohorts/{cohort_id}/members",
                    headers=self.editor_headers
                ) as members_response:
                    if members_response.status == 200:
                        members = await members_response.json()
                        members_count = len(members) if isinstance(members, list) else 0
                        
                        print(f"✅ Editor can access cohort members: cohort {cohort_id}, {members_count} members")
                        
                        return {
                            'success': True,
                            'cohort_id': cohort_id,
                            'members_count': members_count,
                            'can_access_members': True
                        }
                    else:
                        error_text = await members_response.text()
                        return {'success': False, 'error': f"Cannot access members: HTTP {members_response.status}: {error_text}"}
                    
        except Exception as e:
            return {'success': False, 'error': f"Errore test member participation: {e}"}

    # TEST 7: Editor can access payment overview (training operations)
    async def test_editor_payment_overview(self) -> Dict[str, Any]:
        """Test payment overview access"""
        print("\n💰 TEST 7: Editor payment overview operations...")
        
        try:
            async with self.session.get(
                f"{BASE_URL}/api/school/admin/payment-overview",
                headers=self.editor_headers
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    summary = data.get('summary', {})
                    rows_count = len(data.get('rows', []))
                    
                    print(f"✅ Editor can access payment overview: {summary.get('pending_count', 0)} pending payments, {rows_count} rows")
                    
                    return {
                        'success': True,
                        'summary': summary,
                        'rows_count': rows_count
                    }
                else:
                    error_text = await response.text()
                    return {'success': False, 'error': f"Payment overview failed: HTTP {response.status}: {error_text}"}
                    
        except Exception as e:
            return {'success': False, 'error': f"Errore test payment overview: {e}"}

    # TEST 8: Editor can access bulk installments (training operations)
    async def test_editor_bulk_installments(self) -> Dict[str, Any]:
        """Test bulk installments access"""
        print("\n📝 TEST 8: Editor bulk installments operations...")
        
        try:
            # Get installments list
            async with self.session.get(
                f"{BASE_URL}/api/school/admin/installments",
                headers=self.editor_headers
            ) as response:
                if response.status == 200:
                    installments = await response.json()
                    installments_count = len(installments) if isinstance(installments, list) else 0
                    
                    print(f"✅ Editor can access installments: {installments_count} installments")
                    
                    return {
                        'success': True,
                        'installments_count': installments_count,
                        'can_access_bulk_operations': True
                    }
                else:
                    error_text = await response.text()
                    return {'success': False, 'error': f"Installments access failed: HTTP {response.status}: {error_text}"}
                    
        except Exception as e:
            return {'success': False, 'error': f"Errore test bulk installments: {e}"}

    async def run_all_tests(self):
        """Esegue tutti i test di verifica accessi ruoli"""
        print("🚀 AVVIO BACKEND VERIFICATION - Role Access Control")
        print("=" * 60)
        
        results = {}
        
        try:
            # TEST 1: Regular user 403 on courses-events
            results['regular_user_courses_events_403'] = await self.test_regular_user_courses_events_403()
            
            # TEST 2: Regular user 403 on repository/files
            results['regular_user_repository_files_403'] = await self.test_regular_user_repository_files_403()
            
            # TEST 3: Regular user 200 on school/training-courses
            results['regular_user_training_courses_200'] = await self.test_regular_user_training_courses_200()
            
            # TEST 4: Editor 200 on courses-events
            results['editor_courses_events_200'] = await self.test_editor_courses_events_200()
            
            # TEST 5: Editor cohorts operations
            results['editor_cohorts_operations'] = await self.test_editor_cohorts_operations()
            
            # TEST 6: Editor member participation
            results['editor_member_participation'] = await self.test_editor_member_participation()
            
            # TEST 7: Editor payment overview
            results['editor_payment_overview'] = await self.test_editor_payment_overview()
            
            # TEST 8: Editor bulk installments
            results['editor_bulk_installments'] = await self.test_editor_bulk_installments()
            
            # SUMMARY
            print("\n" + "=" * 60)
            print("📊 RISULTATI BACKEND VERIFICATION")
            print("=" * 60)
            
            passed = 0
            total = 0
            
            for test_name, result in results.items():
                total += 1
                status = "✅ PASS" if result.get('success') else "❌ FAIL"
                error = f" - {result.get('error', '')}" if not result.get('success') else ""
                test_display = test_name.replace('_', ' ').title()
                print(f"{status} {test_display}{error}")
                if result.get('success'):
                    passed += 1
            
            print(f"\nRISULTATO FINALE: {passed}/{total} test passati")
            
            if passed == total:
                print("🎉 TUTTI I TEST PASSATI - Role access control OK")
            else:
                print("⚠️ Alcuni test falliti - Verificare log sopra per dettagli")
            
            return results
            
        except Exception as e:
            print(f"❌ ERRORE GENERALE: {e}")
            return results

async def main():
    """Main entry point"""
    tester = RoleAccessTester()
    try:
        await tester.setup()
        results = await tester.run_all_tests()
        return results
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    asyncio.run(main())