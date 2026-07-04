# Ariadne — Il tuo spazio Ariadne

## Problem Statement
Piattaforma per la community e i corsisti di Ariadne Training. Area riservata orientata all'utente (corsista), non al gestore.

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI (Python) — invariato
- **Database**: MongoDB
- **AI**: Claude Sonnet 4.5 via emergentintegrations
- **Auth**: JWT + Google OAuth
- **Gmail**: OAuth integration configurata

## Ristrutturazione completata (Sessione 1)

### Layout.js — Navigazione
- **"Il mio spazio"**: Home, Il mio percorso, Materiali
- **"Scopri"**: Percorsi formativi, Bacheca, Eventi, Ariadne AI
- **"Gestione"** (solo admin): Edizioni e materiali, Utenti, Corsi ed eventi, Comunicazioni, Banner
- Sottotitolo: "Il tuo spazio Ariadne"
- Link "Il mio profilo →" sotto email utente
- storageKey aggiornato a 'ariadne_nav_groups'

### App.js
- Route /profile → PlaceholderPage

### Testi aggiornati
- TrainingCoursesPage: "Percorsi formativi" + descrizione senza riferimenti admin
- CourseDetailPage: "Voglio iscrivermi", "Vorrei saperne di più", "Iscrizione avviata"
- MaterialsPage: "I materiali arriveranno qui" + "Non appena inizierai il tuo percorso..."
- CommunityDashboardPage: "Presto troverai qui le prossime occasioni da vivere insieme."
- LoginPage: branding "Il tuo spazio Ariadne"

## Test: iteration_17 — 100% (14/14 feature)

## Sessioni successive (dal piano di ristrutturazione)
- **Sessione 2**: Pagine profilo utente, Le mie iscrizioni, Iscrizioni e pagamenti (admin)
- **Sessione 3**: WelcomePage aggiornata, wizard iscrizione, collegamento pagamenti
- **Sessione 4**: Separazione area admin da area utente, pagine admin dedicate
- **Sessione 5**: Dashboard personalizzata, notifiche, polish finale

## Credenziali test
- Admin: admin@ariadne.training / admin123
