import { createServerFn } from "@tanstack/react-start"
import { db } from "~/lib/db"

// TODO: replace with session-derived agency ID once auth is built
const DEV_AGENCY_ID = "0195f3a0-0000-7000-8000-000000000001"

interface CreatePortalInput {
  client_name: string
  client_email: string
  drive_folder_id: string
  brand_color: string
}

export const createPortal = createServerFn()
  .handler(async ({ data }: { data: CreatePortalInput }) => {
    const slug = data.client_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    const portal = await db
      .insertInto("portal")
      .values({
        agency_id: DEV_AGENCY_ID,
        client_name: data.client_name,
        client_email: data.client_email,
        drive_folder_id: data.drive_folder_id,
        slug,
        status: "active",
        // TODO: create Drive subfolders via Drive API
        drive_onboarding_folder_id: "",
        drive_active_folder_id: "",
        drive_deliverables_folder_id: "",
        drive_archive_folder_id: "",
      })
      .returning("id")
      .executeTakeFirstOrThrow()

    // TODO: register Drive webhook for deliverables folder
    // TODO: send magic-link invite email via Resend

    return portal
  })
