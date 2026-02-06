import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Ensure .env.local exists (for local dev) or set DATABASE_URL in the environment.",
  );
}

// In dev, avoid creating too many clients during hot reload.
const globalForDb = globalThis as unknown as {
  __plantedTankSql?: postgres.Sql;
};

export const sql =
  globalForDb.__plantedTankSql ??
  postgres(databaseUrl, {
    ssl: "require",
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__plantedTankSql = sql;

export const db = drizzle(sql, { schema });
