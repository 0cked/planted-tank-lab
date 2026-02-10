import type { Config } from "drizzle-kit";
import { existsSync, readFileSync } from "node:fs";

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

    // Don't overwrite env already present (e.g. CI/Vercel).
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. Ensure .env.local exists or export DATABASE_URL before running drizzle-kit.",
  );
}

export default {
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
