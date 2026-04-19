import type { default as AgencyTable } from "./Agency"
import type { default as EventTable } from "./Event"
import type { default as FileCommentTable } from "./FileComment"
import type { default as PortalTable } from "./Portal"
import type { default as PortalFileTable } from "./PortalFile"
import type { default as PortalSessionTable } from "./PortalSession"

export default interface PublicSchema {
  file_comment: FileCommentTable

  portal_session: PortalSessionTable

  agency: AgencyTable

  portal: PortalTable

  portal_file: PortalFileTable

  event: EventTable
}
