import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../../src/server/db";
import {
  canonicalEntityMappings,
  ingestionEntities,
  ingestionJobs,
  ingestionSources,
  offers,
  priceHistory,
  products,
  retailers,
} from "../../src/server/db/schema";
import { runIngestionWorker } from "../../src/server/ingestion/worker";
import { enqueueIngestionJob } from "../../src/server/ingestion/job-queue";

let createdOfferId: string | null = null;
let offersHeadSourceId: string | null = null;
let createdJobId: string | null = null;

const originalFetch = globalThis.fetch;

beforeAll(async () => {
  // Mock fetch for HEAD checks.
  globalThis.fetch = vi.fn(async () => {
    return new Response(null, {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  }) as unknown as typeof fetch;

  const productRow = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, "uns-60u"))
    .limit(1);
  expect(productRow[0]?.id).toBeTruthy();

  const retailerRow = await db
    .select({ id: retailers.id })
    .from(retailers)
    .where(eq(retailers.slug, "amazon"))
    .limit(1);
  expect(retailerRow[0]?.id).toBeTruthy();

  const inserted = await db
    .insert(offers)
    .values({
      productId: productRow[0]!.id,
      retailerId: retailerRow[0]!.id,
      priceCents: 12345,
      currency: "USD",
      url: "https://example.com/plantedtanklab-test-offer",
      inStock: false,
      lastCheckedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: offers.id });

  createdOfferId = inserted[0]!.id;
});

afterAll(async () => {
  globalThis.fetch = originalFetch;

  if (!createdOfferId) return;

  // Clean up price history first (FK).
  await db.delete(priceHistory).where(eq(priceHistory.offerId, createdOfferId));

  // Delete ingestion entities that were created for this offer (cascades snapshots + mapping).
  if (offersHeadSourceId) {
    await db
      .delete(ingestionEntities)
      .where(eq(ingestionEntities.sourceEntityId, createdOfferId));
  }

  if (createdJobId) {
    await db.delete(ingestionJobs).where(eq(ingestionJobs.id, createdJobId));
  }

  // Delete offer.
  await db.delete(offers).where(eq(offers.id, createdOfferId));
});

describe("ingestion: offers head refresh", () => {
  test("worker processes offers.head_refresh.one and records provenance", async () => {
    expect(createdOfferId).toBeTruthy();
    const offerId = createdOfferId!;

    // Ensure the ingestion source exists so we can locate entities after processing.
    const src = await db
      .select({ id: ingestionSources.id })
      .from(ingestionSources)
      .where(eq(ingestionSources.slug, "offers-head"))
      .limit(1);
    offersHeadSourceId = src[0]?.id ?? null;

    const enq = await enqueueIngestionJob({
      kind: "offers.head_refresh.one",
      payload: { offerId, timeoutMs: 2000 },
      idempotencyKey: `test:offers.head_refresh.one:${offerId}:${Math.floor(Date.now() / 60000)}`,
      priority: 50,
    });
    createdJobId = enq.id;

    const res = await runIngestionWorker({
      workerId: "vitest",
      maxJobs: 5,
      dryRun: false,
    });

    expect(res.processed).toBeGreaterThan(0);
    expect(res.failed).toBe(0);

    const refreshed = await db
      .select({ inStock: offers.inStock, lastCheckedAt: offers.lastCheckedAt })
      .from(offers)
      .where(eq(offers.id, offerId))
      .limit(1);

    expect(refreshed[0]!.inStock).toBe(true);
    expect(refreshed[0]!.lastCheckedAt).toBeInstanceOf(Date);

    const hist = await db
      .select({ id: priceHistory.id, priceCents: priceHistory.priceCents, inStock: priceHistory.inStock })
      .from(priceHistory)
      .where(eq(priceHistory.offerId, offerId))
      .orderBy(priceHistory.recordedAt);

    expect(hist.length).toBeGreaterThan(0);
    expect(hist[hist.length - 1]!.priceCents).toBe(12345);
    expect(hist[hist.length - 1]!.inStock).toBe(true);

    // Provenance: ingestion entity exists for this offer.
    const entities = await db
      .select({ id: ingestionEntities.id, sourceId: ingestionEntities.sourceId })
      .from(ingestionEntities)
      .where(eq(ingestionEntities.sourceEntityId, offerId))
      .limit(10);

    expect(entities.length).toBe(1);
    const entityId = entities[0]!.id;

    // Mapping exists.
    const mappings = await db
      .select({ canonicalId: canonicalEntityMappings.canonicalId })
      .from(canonicalEntityMappings)
      .where(eq(canonicalEntityMappings.entityId, entityId))
      .limit(1);

    expect(mappings[0]!.canonicalId).toBe(offerId);
  });
});
