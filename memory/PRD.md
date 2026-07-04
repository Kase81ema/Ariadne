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

## Funzionalità Implementate

### Sessione 1 — Menu, labels, tono di voce ✅
- Navigazione ristrutturata in 3 gruppi (Il mio spazio / Scopri / Gestione)
- Tono di voce caldo e user-centric in tutte le pagine
- Empty states aggiornati

### Sessione 2 — Profilo + Le mie iscrizioni ✅
- `ProfilePage.js`: form dati anagrafici, indirizzo, fatturazione (toggle società/privato), documenti caricati
- `MyEnrollmentsPage.js`: lista iscrizioni con status badge, piano rate per iscrizione
- Backend: user-details esteso con campi first_name, last_name, birth_date, birth_place, billing_type

### Sessione 3 — Wizard di iscrizione (6 step) ✅
- `EnrollmentWizardPage.js`: Dati anagrafici → Motivazione → Piano pagamento → Contratto/consensi → Upload documenti → Conferma
- Backend endpoints: POST/GET/PUT enrollments, contract signing con audit trail, document upload, confirm con creazione installments
- Piano rate automatico 30%/35%/35%, coordinate bancarie, firma click-wrap
- Status flow: in_progress → confirmed
- Collection `installments` per rate create da wizard

### Sessione 4 — Admin: separazione + pipeline + KPI ✅
- `AdminEnrollmentsPage.js`: Pipeline onboarding + Operatività corsi + Scadenze pagamenti (3 tab)
- `AdminCommsPage.js`: wrapper Posta in arrivo + Regole + Template (3 tab)
- Widget KPI admin nella CommunityDashboardPage (utenti, iscrizioni, rate, scaduto, pipeline)
- `TrainingCoursesPage.js` semplificato: solo catalogo per tutti gli utenti
- `CourseDetailPage.js`: bottone "Iscriviti adesso" → wizard

### Altre funzionalità ✅
- Community feed con post, likes, commenti
- Buffer integration per publishing su LinkedIn
- Gmail OAuth PKCE per inbox (in attesa abilitazione API su GCP)
- Catalogo corsi con dettagli, credenziali ICF, foto edizioni
- Gestione edizioni, partecipanti, rate cumulative

## API Endpoints Chiave
- `POST /api/school/enrollments` — Crea/riprendi enrollment
- `GET /api/school/enrollments/my` — Lista iscrizioni utente
- `PUT /api/school/enrollments/{id}` — Salva bozza
- `POST /api/school/enrollments/{id}/contract` — Firma contratto
- `POST /api/school/enrollments/{id}/documents` — Upload documenti
- `POST /api/school/enrollments/{id}/confirm` — Conferma iscrizione
- `GET /api/school/admin/enrollment-pipeline` — Pipeline admin (solo in_progress)

## DB Collections
- `enrollments`: { enrollment_id, user_id, course_id, status, current_step, motivation, background, payment_plan, consents, documents, ... }
- `installments`: { installment_id, user_id, course_id, enrollment_id, description, amount, due_date, status }
- `user_details`: { user_id, first_name, last_name, birth_date, billing_type, fiscal_code, ... }
- `payment_installments`: rate create dall'admin (pre-wizard)

## In Attesa
- Gmail API: utente deve abilitare Gmail API su Google Cloud Console (Project ID: 366481913824)

## Backlog
- P1: Google Drive integration per info@ariadne.training
- P2: Polish finale e notifiche
