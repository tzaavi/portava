import { createServerFn } from "@tanstack/react-start"
import { db } from "~/lib/db"

// TODO: replace with session-derived agency ID once auth is built
const DEV_AGENCY_ID = "0195f3a0-0000-7000-8000-000000000001"

export const getOverview = createServerFn().handler(async () => {
  const [metrics, attention, activity] = await Promise.all([
    db
      .selectFrom("portal as p")
      .leftJoin("portal_file as pf", "pf.portal_id", "p.id")
      .where("p.agency_id", "=", DEV_AGENCY_ID)
      .select((eb) => [
        eb.fn.count<string>("p.id").distinct().as("total_portals"),
        eb.fn
          .count<string>("pf.id")
          .filterWhere("p.status", "=", "active")
          .distinct()
          .as("active_portals"),
        eb.fn
          .count<string>("pf.id")
          .filterWhere("pf.status", "=", "awaiting_review")
          .as("awaiting_review"),
        eb.fn
          .count<string>("pf.id")
          .filterWhere("pf.status", "in", [
            "awaiting_review",
            "approved",
            "revision_requested",
            "archived",
          ])
          .as("files_delivered"),
        eb.fn.count<string>("pf.id").filterWhere("pf.status", "=", "approved").as("approvals"),
      ])
      .executeTakeFirstOrThrow(),

    db
      .selectFrom("portal as p")
      .innerJoin("portal_file as pf", "pf.portal_id", "p.id")
      .where("p.agency_id", "=", DEV_AGENCY_ID)
      .where("pf.status", "=", "awaiting_review")
      .groupBy("p.id")
      .select((eb) => [
        "p.id",
        "p.client_name",
        "p.slug",
        eb.fn.count<string>("pf.id").as("pending_count"),
        eb.fn.min("pf.created_at").as("oldest_pending"),
      ])
      .orderBy("oldest_pending", "asc")
      .execute(),

    db
      .selectFrom("event as e")
      .innerJoin("portal as p", "p.id", "e.portal_id")
      .where("p.agency_id", "=", DEV_AGENCY_ID)
      .select([
        "e.id",
        "e.event_type",
        "e.author_type",
        "e.created_at",
        "e.metadata_json",
        "p.client_name",
      ])
      .orderBy("e.created_at", "desc")
      .limit(10)
      .execute(),
  ])

  return { metrics, attention, activity }
})
