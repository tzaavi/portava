import { createDb } from "@portava/db"

// biome-ignore lint/style/noNonNullAssertion: must be set at startup
export const db = createDb(process.env.DATABASE_URL!)
