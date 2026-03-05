#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Smoke test frontend Ariadne Editorial Studio per verificare funzionalità principali: login, dashboard Studio, switch a Scuola, navigazione Il mio percorso, Bacheca Community, e dettaglio corso"

frontend:
  - task: "Login editor con credenziali"
    implemented: true
    working: true
    file: "frontend/src/pages/LoginPage.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "testing"
        comment: "Test creato - verifica login con arianna.perrone@ariadne.test / password123"
      - working: true
        agent: "testing"
        comment: "✓ Login completato con successo. Credenziali accettate, redirect a /dashboard funzionante. Pagina login presenta form correttamente, campi email/password funzionali, nessun errore rilevato"

  - task: "Dashboard Studio caricamento e sidebar leggibile"
    implemented: true
    working: true
    file: "frontend/src/pages/DashboardPage.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "testing"
        comment: "Test creato - verifica dashboard Studio con sidebar e card navigabili"
      - working: true
        agent: "testing"
        comment: "✓ Dashboard Studio caricata correttamente. Sidebar visibile con titolo 'Ariadne', tutte le voci di navigazione presenti (editorial, workflow, export), card statistiche visualizzate e cliccabili. UI leggibile e funzionale"

  - task: "Switch da Studio a Scuola"
    implemented: true
    working: true
    file: "frontend/src/components/Layout.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "testing"
        comment: "Test creato - verifica switch area e gestione onboarding modal se presente"
      - working: true
        agent: "testing"
        comment: "✓ Switch da Studio a Scuola funzionante. Area selector presente, click su 'Scuola' reindirizza correttamente a /community. Nessun onboarding modal (utente già onboarded). Transizione fluida tra le due aree"

  - task: "Pagina Il mio percorso con tab principali"
    implemented: true
    working: true
    file: "frontend/src/pages/MyJourneyPage.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "testing"
        comment: "Test creato - verifica caricamento pagina e tab navigabili"
      - working: true
        agent: "testing"
        comment: "✓ Pagina Il mio percorso caricata correttamente. Tutti i tab presenti e funzionali: 'Formazione Coach ICF', 'Coach tecnica', 'Coach business', 'Credenziali ICF'. Journey overview card visualizzata con progress bar. Contenuti corsi visibili"

  - task: "Bacheca Community con post e immagini"
    implemented: true
    working: true
    file: "frontend/src/pages/FeedPage.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "testing"
        comment: "Test creato - verifica esistenza post e visualizzazione immagini"
      - working: true
        agent: "testing"
        comment: "✓ Bacheca Community caricata con successo. 11 post presenti nel feed, almeno 1 post con immagine visualizzata correttamente. Composer per nuovi post presente e funzionale. Layout stile LinkedIn implementato correttamente"

  - task: "Dettaglio corso con contenuti principali"
    implemented: true
    working: true
    file: "frontend/src/pages/CourseDetailPage.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "testing"
        comment: "Test creato - verifica caricamento pagina dettaglio con informazioni corso"
      - working: true
        agent: "testing"
        comment: "✓ Pagina dettaglio corso 'Core Coaching Program 2026' caricata completamente. Tutte le sezioni presenti: info corso, calendario, investimento, credenziale ACC, foto edizioni precedenti, testimonianze. Back button e CTA funzionanti. UI ricca e completa"

metadata:
  created_by: "testing_agent"
  version: "1.0"
  test_sequence: 2
  run_ui: true

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "sequential"

agent_communication:
  - agent: "testing"
    message: "Inizializzato smoke test frontend Ariadne. URL: https://content-academy-12.preview.emergentagent.com. Credenziali editor: arianna.perrone@ariadne.test / password123. Verifica flusso: login -> dashboard Studio -> switch Scuola -> navigazione percorso/community/corso"
  - agent: "testing"
    message: "✅ SMOKE TEST COMPLETATO CON SUCCESSO. Tutti i 6 test passati senza errori critici. Login funzionante, dashboard Studio con sidebar leggibile e card cliccabili, switch Studio<->Scuola fluido, pagina Il mio percorso con tutti i tab, Bacheca Community con 11 post (1+ con immagini), dettaglio corso completo con tutte le sezioni. App in stato ottimale per utente editor."
