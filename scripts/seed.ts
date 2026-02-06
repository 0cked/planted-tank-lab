import { readFileSync } from "node:fs";
import { join } from "node:path";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import {
  brands,
  categories,
  compatibilityRules,
  offers,
  plants,
  products,
  retailers,
} from "@/server/db/schema";

const categorySeedSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  display_order: z.number().int().nonnegative(),
  builder_required: z.boolean(),
});

const productSeedSchema = z.object({
  category_slug: z.string().min(1),
  brand_slug: z.string().min(1),
  brand_name: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  specs: z.record(z.string(), z.unknown()),
});

const plantSeedSchema = z.object({
  common_name: z.string().min(1),
  scientific_name: z.string().optional(),
  slug: z.string().min(1),
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
  affiliate_network: z.string().optional(),
  affiliate_tag: z.string().optional(),
  active: z.boolean().default(true),
});

const offerSeedSchema = z.object({
  product_slug: z.string().min(1),
  retailer_slug: z.string().min(1),
  price_cents: z.number().int().nonnegative().optional(),
  currency: z.string().min(3).max(3).default("USD"),
  url: z.string().url(),
  in_stock: z.boolean().default(true),
});

function readJson<T>(relPath: string): T {
  const abs = join(process.cwd(), relPath);
  return JSON.parse(readFileSync(abs, "utf8")) as T;
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
      if (!seen.has(item.brand_slug)) seen.set(item.brand_slug, item.brand_name);
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

async function upsertProducts(productFiles: string[]): Promise<void> {
  const categoryRows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories);
  const brandRows = await db.select({ id: brands.id, slug: brands.slug }).from(brands);

  const categoryIdBySlug = new Map(categoryRows.map((r) => [r.slug, r.id] as const));
  const brandIdBySlug = new Map(brandRows.map((r) => [r.slug, r.id] as const));

  for (const relPath of productFiles) {
    const raw = readJson<unknown>(relPath);
    const items = z.array(productSeedSchema).parse(raw);

    for (const item of items) {
      const categoryId = categoryIdBySlug.get(item.category_slug);
      const brandId = brandIdBySlug.get(item.brand_slug);
      if (!categoryId) {
        throw new Error(
          `Unknown category_slug '${item.category_slug}' for product '${item.slug}'`,
        );
      }
      if (!brandId) {
        throw new Error(
          `Unknown brand_slug '${item.brand_slug}' for product '${item.slug}' (did brands seed run?)`,
        );
      }

      await db
        .insert(products)
        .values({
          categoryId,
          brandId,
          name: item.name,
          slug: item.slug,
          description: item.description ?? null,
          specs: item.specs,
          meta: {},
          status: "active",
          source: "manual",
          verified: false,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: products.slug,
          set: {
            categoryId,
            brandId,
            name: item.name,
            description: item.description ?? null,
            specs: item.specs,
            meta: {},
            status: "active",
            source: "manual",
            verified: false,
            updatedAt: new Date(),
          },
        });
    }
  }
}

async function upsertPlants(): Promise<void> {
  const raw = readJson<unknown>("data/plants.json");
  const items = z.array(plantSeedSchema).parse(raw);

  for (const item of items) {
    await db
      .insert(plants)
      .values({
        commonName: item.common_name,
        scientificName: item.scientific_name ?? null,
        slug: item.slug,
        description: item.description ?? null,

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

        maxHeightIn: item.max_height_in != null ? String(item.max_height_in) : null,
        propagation: item.propagation ?? null,
        substrateType: item.substrate_type ?? null,
        shrimpSafe: item.shrimp_safe,
        beginnerFriendly: item.beginner_friendly,

        status: "active",
        verified: false,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: plants.slug,
        set: {
          commonName: item.common_name,
          scientificName: item.scientific_name ?? null,
          description: item.description ?? null,

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

          status: "active",
          verified: false,
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
        affiliateNetwork: item.affiliate_network ?? null,
        affiliateTag: item.affiliate_tag ?? null,
        active: item.active,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: retailers.slug,
        set: {
          name: item.name,
          websiteUrl: item.website_url ?? null,
          logoUrl: item.logo_url ?? null,
          affiliateNetwork: item.affiliate_network ?? null,
          affiliateTag: item.affiliate_tag ?? null,
          active: item.active,
          updatedAt: new Date(),
        },
      });
  }
}

async function upsertOffers(): Promise<void> {
  const raw = readJson<unknown>("data/offers.json");
  const items = z.array(offerSeedSchema).parse(raw);

  const productRows = await db.select({ id: products.id, slug: products.slug }).from(products);
  const retailerRows = await db
    .select({ id: retailers.id, slug: retailers.slug })
    .from(retailers);

  const productIdBySlug = new Map(productRows.map((r) => [r.slug, r.id] as const));
  const retailerIdBySlug = new Map(retailerRows.map((r) => [r.slug, r.id] as const));

  for (const item of items) {
    const productId = productIdBySlug.get(item.product_slug);
    if (!productId) throw new Error(`Unknown product_slug '${item.product_slug}' for offer`);
    const retailerId = retailerIdBySlug.get(item.retailer_slug);
    if (!retailerId) throw new Error(`Unknown retailer_slug '${item.retailer_slug}' for offer`);

    // One offer per (product, retailer) for now.
    const existing = await db
      .select({ id: offers.id })
      .from(offers)
      .where(and(eq(offers.productId, productId), eq(offers.retailerId, retailerId)))
      .limit(1);

    if (existing[0]?.id) {
      await db
        .update(offers)
        .set({
          priceCents: item.price_cents ?? null,
          currency: item.currency,
          url: item.url,
          inStock: item.in_stock,
          updatedAt: new Date(),
        })
        .where(eq(offers.id, existing[0].id));
    } else {
      await db.insert(offers).values({
        productId,
        retailerId,
        priceCents: item.price_cents ?? null,
        currency: item.currency,
        url: item.url,
        affiliateUrl: null,
        inStock: item.in_stock,
        updatedAt: new Date(),
      });
    }
  }
}

async function main(): Promise<void> {
  const productFiles = [
    "data/products/tanks.json",
    "data/products/lights.json",
  ];

  console.log("Seeding: categories...");
  await upsertCategories();

  console.log("Seeding: brands...");
  await upsertBrandsFromProducts(productFiles);

  console.log("Seeding: products...");
  await upsertProducts(productFiles);

  console.log("Seeding: plants...");
  await upsertPlants();

  console.log("Seeding: compatibility rules...");
  await upsertRules();

  console.log("Seeding: retailers...");
  await upsertRetailers();

  console.log("Seeding: offers...");
  await upsertOffers();

  const counts = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(categories),
    db.select({ c: sql<number>`count(*)::int` }).from(brands),
    db.select({ c: sql<number>`count(*)::int` }).from(products),
    db.select({ c: sql<number>`count(*)::int` }).from(plants),
    db.select({ c: sql<number>`count(*)::int` }).from(compatibilityRules),
    db.select({ c: sql<number>`count(*)::int` }).from(retailers),
    db.select({ c: sql<number>`count(*)::int` }).from(offers),
  ]);

  console.log("Seed complete.");
  console.log(
    JSON.stringify(
      {
        categories: counts[0][0]?.c,
        brands: counts[1][0]?.c,
        products: counts[2][0]?.c,
        plants: counts[3][0]?.c,
        rules: counts[4][0]?.c,
        retailers: counts[5][0]?.c,
        offers: counts[6][0]?.c,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
