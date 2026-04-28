import { createServerFn } from "@tanstack/react-start"
import { randomUUID } from "crypto"
import { db } from "~/lib/db"
import { drive } from "~/lib/drive"
import { createPortalFolders } from "~/lib/server/drive-folders"

// TODO: replace with session-derived agency ID once auth is built
const DEV_AGENCY_ID = "0195f3a0-0000-7000-8000-000000000001"

interface CreatePortalInput {
  client_name: string
  client_email: string
  drive_folder_id: string
  brand_color: string
}

function extractFolderId(input: string): string {
  const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : input.trim()
}

async function registerDriveWebhook(
  folderId: string,
  channelId: string,
  token: string
): Promise<string | null> {
  const baseUrl = process.env.BASE_URL
  if (!baseUrl) {
    console.warn("BASE_URL not set — skipping Drive webhook registration")
    return null
  }

  const res = await drive.files.watch({
    fileId: folderId,
    requestBody: {
      id: channelId,
      type: "web_hook",
      address: `${baseUrl}/drive`,
      token,
      // Channel expires in 7 days (Drive max); production should renew before expiry
      expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  return res.data.resourceId ?? null
}

export const createPortal = createServerFn().handler(
  async ({ data }: { data: CreatePortalInput }) => {
    const folderId = extractFolderId(data.drive_folder_id)

    const slug = data.client_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    const folders = await createPortalFolders(folderId)

    const channelId = randomUUID()
    const channelToken = randomUUID()

    const resourceId = await registerDriveWebhook(
      folders.deliverables,
      channelId,
      channelToken
    )

    const portal = await db
      .insertInto("portal")
      .values({
        agency_id: DEV_AGENCY_ID,
        client_name: data.client_name,
        client_email: data.client_email,
        drive_folder_id: folderId,
        slug,
        status: "active",
        drive_onboarding_folder_id: folders.onboarding,
        drive_active_folder_id: folders.active,
        drive_deliverables_folder_id: folders.deliverables,
        drive_archive_folder_id: folders.archive,
        webhook_channel_id: channelId,
        webhook_resource_id: resourceId,
        webhook_channel_token: channelToken,
      })
      .returning("id")
      .executeTakeFirstOrThrow()

    // TODO: send magic-link invite email via Resend

    return portal
  }
)
