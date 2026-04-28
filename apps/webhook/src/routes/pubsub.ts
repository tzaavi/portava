import { Hono } from "hono"
import { db } from "../db.js"
import { drive } from "../drive.js"

export const pubsubRoute = new Hono()

interface PubSubMessage {
  portal_id: string
  deliverables_folder_id: string
}

pubsubRoute.post("/", async (c) => {
  const body = await c.req.json()
  const rawData = body?.message?.data

  if (!rawData) return c.text("no message data", 400)

  const message: PubSubMessage = JSON.parse(
    Buffer.from(rawData, "base64").toString("utf-8")
  )

  const { portal_id, deliverables_folder_id } = message

  // List files currently in the Deliverables folder
  const res = await drive.files.list({
    q: `'${deliverables_folder_id}' in parents and trashed = false`,
    fields: "files(id, name, mimeType)",
    pageSize: 100,
  })

  const files = res.data.files ?? []

  // Get existing portal_file drive IDs to avoid duplicates
  const existing = await db
    .selectFrom("portal_file")
    .where("portal_id", "=", portal_id)
    .select("drive_file_id")
    .execute()

  const existingIds = new Set(existing.map((f) => f.drive_file_id))

  const newFiles = files.filter((f) => f.id && !existingIds.has(f.id))

  for (const file of newFiles) {
    if (!file.id || !file.name || !file.mimeType) continue

    await db
      .insertInto("portal_file")
      .values({
        portal_id,
        drive_file_id: file.id,
        name: file.name,
        mime_type: file.mimeType,
        status: "awaiting_review",
        permission: "preview_only",
        version_number: 1,
      })
      .execute()
  }

  return c.text("ok")
})
