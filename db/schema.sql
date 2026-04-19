create type plan as enum ('free', 'starter', 'pro', 'agency');

create type portal_status as enum ('active', 'archived');

create type file_status as enum ('awaiting_review', 'approved', 'revision_requested', 'archived');

create type file_permission as enum ('preview_only', 'download', 'drive_link');

create type event_type as enum (
  'file_delivered',
  'file_approved',
  'revision_requested',
  'file_archived',
  'file_viewed',
  'portal_opened'
);

create type author_type as enum ('agency', 'client');

create type comment_source as enum ('portal', 'email');

-- -----------------------------------------------------------------------

create table agency (
  id                          uuid primary key default uuidv7(),
  firebase_uid                text not null unique,
  name                        text not null,
  subdomain                   text unique,
  custom_domain               text unique,
  drive_service_account_email text,
  stripe_customer_id          text unique,
  plan                        plan not null default 'free',
  branding_json               jsonb not null default '{}',
  created_at                  timestamptz not null default now()
);

create table portal (
  id                          uuid primary key default uuidv7(),
  agency_id                   uuid not null references agency (id) on delete cascade,
  client_name                 text not null,
  client_email                text not null,
  drive_folder_id             text,
  drive_onboarding_folder_id  text,
  drive_active_folder_id      text,
  drive_deliverables_folder_id text,
  drive_archive_folder_id     text,
  slug                        text not null,
  status                      portal_status not null default 'active',
  created_at                  timestamptz not null default now(),
  unique (agency_id, slug)
);

create table portal_session (
  id          uuid primary key default uuidv7(),
  portal_id   uuid not null references portal (id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table portal_file (
  id             uuid primary key default uuidv7(),
  portal_id      uuid not null references portal (id) on delete cascade,
  drive_file_id  text not null,
  name           text not null,
  mime_type      text not null,
  status         file_status not null default 'awaiting_review',
  permission     file_permission not null default 'preview_only',
  version_number integer not null default 1,
  replaced_by    uuid references portal_file (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table event (
  id            uuid primary key default uuidv7(),
  portal_id     uuid not null references portal (id) on delete cascade,
  file_id       uuid references portal_file (id) on delete set null,
  event_type    event_type not null,
  author_type   author_type not null,
  metadata_json jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create table file_comment (
  id          uuid primary key default uuidv7(),
  file_id     uuid not null references portal_file (id) on delete cascade,
  portal_id   uuid not null references portal (id) on delete cascade,
  author_type author_type not null,
  author_name text not null,
  content     text not null,
  source      comment_source not null,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------

create index on portal (agency_id);
create index on portal_session (portal_id);
create index on portal_file (portal_id);
create index on portal_file (replaced_by);
create index on event (portal_id, created_at desc);
create index on event (file_id);
create index on file_comment (file_id);
create index on file_comment (portal_id);
