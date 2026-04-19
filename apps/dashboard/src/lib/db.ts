import { createDb } from "@portava/db"

export const db = createDb(process.env.DATABASE_URL!)
