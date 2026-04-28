import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { driveRoute } from "./routes/drive.js"
import { pubsubRoute } from "./routes/pubsub.js"

const app = new Hono()

app.route("/drive", driveRoute)
app.route("/pubsub", pubsubRoute)

app.get("/health", (c) => c.text("ok"))

const port = Number(process.env.PORT ?? 3003)

serve({ fetch: app.fetch, port }, () => {
  console.log(`Webhook service listening on port ${port}`)
})
