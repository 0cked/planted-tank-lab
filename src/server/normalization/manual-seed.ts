import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import {
  brands,
  canonicalEntityMappings,
  categories,
  ingestionEntities,
  ingestionEntitySnapshots,
  offers,
  plants,
  products,
  retailers,
} from "@/server/db/schema";
import { matchCanonicalProduct } from "@/server/normalization/matchers/product";

const manualSeedImageUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("/") ||
      value.startsWith("http://") ||
      value.startsWith("https://"),
    {
      message: "image URL must be absolute or a public-path starting with '/'",
    },
  );

export const manualSeedProductSchema = z.object({
  category_slug: z.string().min(1),
  brand_slug: z.string().min(1),
  brand_name: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  model: z.string().min(1).optional(),
  model_number: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  upc: z.string().min(1).optional(),
  ean: z.string().min(1).optional(),
  gtin: z.string().min(1).optional(),
  mpn: z.string().min(1).optional(),
  asin: z.string().min(1).optional(),
  description: z.string().optional(),
  image_url: manualSeedImageUrlSchema.optional(),
  image_urls: z.array(manualSeedImageUrlSchema).optional(),
  specs: z.record(z.string(), z.unknown()),
  identifiers: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
  sources: z.array(z.string().url()).optional(),
  source_notes: z.string().max(2000).optional(),
  verified: z.boolean().optional(),
  curated_rank: z.number().int().positive().optional(),
});

export const manualSeedPlantSchema = z.object({
  common_name: z.string().min(1),
  scientific_name: z.string().optional(),
  slug: z.string().min(1),
  family: z.string().optional(),
  image_url: manualSeedImageUrlSchema.optional(),
  image_urls: z.array(manualSeedImageUrlSchema).optional(),
  difficulty: z.string().min(1),
  light_demand: z.string().min(1),
  co2_demand: z.string().min(1),
  growth_rate: z.string().optional(),
  placement: z.string().min(1),

  temp_min_f: z.number().optional(),
  temp_max_f: z.number().optional(),
  ph_min: z.number().optional(),
  ph_max: z.number().optional(),
  gh_min: z.number().int().optional(),
  gh_max: z.number().int().optional(),
  kh_min: z.number().int().optional(),
  kh_max: z.number().int().optional(),

  max_height_in: z.number().optional(),
  propagation: z.string().optional(),
  substrate_type: z.string().optional(),
  shrimp_safe: z.boolean().default(true),
  beginner_friendly: z.boolean().default(false),

  description: z.string().optional(),
  native_region: z.string().optional(),
  notes: z.string().optional(),
  sources: z.array(z.string().url()).optional(),
});

export const manualSeedOfferSchema = z.object({
  product_slug: z.string().min(1),
  retailer_slug: z.string().min(1),
  price_cents: z.number().int().nonnegative().optional(),
  currency: z.string().min(3).max(3).default("USD"),
  url: z.string().url(),
  affiliate_url: z.string().url().optional(),
  in_stock: z.boolean().default(true),
  last_checked_at: z.string().datetime().optional(),
});

type ManualSeedEntityType = "product" | "plant" | "offer";

type LatestSnapshotRow = {
  entityId: string;
  sourceEntityId: string;
  rawJson: Record<string, unknown>;
};

type ParsedSnapshot<T> = {
  entityId: string;
  sourceEntityId: string;
  payload: T;
};

type NormalizationStats = {
  processed: number;
  inserted: number;
  updated: number;
};

export type ManualSeedNormalizationSummary = {
  products: NormalizationStats;
  plants: NormalizationStats;
  offers: NormalizationStats;
  mappingsUpserted: number;
  totalInserted: number;
  totalUpdated: number;
};

type ManualSeedProduct = z.infer<typeof manualSeedProductSchema>;

function normalizeIdentifierValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function buildManualSeedProductIdentifierMap(
  item: ManualSeedProduct,
): Record<string, string> {
  const out: Record<string, string> = {};

  const assign = (key: string, value: unknown): void => {
    const normalized = normalizeIdentifierValue(value);
    if (!normalized) return;
    out[key] = normalized;
  };

  assign("slug", item.slug);
  assign("sku", item.sku);
  assign("upc", item.upc);
  assign("ean", item.ean);
  assign("gtin", item.gtin);
  assign("mpn", item.mpn);
  assign("asin", item.asin);
  assign("model_number", item.model_number);

  if (item.identifiers) {
    for (const [key, value] of Object.entries(item.identifiers).sort(
      ([a], [b]) => a.localeCompare(b),
    )) {
      assign(key, value);
    }
  }

  return out;
}

function buildManualSeedProductMeta(item: ManualSeedProduct): Record<string, unknown> {
  return {
    sources: item.sources ?? [],
    source_notes: item.source_notes ?? null,
    curated_rank: item.curated_rank ?? null,
    model: item.model ?? null,
    model_number: item.model_number ?? null,
    identifiers: buildManualSeedProductIdentifierMap(item),
  };
}

async function getLatestSnapshots(params: {
  sourceId: string;
  entityType: ManualSeedEntityType;
}): Promise<LatestSnapshotRow[]> {
  const rows = await db
    .select({
      entityId: ingestionEntities.id,
      sourceEntityId: ingestionEntities.sourceEntityId,
      rawJson: ingestionEntitySnapshots.rawJson,
      fetchedAt: ingestionEntitySnapshots.fetchedAt,
      createdAt: ingestionEntitySnapshots.createdAt,
    })
    .from(ingestionEntities)
    .innerJoin(
      ingestionEntitySnapshots,
      eq(ingestionEntitySnapshots.entityId, ingestionEntities.id),
    )
    .where(
      and(
        eq(ingestionEntities.sourceId, params.sourceId),
        eq(ingestionEntities.entityType, params.entityType),
      ),
    )
    .orderBy(
      asc(ingestionEntities.id),
      desc(ingestionEntitySnapshots.fetchedAt),
      desc(ingestionEntitySnapshots.createdAt),
    );

  const latestByEntityId = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestByEntityId.has(row.entityId)) {
      latestByEntityId.set(row.entityId, row);
    }
  }

  const latestRows: LatestSnapshotRow[] = [];
  for (const row of latestByEntityId.values()) {
    if (
      !row.rawJson ||
      typeof row.rawJson !== "object" ||
      Array.isArray(row.rawJson)
    ) {
      throw new Error(
        `Expected raw_json object for ${params.entityType}:${row.sourceEntityId}, found ${typeof row.rawJson}`,
      );
    }

    latestRows.push({
      entityId: row.entityId,
      sourceEntityId: row.sourceEntityId,
      rawJson: row.rawJson as Record<string, unknown>,
    });
  }

  return latestRows;
}

function parseSnapshots<T>(params: {
  rows: LatestSnapshotRow[];
  schema: z.ZodSchema<T>;
}): ParsedSnapshot<T>[] {
  return params.rows.map((row) => {
    const parsed = params.schema.parse(row.rawJson);
    return {
      entityId: row.entityId,
      sourceEntityId: row.sourceEntityId,
      payload: parsed,
    };
  });
}

async function upsertCanonicalMapping(params: {
  entityId: string;
  canonicalType: "product" | "plant" | "offer";
  canonicalId: string;
  matchMethod: string;
  confidence: number;
}): Promise<void> {
  await db
    .insert(canonicalEntityMappings)
    .values({
      entityId: params.entityId,
      canonicalType: params.canonicalType,
      canonicalId: params.canonicalId,
      matchMethod: params.matchMethod,
      confidence: params.confidence,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: canonicalEntityMappings.entityId,
      set: {
        canonicalType: params.canonicalType,
        canonicalId: params.canonicalId,
        matchMethod: params.matchMethod,
        confidence: params.confidence,
        updatedAt: new Date(),
      },
    });
}

async function normalizeProductsFromSnapshots(sourceId: string): Promise<{
  stats: NormalizationStats;
  mappingsUpserted: number;
}> {
  const snapshots = parseSnapshots({
    rows: await getLatestSnapshots({ sourceId, entityType: "product" }),
    schema: manualSeedProductSchema,
  });

  const categoryRows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories);
  const brandRows = await db
    .select({ id: brands.id, slug: brands.slug })
    .from(brands);
  const existingProducts = await db
    .select({
      id: products.id,
      slug: products.slug,
      brandId: products.brandId,
      name: products.name,
      meta: products.meta,
    })
    .from(products);
  const existingProductMappings = await db
    .select({
      entityId: canonicalEntityMappings.entityId,
      canonicalId: canonicalEntityMappings.canonicalId,
    })
    .from(canonicalEntityMappings)
    .where(eq(canonicalEntityMappings.canonicalType, "product"));

  const categoryIdBySlug = new Map(
    categoryRows.map((row) => [row.slug, row.id] as const),
  );
  const brandIdBySlug = new Map(
    brandRows.map((row) => [row.slug, row.id] as const),
  );
  const existingProductById = new Map(
    existingProducts.map((row) => [row.id, row] as const),
  );
  const existingCanonicalIdByEntityId = new Map(
    existingProductMappings.map((row) => [row.entityId, row.canonicalId] as const),
  );

  let inserted = 0;
  let updated = 0;
  let mappingsUpserted = 0;

  for (const snapshot of snapshots) {
    const item = snapshot.payload;

    const categoryId = categoryIdBySlug.get(item.category_slug);
    if (!categoryId) {
      throw new Error(
        `Unknown category_slug '${item.category_slug}' for product '${item.slug}'`,
      );
    }

    const brandId = brandIdBySlug.get(item.brand_slug);
    if (!brandId) {
      throw new Error(
        `Unknown brand_slug '${item.brand_slug}' for product '${item.slug}'`,
      );
    }

    const productMeta = buildManualSeedProductMeta(item);

    const match = matchCanonicalProduct({
      existingEntityCanonicalId:
        existingCanonicalIdByEntityId.get(snapshot.entityId) ?? null,
      slug: item.slug,
      sourceEntityId: snapshot.sourceEntityId,
      brandId,
      name: item.name,
      model: item.model ?? null,
      modelNumber: item.model_number ?? null,
      sku: item.sku ?? null,
      upc: item.upc ?? null,
      ean: item.ean ?? null,
      gtin: item.gtin ?? null,
      mpn: item.mpn ?? null,
      asin: item.asin ?? null,
      identifiers: item.identifiers ?? null,
      existingProducts: [...existingProductById.values()],
    });

    let canonicalId = match.canonicalId;
    if (canonicalId) {
      const rows = await db
        .update(products)
        .set({
          categoryId,
          brandId,
          name: item.name,
          slug: item.slug,
          description: item.description ?? null,
          imageUrl: item.image_url ?? null,
          imageUrls: item.image_urls ?? [],
          specs: item.specs,
          meta: productMeta,
          status: "active",
          source: "manual_seed",
          verified: item.verified ?? false,
          updatedAt: new Date(),
        })
        .where(eq(products.id, canonicalId))
        .returning({ id: products.id });

      if (!rows[0]?.id) {
        throw new Error(`Failed to update canonical product '${canonicalId}'`);
      }

      updated += 1;
    } else {
      const rows = await db
        .insert(products)
        .values({
          categoryId,
          brandId,
          name: item.name,
          slug: item.slug,
          description: item.description ?? null,
          imageUrl: item.image_url ?? null,
          imageUrls: item.image_urls ?? [],
          specs: item.specs,
          meta: productMeta,
          status: "active",
          source: "manual_seed",
          verified: item.verified ?? false,
          updatedAt: new Date(),
        })
        .returning({ id: products.id });

      canonicalId = rows[0]?.id;
      if (!canonicalId) {
        throw new Error(`Failed to normalize product '${item.slug}'`);
      }

      inserted += 1;
    }

    existingProductById.set(canonicalId, {
      id: canonicalId,
      slug: item.slug,
      brandId,
      name: item.name,
      meta: productMeta,
    });
    existingCanonicalIdByEntityId.set(snapshot.entityId, canonicalId);

    await upsertCanonicalMapping({
      entityId: snapshot.entityId,
      canonicalType: "product",
      canonicalId,
      matchMethod: match.matchMethod,
      confidence: match.confidence,
    });
    mappingsUpserted += 1;
  }

  return {
    stats: {
      processed: snapshots.length,
      inserted,
      updated,
    },
    mappingsUpserted,
  };
}

async function normalizePlantsFromSnapshots(sourceId: string): Promise<{
  stats: NormalizationStats;
  mappingsUpserted: number;
}> {
  const snapshots = parseSnapshots({
    rows: await getLatestSnapshots({ sourceId, entityType: "plant" }),
    schema: manualSeedPlantSchema,
  });

  const existingPlants = await db
    .select({ id: plants.id, slug: plants.slug })
    .from(plants);
  const existingPlantIdBySlug = new Map(
    existingPlants.map((row) => [row.slug, row.id] as const),
  );

  let inserted = 0;
  let updated = 0;
  let mappingsUpserted = 0;

  for (const snapshot of snapshots) {
    const item = snapshot.payload;
    const wasExisting = existingPlantIdBySlug.has(item.slug);

    const rows = await db
      .insert(plants)
      .values({
        commonName: item.common_name,
        scientificName: item.scientific_name ?? null,
        slug: item.slug,
        family: item.family ?? null,
        description: item.description ?? null,
        imageUrl: item.image_url ?? null,
        imageUrls: item.image_urls ?? [],
        sources: item.sources ?? [],

        difficulty: item.difficulty,
        lightDemand: item.light_demand,
        co2Demand: item.co2_demand,
        growthRate: item.growth_rate ?? null,
        placement: item.placement,

        tempMinF: item.temp_min_f != null ? String(item.temp_min_f) : null,
        tempMaxF: item.temp_max_f != null ? String(item.temp_max_f) : null,
        phMin: item.ph_min != null ? String(item.ph_min) : null,
        phMax: item.ph_max != null ? String(item.ph_max) : null,
        ghMin: item.gh_min ?? null,
        ghMax: item.gh_max ?? null,
        khMin: item.kh_min ?? null,
        khMax: item.kh_max ?? null,

        maxHeightIn:
          item.max_height_in != null ? String(item.max_height_in) : null,
        propagation: item.propagation ?? null,
        substrateType: item.substrate_type ?? null,
        shrimpSafe: item.shrimp_safe,
        beginnerFriendly: item.beginner_friendly,

        nativeRegion: item.native_region ?? null,
        notes: item.notes ?? null,
        status: "active",
        verified: false,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: plants.slug,
        set: {
          commonName: item.common_name,
          scientificName: item.scientific_name ?? null,
          family: item.family ?? null,
          description: item.description ?? null,
          imageUrl: item.image_url ?? null,
          imageUrls: item.image_urls ?? [],
          sources: item.sources ?? [],

          difficulty: item.difficulty,
          lightDemand: item.light_demand,
          co2Demand: item.co2_demand,
          growthRate: item.growth_rate ?? null,
          placement: item.placement,

          tempMinF: item.temp_min_f != null ? String(item.temp_min_f) : null,
          tempMaxF: item.temp_max_f != null ? String(item.temp_max_f) : null,
          phMin: item.ph_min != null ? String(item.ph_min) : null,
          phMax: item.ph_max != null ? String(item.ph_max) : null,
          ghMin: item.gh_min ?? null,
          ghMax: item.gh_max ?? null,
          khMin: item.kh_min ?? null,
          khMax: item.kh_max ?? null,

          maxHeightIn:
            item.max_height_in != null ? String(item.max_height_in) : null,
          propagation: item.propagation ?? null,
          substrateType: item.substrate_type ?? null,
          shrimpSafe: item.shrimp_safe,
          beginnerFriendly: item.beginner_friendly,

          nativeRegion: item.native_region ?? null,
          notes: item.notes ?? null,
          status: "active",
          verified: false,
          updatedAt: new Date(),
        },
      })
      .returning({ id: plants.id });

    const canonicalId = rows[0]?.id ?? existingPlantIdBySlug.get(item.slug);
    if (!canonicalId) {
      throw new Error(`Failed to normalize plant '${item.slug}'`);
    }

    if (wasExisting) {
      updated += 1;
    } else {
      inserted += 1;
      existingPlantIdBySlug.set(item.slug, canonicalId);
    }

    await upsertCanonicalMapping({
      entityId: snapshot.entityId,
      canonicalType: "plant",
      canonicalId,
      matchMethod: "manual_seed_slug",
      confidence: 100,
    });
    mappingsUpserted += 1;
  }

  return {
    stats: {
      processed: snapshots.length,
      inserted,
      updated,
    },
    mappingsUpserted,
  };
}

async function normalizeOffersFromSnapshots(sourceId: string): Promise<{
  stats: NormalizationStats;
  mappingsUpserted: number;
}> {
  const snapshots = parseSnapshots({
    rows: await getLatestSnapshots({ sourceId, entityType: "offer" }),
    schema: manualSeedOfferSchema,
  });

  const productRows = await db
    .select({ id: products.id, slug: products.slug })
    .from(products);
  const retailerRows = await db
    .select({ id: retailers.id, slug: retailers.slug })
    .from(retailers);
  const existingOffers = await db
    .select({
      id: offers.id,
      productId: offers.productId,
      retailerId: offers.retailerId,
    })
    .from(offers);

  const productIdBySlug = new Map(
    productRows.map((row) => [row.slug, row.id] as const),
  );
  const retailerIdBySlug = new Map(
    retailerRows.map((row) => [row.slug, row.id] as const),
  );
  const offerIdByPair = new Map<string, string>(
    existingOffers.map((row) => [
      `${row.productId}::${row.retailerId}`,
      row.id,
    ]),
  );

  let inserted = 0;
  let updated = 0;
  let mappingsUpserted = 0;

  for (const snapshot of snapshots) {
    const item = snapshot.payload;

    const productId = productIdBySlug.get(item.product_slug);
    if (!productId) {
      throw new Error(`Unknown product_slug '${item.product_slug}' for offer`);
    }

    const retailerId = retailerIdBySlug.get(item.retailer_slug);
    if (!retailerId) {
      throw new Error(
        `Unknown retailer_slug '${item.retailer_slug}' for offer`,
      );
    }

    const pairKey = `${productId}::${retailerId}`;
    const existingOfferId = offerIdByPair.get(pairKey);

    let canonicalOfferId: string;
    if (existingOfferId) {
      await db
        .update(offers)
        .set({
          priceCents: item.price_cents ?? null,
          currency: item.currency,
          url: item.url,
          affiliateUrl: item.affiliate_url ?? null,
          inStock: item.in_stock,
          lastCheckedAt: item.last_checked_at
            ? new Date(item.last_checked_at)
            : null,
          updatedAt: new Date(),
        })
        .where(eq(offers.id, existingOfferId));
      canonicalOfferId = existingOfferId;
      updated += 1;
    } else {
      const rows = await db
        .insert(offers)
        .values({
          productId,
          retailerId,
          priceCents: item.price_cents ?? null,
          currency: item.currency,
          url: item.url,
          affiliateUrl: item.affiliate_url ?? null,
          inStock: item.in_stock,
          lastCheckedAt: item.last_checked_at
            ? new Date(item.last_checked_at)
            : null,
          updatedAt: new Date(),
        })
        .returning({ id: offers.id });

      const insertedId = rows[0]?.id;
      if (!insertedId) {
        throw new Error(
          `Failed to insert offer for product '${item.product_slug}' + retailer '${item.retailer_slug}'`,
        );
      }

      canonicalOfferId = insertedId;
      offerIdByPair.set(pairKey, insertedId);
      inserted += 1;
    }

    await upsertCanonicalMapping({
      entityId: snapshot.entityId,
      canonicalType: "offer",
      canonicalId: canonicalOfferId,
      matchMethod: "manual_seed_pair",
      confidence: 100,
    });
    mappingsUpserted += 1;
  }

  return {
    stats: {
      processed: snapshots.length,
      inserted,
      updated,
    },
    mappingsUpserted,
  };
}

export async function normalizeManualSeedSnapshots(params: {
  sourceId: string;
}): Promise<ManualSeedNormalizationSummary> {
  const productsResult = await normalizeProductsFromSnapshots(params.sourceId);
  const plantsResult = await normalizePlantsFromSnapshots(params.sourceId);
  const offersResult = await normalizeOffersFromSnapshots(params.sourceId);

  const totalInserted =
    productsResult.stats.inserted +
    plantsResult.stats.inserted +
    offersResult.stats.inserted;
  const totalUpdated =
    productsResult.stats.updated +
    plantsResult.stats.updated +
    offersResult.stats.updated;

  return {
    products: productsResult.stats,
    plants: plantsResult.stats,
    offers: offersResult.stats,
    mappingsUpserted:
      productsResult.mappingsUpserted +
      plantsResult.mappingsUpserted +
      offersResult.mappingsUpserted,
    totalInserted,
    totalUpdated,
  };
}
