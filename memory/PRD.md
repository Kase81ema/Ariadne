# Ariadne Editorial Studio - PRD

## Problem Statement
Console operativa per Ariadne Training: gestione comunicazione social (calendario editoriale, workflow post), school operations (inbox email, smistamento, bozze AI), e community (feed, materiali per edizione, percorso personale, assistente AI).

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI (Python) - modulare:
  - server.py (core, auth, studio comunicazione, async job system, post image upload)
  - community_routes.py (feed, banners, onboarding, dashboard, image upload, seed samples)
  - admin_routes.py (gestione utenti)
  - inbox_routes.py (inbox, regole, template, bozze, **Gmail OAuth integration**)
  - school_routes.py (programmi, edizioni, materiali, catalogo corsi, percorso, assistente, user details, pagamenti)
  - media_routes.py (immagini, Buffer integration, media assets)
- **Database**: MongoDB (25+ collections + gmail_tokens, gmail_oauth_state)
- **AI**: Claude Sonnet 4.5 via emergentintegrations (bozze email, assistente, generazione testi, **classificazione email**)
- **Auth**: JWT + Google OAuth (Emergent Auth)
- **Buffer**: Connected (LinkedIn: Emanuele Casero) — publishing verified
- **Gmail**: OAuth integration built, requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

## What's Been Implemented

### Fase 16 - Refactoring Architetturale Studio (06/03/2026)
Dashboard → Centro di controllo con pipeline campagne. EditorialPage → Hub gestione campagne. Workflow → Produzione guidata con step Sorgente + ripresa campagne.

### Fase 17 - School Dashboard + Buffer Fix (06/03/2026)
School dashboard con layout hierarchy, merged welcome text, clickable events, interest badges, sezione Materiali. Buffer fix: GraphQL query corretta, profilo Emanuele Casero collegato.

### Fase 18 - Benvenuto + WelcomePage + Gmail + Rate + Traduzioni (11/03/2026) - COMPLETATO E TESTATO

**BENVENUTO (School Dashboard)**:
- Onboarding dialog: 4 livelli con descrizione (Interessato/a, Studente, Alumni, **Trainer Ariadne**)
- Welcome text: spiegazione chiara delle 4 categorie nella card Benvenuto
- Bottoni azione con hover verde (#8DB440)

**WELCOME PAGE (Pagina iniziale)**:
- Hero section con immagine AI-generated e titolo "Formazione e coaching creativo-esperienziale"
- "Cosa puoi fare qui": 4 feature cards (Percorsi formativi, Community, Eventi e occasioni, Materiali)
- "A chi si rivolge questa piattaforma": 4 categorie (Interessati, Studenti, Alumni, Trainer Ariadne) con descrizioni
- Banner sconto per nuovi utenti (se presente nei banners)
- "La scuola Ariadne": storia, approccio creativo-esperienziale, 5 punti chiave
- "I nostri trainer": 5 schede trainer con credenziali ICF
- Video placeholder, storyboard edizioni, bibliografia, CTA Calendly

**GMAIL INTEGRATION (Backend completo)**:
- OAuth2 flow: `/api/inbox/gmail/connect` → redirect Google → callback → token storage
- Status: `/api/inbox/gmail-status` — mostra se connesso, email, o credenziali mancanti
- Fetch: `/api/inbox/gmail/fetch` — importa ultime N email (10/20/50/100 selezionabile)
- Classificazione AI con Claude: info_corsi, iscrizione, collaborazione, richiesta_call, supporto, altro
- **Spam e pubblicita ignorati automaticamente** (non salvati)
- Email non classificabili → categoria "altro" (sempre importate, mai ignorate)
- Fallback rule-based se AI non disponibile
- Frontend: GmailPanel component in InboxPage con stato, pulsante connect/disconnect, selezione count, risultato fetch

**PAYMENT MANAGEMENT (Miglioramento UI)**:
- Bottone "Esporta CSV" nella vista aggregata scadenze
- Export con colonne: Nome, Corso, Edizione, Descrizione, Scadenza, Importo, Stato
- Importo scaduto evidenziato in rosso

**TEST**: iteration_15.json — backend 100%, frontend 100%, 17 feature verificate

## Setup Gmail
Per collegare info@ariadne.training:
1. Vai su https://console.cloud.google.com
2. Crea un progetto o usa quello esistente
3. Abilita Gmail API
4. Crea credenziali OAuth 2.0 (tipo: Web application)
5. Aggiungi redirect URI: `{APP_URL}/api/inbox/gmail/callback`
6. Copia Client ID e Client Secret
7. Aggiungili al file backend/.env come GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET
8. Riavvia il backend: sudo supervisorctl restart backend
9. Nella pagina Inbox, clicca "Collega Gmail" e autorizza

## Prioritized Backlog

### P1 (Prossimi)
- [ ] **Configurare credenziali Google** (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) per attivare Gmail
- [ ] Google Drive integration per repository (stesso account Google)
- [ ] Rifinitura sidebar (allineamento icona/testo, stato attivo piu evidente)

### P2 (Enhancement)
- [ ] Quick tour interattivo primo accesso
- [ ] Dashboard analytics avanzate
- [ ] Drag & drop calendario
- [ ] Notifiche in-app per pagamenti in scadenza

## Test Reports
- iteration_13: Refactoring architetturale Studio (100%)
- iteration_14: School Dashboard + Buffer (100%)
- iteration_15: Benvenuto + WelcomePage + Gmail + Rate (100%)

## Test Credentials
- Admin: admin@ariadne.training / admin123
