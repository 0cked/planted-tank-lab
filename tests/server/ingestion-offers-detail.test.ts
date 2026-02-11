import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { eq, max, sql } from "drizzle-orm";

import { db } from "../../src/server/db";
import {
  canonicalEntityMappings,
  ingestionEntities,
  ingestionJobs,
  ingestionSources,
  offers,
  offerSummaries,
  priceHistory,
  products,
  retailers,
} from "../../src/server/db/schema";
import { enqueueIngestionJob } from "../../src/server/ingestion/job-queue";
import { runIngestionWorker } from "../../src/server/ingestion/worker";
import { refreshOfferSummaryForProductId } from "../../src/server/services/offer-summaries";

let createdOfferId: string | null = null;
let createdProductId: string | null = null;
const createdJobIds: string[] = [];
const originalFetch = globalThis.fetch;

const detailHtml = `
<!doctype html>
<html>
  <head>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Offer",
        "price": "149.99",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      }
    </script>
  </head>
  <body>
    <div>In stock</div>
  </body>
</html>
`;

beforeAll(async () => {
  globalThis.fetch = vi.fn(async () => {
    return new Response(detailHtml, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }) as unknown as typeof fetch;

  const productRow = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, "uns-60u"))
    .limit(1);
  expect(productRow[0]?.id).toBeTruthy();
  createdProductId = productRow[0]!.id;

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
      url: "https://example.com/plantedtanklab-test-offer-detail",
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

  for (const jobId of createdJobIds) {
    await db.delete(ingestionJobs).where(eq(ingestionJobs.id, jobId));
  }

  if (!createdOfferId) return;

  await db.delete(priceHistory).where(eq(priceHistory.offerId, createdOfferId));
  await db.delete(ingestionEntities).where(eq(ingestionEntities.sourceEntityId, createdOfferId));
  await db.delete(offers).where(eq(offers.id, createdOfferId));

  if (createdProductId) {
    await refreshOfferSummaryForProductId({ db, productId: createdProductId });
  }
});

describe("ingestion: offers detail refresh", () => {
  test("worker processes offers.detail_refresh.one and only appends price history on meaningful changes", async () => {
    expect(createdOfferId).toBeTruthy();
    const offerId = createdOfferId!;

    const enq1 = await enqueueIngestionJob({
      kind: "offers.detail_refresh.one",
      payload: { offerId, timeoutMs: 3000 },
      idempotencyKey: `test:offers.detail_refresh.one:${offerId}:1:${Math.floor(Date.now() / 60000)}`,
      priority: 1000,
    });
    expect(enq1.id).toBeTruthy();
    createdJobIds.push(enq1.id!);

    const runOne = await runIngestionWorker({
      workerId: "vitest-detail-1",
      maxJobs: 25,
      dryRun: false,
    });

    expect(runOne.processed).toBeGreaterThan(0);
    expect(runOne.failed).toBe(0);

    const firstJob = await db
      .select({ status: ingestionJobs.status })
      .from(ingestionJobs)
      .where(eq(ingestionJobs.id, enq1.id!))
      .limit(1);
    expect(firstJob[0]?.status).toBe("success");

    const refreshed = await db
      .select({
        productId: offers.productId,
        priceCents: offers.priceCents,
        inStock: offers.inStock,
        lastCheckedAt: offers.lastCheckedAt,
      })
      .from(offers)
      .where(eq(offers.id, offerId))
      .limit(1);

    expect(refreshed[0]!.priceCents).toBe(14999);
    expect(refreshed[0]!.inStock).toBe(true);
    expect(refreshed[0]!.lastCheckedAt).toBeInstanceOf(Date);

    const histAfterFirst = await db
      .select({ id: priceHistory.id, priceCents: priceHistory.priceCents, inStock: priceHistory.inStock })
      .from(priceHistory)
      .where(eq(priceHistory.offerId, offerId))
      .orderBy(priceHistory.recordedAt);

    expect(histAfterFirst.length).toBeGreaterThan(0);
    expect(histAfterFirst[histAfterFirst.length - 1]!.priceCents).toBe(14999);
    expect(histAfterFirst[histAfterFirst.length - 1]!.inStock).toBe(true);

    const aggregateRows = await db
      .select({
        minPriceCents: sql<number | null>`
          min(case when ${offers.inStock} = true and ${offers.priceCents} is not null then ${offers.priceCents} else null end)
        `.as("min_price_cents"),
        inStockCount: sql<number>`
          coalesce(sum(case when ${offers.inStock} = true then 1 else 0 end), 0)::int
        `.as("in_stock_count"),
        checkedAt: max(offers.lastCheckedAt).as("checked_at"),
      })
      .from(offers)
      .where(eq(offers.productId, refreshed[0]!.productId))
      .groupBy(offers.productId)
      .limit(1);

    const summaryRows = await db
      .select({
        minPriceCents: offerSummaries.minPriceCents,
        inStockCount: offerSummaries.inStockCount,
        staleFlag: offerSummaries.staleFlag,
        checkedAt: offerSummaries.checkedAt,
      })
      .from(offerSummaries)
      .where(eq(offerSummaries.productId, refreshed[0]!.productId))
      .limit(1);

    expect(summaryRows.length).toBe(1);
    expect(summaryRows[0]!.minPriceCents).toBe(aggregateRows[0]!.minPriceCents);
    expect(summaryRows[0]!.inStockCount).toBe(Number(aggregateRows[0]!.inStockCount));
    expect(summaryRows[0]!.checkedAt?.getTime()).toBe(
      aggregateRows[0]!.checkedAt?.getTime(),
    );
    expect(typeof summaryRows[0]!.staleFlag).toBe("boolean");

    const enq2 = await enqueueIngestionJob({
      kind: "offers.detail_refresh.one",
      payload: { offerId, timeoutMs: 3000 },
      idempotencyKey: `test:offers.detail_refresh.one:${offerId}:2:${Math.floor(Date.now() / 60000)}`,
      priority: 1000,
    });
    expect(enq2.id).toBeTruthy();
    createdJobIds.push(enq2.id!);

    const runTwo = await runIngestionWorker({
      workerId: "vitest-detail-2",
      maxJobs: 25,
      dryRun: false,
    });

    expect(runTwo.processed).toBeGreaterThan(0);
    expect(runTwo.failed).toBe(0);

    const secondJob = await db
      .select({ status: ingestionJobs.status })
      .from(ingestionJobs)
      .where(eq(ingestionJobs.id, enq2.id!))
      .limit(1);
    expect(secondJob[0]?.status).toBe("success");

    const histAfterSecond = await db
      .select({ id: priceHistory.id })
      .from(priceHistory)
      .where(eq(priceHistory.offerId, offerId))
      .orderBy(priceHistory.recordedAt);

    expect(histAfterSecond.length).toBe(histAfterFirst.length);

    const sourceRows = await db
      .select({ id: ingestionSources.id })
      .from(ingestionSources)
      .where(eq(ingestionSources.slug, "offers-detail"))
      .limit(1);
    expect(sourceRows[0]?.id).toBeTruthy();

    const entities = await db
      .select({ id: ingestionEntities.id })
      .from(ingestionEntities)
      .where(eq(ingestionEntities.sourceEntityId, offerId))
      .limit(10);
    expect(entities.length).toBeGreaterThan(0);

    const mappings = await db
      .select({ canonicalId: canonicalEntityMappings.canonicalId })
      .from(canonicalEntityMappings)
      .where(eq(canonicalEntityMappings.entityId, entities[0]!.id))
      .limit(1);
    expect(mappings[0]?.canonicalId).toBe(offerId);
  }, 60_000);
});
