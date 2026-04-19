import { createServerFn } from "@tanstack/react-start"
import { db } from "~/lib/db"

// TODO: replace with session-derived agency ID once auth is built
const DEV_AGENCY_ID = "0195f3a0-0000-7000-8000-000000000001"

export const getAgencySettings = createServerFn().handler(async () => {
  return db
    .selectFrom("agency")
    .where("id", "=", DEV_AGENCY_ID as string)
    .select(["id", "name", "subdomain", "plan", "drive_service_account_email", "branding_json"])
    .executeTakeFirstOrThrow()
})

interface UpdateSettingsInput {
  name: string
  brand_color: string
  logo_url: string
  notifications: string
}

export const updateAgencySettings = createServerFn().handler(
  async ({ data }: { data: UpdateSettingsInput }) => {
    const current = await db
      .selectFrom("agency")
      .where("id", "=", DEV_AGENCY_ID as string)
      .select("branding_json")
      .executeTakeFirstOrThrow()

    const branding = {
      ...(current.branding_json as object),
      primaryColor: data.brand_color,
      logoUrl: data.logo_url || null,
      notifications: data.notifications,
    }

    await db
      .updateTable("agency")
      .where("id", "=", DEV_AGENCY_ID as string)
      .set({ name: data.name, branding_json: JSON.stringify(branding) })
      .execute()
  }
)
