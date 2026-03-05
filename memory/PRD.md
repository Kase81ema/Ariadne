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

### Fase 0-3 (Precedenti)
Studio comunicazione, Community core, School Operations, Community avanzata - tutti completati e testati.

### Fase 4 - UX Overhaul Batch 1 (05/03/2026) - COMPLETATO
- Tema scuro Studio / chiaro Scuola, sidebar collassabile, etichette italiane, logo Ariadne, registrazione semplificata

### Fase 5 - UX Overhaul Batch 2 (05/03/2026) - COMPLETATO
- Generazione testi asincrona, upload immagini feed, dashboard community umanizzata

### Fase 6 - UX Overhaul Batch 3 (05/03/2026) - COMPLETATO
- Catalogo corsi semplificato, gestione utenti/fatturazione, rate pagamenti, terminologia Edizioni

### Fase 7 - Grande Overhaul UX (05/03/2026) - COMPLETATO E TESTATO
**SCUOLA:**
- Feed rinominato "Bacheca della Community" con layout stile LinkedIn
- 5 post di esempio da trainer (Maria Rossi, Luca Bianchi, Giulia Verdi, Marco Ferrari, Elena Conti)
- Upload immagine prominente nel composer ("Aggiungi foto")
- Banner consigli con spazio immagine + 3 banner di esempio
- "Il mio percorso" spostato in alto nella dashboard sotto il benvenuto
- Sezione avanzamento credenziali ICF (ACC/PCC/MCC) nel percorso
- Pagina Benvenuto (/welcome) per utenti interessati: storia scuola, trainer, approccio, bibliografia, corsi in partenza, video placeholder, banner sconto, CTA Calendly, foto edizioni precedenti
- Menu riordinato: Feed dopo Il mio percorso
- "Assistente" rinominato "Ariadne AI"
- Gruppo RISORSE con accesso a Corsi ed eventi e Repository anche da Scuola

**STUDIO:**
- Tema dark raffinato con colori logo (azzurro/viola), testi sidebar piu leggibili
- Dashboard stat cards cliccabili: link a Bozze, Generati, Esportati, Campagne attive
- Upload immagini per singoli post dopo generazione testi (step 5 Revisione)

## Prioritized Backlog

### P0 - COMPLETATO
- [x] Tutte le fasi 0-7

### P1 (Improvements)
- [ ] Quick tour interattivo per primo accesso
- [ ] Schede corso dettagliate con foto, orari, certificazione, testimonianze
- [ ] Gestione abbinamento partecipanti per edizione nei materiali
- [ ] Gmail OAuth per sync inbox
- [ ] Google Drive integration per repository
- [ ] Notifiche in-app per pagamenti in scadenza
- [ ] Password reset / cambio password
- [ ] Esportazione dati pagamenti CSV
- [ ] Catalogo corsi gestibile da admin (CRUD)

### P2 (Enhancement)
- [ ] Buffer API per export
- [ ] Drag & drop calendario
- [ ] Dashboard analytics
- [ ] Ricerca avanzata inbox

## Test Reports
- iteration_6: Batch 1-3 (100%)
- iteration_7: Fase 7 grande overhaul (100%, 13 backend + 20 frontend)

## Test Credentials
- Admin: admin@ariadne.training / admin123
- Editor: arianna.perrone@ariadne.test / password123
