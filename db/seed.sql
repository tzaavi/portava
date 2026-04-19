-- Seed data for local development
-- Run via: just db-seed

-- Agency
insert into agency (id, firebase_uid, name, subdomain, plan, branding_json) values (
  '0195f3a0-0000-7000-8000-000000000001',
  'firebase-uid-dev-agency',
  'Studio Nine',
  'studio-nine',
  'pro',
  '{"primaryColor": "#6366f1", "logoUrl": null}'
);

-- Portals
insert into portal (id, agency_id, client_name, client_email, slug, status,
  drive_folder_id, drive_onboarding_folder_id, drive_active_folder_id,
  drive_deliverables_folder_id, drive_archive_folder_id)
values
  (
    '0195f3a0-0000-7000-8000-000000000010',
    '0195f3a0-0000-7000-8000-000000000001',
    'Acme Corp', 'sarah@acme.com', 'acme-corp', 'active',
    'drive-folder-acme', 'drive-onboarding-acme', 'drive-active-acme',
    'drive-deliverables-acme', 'drive-archive-acme'
  ),
  (
    '0195f3a0-0000-7000-8000-000000000011',
    '0195f3a0-0000-7000-8000-000000000001',
    'Bloom Bakery', 'hello@bloombakery.com', 'bloom-bakery', 'active',
    'drive-folder-bloom', 'drive-onboarding-bloom', 'drive-active-bloom',
    'drive-deliverables-bloom', 'drive-archive-bloom'
  ),
  (
    '0195f3a0-0000-7000-8000-000000000012',
    '0195f3a0-0000-7000-8000-000000000001',
    'Nova Tech', 'design@novatech.io', 'nova-tech', 'active',
    'drive-folder-nova', 'drive-onboarding-nova', 'drive-active-nova',
    'drive-deliverables-nova', 'drive-archive-nova'
  );

-- Portal sessions (magic link tokens)
insert into portal_session (id, portal_id, token_hash, expires_at, used_at) values
  (
    '0195f3a0-0000-7000-8000-000000000020',
    '0195f3a0-0000-7000-8000-000000000010',
    'hashed-token-acme-001',
    now() + interval '30 days',
    now() - interval '2 days'
  ),
  (
    '0195f3a0-0000-7000-8000-000000000021',
    '0195f3a0-0000-7000-8000-000000000011',
    'hashed-token-bloom-001',
    now() + interval '30 days',
    null
  );

-- Portal files — Acme Corp
insert into portal_file (id, portal_id, drive_file_id, name, mime_type, status, permission, version_number) values
  (
    '0195f3a0-0000-7000-8000-000000000030',
    '0195f3a0-0000-7000-8000-000000000010',
    'gdrive-file-001', 'Brand Guidelines v2.pdf', 'application/pdf',
    'awaiting_review', 'preview_only', 2
  ),
  (
    '0195f3a0-0000-7000-8000-000000000031',
    '0195f3a0-0000-7000-8000-000000000010',
    'gdrive-file-002', 'Homepage Mockup.fig', 'application/figma',
    'awaiting_review', 'preview_only', 1
  ),
  (
    '0195f3a0-0000-7000-8000-000000000032',
    '0195f3a0-0000-7000-8000-000000000010',
    'gdrive-file-003', 'Logo Suite.zip', 'application/zip',
    'approved', 'download', 1
  ),
  (
    '0195f3a0-0000-7000-8000-000000000033',
    '0195f3a0-0000-7000-8000-000000000010',
    'gdrive-file-004', 'Brand Guidelines v1.pdf', 'application/pdf',
    'archived', 'preview_only', 1
  );

-- Portal files — Bloom Bakery
insert into portal_file (id, portal_id, drive_file_id, name, mime_type, status, permission, version_number) values
  (
    '0195f3a0-0000-7000-8000-000000000040',
    '0195f3a0-0000-7000-8000-000000000011',
    'gdrive-file-010', 'Menu Design.pdf', 'application/pdf',
    'revision_requested', 'preview_only', 1
  ),
  (
    '0195f3a0-0000-7000-8000-000000000041',
    '0195f3a0-0000-7000-8000-000000000011',
    'gdrive-file-011', 'Business Card.pdf', 'application/pdf',
    'approved', 'download', 1
  );

-- Link version chain: Brand Guidelines v2 replaced v1
update portal_file
set replaced_by = '0195f3a0-0000-7000-8000-000000000030'
where id = '0195f3a0-0000-7000-8000-000000000033';

-- Events
insert into event (portal_id, file_id, event_type, author_type, metadata_json) values
  ('0195f3a0-0000-7000-8000-000000000010', '0195f3a0-0000-7000-8000-000000000033', 'file_delivered',  'agency', '{"fileName": "Brand Guidelines v1.pdf"}'),
  ('0195f3a0-0000-7000-8000-000000000010', '0195f3a0-0000-7000-8000-000000000032', 'file_delivered',  'agency', '{"fileName": "Logo Suite.zip"}'),
  ('0195f3a0-0000-7000-8000-000000000010', '0195f3a0-0000-7000-8000-000000000032', 'file_approved',   'client', '{"fileName": "Logo Suite.zip"}'),
  ('0195f3a0-0000-7000-8000-000000000010', '0195f3a0-0000-7000-8000-000000000033', 'file_archived',   'agency', '{"fileName": "Brand Guidelines v1.pdf"}'),
  ('0195f3a0-0000-7000-8000-000000000010', '0195f3a0-0000-7000-8000-000000000030', 'file_delivered',  'agency', '{"fileName": "Brand Guidelines v2.pdf"}'),
  ('0195f3a0-0000-7000-8000-000000000010', '0195f3a0-0000-7000-8000-000000000031', 'file_delivered',  'agency', '{"fileName": "Homepage Mockup.fig"}'),
  ('0195f3a0-0000-7000-8000-000000000010', null,                                   'portal_opened',   'client', '{}'),
  ('0195f3a0-0000-7000-8000-000000000011', '0195f3a0-0000-7000-8000-000000000040', 'file_delivered',  'agency', '{"fileName": "Menu Design.pdf"}'),
  ('0195f3a0-0000-7000-8000-000000000011', '0195f3a0-0000-7000-8000-000000000041', 'file_delivered',  'agency', '{"fileName": "Business Card.pdf"}'),
  ('0195f3a0-0000-7000-8000-000000000011', '0195f3a0-0000-7000-8000-000000000041', 'file_approved',   'client', '{"fileName": "Business Card.pdf"}'),
  ('0195f3a0-0000-7000-8000-000000000011', '0195f3a0-0000-7000-8000-000000000040', 'revision_requested', 'client', '{"fileName": "Menu Design.pdf"}');

-- File comments
insert into file_comment (file_id, portal_id, author_type, author_name, content, source) values
  (
    '0195f3a0-0000-7000-8000-000000000040',
    '0195f3a0-0000-7000-8000-000000000011',
    'client', 'Bloom Bakery',
    'The font on the menu feels too modern for our brand. Can we try something more handwritten? Also the prices section needs more breathing room.',
    'portal'
  ),
  (
    '0195f3a0-0000-7000-8000-000000000030',
    '0195f3a0-0000-7000-8000-000000000010',
    'agency', 'Studio Nine',
    'Updated the color palette to match the new brand direction. Let us know what you think!',
    'portal'
  );
