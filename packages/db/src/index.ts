// Requires Postgres 18+ for uuidv7()
import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"
import type Database from "./generated/Database"

export * from "./generated/public/Agency"
export * from "./generated/public/AuthorType"
export * from "./generated/public/CommentSource"
export * from "./generated/public/Event"
export * from "./generated/public/EventType"
export * from "./generated/public/FileComment"
export * from "./generated/public/FilePermission"
export * from "./generated/public/FileStatus"
export * from "./generated/public/Plan"
export * from "./generated/public/Portal"
export * from "./generated/public/PortalFile"
export * from "./generated/public/PortalSession"
export * from "./generated/public/PortalStatus"
export type { Database }

export function createDb(connectionString: string) {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
  })
}

export type Db = ReturnType<typeof createDb>
