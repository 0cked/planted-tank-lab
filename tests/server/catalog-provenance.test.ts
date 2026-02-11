import { afterAll, describe, expect, test } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "../../src/server/db";
import {
  buildItems,
  builds,
  canonicalEntityMappings,
  categories,
  ingestionEntities,
  ingestionSources,
  offers,
  plants,
  products,
  retailers,
} from "../../src/server/db/schema";
import { runCatalogProvenanceAudit } from "../../src/server/catalog/provenance";
import { ensureIngestionSource } from "../../src/server/ingestion/sources";

const suffix = Date.now();

const sourceSlug = `vitest-catalog-provenance-source-${suffix}`;
const categorySlug = `vitest-catalog-provenance-category-${suffix}`;
const retailerSlug = `vitest-catalog-provenance-retailer-${suffix}`;

let sourceId: string | null = null;
let categoryId: string | null = null;
let retailerId: string | null = null;
let buildId: string | null = null;

const productIds: string[] = [];
const plantIds: string[] = [];
const offerIds: string[] = [];

afterAll(async () => {
  if (buildId) {
    await db.delete(builds).where(eq(builds.id, buildId));
  }

  if (offerIds.length > 0) {
    await db.delete(offers).where(inArray(offers.id, offerIds));
  }

  if (sourceId) {
    await db.delete(ingestionSources).where(eq(ingestionSources.id, sourceId));
  }

  if (productIds.length > 0) {
    await db.delete(products).where(inArray(products.id, productIds));
  }

  if (plantIds.length > 0) {
    await db.delete(plants).where(inArray(plants.id, plantIds));
  }

  if (retailerId) {
    await db.delete(retailers).where(eq(retailers.id, retailerId));
  }

  if (categoryId) {
    await db.delete(categories).where(eq(categories.id, categoryId));
  }
});

describe("catalog provenance audit", () => {
  test("flags non-provenance canonical/displayed rows and build parts", async () => {
    const baseline = await runCatalogProvenanceAudit(db);

    sourceId = await ensureIngestionSource({
      slug: sourceSlug,
      name: "Vitest catalog provenance source",
      kind: "manual_seed",
      defaultTrust: "manual_seed",
      scheduleEveryMinutes: null,
      config: { test: true, scope: "catalog-provenance-audit" },
    });

    const categoryRows = await db
      .insert(categories)
      .values({
        slug: categorySlug,
        name: "Vitest Catalog Provenance",
        displayOrder: 50_000,
        builderRequired: true,
        updatedAt: new Date(),
      })
      .returning({ id: categories.id });
    categoryId = categoryRows[0]?.id ?? null;
    expect(categoryId).toBeTruthy();

    const retailerRows = await db
      .insert(retailers)
      .values({
        slug: retailerSlug,
        name: "Vitest Retailer",
        updatedAt: new Date(),
      })
      .returning({ id: retailers.id });
    retailerId = retailerRows[0]?.id ?? null;
    expect(retailerId).toBeTruthy();

    const insertedProducts = await db
      .insert(products)
      .values([
        {
          categoryId: categoryId!,
          name: `Vitest mapped product ${suffix}`,
          slug: `vitest-mapped-product-${suffix}`,
          specs: { volume_gal: 10 },
          meta: {},
          imageUrls: [],
          source: "manual_seed",
          status: "active",
          updatedAt: new Date(),
        },
        {
          categoryId: categoryId!,
          name: `Vitest unmapped product ${suffix}`,
          slug: `vitest-unmapped-product-${suffix}`,
          specs: { volume_gal: 20 },
          meta: {},
          imageUrls: [],
          source: "manual",
          status: "active",
          updatedAt: new Date(),
        },
      ])
      .returning({ id: products.id });

    const mappedProductId = insertedProducts[0]?.id ?? null;
    const unmappedProductId = insertedProducts[1]?.id ?? null;
    if (!mappedProductId || !unmappedProductId) {
      throw new Error("Failed to create product fixtures for catalog provenance test.");
    }

    productIds.push(mappedProductId, unmappedProductId);

    const insertedPlants = await db
      .insert(plants)
      .values([
        {
          commonName: `Vitest mapped plant ${suffix}`,
          scientificName: `Mappeda testii ${suffix}`,
          slug: `vitest-mapped-plant-${suffix}`,
          difficulty: "easy",
          lightDemand: "low",
          co2Demand: "low",
          placement: "midground",
          status: "active",
          updatedAt: new Date(),
        },
        {
          commonName: `Vitest unmapped plant ${suffix}`,
          scientificName: `Unmappeda testii ${suffix}`,
          slug: `vitest-unmapped-plant-${suffix}`,
          difficulty: "easy",
          lightDemand: "low",
          co2Demand: "low",
          placement: "midground",
          status: "active",
          updatedAt: new Date(),
        },
      ])
      .returning({ id: plants.id });

    const mappedPlantId = insertedPlants[0]?.id ?? null;
    const unmappedPlantId = insertedPlants[1]?.id ?? null;
    if (!mappedPlantId || !unmappedPlantId) {
      throw new Error("Failed to create plant fixtures for catalog provenance test.");
    }

    plantIds.push(mappedPlantId, unmappedPlantId);

    const insertedOffers = await db
      .insert(offers)
      .values([
        {
          productId: mappedProductId,
          retailerId: retailerId!,
          url: `https://example.com/mapped-offer-${suffix}`,
          inStock: true,
          updatedAt: new Date(),
        },
        {
          productId: unmappedProductId,
          retailerId: retailerId!,
          url: `https://example.com/unmapped-offer-${suffix}`,
          inStock: true,
          updatedAt: new Date(),
        },
      ])
      .returning({ id: offers.id });

    const mappedOfferId = insertedOffers[0]?.id ?? null;
    const unmappedOfferId = insertedOffers[1]?.id ?? null;
    if (!mappedOfferId || !unmappedOfferId) {
      throw new Error("Failed to create offer fixtures for catalog provenance test.");
    }

    offerIds.push(mappedOfferId, unmappedOfferId);

    const entities = await db
      .insert(ingestionEntities)
      .values([
        {
          sourceId,
          entityType: "product",
          sourceEntityId: `vitest-mapped-product-entity-${suffix}`,
          active: true,
          updatedAt: new Date(),
        },
        {
          sourceId,
          entityType: "plant",
          sourceEntityId: `vitest-mapped-plant-entity-${suffix}`,
          active: true,
          updatedAt: new Date(),
        },
        {
          sourceId,
          entityType: "offer",
          sourceEntityId: `vitest-mapped-offer-entity-${suffix}`,
          active: true,
          updatedAt: new Date(),
        },
      ])
      .returning({ id: ingestionEntities.id, entityType: ingestionEntities.entityType });

    const mappedProductEntityId = entities.find((entity) => entity.entityType === "product")?.id;
    const mappedPlantEntityId = entities.find((entity) => entity.entityType === "plant")?.id;
    const mappedOfferEntityId = entities.find((entity) => entity.entityType === "offer")?.id;

    if (!mappedProductEntityId || !mappedPlantEntityId || !mappedOfferEntityId) {
      throw new Error("Failed to create ingestion entity fixtures for catalog provenance test.");
    }

    await db.insert(canonicalEntityMappings).values([
      {
        entityId: mappedProductEntityId,
        canonicalType: "product",
        canonicalId: mappedProductId,
        matchMethod: "vitest",
        confidence: 100,
        notes: "mapped product fixture",
        updatedAt: new Date(),
      },
      {
        entityId: mappedPlantEntityId,
        canonicalType: "plant",
        canonicalId: mappedPlantId,
        matchMethod: "vitest",
        confidence: 100,
        notes: "mapped plant fixture",
        updatedAt: new Date(),
      },
      {
        entityId: mappedOfferEntityId,
        canonicalType: "offer",
        canonicalId: mappedOfferId,
        matchMethod: "vitest",
        confidence: 100,
        notes: "mapped offer fixture",
        updatedAt: new Date(),
      },
    ]);

    const buildRows = await db
      .insert(builds)
      .values({
        name: `Vitest provenance build ${suffix}`,
        updatedAt: new Date(),
      })
      .returning({ id: builds.id });

    buildId = buildRows[0]?.id ?? null;
    expect(buildId).toBeTruthy();

    await db.insert(buildItems).values([
      {
        buildId: buildId!,
        categoryId: categoryId!,
        productId: unmappedProductId,
        quantity: 1,
      },
      {
        buildId: buildId!,
        categoryId: categoryId!,
        plantId: unmappedPlantId,
        quantity: 2,
      },
    ]);

    const after = await runCatalogProvenanceAudit(db);

    expect(after.canonicalWithoutProvenance.products).toBeGreaterThanOrEqual(
      baseline.canonicalWithoutProvenance.products + 1,
    );
    expect(after.canonicalWithoutProvenance.plants).toBeGreaterThanOrEqual(
      baseline.canonicalWithoutProvenance.plants + 1,
    );
    expect(after.canonicalWithoutProvenance.offers).toBeGreaterThanOrEqual(
      baseline.canonicalWithoutProvenance.offers + 1,
    );
    expect(after.canonicalWithoutProvenance.categories).toBeGreaterThanOrEqual(
      baseline.canonicalWithoutProvenance.categories + 1,
    );

    expect(after.displayedWithoutProvenance.products).toBeGreaterThanOrEqual(
      baseline.displayedWithoutProvenance.products + 1,
    );
    expect(after.displayedWithoutProvenance.plants).toBeGreaterThanOrEqual(
      baseline.displayedWithoutProvenance.plants + 1,
    );
    expect(after.displayedWithoutProvenance.offers).toBeGreaterThanOrEqual(
      baseline.displayedWithoutProvenance.offers + 1,
    );
    expect(after.displayedWithoutProvenance.categories).toBeGreaterThanOrEqual(
      baseline.displayedWithoutProvenance.categories + 1,
    );

    expect(after.buildPartsReferencingNonProvenance.products).toBeGreaterThanOrEqual(
      baseline.buildPartsReferencingNonProvenance.products + 1,
    );
    expect(after.buildPartsReferencingNonProvenance.plants).toBeGreaterThanOrEqual(
      baseline.buildPartsReferencingNonProvenance.plants + 1,
    );
    expect(after.buildPartsReferencingNonProvenance.total).toBeGreaterThanOrEqual(
      baseline.buildPartsReferencingNonProvenance.total + 2,
    );

    expect(after.hasDisplayedViolations).toBe(true);

    const mappingRows = await db
      .select({ c: canonicalEntityMappings.id })
      .from(canonicalEntityMappings)
      .where(
        and(
          eq(canonicalEntityMappings.canonicalType, "product"),
          eq(canonicalEntityMappings.canonicalId, mappedProductId),
        ),
      );

    expect(mappingRows.length).toBeGreaterThan(0);
  }, 30_000);
});
