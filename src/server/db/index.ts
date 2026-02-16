import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
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
    let value = line.slice(eq + 1).trim();
    // Support Vercel-pulled env files that wrap values in quotes.
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!key) continue;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function getDatabaseUrlOrThrow(): string {
  // Avoid throwing during `next build` (Docker builds, CI) if DATABASE_URL is not present.
  // The DB connection is created lazily on first query instead.
  loadEnvLocal();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Ensure .env.local exists (for local dev) or set DATABASE_URL in the environment.",
    );
  }
  return databaseUrl;
}

// In dev, avoid creating too many clients during hot reload.
const globalForDb = globalThis as unknown as {
  __plantedTankSql?: postgres.Sql;
  __plantedTankDb?: PostgresJsDatabase<typeof schema>;
};

function createSql(): postgres.Sql {
  const databaseUrl = getDatabaseUrlOrThrow();
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
  const isProd = process.env.NODE_ENV === "production";
  const isPooler = databaseUrl.includes("pooler.supabase.com");

  const sql = postgres(databaseUrl, {
    ssl: "require",
    // Supabase poolers enforce low connection limits (especially in Transaction/Session mode).
    // Keep this tiny in prod and on the pooler.
    max: isTest ? 1 : isProd || isPooler ? 1 : 10,
    // Some integration tests run against a remote pooler and can take longer to establish
    // a connection when the pool is cold.
    connect_timeout: isTest ? 60 : undefined,
    // Close idle connections promptly (seconds). Helps avoid “max clients reached”.
    idle_timeout: isProd || isPooler ? 10 : undefined,
    // Pooler + prepared statements can be a bad mix (depending on mode).
    prepare: isPooler ? false : undefined,
  });

  globalForDb.__plantedTankSql = sql;
  return sql;
}

function getSql(): postgres.Sql {
  return globalForDb.__plantedTankSql ?? createSql();
}

function createDb(): PostgresJsDatabase<typeof schema> {
  const db = drizzle(getSql(), { schema });
  globalForDb.__plantedTankDb = db;
  return db;
}

function getDb(): PostgresJsDatabase<typeof schema> {
  return globalForDb.__plantedTankDb ?? createDb();
}

// Proxy exports to keep call sites unchanged, while avoiding DB init at module-load time.
export const db: PostgresJsDatabase<typeof schema> = new Proxy(
  {} as PostgresJsDatabase<typeof schema>,
  {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as unknown as object, prop, receiver);
  },
  },
);

export const sql: postgres.Sql = new Proxy((() => null) as unknown as postgres.Sql, {
  apply(_target, thisArg, argArray) {
    return Reflect.apply(getSql() as unknown as (...args: unknown[]) => unknown, thisArg, argArray);
  },
  get(_target, prop, receiver) {
    return Reflect.get(getSql() as unknown as object, prop, receiver);
  },
});

export type DbClient = typeof db;
