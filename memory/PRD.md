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
- Catalogo con 7 corsi reali (3 ICF + 4 specializzazione)
- 3 eventi reali (Core Quadrant Pro, Webinar demo, Aperitivo coaching)
- WelcomePage con storia reale Ariadne, 3 trainer reali, tono caldo
- CourseDetailPage senza testimonial inventati e senza stock photos
- TrainingCoursesPage con 2 sezioni (ICF + arricchimento)
- MyJourneyPage con categorie aggiornate
- Backend enrollment: status in_progress → confirmed, collection installments

## API Endpoints Chiave
- `POST /api/school/enrollments` — Crea/riprendi enrollment (status: in_progress)
- `POST /api/school/enrollments/{id}/confirm` — Conferma (status: confirmed)
- `GET /api/school/training-courses` — 7 corsi reali (no eventi)
- `GET /api/community/events` — 3 eventi reali
- `GET /api/school/admin/enrollment-pipeline` — Pipeline admin (solo in_progress)

## In Attesa
- Gmail API: utente deve abilitare Gmail API su Google Cloud Console

## Backlog
- P1: Google Drive integration per info@ariadne.training
- P2: Polish finale e notifiche
