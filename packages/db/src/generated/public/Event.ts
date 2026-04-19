import type { ColumnType, Insertable, Selectable, Updateable } from "kysely"
import type { default as AuthorType } from "./AuthorType"
import type { default as EventType } from "./EventType"
import type { PortalId } from "./Portal"
import type { PortalFileId } from "./PortalFile"

/** Identifier type for public.event */
export type EventId = string & { __brand: "public.event" }

/** Represents the table public.event */
export default interface EventTable {
  id: ColumnType<EventId, EventId | undefined, EventId>

  portal_id: ColumnType<PortalId, PortalId, PortalId>

  file_id: ColumnType<PortalFileId | null, PortalFileId | null, PortalFileId | null>

  event_type: ColumnType<EventType, EventType, EventType>

  author_type: ColumnType<AuthorType, AuthorType, AuthorType>

  metadata_json: ColumnType<unknown, unknown | undefined, unknown>

  created_at: ColumnType<Date, Date | string | undefined, Date | string>
}

export type Event = Selectable<EventTable>

export type NewEvent = Insertable<EventTable>

export type EventUpdate = Updateable<EventTable>
