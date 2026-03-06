# Ariadne Editorial Studio - PRD

## Problem Statement
Console operativa per Ariadne Training: gestione comunicazione social (calendario editoriale, workflow post), school operations (inbox email, smistamento, bozze AI), e community (feed, materiali per edizione, percorso personale, assistente AI).

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI (Python) - modulare:
  - server.py (core, auth, studio comunicazione, async job system, post image upload)
  - community_routes.py (feed, banners, onboarding, dashboard, image upload, seed samples)
  - admin_routes.py (gestione utenti)
  - inbox_routes.py (inbox, regole, template, bozze)
  - school_routes.py (programmi, edizioni, materiali, catalogo corsi, percorso, assistente, user details, pagamenti)
  - media_routes.py (immagini, Buffer integration, media assets)
- **Database**: MongoDB (25+ collections)
- **AI**: Claude Sonnet 4.5 via emergentintegrations
- **Auth**: JWT + Google OAuth (Emergent Auth)
- **Buffer**: Connected (LinkedIn: Emanuele Casero) — publishing verified end-to-end

## What's Been Implemented

### Fase 16 - Refactoring Architetturale Studio (06/03/2026) - COMPLETATO
Dashboard → Centro di controllo con pipeline campagne. EditorialPage → Hub gestione campagne. Workflow → Produzione guidata con step Sorgente + ripresa campagne. Backend arricchito con post counts e course_title.

### Fase 17 - School Dashboard Revision + Buffer Fix (06/03/2026) - COMPLETATO E TESTATO

**SCHOOL DASHBOARD**:
1. **Layout hierarchy**: Top row (Benvenuto + Iscrizioni aperte, equal height) → Il mio percorso (full width) → Le prossime occasioni + Materiali (left) | Dalla bacheca (right)
2. **Benvenuto card**: Merged welcome text (removed separate greeting block), unified and fluid message
3. **Action buttons**: Redesigned with icon+text in horizontal layout, green hover (#8DB440), proper spacing
4. **Clickable events**: Each event in "Le prossime occasioni" is a button that navigates to /course/{course_id}
5. **Interest/enrollment badges**: Shows Interessato/a, Confermato/a, Iscritto/a badges on events where user has status
6. **New Materiali section**: Below "Percorso in evidenza", with "Risorse pratiche" and "Esempi e contenuti dai corsi" descriptions + "Esplora i materiali" CTA
7. **Backend**: community_routes.py updated to return course_id and user_interest in upcoming_events

**BUFFER INTEGRATION FIX**:
1. Fixed _buffer_get_profiles in media_routes.py: removed invalid GraphQL fields (serviceUsername, formattedUsername)
2. Buffer profiles API now correctly returns "Emanuele Casero" LinkedIn channel (ID: 69aabbc93f3b94a121205244)
3. Social profile prof_casero_li linked to Buffer channel
4. End-to-end publish test: post created → approved → published to Buffer → confirmed (buffer_post_id: 69aacbee94a16103613fb1ba)

**TEST**: iteration_14.json — backend 100%, frontend 100%

## Prioritized Backlog

### P1 (Improvements)
- [ ] Rifinitura sidebar: allineamento icona/testo e stato attivo piu evidente
- [ ] Rifinitura completa traduzione italiano e micro-copy
- [ ] Miglioramento UI gestione rate (template, duplicazione)

### P2 (Enhancement)
- [ ] Google Drive integration per repository
- [ ] Quick tour interattivo primo accesso
- [ ] Dashboard analytics avanzate
- [ ] Drag & drop calendario
- [ ] Esportazione dati pagamenti CSV

## Test Reports
- iteration_13: Refactoring architetturale Studio (100%)
- iteration_14: School Dashboard + Buffer (100%)

## Test Credentials
- Admin: admin@ariadne.training / admin123
- Editor: arianna.perrone@ariadne.test / password123
