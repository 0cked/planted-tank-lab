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

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
const isProd = process.env.NODE_ENV === "production";

export const sql =
  globalForDb.__plantedTankSql ??
  postgres(databaseUrl, {
    ssl: "require",
    // Supabase poolers enforce low connection limits (especially in Session mode).
    // On Vercel, many concurrent lambda invocations can exhaust the pool quickly.
    // Keep this intentionally tiny in production.
    max: isTest ? 1 : isProd ? 1 : 10,
    // Close idle connections promptly (seconds). Helps avoid “max clients reached” in prod.
    idle_timeout: isProd ? 10 : undefined,
  });

// Cache the client across hot reloads AND across serverless warm invocations.
globalForDb.__plantedTankSql = sql;

export const db = drizzle(sql, { schema });

export type DbClient = typeof db;
