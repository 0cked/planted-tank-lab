import { afterAll, describe, expect, test } from "vitest";
import { and, eq, sql } from "drizzle-orm";

import { db } from "../../src/server/db";
import {
  canonicalEntityMappings,
  ingestionEntities,
  ingestionEntitySnapshots,
  ingestionSources,
  offers,
  plants,
  priceHistory,
  products,
  retailers,
} from "../../src/server/db/schema";
import {
  createManualSeedRun,
  finishManualSeedRun,
  ingestManualSeedSnapshot,
} from "../../src/server/ingestion/sources/manual-seed";
import { ensureIngestionSource } from "../../src/server/ingestion/sources";
import { normalizeManualSeedSnapshots } from "../../src/server/normalization/manual-seed";

const suffix = Date.now();
const sourceSlug = `manual-seed-idempotency-${suffix}`;
const productSlug = `vitest-product-${suffix}`;
const plantSlug = `vitest-plant-${suffix}`;

let sourceId: string | null = null;
let productId: string | null = null;
let plantId: string | null = null;
let offerId: string | null = null;

async function countByQuery<T>(query: Promise<T[]>): Promise<number> {
  return (await query).length;
}

afterAll(async () => {
  if (productId) {
    const relatedOffers = await db
      .select({ id: offers.id })
      .from(offers)
      .where(eq(offers.productId, productId));

    for (const row of relatedOffers) {
      await db.delete(priceHistory).where(eq(priceHistory.offerId, row.id));
      await db.delete(offers).where(eq(offers.id, row.id));
    }
  } else if (offerId) {
    await db.delete(priceHistory).where(eq(priceHistory.offerId, offerId));
    await db.delete(offers).where(eq(offers.id, offerId));
  }

  if (plantId) {
    await db.delete(plants).where(eq(plants.id, plantId));
  }

  if (productId) {
    await db.delete(products).where(eq(products.id, productId));
  }

  if (sourceId) {
    await db.delete(ingestionSources).where(eq(ingestionSources.id, sourceId));
  }
});

describe("ingestion idempotency", () => {
  test("dedupes unchanged snapshots and keeps canonical IDs stable", async () => {
    sourceId = await ensureIngestionSource({
      slug: sourceSlug,
      name: "Vitest manual-seed idempotency",
      kind: "manual_seed",
      defaultTrust: "manual_seed",
      scheduleEveryMinutes: null,
      config: { test: true, scope: "idempotency" },
    });

    const retailerRows = await db
      .select({ id: retailers.id })
      .from(retailers)
      .where(eq(retailers.slug, "amazon"))
      .limit(1);

    const retailerId = retailerRows[0]?.id;
    expect(retailerId).toBeTruthy();

    const productPayload = {
      category_slug: "tank",
      brand_slug: "uns",
      brand_name: "Ultum Nature Systems",
      name: `Vitest Product ${suffix}`,
      slug: productSlug,
      description: "Vitest idempotency product",
      image_url: "https://example.com/vitest-product.jpg",
      image_urls: ["https://example.com/vitest-product.jpg"],
      specs: {
        type: "rimless",
        volume_gallons: 10,
      },
      sources: ["https://example.com/source"],
      verified: true,
    };

    const plantPayload = {
      common_name: `Vitest Plant ${suffix}`,
      scientific_name: `Testus plantus ${suffix}`,
      slug: plantSlug,
      family: "Vitaceae",
      image_url: "https://example.com/vitest-plant.jpg",
      image_urls: ["https://example.com/vitest-plant.jpg"],
      difficulty: "easy",
      light_demand: "medium",
      co2_demand: "low",
      growth_rate: "moderate",
      placement: "midground",
      temp_min_f: 70,
      temp_max_f: 80,
      ph_min: 6.0,
      ph_max: 7.5,
      gh_min: 3,
      gh_max: 10,
      kh_min: 1,
      kh_max: 6,
      max_height_in: 12,
      propagation: "cuttings",
      substrate_type: "aquasoil",
      shrimp_safe: true,
      beginner_friendly: true,
      description: "Vitest idempotency plant",
      native_region: "Test Region",
      notes: "Vitest note",
      sources: ["https://example.com/plant-source"],
    };

    const offerPayload = {
      product_slug: productSlug,
      retailer_slug: "amazon",
      price_cents: 12345,
      currency: "USD",
      url: `https://example.com/vitest-offer-${suffix}`,
      affiliate_url: `https://example.com/vitest-affiliate-${suffix}`,
      in_stock: true,
      last_checked_at: new Date().toISOString(),
    };

    const runOneId = await createManualSeedRun(sourceId);
    const firstProductSnapshot = await ingestManualSeedSnapshot({
      sourceId,
      runId: runOneId,
      entityType: "product",
      sourceEntityId: productSlug,
      raw: productPayload,
    });
    const firstPlantSnapshot = await ingestManualSeedSnapshot({
      sourceId,
      runId: runOneId,
      entityType: "plant",
      sourceEntityId: plantSlug,
      raw: plantPayload,
    });
    const firstOfferSnapshot = await ingestManualSeedSnapshot({
      sourceId,
      runId: runOneId,
      entityType: "offer",
      sourceEntityId: `${productSlug}::amazon`,
      url: offerPayload.url,
      raw: offerPayload,
    });

    await finishManualSeedRun({
      runId: runOneId,
      status: "success",
      stats: {
        snapshotsCreated: [
          firstProductSnapshot.snapshotCreated,
          firstPlantSnapshot.snapshotCreated,
          firstOfferSnapshot.snapshotCreated,
        ].filter(Boolean).length,
      },
    });

    expect(firstProductSnapshot.snapshotCreated).toBe(true);
    expect(firstPlantSnapshot.snapshotCreated).toBe(true);
    expect(firstOfferSnapshot.snapshotCreated).toBe(true);

    const normalizationOne = await normalizeManualSeedSnapshots({ sourceId });
    expect(normalizationOne.totalInserted).toBe(3);

    const productRows = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, productSlug))
      .limit(1);
    const plantRows = await db
      .select({ id: plants.id })
      .from(plants)
      .where(eq(plants.slug, plantSlug))
      .limit(1);

    productId = productRows[0]?.id ?? null;
    plantId = plantRows[0]?.id ?? null;

    expect(productId).toBeTruthy();
    expect(plantId).toBeTruthy();

    const productEntityRows = await db
      .select({ id: ingestionEntities.id })
      .from(ingestionEntities)
      .where(
        and(
          eq(ingestionEntities.sourceId, sourceId),
          eq(ingestionEntities.entityType, "product"),
          eq(ingestionEntities.sourceEntityId, productSlug),
        ),
      )
      .limit(1);
    const productEntityId = productEntityRows[0]?.id;
    expect(productEntityId).toBeTruthy();

    const productMappingRows = await db
      .select({
        canonicalId: canonicalEntityMappings.canonicalId,
        matchMethod: canonicalEntityMappings.matchMethod,
        confidence: canonicalEntityMappings.confidence,
      })
      .from(canonicalEntityMappings)
      .where(eq(canonicalEntityMappings.entityId, productEntityId!))
      .limit(1);

    expect(productMappingRows[0]?.canonicalId).toBe(productId);
    expect(productMappingRows[0]?.matchMethod).toBe("new_canonical");
    expect(productMappingRows[0]?.confidence).toBe(80);

    const offerRows = await db
      .select({ id: offers.id })
      .from(offers)
      .where(
        and(
          eq(offers.productId, productId!),
          eq(offers.retailerId, retailerId!),
        ),
      )
      .limit(1);

    offerId = offerRows[0]?.id ?? null;
    expect(offerId).toBeTruthy();

    const firstCanonicalIds = {
      productId,
      plantId,
      offerId,
    };

    const runTwoId = await createManualSeedRun(sourceId);
    const secondProductSnapshot = await ingestManualSeedSnapshot({
      sourceId,
      runId: runTwoId,
      entityType: "product",
      sourceEntityId: productSlug,
      raw: productPayload,
    });
    const secondPlantSnapshot = await ingestManualSeedSnapshot({
      sourceId,
      runId: runTwoId,
      entityType: "plant",
      sourceEntityId: plantSlug,
      raw: plantPayload,
    });
    const secondOfferSnapshot = await ingestManualSeedSnapshot({
      sourceId,
      runId: runTwoId,
      entityType: "offer",
      sourceEntityId: `${productSlug}::amazon`,
      url: offerPayload.url,
      raw: offerPayload,
    });

    await finishManualSeedRun({
      runId: runTwoId,
      status: "success",
      stats: {
        snapshotsCreated: [
          secondProductSnapshot.snapshotCreated,
          secondPlantSnapshot.snapshotCreated,
          secondOfferSnapshot.snapshotCreated,
        ].filter(Boolean).length,
      },
    });

    expect(secondProductSnapshot.snapshotCreated).toBe(false);
    expect(secondPlantSnapshot.snapshotCreated).toBe(false);
    expect(secondOfferSnapshot.snapshotCreated).toBe(false);

    const normalizationTwo = await normalizeManualSeedSnapshots({ sourceId });
    expect(normalizationTwo.totalInserted).toBe(0);
    expect(normalizationTwo.totalUpdated).toBe(3);

    const productMappingRowsAfter = await db
      .select({
        canonicalId: canonicalEntityMappings.canonicalId,
        matchMethod: canonicalEntityMappings.matchMethod,
        confidence: canonicalEntityMappings.confidence,
      })
      .from(canonicalEntityMappings)
      .where(eq(canonicalEntityMappings.entityId, productEntityId!))
      .limit(1);

    expect(productMappingRowsAfter[0]?.canonicalId).toBe(productId);
    expect(productMappingRowsAfter[0]?.matchMethod).toBe("identifier_exact");
    expect(productMappingRowsAfter[0]?.confidence).toBe(100);

    const productRowsAfter = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, productSlug))
      .limit(1);
    const plantRowsAfter = await db
      .select({ id: plants.id })
      .from(plants)
      .where(eq(plants.slug, plantSlug))
      .limit(1);
    const offerRowsAfter = await db
      .select({ id: offers.id })
      .from(offers)
      .where(
        and(
          eq(offers.productId, productId!),
          eq(offers.retailerId, retailerId!),
        ),
      )
      .limit(1);

    expect(productRowsAfter[0]?.id).toBe(firstCanonicalIds.productId);
    expect(plantRowsAfter[0]?.id).toBe(firstCanonicalIds.plantId);
    expect(offerRowsAfter[0]?.id).toBe(firstCanonicalIds.offerId);

    const productCountRows = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.slug, productSlug));
    const plantCountRows = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(plants)
      .where(eq(plants.slug, plantSlug));
    const offerCountRows = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(offers)
      .where(
        and(
          eq(offers.productId, productId!),
          eq(offers.retailerId, retailerId!),
        ),
      );

    expect(productCountRows[0]?.c).toBe(1);
    expect(plantCountRows[0]?.c).toBe(1);
    expect(offerCountRows[0]?.c).toBe(1);

    const entityRows = await db
      .select({ id: ingestionEntities.id })
      .from(ingestionEntities)
      .where(eq(ingestionEntities.sourceId, sourceId));

    expect(entityRows).toHaveLength(3);

    for (const entity of entityRows) {
      const snapshotCountRows = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(ingestionEntitySnapshots)
        .where(eq(ingestionEntitySnapshots.entityId, entity.id));
      expect(snapshotCountRows[0]?.c).toBe(1);
    }

    expect(
      await countByQuery(
        db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.slug, productSlug)),
      ),
    ).toBe(1);
  }, 60_000);
});
