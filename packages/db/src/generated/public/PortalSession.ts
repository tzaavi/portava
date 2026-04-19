import type { ColumnType, Insertable, Selectable, Updateable } from "kysely"
import type { PortalId } from "./Portal"

/** Identifier type for public.portal_session */
export type PortalSessionId = string & { __brand: "public.portal_session" }

/** Represents the table public.portal_session */
export default interface PortalSessionTable {
  id: ColumnType<PortalSessionId, PortalSessionId | undefined, PortalSessionId>

  portal_id: ColumnType<PortalId, PortalId, PortalId>

  token_hash: ColumnType<string, string, string>

  expires_at: ColumnType<Date, Date | string, Date | string>

  used_at: ColumnType<Date | null, Date | string | null, Date | string | null>

  created_at: ColumnType<Date, Date | string | undefined, Date | string>
}

export type PortalSession = Selectable<PortalSessionTable>

export type NewPortalSession = Insertable<PortalSessionTable>

export type PortalSessionUpdate = Updateable<PortalSessionTable>
