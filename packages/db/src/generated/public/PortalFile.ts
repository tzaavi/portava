import type { ColumnType, Insertable, Selectable, Updateable } from "kysely"
import type { default as FilePermission } from "./FilePermission"
import type { default as FileStatus } from "./FileStatus"
import type { PortalId } from "./Portal"

/** Identifier type for public.portal_file */
export type PortalFileId = string & { __brand: "public.portal_file" }

/** Represents the table public.portal_file */
export default interface PortalFileTable {
  id: ColumnType<PortalFileId, PortalFileId | undefined, PortalFileId>

  portal_id: ColumnType<PortalId, PortalId, PortalId>

  drive_file_id: ColumnType<string, string, string>

  name: ColumnType<string, string, string>

  mime_type: ColumnType<string, string, string>

  status: ColumnType<FileStatus, FileStatus | undefined, FileStatus>

  permission: ColumnType<FilePermission, FilePermission | undefined, FilePermission>

  version_number: ColumnType<number, number | undefined, number>

  replaced_by: ColumnType<PortalFileId | null, PortalFileId | null, PortalFileId | null>

  created_at: ColumnType<Date, Date | string | undefined, Date | string>

  updated_at: ColumnType<Date, Date | string | undefined, Date | string>
}

export type PortalFile = Selectable<PortalFileTable>

export type NewPortalFile = Insertable<PortalFileTable>

export type PortalFileUpdate = Updateable<PortalFileTable>
