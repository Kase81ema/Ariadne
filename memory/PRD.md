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
- "Il mio percorso" ridisegnato come journey tracker personale con 3 aree: Formazione Coach ICF, Formazione Coach tecnica, Formazione Coach business
- Schede corso dettagliate con foto edizioni, certificazione, orari/calendario, testimonianze e CTA
- Pagina Benvenuto (/welcome) per utenti interessati: storia scuola, trainer, approccio, bibliografia, corsi in partenza, video placeholder, banner sconto, CTA Calendly, foto edizioni precedenti
- Menu riordinato: Feed dopo Il mio percorso
- "Assistente" rinominato "Ariadne AI"
- Gruppo RISORSE con accesso a Corsi ed eventi e Repository anche da Scuola

**STUDIO:**
- Tema dark raffinato e alleggerito con colori logo (azzurro/viola), testi sidebar bianchi piu leggibili
- Dashboard stat cards cliccabili: link a Bozze, Generati, Esportati, Campagne attive
- Upload immagini per singoli post dopo generazione testi (step 5 Revisione)

### Fase 8 - Verifica finale regressione (05/03/2026) - COMPLETATO
- Verifica finale frontend + backend eseguita con report `iteration_8.json`
- Studio e Scuola validati end-to-end senza regressioni bloccanti
- Confermati come MOCKED: tracking credenziali ICF persistito in localStorage e parte dei contenuti estesi delle schede corso gestiti staticamente nel frontend

### Fase 9 - Studio Immagini interne + Buffer GraphQL (06/03/2026) - COMPLETATO E TESTATO
**STUDIO COMUNICAZIONE:**
- Nuovo data model MongoDB: `media_assets`, `post_media_assignment`, `repository_images_index`, `studio_jobs`
- Storage immagini persistente su filesystem con route pubbliche `/api/media/public/{asset_id}` e varianti `square`, `portrait`, `landscape`
- Nuova voce sidebar Studio `Immagini` con pagina dedicata e 3 tab: `Carica da PC`, `Repository immagini`, `Genera con AI`
- Upload da PC con preview metadati, tag, associazione opzionale a corso, processamento automatico e firma Ariadne opzionale
- Repository immagini integrato anche nella pagina Repository: upload, indicizzazione, filtro per corso, import in libreria
- Generazione immagini AI attiva con Gemini image generation latest (via Emergent Universal Key) salvata come asset interno
- Due agenti Studio aggiunti: `Ritaglia immagini` e `Migliora immagine`
- Workflow aggiornato con `Abbina immagini automaticamente`, preferenze formato per canale, sorgente immagini, override manuale asset/variante e rimozione immagine
- Export CSV/JSON arricchito con `media_asset_id`, `image_public_url`, `variant`
- Export Buffer aggiornato con anteprima asset interno, stato publishing e gestione errori chiari in UI

**BUFFER:**
- Integrazione migrata al Buffer GraphQL API moderno (`https://api.buffer.com`) con Bearer token
- Query account/organizations implementata e endpoint `/api/buffer/profiles` reso compatibile con il flusso GraphQL corrente
- Publishing backend aggiornato a `createPost` GraphQL con supporto immagine tramite public URL interni e fallback tra shape asset diverse
- Stato attuale account test: token valido, 1 organization rilevata, 0 canali collegati disponibili per pubblicazione live

**TEST:**
- Smoke test frontend + backend eseguiti
- Report `iteration_9.json`: backend 100%, frontend 100%
- Buffer live publish NON completamente verificabile finché l’account non ha almeno un canale collegato

## Prioritized Backlog

### P0 - COMPLETATO
- [x] Tutte le fasi 0-7

### P1 (Improvements)
- [ ] Quick tour interattivo per primo accesso
- [ ] Gestione abbinamento partecipanti per edizione nei materiali
- [ ] Gmail OAuth per sync inbox
- [ ] Google Drive integration per repository
- [ ] Notifiche in-app per pagamenti in scadenza
- [ ] Password reset / cambio password
- [ ] Esportazione dati pagamenti CSV
- [ ] Catalogo corsi gestibile da admin (CRUD)

### P2 (Enhancement)
- [ ] Verifica live publishing Buffer con un canale realmente collegato all’account
- [ ] Drag & drop calendario
- [ ] Dashboard analytics
- [ ] Ricerca avanzata inbox

## Test Reports
- iteration_6: Batch 1-3 (100%)
- iteration_7: Fase 7 grande overhaul (100%, 13 backend + 20 frontend)
- iteration_8: Verifica finale Studio + Scuola (100%, 6 endpoint backend + 15 scenari frontend)
- iteration_9: Modulo immagini Studio + Buffer GraphQL (100%, backend + frontend)

## Test Credentials
- Admin: admin@ariadne.training / admin123
- Editor: arianna.perrone@ariadne.test / password123
