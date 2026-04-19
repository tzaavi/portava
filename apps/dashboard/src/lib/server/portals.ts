import { createServerFn } from "@tanstack/react-start"
import { db } from "~/lib/db"

// TODO: replace with session-derived agency ID once auth is built
const DEV_AGENCY_ID = "0195f3a0-0000-7000-8000-000000000001"

export const getPortals = createServerFn().handler(async () => {
  return db
    .selectFrom("portal as p")
    .leftJoin("portal_file as pf", "pf.portal_id", "p.id")
    .leftJoin("event as e", "e.portal_id", "p.id")
    .where("p.agency_id", "=", DEV_AGENCY_ID)
    .groupBy("p.id")
    .select((eb) => [
      "p.id",
      "p.client_name",
      "p.client_email",
      "p.slug",
      "p.status",
      "p.created_at",
      eb.fn
        .count("pf.id")
        .filterWhere("pf.status", "=", "awaiting_review")
        .as("pending_count"),
      eb.fn.max("e.created_at").as("last_activity"),
    ])
    .orderBy("p.created_at", "desc")
    .execute()
})
