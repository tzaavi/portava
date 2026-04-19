# Portava — Claude Code context

## What it is
Portava (portava.io) is a Google Drive-native client portal builder for
agencies and freelancers. It wraps Google Drive folders into branded,
professional client portals — without asking agencies to change where
their files live or clients to create a Google account.

The core promise: agency creates a portal in under 5 minutes, client
receives a magic-link email, opens a branded portal, reviews and approves
deliverables. No new storage, no migration, no friction.

---

## Tech stack

Agency dashboard:   TanStack Start, GCP Cloud Run (own server-side)
Client portal:      TanStack Start, GCP Cloud Run (own server-side)
Auth:               Firebase Auth (both apps)
Database:           Postgres on GCP Cloud SQL (shared by both apps)
Email:              Resend
Drive access:       Google Drive API via service account
Payments:           Stripe
Domain:             portava.io

Everything runs on GCP: Cloud Run (compute), Cloud SQL (database),
and the rest of the Google ecosystem (Drive API, Firebase Auth).

---

## Architecture overview

Two completely independent TanStack Start applications deployed as
separate GCP Cloud Run services. They share only the GCP Cloud SQL
Postgres instance. There is no shared API layer — each app has its
own server functions that talk directly to Postgres and external services.

Agency dashboard (app.portava.io)
  - TanStack Start server functions handle all agency-side logic
  - Firebase Auth (Google OAuth) for agency login
  - Reads/writes directly to Cloud SQL Postgres
  - Calls Google Drive API from server functions
  - Registers and receives Drive push notification webhooks
  - Sends emails via Resend
  - Stripe billing

Client portal ({agency}.portava.io/{client})
  - TanStack Start server functions handle all client-side logic
  - Firebase Auth custom tokens for magic-link sessions
  - Reads/writes directly to Cloud SQL Postgres
  - Reads Drive file metadata from server functions
  - SSR: agency branding loaded server-side on every request

The two apps never call each other. All shared state is in Cloud SQL.

Cloud SQL connection:
  - Both Cloud Run services connect via Cloud SQL Auth Proxy
    (recommended GCP pattern — no public IP needed, IAM-based auth)
  - Or via private IP if both services are on the same VPC
  - Use connection pooling (pg-pool) with appropriate max connections
    per service — Cloud SQL has a connection limit, size pools accordingly

---

## Firebase Auth usage

Agency dashboard:
  - Google OAuth via Firebase Auth
  - Firebase session cookie persisted server-side
  - Agency identified by Firebase UID → agency table

Client portal:
  - Clients receive magic links via email (no traditional login)
  - Magic link flow:
    1. Agency creates portal → signed token generated
    2. Token stored in portal_session table in Cloud SQL
    3. Invite email sent with link containing token
    4. Client clicks → server function validates token from Cloud SQL
    5. Token marked used_at (single-use)
    6. Firebase Auth custom token minted server-side
    7. Firebase session established with portal_id in custom claims
    8. Session persists 30 days via Firebase session cookie
  - Client can request new magic link if session expires

---

## URL structure

Marketing site:       portava.io (static)
Agency dashboard:     app.portava.io
Client portals:       {agency}.portava.io/{client-slug}
Custom domain:        portal.{agency-domain}.com/{client-slug}

Wildcard (*.portava.io) handled at GCP load balancer level.
Client portal reads hostname from request, extracts agency slug,
queries Cloud SQL for agency context on every SSR request.

---

## Database tables (singular names, GCP Cloud SQL Postgres)

agency
  id, firebase_uid, name, subdomain, custom_domain,
  drive_service_account_email, stripe_customer_id,
  plan, branding_json, created_at

portal
  id, agency_id, client_name, client_email,
  drive_folder_id, drive_onboarding_folder_id,
  drive_active_folder_id, drive_deliverables_folder_id,
  drive_archive_folder_id, slug, status, created_at

portal_session
  id, portal_id, token_hash, expires_at, used_at, created_at

portal_file
  id, portal_id, drive_file_id, name, mime_type,
  status, permission, version_number,
  replaced_by (self-ref FK → portal_file.id),
  created_at, updated_at

  status enum:     'awaiting_review' | 'approved' |
                   'revision_requested' | 'archived'
  permission enum: 'preview_only' | 'download' | 'drive_link'
  Default permission: 'preview_only'

event
  id, portal_id, file_id, event_type, author_type,
  metadata_json, created_at

  event_type:  'file_delivered' | 'file_approved' |
               'revision_requested' | 'file_archived' |
               'file_viewed' | 'portal_opened'
  author_type: 'agency' | 'client'

file_comment
  id, file_id, portal_id, author_type, author_name,
  content, source ('portal' | 'email'), created_at

---

## Drive folder structure per portal

/Client Folder  (agency shares this with the service account)
  /Onboarding      — read-only for client, reference docs
  /Active          — agency working space, invisible to client
  /Deliverables    — files ready for client review (webhook watches this)
  /Archive         — completed work, accessible but not prominent

Auto-created when portal is created via Drive API.
All four folder IDs stored on the portal row.

File flow is strictly one-way: Active → Deliverables → Archive.
Files never move backwards.
Only Deliverables and Archive folder events trigger database writes.
Active folder events are ignored entirely.

---

## Drive webhook flow

Agency dashboard registers push notification channels on the
Deliverables and Archive folders for each portal.

File moves into Deliverables:
  → Server function creates portal_file record (awaiting_review)
  → event record written
  → Resend notification to agency

File moves into Archive:
  → Server function updates portal_file status to 'archived'
  → event record written

Active folder: not watched, no database writes.

---

## Automatic version detection

When new file lands in Deliverables, before creating portal_file:

1. Query existing portal_file for same portal with similar name
2. Strip version suffixes (v1, v2, _v2, -final, _final, -2 etc)
   and extensions from both names, lowercase, trim, compare
3. If match found:

   Existing status is 'approved' or 'revision_requested':
     → Move old file to Archive folder via Drive API
     → Update old portal_file status to 'archived'
     → Create new portal_file as 'awaiting_review'
     → Set replaced_by on new record pointing to old record
     → Notify client: "New version ready for review"

   Existing status is 'awaiting_review':
     → Update existing portal_file record in place
     → Swap drive_file_id to new file
     → No notification

Version history chain via portal_file.replaced_by FK.

---

## Client portal UI (2 tabs)

Tab 1: Files
  Sections:
  - "Awaiting your review" — portal_file where status: awaiting_review
  - "Approved" — portal_file where status: approved (dimmed)
  - "Project documents" — Onboarding folder contents (collapsed)
  - "View archived files" — text link at bottom

  Per-file inline actions (no modals, no tab switching):
  [Open]  [Approve]  [Request changes]

  Approve:
    → portal_file status → 'approved'
    → event record written
    → Agency notified via Resend

  Request changes:
    → Inline textarea expands below file row
    → On submit: note passed to Claude API for parsing into
      structured numbered list
    → Structured list + original note sent to agency via Resend
    → portal_file status → 'revision_requested'
    → Inline comment shown on file row

Tab 2: Activity
  - Chronological event feed for this portal
  - SSR on initial load

---

## Agency dashboard UI (4 sections)

Overview
  - Metrics: active portals, awaiting review, files delivered, approvals
  - Portals needing attention (longest unreviewed first)
  - [Nudge] button — reminder email to client via Resend
  - Recent activity feed (event table across all portals)
  - Setup checklist + custom domain upsell

Portals
  - All portals: name, URL, status, last activity, pending count
  - Per-portal: [View portal] [Open in Drive] [Nudge]
  - [+ Create new portal]

New portal (4-step flow)
  Step 1: Connect Google Drive (service account share instruction)
  Step 2: Agency branding (name, logo, brand color)
  Step 3: Client details + Drive folder input
  Step 4: Review + send invite
  On create: auto-creates 4 subfolders, registers Drive webhooks,
             sends magic-link invite via Resend

Settings
  - Branding: name, logo, brand color
  - Subdomain + custom domain management
  - Drive connection status
  - Notification preferences: immediate | digest | dashboard only
  - Plan + billing (Stripe)

---

## Email flows (all via Resend)

1. Client invite
   From:     {agency email}
   Reply-to: {agency email}
   Subject:  "Your {agency name} client portal is ready"
   Contains: single-use magic link (7-day expiry), portal features,
             "Powered by Portava" footer

2. Revision request → agency
   From:     notifications@portava.io
   Reply-to: {client email}
   Subject:  "{client} requested changes on {file name}"
   Contains: AI-parsed structured list, original note, deep link

3. Approval → agency
   From:     notifications@portava.io
   Reply-to: {client email}
   Subject:  "{client} approved {file name} ✓"
   Contains: file name, remaining pending count, deep link

4. Weekly digest (opt-in, Monday 9am)
   Natural language summary via Claude API

---

## AI features

V1:
  Revision parser — client freeform note → structured numbered list
  via Claude API (claude-sonnet-4-6), called from client portal
  server function on revision submit. Original note always preserved.

V2:
  Weekly digest, smart nudge copy, revision pattern detection

---

## Pricing

Free:    1 portal, core features, portava.io subdomain,
         "Powered by Portava" branding visible
Starter: $29/mo — 5 portals, no Portava branding, agency subdomain
Pro:     $59/mo — 15 portals, nudge emails, download controls,
                  AI revision parsing, 90-day activity history
Agency:  $119/mo — unlimited portals, custom domain, white-label
                   emails, 2 dashboard seats
Annual:  ~2 months free

---

## File permission model (per file, agency-controlled)

preview_only  — Google Drive /preview embed, no download
download      — time-limited signed export URL (Drive API, 60s TTL)
drive_link    — opens file directly in Google Drive

Default: preview_only

---

## Subdomain provisioning

Agency claims slug (Starter+):
  - Validates: lowercase alphanumeric + hyphens, 3-30 chars
  - Reserved: app, www, api, admin, mail, help, support,
              blog, status, billing
  - Written to agency.subdomain
  - GCP wildcard DNS (*.portava.io) resolves immediately

Custom domain (Agency plan):
  - Agency adds CNAME: their domain → cname.portava.io
  - Server function polls DNS propagation (60s interval)
  - GCP managed SSL auto-provisioned
  - agency.custom_domain updated when confirmed live

---

## Key constraints

- No shared API layer. Each TanStack Start app is fully
  self-contained with its own server functions. The two apps
  communicate only via the shared Cloud SQL Postgres database.

- Firebase Auth handles all session state. Magic link tokens
  stored in portal_session table in Cloud SQL.

- Both Cloud Run services connect to Cloud SQL via Cloud SQL
  Auth Proxy (IAM-based, no public IP). Use pg-pool with
  appropriate max connections per service.

- Files never leave Google Drive. Portava reads metadata only.
  Downloads use time-limited signed URLs (60s TTL) generated
  server-side — raw Drive URLs never exposed to clients.

- File flow strictly one-way: Active → Deliverables → Archive.
  Files never move back to Active. Revision cycles change status
  in Cloud SQL only — files stay in Deliverables folder in Drive.

- Active folder completely invisible to clients. Webhook handler
  ignores all events from the Active folder.

- Client portal renders agency branding server-side (SSR).
  No flash of unbranded content. Branding resolved from Cloud SQL
  using the subdomain extracted from the request hostname.

- Scope is narrow: professional file delivery and approval workflow
  on top of Google Drive. No CRM, project management, messaging,
  or time tracking.
