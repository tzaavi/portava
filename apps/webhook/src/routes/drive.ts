import { Hono } from "hono"
import { db } from "../db.js"
import { pubsub } from "../drive.js"

export const driveRoute = new Hono()

driveRoute.post("/", async (c) => {
  const state = c.req.header("X-Goog-Resource-State")

  // Drive sends a "sync" notification when a channel is first registered — ignore it
  if (state === "sync") return c.text("ok")

  const channelId = c.req.header("X-Goog-Channel-Id")
  const channelToken = c.req.header("X-Goog-Channel-Token")

  if (!channelId) return c.text("missing channel id", 400)

  // Validate token to ensure the request is from our registered channel
  const expectedToken = process.env.WEBHOOK_TOKEN
  if (expectedToken && channelToken !== expectedToken) {
    return c.text("invalid token", 401)
  }

  const portal = await db
    .selectFrom("portal")
    .where("webhook_channel_id", "=", channelId)
    .select(["id", "drive_deliverables_folder_id"])
    .executeTakeFirst()

  if (!portal?.drive_deliverables_folder_id) return c.text("ok")

  const topicName = process.env.PUBSUB_TOPIC_NAME
  if (!topicName) return c.text("PUBSUB_TOPIC_NAME not set", 500)

  const message = JSON.stringify({
    portal_id: portal.id,
    deliverables_folder_id: portal.drive_deliverables_folder_id,
  })

  await pubsub.projects.topics.publish({
    topic: topicName,
    requestBody: {
      messages: [{ data: Buffer.from(message).toString("base64") }],
    },
  })

  return c.text("ok")
})
