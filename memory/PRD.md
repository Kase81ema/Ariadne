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

### Fase 10 - Sidebar governance + Training Courses hub (06/03/2026) - COMPLETATO E TESTATO
**NAVIGAZIONE E RUOLI:**
- Sidebar alleggerita con font menu ridotto per una gerarchia visiva più pulita
- Area Studio aggiornata con sidebar chiara e contenuto principale scuro
- Rimossi dalla sidebar `Eventi e annunci`; restano solo nei dashboard/overview interni
- `Corsi ed eventi` e `Repository` resi visibili e accessibili solo a Editor/Admin, sia lato menu sia lato route/API principali
- Nuova voce sidebar `Training Courses`

**TRAINING COURSES PAGE:**
- Nuova pagina catalogo unica per tutti gli utenti con card corsi, ricerca e filtri per categoria/timing
- Supporto a corsi continuativi, upcoming, ongoing e completed
- Vista Admin/Editor estesa con tab operative: catalogo, course operations, payment schedule

**OPERATIVITÀ ADMIN:**
- Gestione course/edition/participants in un unico punto con stati `Interested`, `Confirmed`, `Enrolled`
- Creazione edizioni collegate ai corsi tramite `course_id`
- Workflow cumulativo per piani rateali: selezione corso -> edizione -> partecipanti -> 1-5 rate flessibili per persona
- Nuova vista aggregata scadenze pagamenti/receivables con overdue, upcoming e totale da incassare

**TEST:**
- Self-test backend completato con utente editor + utente regular
- Report `iteration_10.json`: backend 100%, frontend 100%
- Verificati: blocco role-based su `/courses` e `/repository`, catalogo Training Courses per regular user, hub operativo completo per Editor/Admin

### Fase 11 - Sidebar refinement finale Studio + School (06/03/2026) - COMPLETATO E TESTATO
**FOCUS SOLO SIDEBAR:**
- Sidebar allargata a 304px per dare respiro ai label lunghi
- Bottoni di navigazione riprogettati con migliore gerarchia, padding, min-height, icon slot dedicato e label stabilizzati su una linea
- Aggiornati i soli label sidebar richiesti con naming più leggibile e coerente in inglese
- Verificata la resa sia in Studio sia in School: niente wrap brutto, niente icona sopra testo, pulsanti più puliti e professionali

**TEST:**
- Smoke test visivo eseguito con screenshot Studio + School
- Verifica frontend dedicata completata: tutti i label sidebar leggibili e allineati correttamente, nessun difetto residuo segnalato

### Fase 12 - Sidebar pattern definitivo + Training hub esteso (06/03/2026) - COMPLETATO E TESTATO
**SIDEBAR / LINGUA:**
- Sidebar Studio + School ridisegnate come vero sistema di navigazione soft-card / pill button
- Header gruppi rafforzati con card container, separatori e stati attivo/hover più chiari
- Label principali riportati in italiano corrente, più chiaro e coerente con il resto dell’app

**TRAINING COURSES / DETTAGLI CORSO:**
- Training Courses ora usa copy completamente in italiano sul catalogo e sulla parte operativa
- Scheda corso nuovamente raggiungibile da ogni card del catalogo tramite `Apri scheda corso`
- Nuovi endpoint backend per dettaglio corso training e riepilogo admin partecipanti
- Nella scheda del singolo corso, Admin/Editor vedono interessati / confermati / iscritti e possono modificare lo stato inline
- Deep-link diretto da Training Courses e da scheda corso alla pagina `Utenti admin` con selezione automatica dell’utente

**RATE / OPERATIVITÀ:**
- Vista `Piani rate cumulativi` raffinata con template rapidi 2/3/5 rate
- Aggiunta duplicazione schema tra partecipanti (`Usa come modello`, `Applica modello`, `Duplica modello su tutti`)
- Operatività mantenuta nel flusso: corso -> edizione -> partecipanti -> rate

**TEST:**
- Smoke test frontend: sidebar + apertura dettaglio corso
- Report `iteration_11.json`: backend 100%, frontend 100%
- Confermati funzionanti: pattern sidebar, scheda corso raggiungibile, riepilogo admin corso, aggiornamento stato inline, deep-link a utenti admin

### Fase 13 - Sidebar item layout fix definitivo (06/03/2026) - COMPLETATO E TESTATO
**FOCUS SOLO SIDEBAR, COME RICHIESTO:**
- Corretto il problema strutturale dei nav item: il `NavLink` ora usa il pattern compatibile con la versione del router (`className="sidebar-link" + activeClassName="active" + exact`)
- Ogni voce sidebar ora è una singola riga compatta: icona a sinistra, label a destra, area cliccabile piena e stato attivo finalmente visibile
- Rafforzato lo stato attivo in Studio e School con trattamento più netto, mantenendo invariata la grouped card structure
- Nessun altro blocco funzionale dell’app è stato modificato in questo passaggio

**TEST:**
- Smoke test visivo Studio + School con verifica `ACTIVE COUNT = 1` in entrambe le aree
- Verifica frontend dedicata completata: layout orizzontale compatto, active state chiaro, nessun difetto residuo rilevato

### Fase 14 - Dashboard Scuola ridefinita + copy in italiano + interesse corsi (06/03/2026) - COMPLETATO E TESTATO
**TRADUZIONE / MICRO-COPY:**
- Riallineati in italiano corrente i label e i micro-copy principali delle aree toccate: dashboard Scuola, Training Courses, scheda corso, CTA e messaggi di stato
- Tono reso più caldo, coach-like e più coerente con la voce Ariadne

**DASHBOARD SCUOLA:**
- Rimossa la sezione `Volti della community`
- Nuova gerarchia implementata:
  - top: `Il mio percorso` + banner `Iscrizioni aperte ora`
  - sotto: card di benvenuto/orientamento a sinistra + `Dalla bacheca` a destra in posizione più alta e prominente
  - sotto: `Prossime occasioni` arricchita con logica `percorso in evidenza`
- Card di benvenuto trasformata in blocco di orientamento firmato `Emanuele, Arianna e Emanuele` con 3 CTA strategiche
- Banner in alto a destra mantenuto come CTA principale sulle iscrizioni realmente aperte
- `Prossime occasioni` arricchita con percorso evidenziato che porta alla scheda corso per raccolta interesse

**INTERESSE CORSI / DETTAGLIO CORSO:**
- Nuovi endpoint backend per:
  - dettaglio corso training con `current_user_status`
  - salvataggio reale dell’interesse utente su un percorso
  - aggiornamento admin dello stato interesse da scheda corso
  - riepilogo admin corso con `interested / confirmed / enrolled` + prospects senza edizione
- La scheda del corso è di nuovo raggiungibile da `Training Courses`
- L’utente vede in modo evidente il cambio di stato dopo il click su `Mi interessa questo percorso`
- Admin/Editor vedono e modificano lo stato dei partecipanti direttamente nella scheda corso

**TEST:**
- Smoke test frontend su dashboard Scuola + apertura scheda corso
- Report `iteration_12.json`: backend 100%, frontend 100%
- Verificati: nuova gerarchia dashboard, CTA benvenuto, banner iscrizioni, featured program, salvataggio interesse, persistenza stato, riepilogo admin e update inline

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
- [ ] Hardening completo dei permessi backend secondari sul repository immagini/media interni se si vorrà estendere la segregazione dati oltre le route principali
- [ ] Rifinitura estesa della traduzione in italiano su tutte le pagine storiche non ancora riallineate

## Test Reports
- iteration_6: Batch 1-3 (100%)
- iteration_7: Fase 7 grande overhaul (100%, 13 backend + 20 frontend)
- iteration_8: Verifica finale Studio + Scuola (100%, 6 endpoint backend + 15 scenari frontend)
- iteration_9: Modulo immagini Studio + Buffer GraphQL (100%, backend + frontend)
- iteration_10: Sidebar role-based + Training Courses hub + payment overview (100%, backend + frontend)
- iteration_11: Sidebar pattern definitivo + corso detail admin + quick templates rate (100%, backend + frontend)
- iteration_12: Dashboard Scuola ridefinita + interesse corsi + micro-copy italiani (100%, backend + frontend)

## Test Credentials
- Admin: admin@ariadne.training / admin123
- Editor: arianna.perrone@ariadne.test / password123
