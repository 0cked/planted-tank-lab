import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { existsSync, readFileSync } from "node:fs";

import * as schema from "./schema";

function loadEnvLocal(): void {
  if (process.env.DATABASE_URL) return;

  const envPath = ".env.local";
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!key) continue;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

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
