import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { ingestionSources } from "@/server/db/schema";

export async function ensureIngestionSource(params: {
  slug: string;
  name: string;
  kind: string;
  defaultTrust?: string;
  scheduleEveryMinutes?: number | null;
  config?: Record<string, unknown>;
}): Promise<string> {
  const rows = await db
    .insert(ingestionSources)
    .values({
      slug: params.slug,
      name: params.name,
      kind: params.kind,
      config: params.config ?? {},
      scheduleEveryMinutes: params.scheduleEveryMinutes ?? null,
      active: true,
      defaultTrust: params.defaultTrust ?? "unknown",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: ingestionSources.slug,
      set: {
        name: params.name,
        kind: params.kind,
        config: params.config ?? {},
        scheduleEveryMinutes: params.scheduleEveryMinutes ?? null,
        active: true,
        defaultTrust: params.defaultTrust ?? "unknown",
        updatedAt: new Date(),
      },
    })
    .returning({ id: ingestionSources.id });

  const id = rows[0]?.id;
  if (id) return id;

  const fallback = await db
    .select({ id: ingestionSources.id })
    .from(ingestionSources)
    .where(eq(ingestionSources.slug, params.slug))
    .limit(1);

  const fb = fallback[0]?.id;
  if (!fb) throw new Error("Failed to ensure ingestion source");
  return fb;
}

