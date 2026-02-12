import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { nanoid } from "nanoid";
import { z } from "zod";

import {
  buildItems,
  builds,
  categories,
  offers,
  plants,
  products,
  retailers,
} from "@/server/db/schema";
import type * as fullSchema from "@/server/db/schema";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/trpc/trpc";
import { getDesignLibraryAssets } from "@/server/visual/design-asset-library";
import {
  DEFAULT_SUBSTRATE_PROFILE,
  normalizeSubstrateProfile,
} from "@/lib/visual/substrate";
import { buildTankIllustrationUrl, tankModelFromSlug } from "@/lib/tank-visual";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  specs: unknown;
  meta: unknown;
  imageUrl: string | null;
  imageUrls: unknown;
};

type OfferRow = {
  offerId: string;
  productId: string;
  priceCents: number | null;
  updatedAt: Date;
  retailer: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    logoAssetPath: string | null;
  };
};

type VisualCanvasItem = {
  id: string;
  assetId: string;
  assetType: "product" | "plant" | "design";
  categorySlug: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  layer: number;
};

const ACTIVE_STATUS = "active" as const;

const canvasItemSchema = z.object({
  id: z.string().min(1).max(200),
  assetId: z.string().uuid(),
  assetType: z.enum(["product", "plant", "design"]),
  categorySlug: z.string().min(1).max(80),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().min(0.1).max(6),
  rotation: z.number().min(-180).max(180),
  layer: z.number().int().min(0).max(5000),
});

const substrateProfileSchema = z.object({
  leftDepthIn: z.number().min(0.2).max(200),
  centerDepthIn: z.number().min(0.2).max(200),
  rightDepthIn: z.number().min(0.2).max(200),
  moundHeightIn: z.number().min(0).max(200),
  moundPosition: z.number().min(0.2).max(0.8),
});

const canvasStateV2Schema = z.object({
  version: z.literal(2),
  widthIn: z.number().positive(),
  heightIn: z.number().positive(),
  depthIn: z.number().positive(),
  substrateProfile: substrateProfileSchema,
  items: z.array(canvasItemSchema).max(500),
});

const canvasStateV1Schema = z.object({
  version: z.literal(1),
  widthIn: z.number().positive(),
  heightIn: z.number().positive(),
  depthIn: z.number().positive(),
  items: z.array(canvasItemSchema).max(500),
});

const canvasStateSchema = z
  .union([canvasStateV2Schema, canvasStateV1Schema])
  .transform((input) => {
    if (input.version === 2) {
      return {
        ...input,
        substrateProfile: normalizeSubstrateProfile(input.substrateProfile, input.heightIn),
      };
    }
    return {
      version: 2 as const,
      widthIn: input.widthIn,
      heightIn: input.heightIn,
      depthIn: input.depthIn,
      items: input.items,
      substrateProfile: normalizeSubstrateProfile(DEFAULT_SUBSTRATE_PROFILE, input.heightIn),
    };
  });

const lineItemSchema = z
  .object({
    categorySlug: z.string().min(1).max(80),
    productId: z.string().uuid().optional(),
    plantId: z.string().uuid().optional(),
    quantity: z.number().int().min(1).max(200).default(1),
    notes: z.string().trim().max(500).optional(),
    selectedOfferId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    const hasProduct = Boolean(value.productId);
    const hasPlant = Boolean(value.plantId);
    if (hasProduct === hasPlant) {
      ctx.addIssue({
        code: "custom",
        message: "Each line item must include either productId or plantId (not both).",
      });
    }
  });

const saveInputSchema = z.object({
  buildId: z.string().uuid().optional(),
  shareSlug: z.string().min(1).max(20).optional(),
  name: z.string().trim().min(1).max(300).default("Visual Build"),
  description: z.string().trim().max(5000).optional(),
  tankId: z.string().uuid(),
  canvasState: canvasStateSchema,
  lineItems: z.array(lineItemSchema).max(500).default([]),
  isPublic: z.boolean().optional(),
  flags: z.record(z.string(), z.unknown()).optional(),
});

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function firstImage(primary: string | null, imageUrls: unknown): string | null {
  const fromList = asArray(imageUrls)
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .find((v) => v.length > 0);
  if (primary && primary.trim()) return primary.trim();
  return fromList ?? null;
}

function firstPlantSourceUrl(sources: unknown): string | null {
  for (const source of asArray(sources)) {
    const row = asRecord(source);
    const url = row.url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return null;
}

function defaultDimensionsForCategory(categorySlug: string): {
  widthIn: number;
  heightIn: number;
  depthIn: number;
} {
  switch (categorySlug) {
    case "hardscape":
      return { widthIn: 7, heightIn: 5, depthIn: 4 };
    case "substrate":
      return { widthIn: 4, heightIn: 4, depthIn: 4 };
    case "co2":
      return { widthIn: 3, heightIn: 10, depthIn: 3 };
    case "filter":
      return { widthIn: 5, heightIn: 8, depthIn: 5 };
    case "light":
      return { widthIn: 18, heightIn: 2, depthIn: 2 };
    case "heater":
      return { widthIn: 2, heightIn: 10, depthIn: 2 };
    case "stand":
      return { widthIn: 24, heightIn: 28, depthIn: 14 };
    case "test_kit":
    case "accessories":
    case "fertilizer":
      return { widthIn: 3, heightIn: 6, depthIn: 3 };
    default:
      return { widthIn: 4, heightIn: 4, depthIn: 4 };
  }
}

function dimensionsFromProduct(categorySlug: string, specs: unknown): {
  widthIn: number;
  heightIn: number;
  depthIn: number;
} {
  const s = asRecord(specs);
  const defaults = defaultDimensionsForCategory(categorySlug);

  const widthIn =
    asNumber(s.length_in) ??
    asNumber(s.width_in) ??
    asNumber(s.tank_length_in) ??
    asNumber(s.max_tank_length_in) ??
    defaults.widthIn;

  const heightIn =
    asNumber(s.height_in) ??
    asNumber(s.max_height_in) ??
    asNumber(s.heater_length_in) ??
    defaults.heightIn;

  const depthIn = asNumber(s.depth_in) ?? asNumber(s.width_in) ?? defaults.depthIn;

  return {
    widthIn: Math.max(1, widthIn),
    heightIn: Math.max(1, heightIn),
    depthIn: Math.max(1, depthIn),
  };
}

function dimensionsFromPlant(plant: {
  maxHeightIn: string | number | null;
}): {
  widthIn: number;
  heightIn: number;
  depthIn: number;
} {
  const h = Math.max(2, asNumber(plant.maxHeightIn) ?? 8);
  return {
    widthIn: Math.max(1.5, h * 0.45),
    heightIn: h,
    depthIn: Math.max(1, h * 0.35),
  };
}

function skuFromProduct(row: ProductRow): string | null {
  const meta = asRecord(row.meta);
  const specs = asRecord(row.specs);
  const candidates = [meta.sku, specs.sku, meta.model_number, specs.model_number];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function defaultScaleForCategory(categorySlug: string): number {
  switch (categorySlug) {
    case "hardscape":
      return 0.9;
    case "plants":
      return 0.65;
    case "substrate":
      return 1;
    case "light":
      return 0.75;
    default:
      return 0.7;
  }
}

function defaultBagVolumeLiters(categorySlug: string, specs: unknown): number | null {
  if (categorySlug !== "substrate") return null;
  const s = asRecord(specs);
  const direct =
    asNumber(s.bag_volume_l) ??
    asNumber(s.bag_size_l) ??
    asNumber(s.pack_volume_l) ??
    asNumber(s.volume_l);
  if (direct != null && direct > 0) return direct;

  const substrateType =
    typeof s.substrate_type === "string" ? s.substrate_type.toLowerCase() : undefined;
  if (substrateType === "active_soil") return 8;
  if (substrateType === "sand") return 9;
  if (substrateType === "inert_gravel") return 8.8;
  return 8;
}

function parseCanvasState(value: unknown): {
  version: 2;
  widthIn: number;
  heightIn: number;
  depthIn: number;
  substrateProfile: z.infer<typeof substrateProfileSchema>;
  items: VisualCanvasItem[];
} {
  const parsed = canvasStateSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  return {
    version: 2,
    widthIn: 24,
    heightIn: 14,
    depthIn: 12,
    substrateProfile: DEFAULT_SUBSTRATE_PROFILE,
    items: [],
  };
}

async function findBestOffers(params: {
  db: PostgresJsDatabase<typeof fullSchema>;
  productIds: string[];
}): Promise<Map<string, OfferRow>> {
  if (params.productIds.length === 0) return new Map();

  const rows = await params.db
    .select({
      offerId: offers.id,
      productId: offers.productId,
      priceCents: offers.priceCents,
      updatedAt: offers.updatedAt,
      retailer: {
        id: retailers.id,
        name: retailers.name,
        slug: retailers.slug,
        logoUrl: retailers.logoUrl,
        logoAssetPath: retailers.logoAssetPath,
      },
    })
    .from(offers)
    .innerJoin(retailers, eq(offers.retailerId, retailers.id))
    .where(
      and(
        inArray(offers.productId, params.productIds),
        eq(offers.inStock, true),
        isNotNull(offers.priceCents),
      ),
    )
    .orderBy(offers.productId, offers.priceCents, desc(offers.updatedAt));

  const bestByProduct = new Map<string, OfferRow>();
  for (const row of rows) {
    if (!bestByProduct.has(row.productId)) {
      bestByProduct.set(row.productId, row);
    }
  }
  return bestByProduct;
}

export const visualBuilderRouter = createTRPCRouter({
  catalog: publicProcedure.query(async ({ ctx }) => {
    const categoryRows = await ctx.db
      .select({ id: categories.id, slug: categories.slug, name: categories.name })
      .from(categories)
      .orderBy(categories.displayOrder, categories.name);

    const productRows = await ctx.db
      .select({
        product: {
          id: products.id,
          name: products.name,
          slug: products.slug,
          specs: products.specs,
          meta: products.meta,
          imageUrl: products.imageUrl,
          imageUrls: products.imageUrls,
        },
        category: {
          id: categories.id,
          slug: categories.slug,
          name: categories.name,
        },
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.status, ACTIVE_STATUS))
      .orderBy(categories.displayOrder, products.name);

    const plantRows = await ctx.db
      .select({
        id: plants.id,
        commonName: plants.commonName,
        slug: plants.slug,
        imageUrl: plants.imageUrl,
        imageUrls: plants.imageUrls,
        difficulty: plants.difficulty,
        lightDemand: plants.lightDemand,
        co2Demand: plants.co2Demand,
        growthRate: plants.growthRate,
        placement: plants.placement,
        tempMinF: plants.tempMinF,
        tempMaxF: plants.tempMaxF,
        phMin: plants.phMin,
        phMax: plants.phMax,
        ghMin: plants.ghMin,
        ghMax: plants.ghMax,
        khMin: plants.khMin,
        khMax: plants.khMax,
        maxHeightIn: plants.maxHeightIn,
        sources: plants.sources,
      })
      .from(plants)
      .where(eq(plants.status, ACTIVE_STATUS))
      .orderBy(plants.commonName);

    const rimlessTanks = productRows.filter((row) => {
      if (row.category.slug !== "tank") return false;
      return asBoolean(asRecord(row.product.specs).rimless) === true;
    });

    const bestOfferByProductId = await findBestOffers({
      db: ctx.db,
      productIds: productRows.map((row) => row.product.id),
    });
    const categoryNameBySlug = new Map(categoryRows.map((row) => [row.slug, row.name] as const));

    const tanks = rimlessTanks.map((row) => {
      const dims = dimensionsFromProduct("tank", row.product.specs);
      const bestOffer = bestOfferByProductId.get(row.product.id) ?? null;
      const label = tankModelFromSlug(row.product.slug) ?? "UNS";
      return {
        id: row.product.id,
        name: row.product.name,
        slug: row.product.slug,
        widthIn: dims.widthIn,
        heightIn: dims.heightIn,
        depthIn: dims.depthIn,
        imageUrl: buildTankIllustrationUrl({
          lengthIn: dims.widthIn,
          widthIn: dims.depthIn,
          heightIn: dims.heightIn,
          label,
        }),
        priceCents: bestOffer?.priceCents ?? null,
        offerId: bestOffer?.offerId ?? null,
        goUrl: bestOffer ? `/go/${bestOffer.offerId}` : null,
        purchaseUrl: bestOffer ? `/go/${bestOffer.offerId}` : null,
        sku: skuFromProduct(row.product),
        specs: asRecord(row.product.specs),
      };
    });

    const productAssets = productRows
      .filter((row) => row.category.slug !== "tank")
      .map((row) => {
        const dims = dimensionsFromProduct(row.category.slug, row.product.specs);
        const bestOffer = bestOfferByProductId.get(row.product.id) ?? null;
        const linkedOfferUrl = bestOffer ? `/go/${bestOffer.offerId}` : null;
        return {
          id: row.product.id,
          type: "product" as const,
          sourceMode: "catalog_product" as const,
          name: row.product.name,
          slug: row.product.slug,
          categorySlug: row.category.slug,
          categoryName: row.category.name,
          imageUrl: firstImage(row.product.imageUrl, row.product.imageUrls),
          widthIn: dims.widthIn,
          heightIn: dims.heightIn,
          depthIn: dims.depthIn,
          defaultScale: defaultScaleForCategory(row.category.slug),
          sku: skuFromProduct(row.product),
          priceCents: bestOffer?.priceCents ?? null,
          estimatedUnitPriceCents: null,
          offerId: bestOffer?.offerId ?? null,
          goUrl: linkedOfferUrl,
          purchaseUrl: linkedOfferUrl,
          retailerLinks: linkedOfferUrl
            ? [
                {
                  label: `Buy from ${bestOffer?.retailer.name ?? "retailer"}`,
                  url: linkedOfferUrl,
                  retailerSlug: bestOffer?.retailer.slug ?? undefined,
                },
              ]
            : [],
          materialType: null,
          tags: [],
          bagVolumeLiters: defaultBagVolumeLiters(row.category.slug, row.product.specs),
          specs: asRecord(row.product.specs),
          plantProfile: null,
        };
      });

    const plantAssets = plantRows.map((row) => {
      const dims = dimensionsFromPlant({ maxHeightIn: row.maxHeightIn });
      const purchaseUrl = firstPlantSourceUrl(row.sources) ?? `/plants/${row.slug}`;
      return {
        id: row.id,
        type: "plant" as const,
        sourceMode: "catalog_plant" as const,
        name: row.commonName,
        slug: row.slug,
        categorySlug: "plants",
        categoryName: "Plants",
        imageUrl: firstImage(row.imageUrl, row.imageUrls),
        widthIn: dims.widthIn,
        heightIn: dims.heightIn,
        depthIn: dims.depthIn,
        defaultScale: defaultScaleForCategory("plants"),
        sku: null,
        priceCents: null,
        estimatedUnitPriceCents: null,
        offerId: null,
        goUrl: null,
        purchaseUrl,
        retailerLinks: purchaseUrl
          ? [
              {
                label: "Shop similar plants",
                url: purchaseUrl,
              },
            ]
          : [],
        materialType: null,
        tags: [],
        bagVolumeLiters: null,
        specs: null,
        plantProfile: {
          difficulty: row.difficulty,
          lightDemand: row.lightDemand,
          co2Demand: row.co2Demand,
          growthRate: row.growthRate,
          placement: row.placement,
          tempMinF: asNumber(row.tempMinF),
          tempMaxF: asNumber(row.tempMaxF),
          phMin: asNumber(row.phMin),
          phMax: asNumber(row.phMax),
          ghMin: row.ghMin,
          ghMax: row.ghMax,
          khMin: row.khMin,
          khMax: row.khMax,
          maxHeightIn: asNumber(row.maxHeightIn),
        },
      };
    });

    const designAssets = getDesignLibraryAssets().map((asset) => ({
      id: asset.id,
      type: "design" as const,
      sourceMode: "design_archetype" as const,
      name: asset.name,
      slug: asset.slug,
      categorySlug: asset.categorySlug,
      categoryName: categoryNameBySlug.get(asset.categorySlug) ?? asset.categoryName,
      imageUrl: asset.imageUrl ?? null,
      widthIn: asset.widthIn,
      heightIn: asset.heightIn,
      depthIn: asset.depthIn,
      defaultScale: asset.defaultScale,
      sku: null,
      priceCents: null,
      estimatedUnitPriceCents: asset.estimatedUnitPriceCents ?? null,
      offerId: null,
      goUrl: null,
      purchaseUrl: asset.retailerLinks[0]?.url ?? null,
      retailerLinks: asset.retailerLinks,
      materialType: asset.materialType ?? null,
      tags: asset.tags,
      bagVolumeLiters: null,
      specs: {
        material_type: asset.materialType ?? null,
        source_mode: "design_archetype",
      },
      plantProfile: null,
    }));

    return {
      tanks,
      categories: categoryRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
      })),
      assets: [...productAssets, ...plantAssets, ...designAssets],
      updatedAt: new Date().toISOString(),
    };
  }),

  getByShareSlug: publicProcedure
    .input(z.object({ shareSlug: z.string().min(1).max(20) }))
    .query(async ({ ctx, input }) => {
      const buildRows = await ctx.db
        .select({
          id: builds.id,
          userId: builds.userId,
          name: builds.name,
          description: builds.description,
          shareSlug: builds.shareSlug,
          isPublic: builds.isPublic,
          tankId: builds.tankId,
          canvasState: builds.canvasState,
          flags: builds.flags,
          totalPriceCents: builds.totalPriceCents,
          itemCount: builds.itemCount,
          updatedAt: builds.updatedAt,
        })
        .from(builds)
        .where(eq(builds.shareSlug, input.shareSlug))
        .limit(1);

      const build = buildRows[0];
      if (!build) throw new TRPCError({ code: "NOT_FOUND" });
      const requesterUserId = ctx.session?.user?.id ?? null;
      if (!build.isPublic && (!requesterUserId || build.userId !== requesterUserId)) {
        // Avoid leaking private build existence through share-slug probing.
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const itemRows = await ctx.db
        .select({
          itemId: buildItems.id,
          categorySlug: categories.slug,
          categoryName: categories.name,
          quantity: buildItems.quantity,
          notes: buildItems.notes,
          selectedOfferId: buildItems.selectedOfferId,
          product: {
            id: products.id,
            name: products.name,
            slug: products.slug,
          },
          plant: {
            id: plants.id,
            commonName: plants.commonName,
            slug: plants.slug,
          },
        })
        .from(buildItems)
        .innerJoin(categories, eq(buildItems.categoryId, categories.id))
        .leftJoin(products, eq(buildItems.productId, products.id))
        .leftJoin(plants, eq(buildItems.plantId, plants.id))
        .where(eq(buildItems.buildId, build.id));

      return {
        build,
        initialState: {
          buildId: build.id,
          shareSlug: build.shareSlug,
          name: build.name,
          description: build.description,
          isPublic: build.isPublic,
          tankId: build.tankId,
          canvasState: parseCanvasState(build.canvasState),
          flags: asRecord(build.flags),
          lineItems: itemRows.map((row) => ({
            id: row.itemId,
            categorySlug: row.categorySlug,
            categoryName: row.categoryName,
            quantity: row.quantity,
            notes: row.notes,
            selectedOfferId: row.selectedOfferId,
            product: row.product?.id
              ? {
                  id: row.product.id,
                  name: row.product.name ?? "",
                  slug: row.product.slug ?? "",
                }
              : null,
            plant: row.plant?.id
              ? {
                  id: row.plant.id,
                  commonName: row.plant.commonName ?? "",
                  slug: row.plant.slug ?? "",
                }
              : null,
          })),
        },
      };
    }),

  save: publicProcedure.input(saveInputSchema).mutation(async ({ ctx, input }) => {
    return ctx.db.transaction(async (tx) => {
      const userId = ctx.session?.user?.id ?? null;

      const categoryRows = await tx
        .select({ id: categories.id, slug: categories.slug })
        .from(categories);
      const categoryIdBySlug = new Map(categoryRows.map((row) => [row.slug, row.id] as const));

      const tankRows = await tx
        .select({
          id: products.id,
          categorySlug: categories.slug,
          status: products.status,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.id, input.tankId))
        .limit(1);

      const tank = tankRows[0];
      if (!tank || tank.categorySlug !== "tank" || tank.status !== ACTIVE_STATUS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please choose a valid active rimless tank before saving.",
        });
      }

      let buildId = input.buildId ?? null;
      let shareSlug = input.shareSlug ?? null;
      let existingPublic = false;
      let ownerUserId: string | null = userId;

      if (buildId) {
        const existing = await tx
          .select({
            id: builds.id,
            userId: builds.userId,
            shareSlug: builds.shareSlug,
            isPublic: builds.isPublic,
          })
          .from(builds)
          .where(eq(builds.id, buildId))
          .limit(1);

        const row = existing[0];
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        if (row.userId && row.userId !== userId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        shareSlug = row.shareSlug;
        existingPublic = row.isPublic;
        ownerUserId = row.userId ?? userId ?? null;
      }

      if (!buildId && shareSlug) {
        const existingByShare = await tx
          .select({
            id: builds.id,
            userId: builds.userId,
            isPublic: builds.isPublic,
          })
          .from(builds)
          .where(eq(builds.shareSlug, shareSlug))
          .limit(1);

        const row = existingByShare[0];
        if (row) {
          if (row.userId && row.userId !== userId) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
          buildId = row.id;
          existingPublic = row.isPublic;
          ownerUserId = row.userId ?? userId ?? null;
        }
      }

      if (!buildId) {
        shareSlug = shareSlug ?? nanoid(10);
        const created = await tx
          .insert(builds)
          .values({
            userId: ownerUserId,
            name: input.name,
            description: input.description ?? null,
            shareSlug,
            style: "visual-v1",
            tankId: input.tankId,
            canvasState: input.canvasState,
            flags: input.flags ?? {},
            isPublic: input.isPublic ?? false,
            isCompleted: true,
            totalPriceCents: 0,
            itemCount: 0,
            warningsCount: 0,
            errorsCount: 0,
            updatedAt: new Date(),
          })
          .returning({ id: builds.id, shareSlug: builds.shareSlug, isPublic: builds.isPublic });

        buildId = created[0]?.id ?? null;
        shareSlug = created[0]?.shareSlug ?? null;
        existingPublic = created[0]?.isPublic ?? false;
      }

      if (!buildId || !shareSlug) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to save visual build.",
        });
      }

      const productIds = input.lineItems
        .map((item) => item.productId)
        .filter((id): id is string => Boolean(id));
      const uniqueProductIds = Array.from(new Set(productIds));

      const productRows = uniqueProductIds.length
        ? await tx
            .select({
              id: products.id,
              categoryId: products.categoryId,
              status: products.status,
            })
            .from(products)
            .where(inArray(products.id, uniqueProductIds))
        : [];
      const productsById = new Map(productRows.map((row) => [row.id, row] as const));

      const plantIds = input.lineItems
        .map((item) => item.plantId)
        .filter((id): id is string => Boolean(id));
      const uniquePlantIds = Array.from(new Set(plantIds));

      const plantRows = uniquePlantIds.length
        ? await tx
            .select({ id: plants.id, status: plants.status })
            .from(plants)
            .where(inArray(plants.id, uniquePlantIds))
        : [];
      const plantsById = new Map(plantRows.map((row) => [row.id, row] as const));

      const bestOfferByProduct = await findBestOffers({ db: tx, productIds: uniqueProductIds });

      const selectedOfferIds = input.lineItems
        .map((item) => item.selectedOfferId)
        .filter((id): id is string => Boolean(id));
      const selectedOfferRows = selectedOfferIds.length
        ? await tx
            .select({
              id: offers.id,
              productId: offers.productId,
              priceCents: offers.priceCents,
              inStock: offers.inStock,
            })
            .from(offers)
            .where(inArray(offers.id, selectedOfferIds))
        : [];
      const selectedOfferById = new Map(selectedOfferRows.map((row) => [row.id, row] as const));

      let totalPriceCents = 0;
      const lineRows: Array<{
        buildId: string;
        categoryId: string;
        productId: string | null;
        plantId: string | null;
        quantity: number;
        notes: string | null;
        selectedOfferId: string | null;
      }> = [];

      for (const item of input.lineItems) {
        const categoryId = categoryIdBySlug.get(item.categorySlug);
        if (!categoryId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Unknown category slug '${item.categorySlug}'.`,
          });
        }

        if (item.productId) {
          const product = productsById.get(item.productId);
          if (!product || product.status !== ACTIVE_STATUS) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "One or more selected products are not active.",
            });
          }
          if (product.categoryId !== categoryId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Product category mismatch for '${item.categorySlug}'.`,
            });
          }

          let linePrice = 0;
          let selectedOfferId: string | null = null;

          if (item.selectedOfferId) {
            const selectedOffer = selectedOfferById.get(item.selectedOfferId);
            if (
              selectedOffer &&
              selectedOffer.productId === item.productId &&
              selectedOffer.inStock === true &&
              selectedOffer.priceCents != null
            ) {
              linePrice = selectedOffer.priceCents;
              selectedOfferId = selectedOffer.id;
            }
          }

          if (!linePrice) {
            const best = bestOfferByProduct.get(item.productId);
            if (best?.priceCents != null) {
              linePrice = best.priceCents;
              selectedOfferId = best.offerId;
            }
          }

          totalPriceCents += linePrice * item.quantity;

          lineRows.push({
            buildId,
            categoryId,
            productId: item.productId,
            plantId: null,
            quantity: item.quantity,
            notes: item.notes ?? null,
            selectedOfferId,
          });

          continue;
        }

        if (item.plantId) {
          const plant = plantsById.get(item.plantId);
          if (!plant || plant.status !== ACTIVE_STATUS) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "One or more selected plants are not active.",
            });
          }

          lineRows.push({
            buildId,
            categoryId,
            productId: null,
            plantId: item.plantId,
            quantity: item.quantity,
            notes: item.notes ?? null,
            selectedOfferId: null,
          });
        }
      }

      await tx.delete(buildItems).where(eq(buildItems.buildId, buildId));
      if (lineRows.length > 0) {
        await tx.insert(buildItems).values(lineRows);
      }

      const itemCount = lineRows.reduce((sum, row) => sum + row.quantity, 0);
      const nextPublic = input.isPublic ?? existingPublic;

      await tx
        .update(builds)
        .set({
          userId: ownerUserId,
          name: input.name,
          description: input.description ?? null,
          style: "visual-v1",
          tankId: input.tankId,
          canvasState: input.canvasState,
          flags: input.flags ?? {},
          isPublic: nextPublic,
          isCompleted: true,
          itemCount,
          totalPriceCents,
          updatedAt: new Date(),
        })
        .where(eq(builds.id, buildId));

      return {
        buildId,
        shareSlug,
        isPublic: nextPublic,
        itemCount,
        totalPriceCents,
      };
    });
  }),

  duplicatePublic: protectedProcedure
    .input(z.object({ shareSlug: z.string().min(1).max(20) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const sourceRows = await tx
          .select({
            id: builds.id,
            name: builds.name,
            description: builds.description,
            style: builds.style,
            tankId: builds.tankId,
            canvasState: builds.canvasState,
            flags: builds.flags,
            totalPriceCents: builds.totalPriceCents,
            itemCount: builds.itemCount,
            warningsCount: builds.warningsCount,
            errorsCount: builds.errorsCount,
          })
          .from(builds)
          .where(and(eq(builds.shareSlug, input.shareSlug), eq(builds.isPublic, true)))
          .limit(1);

        const source = sourceRows[0];
        if (!source) throw new TRPCError({ code: "NOT_FOUND" });

        const shareSlug = nanoid(10);
        const created = await tx
          .insert(builds)
          .values({
            userId: ctx.session.user.id,
            name: `${source.name} (Copy)`,
            description: source.description,
            shareSlug,
            style: source.style ?? "visual-v1",
            tankId: source.tankId,
            canvasState: source.canvasState,
            flags: source.flags ?? {},
            isPublic: false,
            isCompleted: true,
            totalPriceCents: source.totalPriceCents,
            itemCount: source.itemCount,
            warningsCount: source.warningsCount,
            errorsCount: source.errorsCount,
            updatedAt: new Date(),
          })
          .returning({ id: builds.id, shareSlug: builds.shareSlug });

        const newBuildId = created[0]?.id;
        const newShareSlug = created[0]?.shareSlug;
        if (!newBuildId || !newShareSlug) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to duplicate build.",
          });
        }

        const sourceItems = await tx
          .select({
            categoryId: buildItems.categoryId,
            productId: buildItems.productId,
            plantId: buildItems.plantId,
            quantity: buildItems.quantity,
            notes: buildItems.notes,
            selectedOfferId: buildItems.selectedOfferId,
          })
          .from(buildItems)
          .where(eq(buildItems.buildId, source.id));

        if (sourceItems.length > 0) {
          await tx.insert(buildItems).values(
            sourceItems.map((item) => ({
              buildId: newBuildId,
              categoryId: item.categoryId,
              productId: item.productId,
              plantId: item.plantId,
              quantity: item.quantity,
              notes: item.notes,
              selectedOfferId: item.selectedOfferId,
            })),
          );
        }

        return {
          buildId: newBuildId,
          shareSlug: newShareSlug,
        };
      });
    }),
});
