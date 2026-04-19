import type { ColumnType, Insertable, Selectable, Updateable } from "kysely"
import type { AgencyId } from "./Agency"
import type { default as PortalStatus } from "./PortalStatus"

/** Identifier type for public.portal */
export type PortalId = string & { __brand: "public.portal" }

/** Represents the table public.portal */
export default interface PortalTable {
  id: ColumnType<PortalId, PortalId | undefined, PortalId>

  agency_id: ColumnType<AgencyId, AgencyId, AgencyId>

  client_name: ColumnType<string, string, string>

  client_email: ColumnType<string, string, string>

  drive_folder_id: ColumnType<string | null, string | null, string | null>

  drive_onboarding_folder_id: ColumnType<string | null, string | null, string | null>

  drive_active_folder_id: ColumnType<string | null, string | null, string | null>

  drive_deliverables_folder_id: ColumnType<string | null, string | null, string | null>

  drive_archive_folder_id: ColumnType<string | null, string | null, string | null>

  slug: ColumnType<string, string, string>

  status: ColumnType<PortalStatus, PortalStatus | undefined, PortalStatus>

  created_at: ColumnType<Date, Date | string | undefined, Date | string>
}

export type Portal = Selectable<PortalTable>

export type NewPortal = Insertable<PortalTable>

export type PortalUpdate = Updateable<PortalTable>
