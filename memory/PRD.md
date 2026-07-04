# Ariadne — Scuola e Community

## Problem Statement
Piattaforma per Ariadne Training: community, percorso formativo, gestione scuola (inbox email, smistamento AI, bozze), catalogo corsi, materiali didattici, assistente AI.

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI (Python) - modulare (server.py, community_routes.py, admin_routes.py, inbox_routes.py, school_routes.py, media_routes.py)
- **Database**: MongoDB
- **AI**: Claude Sonnet 4.5 via emergentintegrations
- **Auth**: JWT + Google OAuth (Emergent Auth)
- **Gmail**: OAuth integration (richiede GOOGLE_CLIENT_ID/SECRET)

## Cleanup completato (Fase 19)
Rimosso intero Studio comunicazione: 11 pagine, 12 API exports, area selector, sidebar Studio, ruolo editor, AdminEditorRoute.

### File eliminati
DashboardPage, ProfilesPage, EditorialPage, RulesPage, WorkflowPage, ImagesPage, ApprovalsPage, ExportPage, AgentsPage, StartCampaignPage, CampaignsPage, RegisterPage

### File modificati
- App.js: rimossi import Studio, route semplificate, DefaultRedirect → /community
- Layout.js: sidebar solo Scuola (Community, Risorse, Gestione scuola)
- api.js: rimossi profilesAPI, campaignsAPI, postsAPI, rulesAPI, templatesAPI, agentsAPI, setupAPI, generateAPI, exportAPI, dashboardAPI, auditAPI, bufferAPI
- LoginPage.js: branding "Scuola e community", testo di benvenuto aggiornato
- AuthCallback.js, AuthContext.js: redirect → /community

## Pagine attive
### Tutti gli utenti
/community, /welcome, /feed, /my-journey, /materials, /assistant, /training-courses, /course/:id, /community/events

### Solo admin
/courses, /repository, /inbox, /routing-rules, /email-templates, /users-admin, /cohorts-admin, /banners-admin

## Test Reports
- iteration_16: Studio cleanup (100% frontend)

## Backlog
- [ ] Collegamento Gmail (credenziali configurate, API da abilitare nel progetto Google)
- [ ] Google Drive integration per repository
- [ ] Rifinitura sidebar (stato attivo piu evidente)
- [ ] Quick tour primo accesso

## Credenziali test
- Admin: admin@ariadne.training / admin123
