import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { pruneLegacyCatalogRows } from "@/server/catalog/legacy-prune";
import { runCatalogRegressionAudit } from "@/server/catalog/regression-audit";
import { db } from "@/server/db";
import {
  brands,
  categories,
  compatibilityRules,
  offers,
  plants,
  priceHistory,
  products,
  retailers,
} from "@/server/db/schema";
import {
  createManualSeedRun,
  ensureManualSeedSource,
  finishManualSeedRun,
  ingestManualSeedSnapshot,
} from "@/server/ingestion/sources/manual-seed";
import {
  manualSeedOfferSchema as offerSeedSchema,
  manualSeedPlantSchema as plantSeedSchema,
  manualSeedProductSchema as productSeedSchema,
  normalizeManualSeedSnapshots,
} from "@/server/normalization/manual-seed";

const categorySeedSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  display_order: z.number().int().nonnegative(),
  builder_required: z.boolean(),
});

const ruleSeedSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  severity: z.enum(["error", "warning", "recommendation", "completeness"]),
  categories_involved: z.array(z.string().min(1)).min(1),
  condition_logic: z.record(z.string(), z.unknown()),
  message_template: z.string().min(1),
  fix_suggestion: z.string().optional(),
  active: z.boolean().default(true),
  version: z.number().int().positive().default(1),
});

const retailerSeedSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  website_url: z.string().url().optional(),
  logo_url: z.string().url().optional(),
  logo_asset_path: z.string().min(1).optional(),
  priority: z.number().int().optional(),
  affiliate_network: z.string().optional(),
  affiliate_tag: z.string().optional(),
  affiliate_tag_param: z.string().min(1).optional(),
  affiliate_deeplink_template: z.string().min(1).optional(),
  allowed_hosts: z.array(z.string().min(1)).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  active: z.boolean().default(true),
});

function readJson<T>(relPath: string): T {
  const abs = join(process.cwd(), relPath);
  return JSON.parse(readFileSync(abs, "utf8")) as T;
}

async function ingestManualSeedData(productFiles: string[]): Promise<{
  sourceId: string;
  runId: string;
  entitiesTouched: number;
  snapshotsCreated: number;
}> {
  const sourceId = await ensureManualSeedSource();
  const runId = await createManualSeedRun(sourceId);

  let entitiesTouched = 0;
  let snapshotsCreated = 0;

  const maybeLogIngestionProgress = (): void => {
    if (entitiesTouched > 0 && entitiesTouched % 25 === 0) {
      console.log(
        `Seeding: ingestion progress ${entitiesTouched} entities (${snapshotsCreated} new snapshots)...`,
      );
    }
  };

  try {
    for (const relPath of productFiles) {
      const raw = readJson<unknown>(relPath);
      const items = z.array(productSeedSchema).parse(raw);

      for (const item of items) {
        const res = await ingestManualSeedSnapshot({
          sourceId,
          runId,
          entityType: "product",
          sourceEntityId: item.slug,
          raw: item,
        });
        entitiesTouched += 1;
        if (res.snapshotCreated) snapshotsCreated += 1;
        maybeLogIngestionProgress();
      }
    }

    const rawPlants = readJson<unknown>("data/plants.json");
    const plantItems = z.array(plantSeedSchema).parse(rawPlants);
    for (const item of plantItems) {
      const res = await ingestManualSeedSnapshot({
        sourceId,
        runId,
        entityType: "plant",
        sourceEntityId: item.slug,
        raw: item,
      });
      entitiesTouched += 1;
      if (res.snapshotCreated) snapshotsCreated += 1;

      maybeLogIngestionProgress();
    }

    const rawOffers = readJson<unknown>("data/offers.json");
    const offerItems = z.array(offerSeedSchema).parse(rawOffers);
    for (const item of offerItems) {
      const sourceEntityId = `${item.product_slug}::${item.retailer_slug}`;
      const res = await ingestManualSeedSnapshot({
        sourceId,
        runId,
        entityType: "offer",
        sourceEntityId,
        url: item.url,
        raw: item,
      });
      entitiesTouched += 1;
      if (res.snapshotCreated) snapshotsCreated += 1;

      maybeLogIngestionProgress();
    }

    await finishManualSeedRun({
      runId,
      status: "success",
      stats: {
        entitiesTouched,
        snapshotsCreated,
      },
    });
  } catch (error) {
    await finishManualSeedRun({
      runId,
      status: "failed",
      stats: {
        entitiesTouched,
        snapshotsCreated,
      },
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  return { sourceId, runId, entitiesTouched, snapshotsCreated };
}

async function upsertCategories(): Promise<void> {
  const raw = readJson<unknown>("data/categories.json");
  const items = z.array(categorySeedSchema).parse(raw);

  for (const item of items) {
    await db
      .insert(categories)
      .values({
        slug: item.slug,
        name: item.name,
        displayOrder: item.display_order,
        builderRequired: item.builder_required,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: item.name,
          displayOrder: item.display_order,
          builderRequired: item.builder_required,
          updatedAt: new Date(),
        },
      });
  }
}

async function upsertBrandsFromProducts(productFiles: string[]): Promise<void> {
  const seen = new Map<string, string>();

  for (const relPath of productFiles) {
    const raw = readJson<unknown>(relPath);
    const items = z.array(productSeedSchema).parse(raw);
    for (const item of items) {
      if (!seen.has(item.brand_slug))
        seen.set(item.brand_slug, item.brand_name);
    }
  }

  for (const [slug, name] of seen.entries()) {
    await db
      .insert(brands)
      .values({
        slug,
        name,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: brands.slug,
        set: {
          name,
          updatedAt: new Date(),
        },
      });
  }
}

async function upsertRules(): Promise<void> {
  const raw = readJson<unknown>("data/rules.json");
  const items = z.array(ruleSeedSchema).parse(raw);

  for (const item of items) {
    await db
      .insert(compatibilityRules)
      .values({
        code: item.code,
        name: item.name,
        description: item.description ?? null,
        severity: item.severity,
        categoriesInvolved: item.categories_involved,
        conditionLogic: item.condition_logic,
        messageTemplate: item.message_template,
        fixSuggestion: item.fix_suggestion ?? null,
        active: item.active,
        version: item.version,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: compatibilityRules.code,
        set: {
          name: item.name,
          description: item.description ?? null,
          severity: item.severity,
          categoriesInvolved: item.categories_involved,
          conditionLogic: item.condition_logic,
          messageTemplate: item.message_template,
          fixSuggestion: item.fix_suggestion ?? null,
          active: item.active,
          version: item.version,
          updatedAt: new Date(),
        },
      });
  }
}

async function upsertRetailers(): Promise<void> {
  const raw = readJson<unknown>("data/retailers.json");
  const items = z.array(retailerSeedSchema).parse(raw);

  for (const item of items) {
    await db
      .insert(retailers)
      .values({
        slug: item.slug,
        name: item.name,
        websiteUrl: item.website_url ?? null,
        logoUrl: item.logo_url ?? null,
        logoAssetPath: item.logo_asset_path ?? null,
        priority: item.priority ?? 0,
        affiliateNetwork: item.affiliate_network ?? null,
        affiliateTag: item.affiliate_tag ?? null,
        affiliateTagParam: item.affiliate_tag_param ?? "tag",
        affiliateDeeplinkTemplate: item.affiliate_deeplink_template ?? null,
        allowedHosts: item.allowed_hosts ?? [],
        meta: item.meta ?? {},
        active: item.active,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: retailers.slug,
        set: {
          name: item.name,
          websiteUrl: item.website_url ?? null,
          logoUrl: item.logo_url ?? null,
          logoAssetPath: item.logo_asset_path ?? null,
          priority: item.priority ?? 0,
          affiliateNetwork: item.affiliate_network ?? null,
          affiliateTag: item.affiliate_tag ?? null,
          affiliateTagParam: item.affiliate_tag_param ?? "tag",
          affiliateDeeplinkTemplate: item.affiliate_deeplink_template ?? null,
          allowedHosts: item.allowed_hosts ?? [],
          meta: item.meta ?? {},
          active: item.active,
          updatedAt: new Date(),
        },
      });
  }
}

async function backfillInitialPriceHistory(): Promise<void> {
  // Seed at least one price history point per priced offer, but only if it has no history yet.
  const rows = await db
    .select({
      offerId: offers.id,
      priceCents: offers.priceCents,
      inStock: offers.inStock,
    })
    .from(offers)
    .leftJoin(priceHistory, eq(offers.id, priceHistory.offerId))
    .where(and(isNotNull(offers.priceCents), isNull(priceHistory.offerId)))
    .limit(5000);

  for (const row of rows) {
    if (row.priceCents == null) continue;

    await db.insert(priceHistory).values({
      offerId: row.offerId,
      priceCents: row.priceCents,
      inStock: row.inStock,
      recordedAt: new Date(),
    });
  }
}

async function main(): Promise<void> {
  const productFiles = readdirSync(join(process.cwd(), "data/products"))
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => join("data/products", fileName))
    .sort((a, b) => a.localeCompare(b));

  console.log("Seeding: ingestion snapshots (manual_seed source)...");
  const ingestion = await ingestManualSeedData(productFiles);

  console.log("Seeding: categories...");
  await upsertCategories();

  console.log("Seeding: brands...");
  await upsertBrandsFromProducts(productFiles);

  console.log("Seeding: compatibility rules...");
  await upsertRules();

  console.log("Seeding: retailers...");
  await upsertRetailers();

  console.log(
    "Seeding: normalization (products/plants/offers from ingestion snapshots)...",
  );
  const normalization = await normalizeManualSeedSnapshots({
    sourceId: ingestion.sourceId,
  });

  console.log("Seeding: prune legacy non-provenance catalog rows...");
  const legacyCleanup = await pruneLegacyCatalogRows({ database: db });

  console.log("Seeding: regression audit (provenance + placeholders)...");
  const regressionAudit = await runCatalogRegressionAudit(db);
  const provenanceAudit = regressionAudit.provenance;
  if (regressionAudit.hasViolations) {
    throw new Error(
      [
        "Catalog regression audit failed after seed normalization and cleanup.",
        `displayed.products=${provenanceAudit.displayedWithoutProvenance.products}`,
        `displayed.plants=${provenanceAudit.displayedWithoutProvenance.plants}`,
        `displayed.offers=${provenanceAudit.displayedWithoutProvenance.offers}`,
        `displayed.categories=${provenanceAudit.displayedWithoutProvenance.categories}`,
        `buildParts.total=${provenanceAudit.buildPartsReferencingNonProvenance.total}`,
        `placeholder.products=${regressionAudit.placeholders.products.total}`,
        `placeholder.plants=${regressionAudit.placeholders.plants.total}`,
      ].join(" "),
    );
  }

  console.log("Seeding: price history (initial backfill)...");
  await backfillInitialPriceHistory();

  // Avoid spiking pooled connections on low-connection poolers.
  const categoriesCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(categories);
  const brandsCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(brands);
  const productsCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(products);
  const plantsCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(plants);
  const rulesCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(compatibilityRules);
  const retailersCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(retailers);
  const offersCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(offers);
  const priceHistoryCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(priceHistory);

  console.log("Seed complete.");
  console.log(
    JSON.stringify(
      {
        ingestion: {
          sourceId: ingestion.sourceId,
          runId: ingestion.runId,
          entitiesTouched: ingestion.entitiesTouched,
          snapshotsCreated: ingestion.snapshotsCreated,
        },
        normalization: {
          products: normalization.products,
          plants: normalization.plants,
          offers: normalization.offers,
          mappingsUpserted: normalization.mappingsUpserted,
          totalInserted: normalization.totalInserted,
          totalUpdated: normalization.totalUpdated,
        },
        legacyCleanup,
        regressionAudit,
        provenanceAudit,
        categories: categoriesCount[0]?.c,
        brands: brandsCount[0]?.c,
        products: productsCount[0]?.c,
        plants: plantsCount[0]?.c,
        rules: rulesCount[0]?.c,
        retailers: retailersCount[0]?.c,
        offers: offersCount[0]?.c,
        priceHistory: priceHistoryCount[0]?.c,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
