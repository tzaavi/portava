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

## Prerequisites

- Node 20+
- [pnpm](https://pnpm.io/installation)
- [Docker](https://docs.docker.com/get-docker/) (for local Postgres)
- [just](https://github.com/casey/just#installation) (task runner)

## Local setup

```bash
# 1. Install dependencies
pnpm install

# 2. Create .env at the repo root (see Environment variables below)

# 3. Start Postgres
just db-start

# 4. Create schema + seed dev data
just db-reset-seed
```

## Running the apps

| Command | URL | Description |
|---|---|---|
| `just dev-dashboard` | http://localhost:3001 | Agency dashboard |
| `just dev-portal` | http://localhost:3002 | Client portal |
| `just dev-webhook` | http://localhost:3003 | Drive webhook receiver |

## Database commands

| Command | Description |
|---|---|
| `just db-start` | Start Postgres container |
| `just db-stop` | Stop Postgres container |
| `just db-reset` | Drop + recreate DB from `db/schema.sql` |
| `just db-seed` | Insert seed data from `db/seed.sql` |
| `just db-reset-seed` | Reset and seed in one step |
| `just db-psql` | Open a psql shell |
| `just db-generate` | Regenerate Kysely types from schema |

## Environment variables

Create a `.env` file at the repo root:

```env
DATABASE_URL=postgresql://portava:portava@localhost:5433/portava

GOOGLE_SERVICE_ACCOUNT_JSON='{...}'

BASE_URL=
PUBSUB_TOPIC_NAME=
WEBHOOK_TOKEN=

VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_API_KEY=
```

| Variable | Description | How to get it |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | Pre-filled — matches Docker Compose |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account key JSON (single line, single-quoted) | `gcloud secrets versions access latest --secret=drive-service-account-key --project=portava-stage` |
| `BASE_URL` | Public URL of the webhook service | ngrok/Cloudflare Tunnel → port 3003. Leave empty to skip Drive webhook registration |
| `PUBSUB_TOPIC_NAME` | Cloud Pub/Sub topic full name | Output of `terraform apply` — format: `projects/PROJECT/topics/drive-notifications` |
| `WEBHOOK_TOKEN` | Random secret for Drive webhook validation | `openssl rand -hex 32` |
| `VITE_GOOGLE_CLIENT_ID` | OAuth 2.0 web client ID for the Drive Picker | See below |
| `VITE_GOOGLE_API_KEY` | Restricted API key for Google Picker API | See below |

### Getting `VITE_GOOGLE_CLIENT_ID`

1. [GCP Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**
2. **+ Create Credentials → OAuth client ID** → Application type: **Web application**
3. Under **Authorized JavaScript origins** add `http://localhost:3001` (and your Cloud Run URL for prod)
4. Copy the **Client ID**

> The OAuth consent screen must be configured first (APIs & Services → OAuth consent screen).
> For testing, set to **Internal** (Google Workspace) or add yourself as a test user under **External**.

### Getting `VITE_GOOGLE_API_KEY`

1. **APIs & Services → Credentials → + Create Credentials → API key**
2. Edit the key → **API restrictions** → restrict to **Google Picker API**
   - If not listed, enable it first: **APIs & Services → Library → "Google Picker API"**
3. **Application restrictions → HTTP referrers** → add `http://localhost:3001/*` (and Cloud Run URL for prod)
4. Copy the key

## Infrastructure (Terraform)

```bash
cd infra/environments/stage
terraform init
terraform apply
```

State is stored in GCS. Targets pre-existing GCP projects (`portava-stage`, `portava-prod`). Firebase is configured manually.
