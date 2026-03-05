# Ariadne Editorial Studio - PRD

## Problem Statement
Console operativa per social media manager: pianificazione calendario editoriale e generazione post social testuali per canali aziendali (LinkedIn, Instagram) e profili personali dei soci di Ariadne Training.

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: Claude Sonnet 4.5 via emergentintegrations (MOCKED)
- **Auth**: JWT + Google OAuth (Emergent Auth)

## User Personas
1. **Admin** (admin@ariadne.training) - Gestione completa
2. **Editor** - Creazione e gestione contenuti
3. **Viewer** - Solo lettura

## Core Requirements (Static)
- Calendario editoriale con vista mese/settimana
- Generazione post testuali AI (10 agenti specializzati)
- Workflow: campagna -> pianifica -> genera -> revisiona -> approva -> esporta
- Export per Buffer (CSV/JSON) e Copy Pack
- Repository base conoscitiva con upload file
- Gestione corsi/eventi con duplicazione rapida
- Profili social configurabili (LinkedIn aziendale/personale, Instagram)
- Regole di pianificazione modificabili
- Audit log completo
- Separazione Setup vs Produzione con wizard guidato
- Gestione agenti con preset (veloce/standard/alta qualita)
- Modalita essenziale per workflow semplificato

## What's Been Implemented

### Backend (FastAPI)
- Auth completo (JWT + Google OAuth session exchange)
- CRUD Social Profiles, Courses/Events, Campaigns, Posts, Planning Rules, Templates
- Clone corsi in 1 click
- AI Generation pipeline con 10 agenti (Claude Sonnet 4.5) - MOCKED
- Export CSV/JSON/Copy Pack
- File upload repository con categorie
- Dashboard stats e calendar API
- Post versioning e commenti
- Batch approval
- Audit logging completo
- Seed data: 5 profili, 2 corsi, 2 regole, 3 template, 10 agenti, 1 admin
- /api/setup/readiness endpoint per verifica stato setup
- /api/agents/preset endpoint per preset rapidi agenti
- /api/courses-events/{id}/clone endpoint per duplicazione corsi

### Frontend (React)
- Login (JWT + Google OAuth)
- Dashboard con stats e calendario mese
- Profili Social (CRUD + toggle on/off)
- Corsi ed Eventi (CRUD + clone + multi-date + trainer/tag)
- Editoriale (campagne non legate a corsi)
- Regole di pianificazione (editor visuale giorni/orari/gap)
- Workflow wizard multi-step (6 passaggi) con modalita essenziale
- Approvazioni (filtri, edit, rigenera, commenti, versioni)
- Export (CSV/JSON/Copy Pack con copia individuale)
- Repository (upload con categorie, anteprima)
- **Avvia campagna** - pagina wizard guidata con checklist readiness, azioni rapide
- **Agenti** - pagina gestione agenti con preset e toggle individuale
- Sidebar raggruppata (Avvio/Produzione/Contenuti/Setup) con badge stato
- Indicatore readiness globale nel header sidebar

### UX Refactor "Setup vs Produzione" (05/03/2026) - COMPLETATO E TESTATO
- Sidebar ristrutturata in gruppi logici con badge colorati
- Pagina "Avvia campagna" con checklist dinamica collegata a /api/setup/readiness
- Azioni rapide: "Crea regola base", "Attiva preset standard"
- Toggle "Modalita essenziale" che nasconde campi avanzati nel workflow
- Pagina "Agenti" con preset rapidi (veloce/standard/alta qualita)
- Duplicazione corsi con bottone clone
- Navigazione "Vai a" per ogni voce checklist

### Design
- Stile Ariadne: minimale, molto bianco, tipografia Outfit + DM Sans
- Accenti cubotti (viola, arancio, verde, rosso, azzurro) su badge/stati
- Card con angoli leggeri, ombre morbide, spaziature ampie
- Responsive con sidebar collapsible

## Prioritized Backlog

### P0 (Critical) - COMPLETATO
- [x] Auth (JWT + Google OAuth)
- [x] Dashboard + Calendar
- [x] Social Profiles CRUD
- [x] Courses/Events CRUD + Clone
- [x] Campaign Workflow (create -> plan -> generate -> approve -> export)
- [x] Export CSV/JSON/Copy Pack
- [x] Setup vs Produzione UX refactor
- [x] Pagina Avvia campagna con checklist readiness
- [x] Pagina Agenti con preset
- [x] Modalita essenziale workflow

### P1 (Important - Next Phase)
- [ ] Implementazione vera generazione AI con Claude Sonnet 4.5 (attualmente MOCKED)
- [ ] Logica workflow completa (pianificazione calendario con conflitti, versioning post, quality check)
- [ ] Google Drive integration (lettura cartella repository)
- [ ] Drag & drop per riordinare post nel calendario
- [ ] Simulazione pianificazione (preview prima di generare)
- [ ] Preset campagna standard (corso multi-date, evento singolo, webinar, evergreen)
- [ ] Preset mix canali (solo azienda, azienda+soci, etc.)
- [ ] Buffer API adapter (disattivato, pronto per futuro)

### P2 (Enhancement)
- [ ] Filtri avanzati per campagna/profilo/data
- [ ] Ruoli e permessi granulari (admin/editor/viewer differenziati)
- [ ] Notifiche in-app per approvazioni
- [ ] Analytics post performance
- [ ] Template editor avanzato con variabili
- [ ] Scheduling automatico in futuro (Buffer API)
- [ ] Refactoring backend/server.py in moduli separati

## Test Credentials
- Email: arianna.perrone@ariadne.test / Password: password123
- Admin: admin@ariadne.training / admin123

## Test Reports
- /app/test_reports/iteration_1.json
- /app/test_reports/iteration_2.json
- /app/test_reports/iteration_3.json (UX refactor - 100% pass)
