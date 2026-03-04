# Ariadne Editorial Studio - PRD

## Problem Statement
Console operativa per social media manager: pianificazione calendario editoriale e generazione post social testuali per canali aziendali (LinkedIn, Instagram) e profili personali dei soci di Ariadne Training.

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: Claude Sonnet 4.5 via emergentintegrations
- **Auth**: JWT + Google OAuth (Emergent Auth)

## User Personas
1. **Admin** (admin@ariadne.training) - Gestione completa
2. **Editor** - Creazione e gestione contenuti
3. **Viewer** - Solo lettura

## Core Requirements (Static)
- Calendario editoriale con vista mese/settimana
- Generazione post testuali AI (10 agenti specializzati)
- Workflow: campagna → pianifica → genera → revisiona → approva → esporta
- Export per Buffer (CSV/JSON) e Copy Pack
- Repository base conoscitiva con upload file
- Gestione corsi/eventi con duplicazione rapida
- Profili social configurabili (LinkedIn aziendale/personale, Instagram)
- Regole di pianificazione modificabili
- Audit log completo

## What's Been Implemented (04/03/2026)

### Backend (FastAPI)
- Auth completo (JWT + Google OAuth session exchange)
- CRUD Social Profiles, Courses/Events, Campaigns, Posts, Planning Rules, Templates
- Clone corsi in 1 click
- AI Generation pipeline con 10 agenti (Claude Sonnet 4.5)
- Export CSV/JSON/Copy Pack
- File upload repository con categorie
- Dashboard stats e calendar API
- Post versioning e commenti
- Batch approval
- Audit logging completo
- Seed data: 5 profili, 2 corsi, 2 regole, 3 template, 10 agenti, 1 admin

### Frontend (React)
- Login (JWT + Google OAuth)
- Dashboard con stats e calendario mese
- Profili Social (CRUD + toggle on/off)
- Corsi ed Eventi (CRUD + clone + multi-date + trainer/tag)
- Editoriale (campagne non legate a corsi)
- Regole di pianificazione (editor visuale giorni/orari/gap)
- Workflow wizard multi-step (6 passaggi)
- Approvazioni (filtri, edit, rigenera, commenti, versioni)
- Export (CSV/JSON/Copy Pack con copia individuale)
- Repository (upload con categorie, anteprima)

### Design
- Stile Ariadne: minimale, molto bianco, tipografia Outfit + DM Sans
- Accenti cubotti (viola, arancio, verde, rosso, azzurro) su badge/stati
- Card con angoli leggeri, ombre morbide, spaziature ampie
- Responsive con sidebar collapsible

## Prioritized Backlog

### P0 (Critical)
- [x] Auth (JWT + Google OAuth)
- [x] Dashboard + Calendar
- [x] Social Profiles CRUD
- [x] Courses/Events CRUD + Clone
- [x] Campaign Workflow (create → plan → generate → approve → export)
- [x] Export CSV/JSON/Copy Pack

### P1 (Important - Next Phase)
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

## Next Tasks
1. Google Drive integration per lettura documenti repository
2. Drag & drop calendario
3. Preset campagna e mix canali
4. Simulazione pianificazione
5. Buffer adapter preparazione
