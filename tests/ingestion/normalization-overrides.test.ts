import { afterAll, describe, expect, test } from "vitest";
import { and, eq } from "drizzle-orm";

import { db } from "../../src/server/db";
import {
  canonicalEntityMappings,
  ingestionEntities,
  ingestionSources,
  normalizationOverrides,
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
const sourceSlug = `manual-seed-overrides-${suffix}`;
const productSlug = `vitest-override-product-${suffix}`;
const plantSlug = `vitest-override-plant-${suffix}`;
const offerSourceEntityId = `${productSlug}::amazon`;

let sourceId: string | null = null;
let productId: string | null = null;
let plantId: string | null = null;
let offerId: string | null = null;

afterAll(async () => {
  if (offerId) {
    await db
      .delete(normalizationOverrides)
      .where(
        and(
          eq(normalizationOverrides.canonicalType, "offer"),
          eq(normalizationOverrides.canonicalId, offerId),
        ),
      );

    await db.delete(priceHistory).where(eq(priceHistory.offerId, offerId));
    await db.delete(offers).where(eq(offers.id, offerId));
  }

  if (plantId) {
    await db
      .delete(normalizationOverrides)
      .where(
        and(
          eq(normalizationOverrides.canonicalType, "plant"),
          eq(normalizationOverrides.canonicalId, plantId),
        ),
      );

    await db.delete(plants).where(eq(plants.id, plantId));
  }

  if (productId) {
    await db
      .delete(normalizationOverrides)
      .where(
        and(
          eq(normalizationOverrides.canonicalType, "product"),
          eq(normalizationOverrides.canonicalId, productId),
        ),
      );

    await db.delete(products).where(eq(products.id, productId));
  }

  if (sourceId) {
    await db.delete(ingestionSources).where(eq(ingestionSources.id, sourceId));
  }
});

describe("normalization overrides", () => {
  test("overrides win and notes record winner reason metadata", async () => {
    sourceId = await ensureIngestionSource({
      slug: sourceSlug,
      name: "Vitest manual-seed overrides",
      kind: "manual_seed",
      defaultTrust: "manual_seed",
      scheduleEveryMinutes: null,
      config: { test: true, scope: "normalization-overrides" },
    });

    const retailerRows = await db
      .select({ id: retailers.id })
      .from(retailers)
      .where(eq(retailers.slug, "amazon"))
      .limit(1);

    const retailerId = retailerRows[0]?.id ?? null;
    expect(retailerId).toBeTruthy();

    const initialProductPayload = {
      category_slug: "tank",
      brand_slug: "uns",
      brand_name: "Ultum Nature Systems",
      name: `Override Product ${suffix}`,
      slug: productSlug,
      description: "Initial product payload",
      image_url: "https://example.com/override-product-initial.jpg",
      image_urls: ["https://example.com/override-product-initial.jpg"],
      specs: {
        type: "rimless",
        volume_gallons: 10,
      },
      sources: ["https://example.com/override-product-source"],
      verified: true,
    };

    const initialPlantPayload = {
      common_name: `Override Plant ${suffix}`,
      scientific_name: `Override plantus ${suffix}`,
      slug: plantSlug,
      family: "Vitaceae",
      image_url: "https://example.com/override-plant-initial.jpg",
      image_urls: ["https://example.com/override-plant-initial.jpg"],
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
      description: "Initial plant payload",
      native_region: "Test Region",
      notes: "Initial note",
      sources: ["https://example.com/override-plant-source"],
    };

    const initialOfferPayload = {
      product_slug: productSlug,
      retailer_slug: "amazon",
      price_cents: 12345,
      currency: "USD",
      url: `https://example.com/override-offer-${suffix}`,
      affiliate_url: `https://example.com/override-affiliate-${suffix}`,
      in_stock: true,
      last_checked_at: new Date().toISOString(),
    };

    const runOneId = await createManualSeedRun(sourceId);
    await ingestManualSeedSnapshot({
      sourceId,
      runId: runOneId,
      entityType: "product",
      sourceEntityId: productSlug,
      raw: initialProductPayload,
    });
    await ingestManualSeedSnapshot({
      sourceId,
      runId: runOneId,
      entityType: "plant",
      sourceEntityId: plantSlug,
      raw: initialPlantPayload,
    });
    await ingestManualSeedSnapshot({
      sourceId,
      runId: runOneId,
      entityType: "offer",
      sourceEntityId: offerSourceEntityId,
      url: initialOfferPayload.url,
      raw: initialOfferPayload,
    });

    await finishManualSeedRun({
      runId: runOneId,
      status: "success",
      stats: { stage: "initial" },
    });

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
    const plantEntityRows = await db
      .select({ id: ingestionEntities.id })
      .from(ingestionEntities)
      .where(
        and(
          eq(ingestionEntities.sourceId, sourceId),
          eq(ingestionEntities.entityType, "plant"),
          eq(ingestionEntities.sourceEntityId, plantSlug),
        ),
      )
      .limit(1);
    const offerEntityRows = await db
      .select({ id: ingestionEntities.id })
      .from(ingestionEntities)
      .where(
        and(
          eq(ingestionEntities.sourceId, sourceId),
          eq(ingestionEntities.entityType, "offer"),
          eq(ingestionEntities.sourceEntityId, offerSourceEntityId),
        ),
      )
      .limit(1);

    const productEntityId = productEntityRows[0]?.id ?? null;
    const plantEntityId = plantEntityRows[0]?.id ?? null;
    const offerEntityId = offerEntityRows[0]?.id ?? null;

    expect(productEntityId).toBeTruthy();
    expect(plantEntityId).toBeTruthy();
    expect(offerEntityId).toBeTruthy();

    await db.insert(normalizationOverrides).values([
      {
        canonicalType: "product",
        canonicalId: productId!,
        fieldPath: "name",
        value: "Manual Override Product Name",
        reason: "manual_name_override",
        updatedAt: new Date(),
      },
      {
        canonicalType: "product",
        canonicalId: productId!,
        fieldPath: "specs.volume_gallons",
        value: 42,
        reason: "manual_specs_override",
        updatedAt: new Date(),
      },
      {
        canonicalType: "plant",
        canonicalId: plantId!,
        fieldPath: "difficulty",
        value: "hard",
        reason: "manual_difficulty_override",
        updatedAt: new Date(),
      },
      {
        canonicalType: "offer",
        canonicalId: offerId!,
        fieldPath: "priceCents",
        value: 7777,
        reason: "manual_price_override",
        updatedAt: new Date(),
      },
    ]);

    const changedProductPayload = {
      ...initialProductPayload,
      name: "Automated Product Name V2",
      description: "Automated product value should lose to override",
      specs: {
        ...initialProductPayload.specs,
        volume_gallons: 5,
      },
    };

    const changedPlantPayload = {
      ...initialPlantPayload,
      difficulty: "easy",
      notes: "Automated plant value should lose to override",
    };

    const changedOfferPayload = {
      ...initialOfferPayload,
      price_cents: 10999,
      last_checked_at: new Date(Date.now() + 60_000).toISOString(),
    };

    const runTwoId = await createManualSeedRun(sourceId);
    await ingestManualSeedSnapshot({
      sourceId,
      runId: runTwoId,
      entityType: "product",
      sourceEntityId: productSlug,
      raw: changedProductPayload,
    });
    await ingestManualSeedSnapshot({
      sourceId,
      runId: runTwoId,
      entityType: "plant",
      sourceEntityId: plantSlug,
      raw: changedPlantPayload,
    });
    await ingestManualSeedSnapshot({
      sourceId,
      runId: runTwoId,
      entityType: "offer",
      sourceEntityId: offerSourceEntityId,
      url: changedOfferPayload.url,
      raw: changedOfferPayload,
    });

    await finishManualSeedRun({
      runId: runTwoId,
      status: "success",
      stats: { stage: "override_rerun" },
    });

    const normalizationTwo = await normalizeManualSeedSnapshots({ sourceId });
    expect(normalizationTwo.totalInserted).toBe(0);
    expect(normalizationTwo.totalUpdated).toBe(3);

    const normalizedProductRows = await db
      .select({ name: products.name, specs: products.specs })
      .from(products)
      .where(eq(products.id, productId!))
      .limit(1);

    const normalizedPlantRows = await db
      .select({ difficulty: plants.difficulty })
      .from(plants)
      .where(eq(plants.id, plantId!))
      .limit(1);

    const normalizedOfferRows = await db
      .select({ priceCents: offers.priceCents })
      .from(offers)
      .where(eq(offers.id, offerId!))
      .limit(1);

    expect(normalizedProductRows[0]?.name).toBe("Manual Override Product Name");
    expect(
      (normalizedProductRows[0]?.specs as Record<string, unknown>)?.volume_gallons,
    ).toBe(42);
    expect(normalizedPlantRows[0]?.difficulty).toBe("hard");
    expect(normalizedOfferRows[0]?.priceCents).toBe(7777);

    const productMappingRows = await db
      .select({ notes: canonicalEntityMappings.notes })
      .from(canonicalEntityMappings)
      .where(eq(canonicalEntityMappings.entityId, productEntityId!))
      .limit(1);
    const plantMappingRows = await db
      .select({ notes: canonicalEntityMappings.notes })
      .from(canonicalEntityMappings)
      .where(eq(canonicalEntityMappings.entityId, plantEntityId!))
      .limit(1);
    const offerMappingRows = await db
      .select({ notes: canonicalEntityMappings.notes })
      .from(canonicalEntityMappings)
      .where(eq(canonicalEntityMappings.entityId, offerEntityId!))
      .limit(1);

    const productNotes = JSON.parse(productMappingRows[0]?.notes ?? "{}") as {
      winnerByField?: Record<string, { winner?: string; reason?: string }>;
    };
    const plantNotes = JSON.parse(plantMappingRows[0]?.notes ?? "{}") as {
      winnerByField?: Record<string, { winner?: string; reason?: string }>;
    };
    const offerNotes = JSON.parse(offerMappingRows[0]?.notes ?? "{}") as {
      winnerByField?: Record<string, { winner?: string; reason?: string }>;
    };

    expect(productNotes.winnerByField?.name?.winner).toBe("override");
    expect(productNotes.winnerByField?.name?.reason).toBe("manual_name_override");
    expect(productNotes.winnerByField?.["specs.volume_gallons"]?.winner).toBe(
      "override",
    );
    expect(
      productNotes.winnerByField?.["specs.volume_gallons"]?.reason,
    ).toBe("manual_specs_override");

    expect(plantNotes.winnerByField?.difficulty?.winner).toBe("override");
    expect(plantNotes.winnerByField?.difficulty?.reason).toBe(
      "manual_difficulty_override",
    );

    expect(offerNotes.winnerByField?.priceCents?.winner).toBe("override");
    expect(offerNotes.winnerByField?.priceCents?.reason).toBe(
      "manual_price_override",
    );
  }, 90_000);
});
