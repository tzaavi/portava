import type { ColumnType, Insertable, Selectable, Updateable } from "kysely"
import type { default as Plan } from "./Plan"

/** Identifier type for public.agency */
export type AgencyId = string & { __brand: "public.agency" }

/** Represents the table public.agency */
export default interface AgencyTable {
  id: ColumnType<AgencyId, AgencyId | undefined, AgencyId>

  firebase_uid: ColumnType<string, string, string>

  name: ColumnType<string, string, string>

  subdomain: ColumnType<string | null, string | null, string | null>

  custom_domain: ColumnType<string | null, string | null, string | null>

  drive_service_account_email: ColumnType<string | null, string | null, string | null>

  stripe_customer_id: ColumnType<string | null, string | null, string | null>

  plan: ColumnType<Plan, Plan | undefined, Plan>

  branding_json: ColumnType<unknown, unknown | undefined, unknown>

  created_at: ColumnType<Date, Date | string | undefined, Date | string>
}

export type Agency = Selectable<AgencyTable>

export type NewAgency = Insertable<AgencyTable>

export type AgencyUpdate = Updateable<AgencyTable>
