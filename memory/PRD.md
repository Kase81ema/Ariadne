# Ariadne Editorial Studio - PRD

## Problem Statement
Console operativa per social media manager e scuola di coaching: pianificazione calendario editoriale, generazione post social testuali per canali aziendali (LinkedIn, Instagram), e area community per partecipanti e interessati.

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI (Python) - modulare (server.py + community_routes.py + admin_routes.py)
- **Database**: MongoDB
- **AI**: Claude Sonnet 4.5 via emergentintegrations (MOCKED)
- **Auth**: JWT + Google OAuth (Emergent Auth)

## User Personas & Roles
1. **Admin** - Gestione completa (studio + community + school ops)
2. **Editor** - Creazione contenuti + gestione community
3. **User** - Partecipanti/interessati (solo community)

Role assignment:
- ADMIN_EMAILS env var -> admin al login
- Se ADMIN_EMAILS vuoto: primo utente -> admin
- Default nuove registrazioni: role=user

## Aree dell'applicazione
1. **Studio comunicazione** (admin/editor): calendario editoriale, workflow post, export
2. **Scuola e community** (tutti): dashboard, feed, percorso, materiali, eventi, assistente; admin/editor: inbox, utenti, banner, cohort

## What's Been Implemented

### Fase 0 - Studio comunicazione (completato)
- Auth JWT + Google OAuth
- Dashboard con stats e calendario
- Profili Social CRUD + toggle
- Corsi ed Eventi CRUD + clone
- Workflow wizard multi-step + modalita essenziale
- Approvazioni + Export CSV/JSON/Copy Pack
- Repository con upload
- Regole pianificazione
- Agenti AI con preset
- Setup vs Produzione UX refactor

### Fase 1 - Scuola e Community Core (05/03/2026 - COMPLETATO E TESTATO)
Backend:
- Sistema ruoli aggiornato (ADMIN_EMAILS, determine_role, default user)
- community_routes.py: feed CRUD, onboarding, dashboard, banners, events
- admin_routes.py: user management (list, change role, suspend, remove content)
- Seed data: 3 banner community

Frontend:
- Selettore area (Studio/Scuola) nella sidebar con navigazione role-based
- CommunityDashboardPage: dashboard con onboarding dialog, banner, eventi, feed recente
- FeedPage: post testo, like, commenti, moderazione admin
- UsersAdminPage: gestione utenti, ruoli, sospensione
- BannersAdminPage: CRUD banner con audience targeting
- CommunityEventsPage: vista eventi da corsi
- PlaceholderPage: pagine "In arrivo" per features future
- Routing role-based: user -> solo community, admin/editor -> entrambe le aree

## Prioritized Backlog

### P0 (Critical) - COMPLETATO
- [x] Auth (JWT + Google OAuth)
- [x] Studio comunicazione completo
- [x] Setup vs Produzione UX refactor
- [x] Scuola e community: ruoli, area selector, dashboard, feed, onboarding
- [x] Gestione utenti + banner consigli

### P1 (Important - Next Phase: School Operations)
- [ ] Inbox con modalita manuale (import thread)
- [ ] Regole smistamento
- [ ] Template email
- [ ] Gestione bozze + approvazione
- [ ] AI per bozze email (Claude Sonnet 4.5)

### P1.5 (Community Avanzata)
- [ ] Materiali per coorte (programs, cohorts, memberships)
- [ ] Pagina admin "Cohort e materiali"
- [ ] Percorso personale (formazione/credenziale/business)
- [ ] Assistente AI (chat con context dal repository)

### P2 (Enhancement)
- [ ] Implementazione vera generazione AI con Claude Sonnet 4.5
- [ ] Google Drive integration per repository
- [ ] Integrazione Gmail OAuth
- [ ] Buffer API adapter
- [ ] Drag & drop calendario
- [ ] Filtri avanzati, notifiche, analytics
- [ ] Refactoring backend monolitico ulteriore

## Test Credentials
- Admin: admin@ariadne.training / admin123
- Editor: arianna.perrone@ariadne.test / password123

## Test Reports
- /app/test_reports/iteration_1.json, iteration_2.json, iteration_3.json (Studio)
- /app/test_reports/iteration_4.json (Community Phase 1 - 100% pass, 27 backend + all frontend)
