import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { eq, max, sql } from "drizzle-orm";

import { db } from "../../src/server/db";
import {
  canonicalEntityMappings,
  ingestionEntities,
  ingestionEntitySnapshots,
  ingestionJobs,
  ingestionSources,
  normalizationOverrides,
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
let originalProductImageUrl: string | null = null;
let originalProductImageUrls: unknown = [];
const createdJobIds: string[] = [];
const createdOverrideIds: string[] = [];
const originalFetch = globalThis.fetch;

const detailHtml = `
<!doctype html>
<html>
  <head>
    <meta property="og:image" content="/images/aquascape-hero-2400.jpg" />
    <meta name="twitter:image" content="https://cdn.example.com/offer-detail-valid.jpg" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Offer",
        "price": "149.99",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "image": "/images/aquascape-hero-2400.jpg"
      }
    </script>
  </head>
  <body>
    <div>In stock</div>
  </body>
</html>
`;

const detailHtmlSecondPass = `
<!doctype html>
<html>
  <head>
    <meta property="og:image" content="https://cdn.example.com/offer-detail-second-pass.jpg" />
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

let activeDetailHtml = detailHtml;

beforeAll(async () => {
  globalThis.fetch = vi.fn(async () => {
    return new Response(activeDetailHtml, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }) as unknown as typeof fetch;

  const productRow = await db
    .select({
      id: products.id,
      imageUrl: products.imageUrl,
      imageUrls: products.imageUrls,
    })
    .from(products)
    .where(eq(products.slug, "uns-60u"))
    .limit(1);
  expect(productRow[0]?.id).toBeTruthy();
  createdProductId = productRow[0]!.id;
  originalProductImageUrl = productRow[0]!.imageUrl;
  originalProductImageUrls = productRow[0]!.imageUrls;

  await db
    .update(products)
    .set({ imageUrl: null, imageUrls: [], updatedAt: new Date() })
    .where(eq(products.id, productRow[0]!.id));

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

  for (const overrideId of createdOverrideIds) {
    await db.delete(normalizationOverrides).where(eq(normalizationOverrides.id, overrideId));
  }

  if (createdOfferId) {
    await db.delete(priceHistory).where(eq(priceHistory.offerId, createdOfferId));
    await db
      .delete(ingestionEntities)
      .where(eq(ingestionEntities.sourceEntityId, createdOfferId));
    await db.delete(offers).where(eq(offers.id, createdOfferId));
  }

  if (createdProductId) {
    await db
      .update(products)
      .set({
        imageUrl: originalProductImageUrl,
        imageUrls: Array.isArray(originalProductImageUrls)
          ? originalProductImageUrls
          : [],
        updatedAt: new Date(),
      })
      .where(eq(products.id, createdProductId));

    await refreshOfferSummaryForProductId({ db, productId: createdProductId });
  }
});

async function runWorkerUntilJobSettled(params: {
  jobId: string;
  workerId: string;
  maxAttempts?: number;
}): Promise<string | null> {
  const maxAttempts = params.maxAttempts ?? 8;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await runIngestionWorker({
      workerId: `${params.workerId}-${attempt}`,
      maxJobs: 10,
      dryRun: false,
    });

    const jobRows = await db
      .select({ status: ingestionJobs.status })
      .from(ingestionJobs)
      .where(eq(ingestionJobs.id, params.jobId))
      .limit(1);

    const status = jobRows[0]?.status ?? null;
    if (status === "success" || status === "failed") {
      return status;
    }
  }

  const finalRows = await db
    .select({ status: ingestionJobs.status })
    .from(ingestionJobs)
    .where(eq(ingestionJobs.id, params.jobId))
    .limit(1);

  return finalRows[0]?.status ?? null;
}

describe("ingestion: offers detail refresh", () => {
  test("worker processes offers.detail_refresh.one and only appends price history on meaningful changes", async () => {
    expect(createdOfferId).toBeTruthy();
    const offerId = createdOfferId!;
    activeDetailHtml = detailHtml;

    const enq1 = await enqueueIngestionJob({
      kind: "offers.detail_refresh.one",
      payload: { offerId, timeoutMs: 3000 },
      idempotencyKey: `test:offers.detail_refresh.one:${offerId}:1:${Date.now()}:${Math.random()}`,
      priority: 10_000,
    });
    expect(enq1.id).toBeTruthy();
    createdJobIds.push(enq1.id!);

    const firstJobStatus = await runWorkerUntilJobSettled({
      jobId: enq1.id!,
      workerId: "vitest-detail-1",
    });

    expect(firstJobStatus).toBe("success");

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

    const hydratedProduct = await db
      .select({ imageUrl: products.imageUrl, imageUrls: products.imageUrls })
      .from(products)
      .where(eq(products.id, refreshed[0]!.productId))
      .limit(1);

    expect(hydratedProduct[0]!.imageUrl).toBe(
      "https://cdn.example.com/offer-detail-valid.jpg",
    );
    expect(Array.isArray(hydratedProduct[0]!.imageUrls)).toBe(true);

    const offerEntityRows = await db
      .select({ id: ingestionEntities.id })
      .from(ingestionEntities)
      .where(eq(ingestionEntities.sourceEntityId, offerId))
      .limit(1);
    expect(offerEntityRows[0]?.id).toBeTruthy();

    const latestSnapshotRows = await db
      .select({ extracted: ingestionEntitySnapshots.extracted, rawJson: ingestionEntitySnapshots.rawJson })
      .from(ingestionEntitySnapshots)
      .where(eq(ingestionEntitySnapshots.entityId, offerEntityRows[0]!.id))
      .orderBy(ingestionEntitySnapshots.fetchedAt)
      .limit(10);

    const latestSnapshot = latestSnapshotRows[latestSnapshotRows.length - 1];
    expect(latestSnapshot).toBeTruthy();

    const extractedFields = (latestSnapshot!.extracted as { fields?: Record<string, { value?: unknown }> })?.fields ?? {};
    expect(extractedFields.product_image_url?.value).toBe(
      "https://cdn.example.com/offer-detail-valid.jpg",
    );

    const rawImageSelected = (latestSnapshot!.rawJson as { image?: { selected?: unknown } })?.image?.selected;
    expect(rawImageSelected).toBe("https://cdn.example.com/offer-detail-valid.jpg");

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

    activeDetailHtml = detailHtmlSecondPass;

    const enq2 = await enqueueIngestionJob({
      kind: "offers.detail_refresh.one",
      payload: { offerId, timeoutMs: 3000 },
      idempotencyKey: `test:offers.detail_refresh.one:${offerId}:2:${Date.now()}:${Math.random()}`,
      priority: 10_000,
    });
    expect(enq2.id).toBeTruthy();
    createdJobIds.push(enq2.id!);

    const secondJobStatus = await runWorkerUntilJobSettled({
      jobId: enq2.id!,
      workerId: "vitest-detail-2",
    });

    expect(secondJobStatus).toBe("success");

    const histAfterSecond = await db
      .select({ id: priceHistory.id })
      .from(priceHistory)
      .where(eq(priceHistory.offerId, offerId))
      .orderBy(priceHistory.recordedAt);

    expect(histAfterSecond.length).toBe(histAfterFirst.length);

    const hydratedProductAfterSecond = await db
      .select({ imageUrl: products.imageUrl })
      .from(products)
      .where(eq(products.id, refreshed[0]!.productId))
      .limit(1);
    expect(hydratedProductAfterSecond[0]!.imageUrl).toBe(
      "https://cdn.example.com/offer-detail-valid.jpg",
    );

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

  test("skips product image hydration when product image override exists", async () => {
    expect(createdOfferId).toBeTruthy();
    expect(createdProductId).toBeTruthy();
    const offerId = createdOfferId!;
    const productId = createdProductId!;

    await db
      .delete(normalizationOverrides)
      .where(eq(normalizationOverrides.canonicalId, productId));

    await db
      .update(products)
      .set({ imageUrl: null, imageUrls: [], updatedAt: new Date() })
      .where(eq(products.id, productId));

    const insertedOverride = await db
      .insert(normalizationOverrides)
      .values({
        canonicalType: "product",
        canonicalId: productId,
        fieldPath: "imageUrl",
        value: "https://example.com/override-image.jpg",
        reason: "vitest image override guard",
      })
      .returning({ id: normalizationOverrides.id });
    createdOverrideIds.push(insertedOverride[0]!.id);

    activeDetailHtml = detailHtmlSecondPass;

    const enq = await enqueueIngestionJob({
      kind: "offers.detail_refresh.one",
      payload: { offerId, timeoutMs: 3000 },
      idempotencyKey: `test:offers.detail_refresh.one:override:${offerId}:${Date.now()}:${Math.random()}`,
      priority: 10_000,
    });
    expect(enq.id).toBeTruthy();
    createdJobIds.push(enq.id!);

    const overrideJobStatus = await runWorkerUntilJobSettled({
      jobId: enq.id!,
      workerId: "vitest-detail-override",
    });

    expect(overrideJobStatus).toBe("success");

    const productAfter = await db
      .select({ imageUrl: products.imageUrl, imageUrls: products.imageUrls })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    expect(productAfter[0]!.imageUrl).toBeNull();
    expect(Array.isArray(productAfter[0]!.imageUrls)).toBe(true);
    expect((productAfter[0]!.imageUrls as unknown[]).length).toBe(0);
  });

  test("does not mutate canonical offer state on transport failure", async () => {
    expect(createdOfferId).toBeTruthy();
    const offerId = createdOfferId!;

    const baselineCheckedAt = new Date("2026-02-10T00:00:00.000Z");
    await db
      .update(offers)
      .set({
        priceCents: 17777,
        inStock: true,
        lastCheckedAt: baselineCheckedAt,
        updatedAt: new Date(),
      })
      .where(eq(offers.id, offerId));

    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const enq = await enqueueIngestionJob({
      kind: "offers.detail_refresh.one",
      payload: { offerId, timeoutMs: 3000 },
      idempotencyKey: `test:offers.detail_refresh.one:failure:${offerId}:${Date.now()}:${Math.random()}`,
      priority: 10_000,
    });
    if (enq.id) createdJobIds.push(enq.id);

    const failureJobStatus = await runWorkerUntilJobSettled({
      jobId: enq.id!,
      workerId: "vitest-detail-failure",
    });

    expect(failureJobStatus).toBe("success");

    const refreshed = await db
      .select({
        priceCents: offers.priceCents,
        inStock: offers.inStock,
        lastCheckedAt: offers.lastCheckedAt,
      })
      .from(offers)
      .where(eq(offers.id, offerId))
      .limit(1);

    expect(refreshed[0]!.priceCents).toBe(17777);
    expect(refreshed[0]!.inStock).toBe(true);
    expect(refreshed[0]!.lastCheckedAt?.toISOString()).toBe(
      baselineCheckedAt.toISOString(),
    );
  });
});
