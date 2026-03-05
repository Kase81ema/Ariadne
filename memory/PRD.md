# Ariadne Editorial Studio - PRD

## Problem Statement
Console operativa per Ariadne Training: gestione comunicazione social (calendario editoriale, workflow post), school operations (inbox email, smistamento, bozze AI), e community (feed, materiali per edizione, percorso personale, assistente AI).

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI (Python) - modulare:
  - server.py (core, auth, studio comunicazione, async job system)
  - community_routes.py (feed, banners, onboarding, dashboard, image upload)
  - admin_routes.py (gestione utenti)
  - inbox_routes.py (inbox, regole, template, bozze)
  - school_routes.py (programmi, edizioni, materiali, catalogo corsi, percorso, assistente, user details, pagamenti)
- **Database**: MongoDB (20+ collections)
- **AI**: Claude Sonnet 4.5 via emergentintegrations (ATTIVO per bozze email, assistente, generazione testi post)
- **Auth**: JWT + Google OAuth (Emergent Auth)

## Aree applicazione
1. **Studio comunicazione** (admin/editor): tema scuro, calendario, workflow, export
2. **Scuola e community** (tutti + admin/editor gestione): tema chiaro, feed, percorso corsi, materiali, inbox, edizioni

## Roles
- admin: pieno accesso, modera feed, approva bozze, gestisce utenti/edizioni, billing
- editor: studio + gestione community (no approvazione bozze, no moderazione)
- user: solo community (feed, percorso, materiali propri, assistente)

## What's Been Implemented

### Fase 0 - Studio comunicazione
Auth, Dashboard, Profili Social, Corsi/Eventi, Workflow, Approvazioni, Export, Repository, Regole, Agenti, Setup vs Produzione UX.

### Fase 1 - Community Core (05/03/2026)
Sistema ruoli (ADMIN_EMAILS), selettore area, community dashboard + onboarding, feed (post/commenti/like/moderazione), gestione utenti, banner consigli.

### Fase 2 - School Operations (05/03/2026)
Inbox, Regole smistamento, Template email, Bozze AI, Workflow approvazione, Note di attenzione.

### Fase 3 - Community Avanzata (05/03/2026)
Programmi e Edizioni, Materiali, Percorso personale, Assistente AI.

### Fase 4 - UX Overhaul Batch 1 (05/03/2026) - COMPLETATO E TESTATO
- **Tema scuro Studio**: variabili CSS sotto `[data-area="studio"]`, override automatici per classi Tailwind
- **Tema chiaro Scuola**: tema default per area school
- **Sidebar collassabile**: gruppi con stato persistito in localStorage, chevron animati
- **Etichette italiane**: tutte le label sidebar tradotte
- **Logo Ariadne**: integrato in sidebar e login page con fallback
- **Registrazione semplificata**: solo email obbligatoria, sezione espandibile per nome/password opzionali
- **Password auto-generata**: backend genera password se non fornita, mostrata all'utente

### Fase 5 - UX Overhaul Batch 2 (05/03/2026) - COMPLETATO E TESTATO
- **Generazione testi asincrona**: job in background via `asyncio.create_task`, endpoint start/poll, progress bar nel frontend
- **Upload immagini feed**: selezione file, preview, upload e visualizzazione nel feed
- **Dashboard community umanizzata**: sezione "Volti della community" con avatar colorati, immagini dal feed nei post recenti

### Fase 6 - UX Overhaul Batch 3 (05/03/2026) - COMPLETATO E TESTATO
- **"Il mio percorso" semplificato**: catalogo corsi con 2 tab (Ariadne/business), 7 corsi seed, status toggle per utente
- **Gestione utenti e fatturazione**: dialog dettagli con campi fatturazione (CF, P.IVA, SDI, PEC, indirizzo), gestione rate pagamenti
- **Rate e pagamenti**: CRUD completo, alert scadenze, stati pending/paid/overdue
- **Terminologia "Edizioni"**: sostituzione "Cohort" con "Edizioni" in tutti i componenti user-facing

## Prioritized Backlog

### P0 - COMPLETATO
- [x] Studio comunicazione
- [x] Community core
- [x] School Operations
- [x] Community avanzata
- [x] UX Overhaul Batch 1 (temi, sidebar, registrazione, logo)
- [x] UX Overhaul Batch 2 (async gen, immagini feed, dashboard umana)
- [x] UX Overhaul Batch 3 (catalogo corsi, billing, pagamenti, terminologia)

### P1 (Improvements)
- [ ] Gmail OAuth per sync automatico inbox
- [ ] Invio email reale (SMTP o Gmail API)
- [ ] Google Drive integration per repository
- [ ] Notifiche in-app per pagamenti in scadenza
- [ ] Password reset / cambio password utente
- [ ] Esportazione dati pagamenti (CSV)

### P2 (Enhancement)
- [ ] Buffer API adapter per export
- [ ] Drag & drop calendario
- [ ] Notifiche in-app per approvazioni e SLA
- [ ] Dashboard analytics (post performance, inbox metrics)
- [ ] Ricerca avanzata inbox
- [ ] Template percorso personalizzabili da admin
- [ ] Catalogo corsi gestibile da admin (CRUD)

## Collections
users, user_profiles, user_sessions, user_details, social_profiles, courses_events, campaigns, posts, planning_rules, agent_configs, repository_files, templates, audit_logs, suggestion_banners, feed_posts, feed_comments, feed_likes, inbox_threads, inbox_messages, inbox_rules, inbox_templates, inbox_drafts, programs, cohorts, cohort_memberships, materials, journey_templates, journey_progress, course_catalog, user_course_progress, payment_installments

## Test Reports
- iteration_1-3: Studio comunicazione (100%)
- iteration_4: Community Phase 1 (100%, 27 backend tests)
- iteration_5: Phase 2+3 (100%, 35 backend tests + all frontend)
- iteration_6: Batch 3 features (100%, 17 backend + 10 frontend)

## Test Credentials
- Admin: admin@ariadne.training / admin123
- Editor: arianna.perrone@ariadne.test / password123
