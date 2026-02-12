import { afterAll, describe, expect, test } from "vitest";
import { eq, inArray } from "drizzle-orm";

import { db } from "../../src/server/db";
import {
  canonicalEntityMappings,
  ingestionEntities,
  ingestionSources,
  products,
} from "../../src/server/db/schema";
import {
  createManualSeedRun,
  finishManualSeedRun,
  ingestManualSeedSnapshot,
} from "../../src/server/ingestion/sources/manual-seed";
import { ensureIngestionSource } from "../../src/server/ingestion/sources";
import { normalizeManualSeedSnapshots } from "../../src/server/normalization/manual-seed";

const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const sourceSlug = `manual-seed-image-preservation-${suffix}`;
const productSlug = `vitest-image-preserve-product-${suffix}`;

let sourceId: string | null = null;
let productId: string | null = null;

afterAll(async () => {
  if (productId) {
    await db.delete(products).where(eq(products.id, productId));
  } else {
    await db.delete(products).where(eq(products.slug, productSlug));
  }

  if (sourceId) {
    const entityRows = await db
      .select({ id: ingestionEntities.id })
      .from(ingestionEntities)
      .where(eq(ingestionEntities.sourceId, sourceId));

    const entityIds = entityRows.map((row) => row.id);

    if (entityIds.length > 0) {
      await db
        .delete(canonicalEntityMappings)
        .where(inArray(canonicalEntityMappings.entityId, entityIds));

      await db
        .delete(ingestionEntities)
        .where(eq(ingestionEntities.sourceId, sourceId));
    }

    await db.delete(ingestionSources).where(eq(ingestionSources.id, sourceId));
  }
});

describe("manual seed normalization image preservation", () => {
  test("preserves canonical product image when later seed snapshots omit image fields", async () => {
    sourceId = await ensureIngestionSource({
      slug: sourceSlug,
      name: "Vitest manual-seed image preservation",
      kind: "manual_seed",
      defaultTrust: "manual_seed",
      scheduleEveryMinutes: null,
      config: { test: true, scope: "manual-seed-image-preservation" },
    });

    const initialPayload = {
      category_slug: "tank",
      brand_slug: "uns",
      brand_name: "Ultum Nature Systems",
      name: `Image Preservation Product ${suffix}`,
      slug: productSlug,
      description: "Initial payload with image.",
      image_url: "https://cdn.example.com/manual-seed-initial-image.jpg",
      image_urls: ["https://cdn.example.com/manual-seed-initial-image.jpg"],
      specs: {
        volume_gallons: 10,
      },
      sources: ["https://example.com/manual-seed-image-preservation"],
      verified: true,
    };

    const runOneId = await createManualSeedRun(sourceId);
    await ingestManualSeedSnapshot({
      sourceId,
      runId: runOneId,
      entityType: "product",
      sourceEntityId: productSlug,
      raw: initialPayload,
    });
    await finishManualSeedRun({
      runId: runOneId,
      status: "success",
      stats: { stage: "initial" },
    });

    const normalizationOne = await normalizeManualSeedSnapshots({ sourceId });
    expect(normalizationOne.products.inserted).toBeGreaterThanOrEqual(1);

    const firstProductRows = await db
      .select({
        id: products.id,
        imageUrl: products.imageUrl,
        imageUrls: products.imageUrls,
      })
      .from(products)
      .where(eq(products.slug, productSlug))
      .limit(1);

    productId = firstProductRows[0]?.id ?? null;
    expect(productId).toBeTruthy();
    expect(firstProductRows[0]?.imageUrl).toBe(
      "https://cdn.example.com/manual-seed-initial-image.jpg",
    );

    const imageOmittedPayload = {
      category_slug: "tank",
      brand_slug: "uns",
      brand_name: "Ultum Nature Systems",
      name: `Image Preservation Product ${suffix} Updated`,
      slug: productSlug,
      description: "Second payload intentionally omits image fields.",
      specs: {
        volume_gallons: 10,
      },
      sources: ["https://example.com/manual-seed-image-preservation"],
      verified: true,
    };

    const runTwoId = await createManualSeedRun(sourceId);
    await ingestManualSeedSnapshot({
      sourceId,
      runId: runTwoId,
      entityType: "product",
      sourceEntityId: productSlug,
      raw: imageOmittedPayload,
    });
    await finishManualSeedRun({
      runId: runTwoId,
      status: "success",
      stats: { stage: "image_omitted" },
    });

    const normalizationTwo = await normalizeManualSeedSnapshots({ sourceId });
    expect(normalizationTwo.products.updated).toBeGreaterThanOrEqual(1);

    const secondProductRows = await db
      .select({ imageUrl: products.imageUrl, imageUrls: products.imageUrls })
      .from(products)
      .where(eq(products.id, productId!))
      .limit(1);

    expect(secondProductRows[0]?.imageUrl).toBe(
      "https://cdn.example.com/manual-seed-initial-image.jpg",
    );
    expect(secondProductRows[0]?.imageUrls).toEqual([
      "https://cdn.example.com/manual-seed-initial-image.jpg",
    ]);
  }, 60_000);
});
