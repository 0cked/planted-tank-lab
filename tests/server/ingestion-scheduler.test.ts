import { afterAll, describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../../src/server/db";
import { ingestionJobs, ingestionSources } from "../../src/server/db/schema";
import { ensureIngestionSource } from "../../src/server/ingestion/sources";
import { enqueueScheduledIngestionJobs } from "../../src/server/ingestion/scheduler";

let createdJobId: string | null = null;

afterAll(async () => {
  if (createdJobId) {
    await db.delete(ingestionJobs).where(eq(ingestionJobs.id, createdJobId));
  }
});

describe("ingestion scheduler", () => {
  test("enqueues scheduled jobs using idempotency buckets", async () => {
    await ensureIngestionSource({
      slug: "offers-detail",
      name: "Retailer offer detail checks",
      kind: "offer_detail",
      defaultTrust: "retailer",
      scheduleEveryMinutes: 60,
      config: {
        jobKind: "offers.detail_refresh.bulk",
        jobPayload: { olderThanHours: 20, limit: 10, timeoutMs: 12000 },
        idempotencyPrefix: "test:schedule:offers-detail",
      },
    });

    const now = new Date("2026-02-10T12:34:56.000Z");
    const bucket = Math.floor(now.getTime() / (60 * 60_000));
    const idempotencyKey = `test:schedule:offers-detail:${bucket}`;

    const res = await enqueueScheduledIngestionJobs({ db, now });
    expect(res.scanned).toBeGreaterThan(0);

    const rows = await db
      .select({
        id: ingestionJobs.id,
        kind: ingestionJobs.kind,
        payload: ingestionJobs.payload,
        idempotencyKey: ingestionJobs.idempotencyKey,
      })
      .from(ingestionJobs)
      .where(eq(ingestionJobs.idempotencyKey, idempotencyKey))
      .limit(1);

    expect(rows[0]?.kind).toBe("offers.detail_refresh.bulk");
    expect(rows[0]?.payload).toMatchObject({ olderThanHours: 20, limit: 10 });
    createdJobId = rows[0]?.id ?? null;

    // Second run in the same bucket should dedupe.
    const res2 = await enqueueScheduledIngestionJobs({ db, now });
    expect(res2.deduped).toBeGreaterThanOrEqual(1);

    // Make sure we didn't create a second source row.
    const srcRows = await db
      .select({ slug: ingestionSources.slug })
      .from(ingestionSources)
      .where(eq(ingestionSources.slug, "offers-detail"))
      .limit(10);
    expect(srcRows.length).toBe(1);
  }, 20_000);
});

