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
- **Database**: MongoDB (25+ collections)
- **AI**: Claude Sonnet 4.5 via emergentintegrations (ATTIVO per bozze email, assistente, generazione testi post)
- **Auth**: JWT + Google OAuth (Emergent Auth)

## Tema colori dal logo Ariadne
- Arancione: #FF9933, Giallo-verde: #99CC33, Rosa: #FF3366, Azzurro: #33CCFF, Viola: #9933CC
- **Studio**: dark theme con azzurro (#33CCFF) e viola (#9933CC) come accenti
- **Scuola**: light theme con giallo-verde (#99CC33) come accento primario

## What's Been Implemented

### Fase 0-15 (Precedenti) - COMPLETATO
Tutte le fasi precedenti completate e testate: Studio comunicazione, Community core, School Operations, Community avanzata, UX Overhaul (6 batch), Grande Overhaul UX, Studio Immagini + Buffer, Sidebar refinement (4 iterazioni), Training Courses hub, Dashboard Scuola ridefinita, interesse corsi.

### Fase 16 - Refactoring Architetturale Studio (06/03/2026) - COMPLETATO E TESTATO
**OBIETTIVO**: Rendere la "campagna" l'oggetto centrale del workflow Studio, unificando il flusso di produzione.

**DASHBOARD (Centro di controllo)**:
- Rinominata da "Dashboard" a "Centro di controllo"
- Nuova sezione "Pipeline campagne" con conteggio per stato (Bozza, Pianificazione, In revisione, Esportate)
- Sezione "Campagne recenti" con barre di progresso e click per ripresa
- Stat cards operative: Campagne attive, Post da approvare, Post approvati, Pubblicazioni oggi
- Stat row secondaria: Bozze, Generati, Esportati, Questa settimana
- Calendario editoriale mantenuto con filtri profilo

**EDITORIALE → CAMPAGNE (Hub gestione campagne)**:
- Pagina completamente riscritta: mostra TUTTE le campagne (non solo tipo "editorial")
- Quick stats: Campagne attive, In revisione, Completate
- Ricerca per titolo + filtro per stato + filtro per tipo
- Card campagne arricchite con: icona tipo, titolo, badge stato, badge tipo, corso collegato, periodo, profili, post/profilo
- Barre di progresso con label step (Da configurare → Testi da generare → X/Y approvati → Pronta per export → Completata)
- Azioni rapide: Riprendi, Esporta, Elimina (visibili al hover)
- Click su qualsiasi campagna apre il Workflow in modalita ripresa

**WORKFLOW (Produzione guidata) - REFACTORED**:
- Nuovo step 0 "Sorgente": selezione esplicita della fonte contenuti
  - Corso/evento: dropdown corsi dal catalogo
  - Repository: usa documenti guida esistenti
  - Testo libero/URL: campo URL multipli + area note
- Steps: Sorgente → Campagna → Profili → Agenti → Genera → Revisione
- Supporto ripresa campagne esistenti (`resumeCampaignId` via navigation state)
  - Carica dati campagna, profili, corso, sorgente
  - Salta allo step corretto basandosi sullo stato (draft→step 0, planning→step 4, review→step 5)
- Pulsante "Salva note nel repository" nello step Revisione
- Dialog per salvare note con titolo e contenuto nel repository

**BACKEND**:
- `CampaignCreate` model esteso con `source_type`, `source_urls`, `source_notes`, `current_step`
- `GET /api/campaigns` arricchito con: `posts_total`, `posts_draft`, `posts_generated`, `posts_approved`, `posts_exported`, `course_title`
- `GET /api/campaigns/{id}` arricchito con stessi campi
- `GET /api/dashboard/stats` arricchito con: `campaigns_draft`, `campaigns_planning`, `campaigns_review`, `campaigns_exported`, `recent_campaigns` (ultimi 5 con post counts)
- Nuovo endpoint `POST /api/campaigns/{id}/save-notes` per salvare note nel repository

**SIDEBAR**:
- "Dashboard" → "Centro di controllo"
- "Editoriale" spostato da Contenuti a Produzione, rinominato "Campagne"
- Gruppo Produzione riordinato: Campagne, Produzione guidata, Approvazioni, Esporta e pubblica

**TEST**:
- Report `iteration_13.json`: backend 100%, frontend 100%
- 22+ feature verificate: pipeline, campagne arricchite, filtri, ripresa campagne, step sorgente, salvataggio note, sidebar aggiornata

## Prioritized Backlog

### P0 - COMPLETATO
- [x] Tutte le fasi 0-16

### P1 (Improvements)
- [ ] Rifinitura sidebar: allineamento icona/testo e stato attivo piu evidente
- [ ] Rifinitura completa traduzione italiano e micro-copy su tutte le pagine
- [ ] Miglioramento UI gestione rate (template, duplicazione)
- [ ] Quick tour interattivo per primo accesso
- [ ] Gestione abbinamento partecipanti per edizione nei materiali
- [ ] Password reset / cambio password
- [ ] Catalogo corsi gestibile da admin (CRUD)

### P2 (Enhancement)
- [ ] Verifica live publishing Buffer con un canale collegato
- [ ] Google Drive integration per repository
- [ ] Gmail OAuth per sync inbox
- [ ] Drag & drop calendario
- [ ] Dashboard analytics avanzate
- [ ] Ricerca avanzata inbox
- [ ] Esportazione dati pagamenti CSV
- [ ] Notifiche in-app per pagamenti in scadenza

## Test Reports
- iteration_6-8: Fasi 0-8 (100%)
- iteration_9: Modulo immagini Studio + Buffer (100%)
- iteration_10: Sidebar + Training Courses (100%)
- iteration_11: Sidebar + corso detail admin (100%)
- iteration_12: Dashboard Scuola + interesse corsi (100%)
- iteration_13: Refactoring architetturale Studio (100%, 16+ backend + 22 frontend)

## Test Credentials
- Admin: admin@ariadne.training / admin123
- Editor: arianna.perrone@ariadne.test / password123
