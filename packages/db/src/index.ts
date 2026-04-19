// Requires Postgres 18+ for uuidv7()
import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"

export interface Database {
  agency: AgencyTable
  portal: PortalTable
  portal_session: PortalSessionTable
  portal_file: PortalFileTable
  event: EventTable
  file_comment: FileCommentTable
}

interface AgencyTable {
  id: string
  firebase_uid: string
  name: string
  subdomain: string | null
  custom_domain: string | null
  drive_service_account_email: string | null
  stripe_customer_id: string | null
  plan: "free" | "starter" | "pro" | "agency"
  branding_json: unknown
  created_at: Date
}

interface PortalTable {
  id: string
  agency_id: string
  client_name: string
  client_email: string
  drive_folder_id: string | null
  drive_onboarding_folder_id: string | null
  drive_active_folder_id: string | null
  drive_deliverables_folder_id: string | null
  drive_archive_folder_id: string | null
  slug: string
  status: "active" | "archived"
  created_at: Date
}

interface PortalSessionTable {
  id: string
  portal_id: string
  token_hash: string
  expires_at: Date
  used_at: Date | null
  created_at: Date
}

interface PortalFileTable {
  id: string
  portal_id: string
  drive_file_id: string
  name: string
  mime_type: string
  status: "awaiting_review" | "approved" | "revision_requested" | "archived"
  permission: "preview_only" | "download" | "drive_link"
  version_number: number
  replaced_by: string | null
  created_at: Date
  updated_at: Date
}

interface EventTable {
  id: string
  portal_id: string
  file_id: string | null
  event_type:
    | "file_delivered"
    | "file_approved"
    | "revision_requested"
    | "file_archived"
    | "file_viewed"
    | "portal_opened"
  author_type: "agency" | "client"
  metadata_json: unknown
  created_at: Date
}

interface FileCommentTable {
  id: string
  file_id: string
  portal_id: string
  author_type: "agency" | "client"
  author_name: string
  content: string
  source: "portal" | "email"
  created_at: Date
}

export function createDb(connectionString: string) {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
  })
}

export type Db = ReturnType<typeof createDb>
