import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, inArray, isNotNull, ne, sql } from "drizzle-orm";

import { buildItems, brands, categories, products } from "@/server/db/schema";
import { createTRPCRouter, publicProcedure } from "@/server/trpc/trpc";
import {
  buildTankIllustrationUrl,
  getTankVisualDimensions,
  tankModelFromSlug,
} from "@/lib/tank-visual";

const ACTIVE_PRODUCT_STATUS = "active" as const;
const NON_PRODUCTION_CATEGORY_PATTERN = "(^|[^a-z])(vitest|test)([^a-z]|$)";
const productionCategoryGuard = sql`${categories.slug} !~* ${NON_PRODUCTION_CATEGORY_PATTERN} and ${categories.name} !~* ${NON_PRODUCTION_CATEGORY_PATTERN}`;

type ProductLike = {
  slug: string;
  specs: unknown;
  imageUrl: string | null;
  imageUrls: unknown;
};

function withTankPrimaryImage<T extends ProductLike>(product: T, categorySlug: string): T {
  if (categorySlug !== "tank") return product;

  const dims = getTankVisualDimensions(product.specs);
  if (!dims) return product;

  const label = tankModelFromSlug(product.slug) ?? "UNS";
  return {
    ...product,
    imageUrl: buildTankIllustrationUrl({
      lengthIn: dims.lengthIn,
      widthIn: dims.widthIn,
      heightIn: dims.heightIn,
      label,
    }),
    imageUrls: [],
  };
}

export const productsRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      return ctx.db
        .select()
        .from(products)
        .where(eq(products.status, ACTIVE_PRODUCT_STATUS))
        .limit(limit);
    }),

  categoriesList: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(categories)
      .where(productionCategoryGuard)
      .orderBy(categories.displayOrder, categories.name);
  }),

  categoryBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(50) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(categories)
        .where(and(eq(categories.slug, input.slug), productionCategoryGuard))
        .limit(1);
      return rows[0] ?? null;
    }),

  brandsByCategorySlug: publicProcedure
    .input(z.object({ categorySlug: z.string().min(1).max(50) }))
    .query(async ({ ctx, input }) => {
      const cat = await ctx.db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.slug, input.categorySlug), productionCategoryGuard))
        .limit(1);
      const categoryId = cat[0]?.id;
      if (!categoryId) return [];
      const restrictToActive = input.categorySlug !== "tank";

      // Distinct brands used in this category.
      const rows = await ctx.db
        .selectDistinct({
          id: brands.id,
          name: brands.name,
          slug: brands.slug,
        })
        .from(products)
        .innerJoin(brands, eq(products.brandId, brands.id))
        .where(
          and(
            eq(products.categoryId, categoryId),
            restrictToActive ? eq(products.status, ACTIVE_PRODUCT_STATUS) : undefined,
            isNotNull(products.brandId),
          ),
        )
        .orderBy(brands.name);

      return rows;
    }),

  listByCategorySlug: publicProcedure
    .input(
      z.object({
        categorySlug: z.string().min(1),
        limit: z.number().int().min(1).max(200).default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const categoryRow = await ctx.db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.slug, input.categorySlug), productionCategoryGuard))
        .limit(1);

      const categoryId = categoryRow[0]?.id;
      if (!categoryId) return [];
      const restrictToActive = input.categorySlug !== "tank";

      const rows = await ctx.db
        .select({
          product: products,
          brand: brands,
        })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(
          and(
            eq(products.categoryId, categoryId),
            restrictToActive ? eq(products.status, ACTIVE_PRODUCT_STATUS) : undefined,
          ),
        )
        .orderBy(products.name)
        .limit(input.limit);

      return rows.map((r) => ({
        ...withTankPrimaryImage(r.product, input.categorySlug),
        brand: r.brand,
      }));
    }),

  search: publicProcedure
    .input(
      z.object({
        categorySlug: z.string().min(1).max(50),
        q: z.string().trim().min(1).max(200).optional(),
        brandSlug: z.string().trim().min(1).max(200).optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const categoryRow = await ctx.db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.slug, input.categorySlug), productionCategoryGuard))
        .limit(1);

      const categoryId = categoryRow[0]?.id;
      if (!categoryId) return [];
      const restrictToActive = input.categorySlug !== "tank";

      const where = and(
        eq(products.categoryId, categoryId),
        restrictToActive ? eq(products.status, ACTIVE_PRODUCT_STATUS) : undefined,
        input.q ? ilike(products.name, `%${input.q}%`) : undefined,
        input.brandSlug ? eq(brands.slug, input.brandSlug) : undefined,
      );

      const rows = await ctx.db
        .select({
          product: products,
          brand: brands,
        })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(where)
        .orderBy(products.name)
        .limit(input.limit);

      return rows.map((r) => ({
        ...withTankPrimaryImage(r.product, input.categorySlug),
        brand: r.brand,
      }));
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(500) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          product: products,
          brand: brands,
          category: categories,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(eq(products.slug, input.slug))
        .limit(1);

      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.category.slug !== "tank" && row.product.status !== ACTIVE_PRODUCT_STATUS) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        ...withTankPrimaryImage(row.product, row.category.slug),
        brand: row.brand,
        category: row.category,
      };
    }),

  worksWellWith: publicProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        limit: z.number().int().min(1).max(12).default(6),
      }),
    )
    .query(async ({ ctx, input }) => {
      // 1) Find builds that include this product.
      const buildIdRows = await ctx.db
        .select({ buildId: buildItems.buildId })
        .from(buildItems)
        .where(eq(buildItems.productId, input.productId))
        .limit(500);

      const buildIds = Array.from(new Set(buildIdRows.map((r) => r.buildId)));
      if (buildIds.length === 0) return [];

      // 2) Count other products that co-occur in those builds.
      const counts = await ctx.db
        .select({
          productId: buildItems.productId,
          uses: sql<number>`count(*)`.mapWith(Number),
        })
        .from(buildItems)
        .where(
          and(
            inArray(buildItems.buildId, buildIds),
            isNotNull(buildItems.productId),
            ne(buildItems.productId, input.productId),
          ),
        )
        .groupBy(buildItems.productId)
        .orderBy(desc(sql<number>`count(*)`))
        .limit(input.limit);

      const ids = counts
        .map((c) => c.productId)
        .filter((id): id is string => typeof id === "string");
      if (ids.length === 0) return [];

      const rows = await ctx.db
        .select({
          product: products,
          category: categories,
          brand: brands,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(
          and(
            inArray(products.id, ids),
            eq(products.status, ACTIVE_PRODUCT_STATUS),
          ),
        )
        .limit(input.limit);

      const usesById = new Map(
        counts
          .filter((c): c is { productId: string; uses: number } => typeof c.productId === "string")
          .map((c) => [c.productId, c.uses] as const),
      );

      return rows
        .map((r) => ({
          ...withTankPrimaryImage(r.product, r.category.slug),
          category: { slug: r.category.slug, name: r.category.name },
          brand: r.brand ? { slug: r.brand.slug, name: r.brand.name } : null,
          uses: usesById.get(r.product.id) ?? 0,
        }))
        .sort((a, b) => (b.uses - a.uses) || a.name.localeCompare(b.name));
    }),
});
