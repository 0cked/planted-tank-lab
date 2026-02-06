import { z } from "zod";
import { eq } from "drizzle-orm";

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
});
