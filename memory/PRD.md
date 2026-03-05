# Ariadne Editorial Studio - PRD

## Problem Statement
Console operativa per Ariadne Training: gestione comunicazione social (calendario editoriale, workflow post), school operations (inbox email, smistamento, bozze AI), e community (feed, materiali per coorte, percorso personale, assistente AI).

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI (Python) - modulare:
  - server.py (core, auth, studio comunicazione)
  - community_routes.py (feed, banners, onboarding, dashboard)
  - admin_routes.py (gestione utenti)
  - inbox_routes.py (inbox, regole, template, bozze)
  - school_routes.py (programmi, cohort, materiali, percorso, assistente)
- **Database**: MongoDB (15+ collections)
- **AI**: Claude Sonnet 4.5 via emergentintegrations (ATTIVO per bozze email e assistente)
- **Auth**: JWT + Google OAuth (Emergent Auth)

## Aree applicazione
1. **Studio comunicazione** (admin/editor): calendario, workflow, export
2. **Scuola e community** (tutti + admin/editor gestione): feed, percorso, materiali, inbox, cohort

## Roles
- admin: pieno accesso, modera feed, approva bozze, gestisce utenti/cohort
- editor: studio + gestione community (no approvazione bozze, no moderazione)
- user: solo community (feed, percorso, materiali propri, assistente)

## What's Been Implemented

### Fase 0 - Studio comunicazione
Auth, Dashboard, Profili Social, Corsi/Eventi, Workflow, Approvazioni, Export, Repository, Regole, Agenti, Setup vs Produzione UX.

### Fase 1 - Community Core (05/03/2026)
Sistema ruoli (ADMIN_EMAILS), selettore area, community dashboard + onboarding, feed (post/commenti/like/moderazione), gestione utenti, banner consigli.

### Fase 2 - School Operations (05/03/2026) - COMPLETATO E TESTATO
- **Inbox**: import manuale thread, classificazione automatica via regole, SLA tracking, assegnazione
- **Regole smistamento**: CRUD con condizioni (keyword oggetto/testo, mittente), categoria, priorita, SLA, assegnatario
- **Template email**: CRUD per categorie con variabili ({{nome}}, {{corso}}, etc.)
- **Bozze AI**: generazione con Claude Sonnet 4.5 usando template + repository + dati corsi + thread context
- **Workflow approvazione**: genera bozza -> modifica -> invia in approvazione -> approva e invia (admin)
- **Note di attenzione**: AI segnala dati mancanti o rischi compliance
- Seed: 3 regole, 3 template

### Fase 3 - Community Avanzata (05/03/2026) - COMPLETATO E TESTATO
- **Programmi e Cohort**: CRUD programmi, CRUD edizioni (cohort), assegnazione membri
- **Materiali**: upload per cohort, accesso filtrato per membership utente, download
- **Percorso personale**: 3 tab (formazione/credenziale/business), step con status, tracking ore, validazione admin
- **Assistente AI**: chat con Claude Sonnet 4.5 usando repository + corsi + materiali come contesto, rifiuta di inventare info
- Seed: 3 journey template (formazione 5 step, credenziale 4 step, business 5 step)

## Prioritized Backlog

### P0 - COMPLETATO
- [x] Studio comunicazione
- [x] Community core (feed, banners, onboarding, utenti)
- [x] School Operations (inbox, regole, template, bozze AI)
- [x] Community avanzata (cohort, materiali, percorso, assistente)

### P1 (Improvements)
- [ ] Gmail OAuth per sync automatico inbox
- [ ] Invio email reale (SMTP o Gmail API)
- [ ] Generazione AI vera per post social (Claude Sonnet 4.5 nel workflow studio)
- [ ] Google Drive integration per repository
- [ ] Upload immagini nel feed

### P2 (Enhancement)
- [ ] Buffer API adapter per export
- [ ] Drag & drop calendario
- [ ] Notifiche in-app per approvazioni e SLA
- [ ] Dashboard analytics (post performance, inbox metrics)
- [ ] Ricerca avanzata inbox
- [ ] Template percorso personalizzabili da admin

## Collections
users, user_profiles, user_sessions, social_profiles, courses_events, campaigns, posts, planning_rules, agent_configs, repository_files, templates, audit_logs, suggestion_banners, feed_posts, feed_comments, feed_likes, inbox_threads, inbox_messages, inbox_rules, inbox_templates, inbox_drafts, programs, cohorts, cohort_memberships, materials, journey_templates, journey_progress

## Test Reports
- iteration_1-3: Studio comunicazione (100%)
- iteration_4: Community Phase 1 (100%, 27 backend tests)
- iteration_5: Phase 2+3 (100%, 35 backend tests + all frontend)

## Test Credentials
- Admin: admin@ariadne.training / admin123
- Editor: arianna.perrone@ariadne.test / password123
