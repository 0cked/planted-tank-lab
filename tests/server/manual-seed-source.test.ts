import { afterAll, describe, expect, test } from "vitest";
import { and, eq } from "drizzle-orm";

import { db } from "../../src/server/db";
import {
  ingestionEntities,
  ingestionEntitySnapshots,
  ingestionRuns,
} from "../../src/server/db/schema";
import {
  createManualSeedRun,
  ensureManualSeedSource,
  finishManualSeedRun,
  ingestManualSeedSnapshot,
} from "../../src/server/ingestion/sources/manual-seed";

const createdRunIds: string[] = [];
const createdEntitySourceIds: string[] = [];

afterAll(async () => {
  for (const sourceEntityId of createdEntitySourceIds) {
    const entities = await db
      .select({ id: ingestionEntities.id })
      .from(ingestionEntities)
      .where(eq(ingestionEntities.sourceEntityId, sourceEntityId));

    for (const entity of entities) {
      await db
        .delete(ingestionEntitySnapshots)
        .where(eq(ingestionEntitySnapshots.entityId, entity.id));
      await db.delete(ingestionEntities).where(eq(ingestionEntities.id, entity.id));
    }
  }

  for (const runId of createdRunIds) {
    await db.delete(ingestionRuns).where(eq(ingestionRuns.id, runId));
  }
});

describe("manual seed ingestion source", () => {
  test("upserts source and dedupes identical snapshot content hash", async () => {
    const sourceId = await ensureManualSeedSource();
    expect(sourceId).toBeTruthy();

    const runId = await createManualSeedRun(sourceId);
    createdRunIds.push(runId);

    const sourceEntityId = `vitest-product-${Date.now()}`;
    createdEntitySourceIds.push(sourceEntityId);

    const rawPayload = {
      slug: sourceEntityId,
      name: "Vitest Product",
      specs: { width_in: 24, category: "tank" },
      verified: true,
    };

    const first = await ingestManualSeedSnapshot({
      sourceId,
      runId,
      entityType: "product",
      sourceEntityId,
      raw: rawPayload,
    });

    const second = await ingestManualSeedSnapshot({
      sourceId,
      runId,
      entityType: "product",
      sourceEntityId,
      raw: rawPayload,
    });

    expect(first.snapshotCreated).toBe(true);
    expect(second.snapshotCreated).toBe(false);
    expect(first.entityId).toBe(second.entityId);

    const snapshots = await db
      .select({
        id: ingestionEntitySnapshots.id,
        contentHash: ingestionEntitySnapshots.contentHash,
        extracted: ingestionEntitySnapshots.extracted,
      })
      .from(ingestionEntitySnapshots)
      .where(eq(ingestionEntitySnapshots.entityId, first.entityId));

    expect(snapshots.length).toBe(1);
    expect(snapshots[0]?.contentHash).toHaveLength(64);

    const extracted = snapshots[0]?.extracted as {
      fields?: Record<string, { trust?: string; provenance?: { source?: string } }>;
    };
    expect(extracted.fields?.slug?.trust).toBe("manual_seed");
    expect(extracted.fields?.slug?.provenance?.source).toBe("manual_seed");

    await finishManualSeedRun({
      runId,
      status: "success",
      stats: { snapshots: snapshots.length },
    });

    const entityRows = await db
      .select({ id: ingestionEntities.id })
      .from(ingestionEntities)
      .where(
        and(
          eq(ingestionEntities.sourceId, sourceId),
          eq(ingestionEntities.sourceEntityId, sourceEntityId),
        ),
      )
      .limit(1);

    expect(entityRows[0]?.id).toBe(first.entityId);
  });
});
