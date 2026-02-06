import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, ilike, isNotNull } from "drizzle-orm";

import { brands, categories, products } from "@/server/db/schema";
import { createTRPCRouter, publicProcedure } from "@/server/trpc/trpc";

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
      return ctx.db.select().from(products).limit(limit);
    }),

  categoriesList: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(categories)
      .orderBy(categories.displayOrder, categories.name);
  }),

  categoryBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(50) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(categories)
        .where(eq(categories.slug, input.slug))
        .limit(1);
      return rows[0] ?? null;
    }),

  brandsByCategorySlug: publicProcedure
    .input(z.object({ categorySlug: z.string().min(1).max(50) }))
    .query(async ({ ctx, input }) => {
      const cat = await ctx.db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, input.categorySlug))
        .limit(1);
      const categoryId = cat[0]?.id;
      if (!categoryId) return [];

      // Distinct brands used in this category.
      const rows = await ctx.db
        .selectDistinct({
          id: brands.id,
          name: brands.name,
          slug: brands.slug,
        })
        .from(products)
        .innerJoin(brands, eq(products.brandId, brands.id))
        .where(and(eq(products.categoryId, categoryId), isNotNull(products.brandId)))
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
        .where(eq(categories.slug, input.categorySlug))
        .limit(1);

      const categoryId = categoryRow[0]?.id;
      if (!categoryId) return [];

      const rows = await ctx.db
        .select({
          product: products,
          brand: brands,
        })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(eq(products.categoryId, categoryId))
        .orderBy(products.name)
        .limit(input.limit);

      return rows.map((r) => ({
        ...r.product,
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
        .where(eq(categories.slug, input.categorySlug))
        .limit(1);

      const categoryId = categoryRow[0]?.id;
      if (!categoryId) return [];

      const where = and(
        eq(products.categoryId, categoryId),
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
        ...r.product,
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

      return {
        ...row.product,
        brand: row.brand,
        category: row.category,
      };
    }),
});
