import { and, eq, isNotNull, sql } from "drizzle-orm";

import type { DbClient } from "@/server/db";
import { offers } from "@/server/db/schema";

type RefreshResult = {
  scanned: number;
  updated: number;
  failed: number;
};

function toMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

export async function refreshOffersJob(params: {
  db: DbClient;
  olderThanDays: number;
  limit: number;
  timeoutMs: number;
}): Promise<RefreshResult> {
  const cutoff = new Date(Date.now() - toMs(params.olderThanDays));

  // Only refresh offers that have a URL and haven't been checked recently.
  // (Some offers may have null prices; we still check reachability.)
  const rows = await params.db
    .select({ id: offers.id, url: offers.url })
    .from(offers)
    .where(
      and(
        isNotNull(offers.url),
        sql<boolean>`coalesce(${offers.lastCheckedAt}, ${offers.updatedAt}) < ${cutoff}`,
      ),
    )
    .limit(params.limit);

  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), params.timeoutMs);

      let ok = false;
      try {
        const res = await fetch(row.url, {
          method: "HEAD",
          redirect: "follow",
          signal: controller.signal,
          headers: {
            // Some stores block empty UA; keep it generic.
            "user-agent": "PlantedTankLabOfferChecker/1.0",
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        ok = res.status >= 200 && res.status < 400;
      } catch {
        ok = false;
      } finally {
        clearTimeout(t);
      }

      await params.db
        .update(offers)
        .set({
          inStock: ok,
          lastCheckedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(offers.id, row.id));

      updated += 1;
    } catch {
      failed += 1;
    }
  }

  return { scanned: rows.length, updated, failed };
}
