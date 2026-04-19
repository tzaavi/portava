# Portava

Google Drive-native client portal builder for agencies and freelancers.

Portava wraps Google Drive folders into branded, professional client portals — without asking agencies to change where their files live or clients to create a Google account.

## Apps

| App | URL | Stack |
|-----|-----|-------|
| Agency dashboard | app.portava.io | TanStack Start · Firebase Auth · GCP Cloud Run |
| Client portal | {agency}.portava.io/{client} | TanStack Start · Magic-link auth · GCP Cloud Run |

Both apps share a GCP Cloud SQL Postgres database. There is no shared API layer.

## Stack

- **Frontend/Backend**: TanStack Start (server functions)
- **Auth**: Firebase Auth — Google OAuth for agencies, magic-link custom tokens for clients
- **Database**: GCP Cloud SQL Postgres via Cloud SQL Auth Proxy
- **Storage**: Google Drive (files never leave Drive)
- **Email**: Resend
- **Payments**: Stripe
- **AI**: Claude API (revision parsing)
- **Infra**: GCP Cloud Run, wildcard DNS on *.portava.io
