# Ariadne — Piattaforma E-Learning e Community

## Problema
Piattaforma e-learning e community per Ariadne Training. Percorsi formativi per coaching professionale, gestione iscrizioni, pagamenti a rate, community feed e comunicazioni integrate.

## Architettura
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Integrazioni**: Buffer (LinkedIn publishing), Gmail OAuth (inbox), Gemini (immagini), Claude Sonnet 4.5 (AI)

## Struttura Navigazione
- **Il mio spazio**: Home, Le mie iscrizioni, Il mio percorso, Materiali
- **Scopri**: Percorsi formativi, Bacheca, Eventi, Ariadne AI
- **Gestione** (solo admin): Iscrizioni e pagamenti, Edizioni e materiali, Utenti, Corsi ed eventi, Comunicazioni, Banner

## Catalogo Corsi (7 corsi reali)
### Sezione A — Percorso coaching ICF
1. **Core Coaching Program** (cat_cc2026) — Level 1 ICF, credenziale ACC, €2.900
2. **Professional Coaching Program** (cat_pcp2026) — Level 2 ICF, credenziale PCC, €5.300
3. **Team Coaching Program** (cat_tcp2026) — Level 2 + ACTC, credenziale PCC+ACTC, €2.900

### Sezione B — Corsi di arricchimento e specializzazione
4. **Core Quadrant® Pro Training** (cat_cqpro) — Certificazione Core Quadrant Trainer, €1.795
5. **Visual Coaching** (cat_visual) — 20 ore formazione avanzata
6. **Teen Coaching** (cat_teen) — 16 ore coaching con adolescenti
7. **Advanced Coaching** (cat_advanced) — Livello 3 sperimentale

## Eventi Reali (aggiornati 2026-07-04)
1. **Core Quadrant® Pro Training** — 30 settembre / 1 ottobre 2026 (invariato)
2. **Presentazione percorsi formativi 2026-2027** — 14 luglio 2026, 18:30-20:00, Arianna Perrone + Emanuele Ciccarelli, Online (Zoom)
3. **Atelier — Apericoaching** — Ricorrenza mensile, Cascina Ovi, Segrate (Milano), nessuna data fittizia

## Trainer Reali
- **Arianna Perrone** — Co-fondatrice, MCC ICF, 2500+ ore coaching
- **Emanuele Ciccarelli** — Co-fondatore, PCC ICF, Integral Coach
- **Emanuele Casero** — Co-fondatore, PCC ICF, sviluppo strategico

## Funzionalità Implementate

### Ristrutturazione Sessione 1 — Menu, labels, tono ✅
### Ristrutturazione Sessione 2 — Profilo + Le mie iscrizioni ✅
### Ristrutturazione Sessione 3 — Wizard iscrizione (6 step) ✅
### Ristrutturazione Sessione 4 — Admin separazione + pipeline + KPI ✅
### Contenuti reali — Prompt_1_Contenuti_Reali.md ✅
### UX Miglioramenti — Prompt_2_UX_Miglioramenti.md ✅ (2026-07-04)
- Widget "Prossimo Passo" nella Home (stato utente dinamico)
- Cross-linking MyJourney ↔ MyEnrollments ↔ CourseDetail
- Badge prerequisiti nel catalogo (Aperto a tutti / Prerequisito)
- Empty states con tono Ariadne (MyEnrollments, MyJourney)
- Breadcrumb in ProfilePage, MyEnrollmentsPage, CourseDetailPage
- Sidebar: evidenziazione sotto-pagine (/course/* → Percorsi formativi)
- Testo coerente CTA: "Vorrei saperne di più"
- Profilo: avviso profilo incompleto con bordi arancio
### Correzione Eventi — Micro_Prompt_Correzione_Eventi.md ✅ (2026-07-04)
- Webinar → Presentazione percorsi formativi 2026-2027
- Aperitivo → Atelier — Apericoaching (ricorrente mensile)
- Supporto eventi ricorrenti in dashboard, eventi page
- Fix API CourseDetailPage (registerInterest → saveTrainingCourseInterest)

## API Endpoints Chiave
- `POST /api/school/enrollments` — Crea/riprendi enrollment (status: in_progress)
- `POST /api/school/enrollments/{id}/confirm` — Conferma (status: confirmed)
- `GET /api/school/enrollments/my` — Lista iscrizioni utente
- `GET /api/school/my-payments` — Lista rate utente
- `GET /api/school/training-courses` — Lista percorsi formativi con eventi
- `GET /api/school/training-courses/{id}` — Dettaglio percorso
- `POST /api/school/training-courses/{id}/interest` — Segnala interesse
- `GET /api/community/dashboard` — Dashboard con widget, eventi, interessi
- `GET /api/community/events` — Lista eventi (inclusi ricorrenti)
- `GET /api/school/user-details` — Dati profilo utente

## Issue Note
- **Gmail API**: OAuth code funziona, ma l'API Gmail non è abilitata nel progetto GCP dell'utente. Serve azione utente.

## Task Futuri
- P1: Google Drive Integration per info@ariadne.training
- P2: Polish finale, notifiche, dashboard personalizzata
