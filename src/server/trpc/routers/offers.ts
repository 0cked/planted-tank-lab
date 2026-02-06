import { z } from "zod";
import { and, desc, eq, inArray, isNotNull, min } from "drizzle-orm";

import { offers, retailers } from "@/server/db/schema";
import { createTRPCRouter, publicProcedure } from "@/server/trpc/trpc";

export const offersRouter = createTRPCRouter({
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
      // Safe shape (do not expose raw URLs or affiliate tags via generic listing).
      return ctx.db
        .select({
          id: offers.id,
          productId: offers.productId,
          retailerId: offers.retailerId,
          priceCents: offers.priceCents,
          currency: offers.currency,
          inStock: offers.inStock,
          updatedAt: offers.updatedAt,
        })
        .from(offers)
        .limit(limit);
    }),

  lowestByProductIds: publicProcedure
    .input(
      z.object({
        productIds: z.array(z.string().uuid()).max(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.productIds.length === 0) return [];

      // Best-effort: some products may have no offers, or offers without price.
      return ctx.db
        .select({
          productId: offers.productId,
          minPriceCents: min(offers.priceCents).as("min_price_cents"),
        })
        .from(offers)
        .where(
          and(
            inArray(offers.productId, input.productIds),
            eq(offers.inStock, true),
            isNotNull(offers.priceCents),
          ),
        )
        .groupBy(offers.productId);
    }),

  bestByProductIds: publicProcedure
    .input(
      z.object({
        productIds: z.array(z.string().uuid()).max(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.productIds.length === 0) return [];

      // Order so the first row per product is the best offer:
      // lowest price, then most recently updated.
      const rows = await ctx.db
        .select({
          offerId: offers.id,
          productId: offers.productId,
          priceCents: offers.priceCents,
          currency: offers.currency,
          inStock: offers.inStock,
          updatedAt: offers.updatedAt,
          retailer: {
            id: retailers.id,
            name: retailers.name,
            slug: retailers.slug,
            websiteUrl: retailers.websiteUrl,
            logoUrl: retailers.logoUrl,
          },
        })
        .from(offers)
        .innerJoin(retailers, eq(offers.retailerId, retailers.id))
        .where(
          and(
            inArray(offers.productId, input.productIds),
            eq(offers.inStock, true),
            isNotNull(offers.priceCents),
          ),
        )
        .orderBy(offers.productId, offers.priceCents, desc(offers.updatedAt));

      const best = new Map<string, (typeof rows)[number]>();
      for (const r of rows) {
        if (!best.has(r.productId)) best.set(r.productId, r);
      }

      return Array.from(best.values()).map((r) => ({
        productId: r.productId,
        offerId: r.offerId,
        priceCents: r.priceCents,
        currency: r.currency,
        inStock: r.inStock,
        updatedAt: r.updatedAt,
        retailer: r.retailer,
        goUrl: `/go/${r.offerId}`,
      }));
    }),

  getByIds: publicProcedure
    .input(
      z.object({
        offerIds: z.array(z.string().uuid()).max(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.offerIds.length === 0) return [];

      const rows = await ctx.db
        .select({
          offerId: offers.id,
          productId: offers.productId,
          priceCents: offers.priceCents,
          currency: offers.currency,
          inStock: offers.inStock,
          updatedAt: offers.updatedAt,
          retailer: {
            id: retailers.id,
            name: retailers.name,
            slug: retailers.slug,
            websiteUrl: retailers.websiteUrl,
            logoUrl: retailers.logoUrl,
          },
        })
        .from(offers)
        .innerJoin(retailers, eq(offers.retailerId, retailers.id))
        .where(inArray(offers.id, input.offerIds))
        .orderBy(desc(offers.updatedAt));

      return rows.map((r) => ({
        productId: r.productId,
        offerId: r.offerId,
        priceCents: r.priceCents,
        currency: r.currency,
        inStock: r.inStock,
        updatedAt: r.updatedAt,
        retailer: r.retailer,
        goUrl: `/go/${r.offerId}`,
      }));
    }),

  listByProductId: publicProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          offer: offers,
          retailer: retailers,
        })
        .from(offers)
        .innerJoin(retailers, eq(offers.retailerId, retailers.id))
        .where(eq(offers.productId, input.productId))
        .orderBy(offers.priceCents)
        .limit(input.limit);

      return rows.map((r) => ({
        id: r.offer.id,
        priceCents: r.offer.priceCents,
        currency: r.offer.currency,
        inStock: r.offer.inStock,
        updatedAt: r.offer.updatedAt,
        retailer: {
          id: r.retailer.id,
          name: r.retailer.name,
          slug: r.retailer.slug,
          websiteUrl: r.retailer.websiteUrl,
          logoUrl: r.retailer.logoUrl,
        },
        goUrl: `/go/${r.offer.id}`,
      }));
    }),
});
