import { z } from "zod";
import { and, asc, desc, eq, gt, inArray, isNotNull, min } from "drizzle-orm";

import { offers, priceHistory, retailers } from "@/server/db/schema";
import { ensureOfferSummariesByProductIds } from "@/server/services/offer-summaries";
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
          lastCheckedAt: offers.lastCheckedAt,
          updatedAt: offers.updatedAt,
        })
        .from(offers)
        .limit(limit);
    }),

  summaryByProductIds: publicProcedure
    .input(
      z.object({
        productIds: z.array(z.string().uuid()).max(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.productIds.length === 0) return [];

      const rows = await ensureOfferSummariesByProductIds({
        db: ctx.db,
        productIds: input.productIds,
      });

      return rows.map((row) => ({
        productId: row.productId,
        minPriceCents: row.minPriceCents,
        inStockCount: row.inStockCount,
        staleFlag: row.staleFlag,
        checkedAt: row.checkedAt,
        updatedAt: row.updatedAt,
      }));
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
          lastCheckedAt: offers.lastCheckedAt,
          updatedAt: offers.updatedAt,
          retailer: {
            id: retailers.id,
            name: retailers.name,
            slug: retailers.slug,
            websiteUrl: retailers.websiteUrl,
            logoUrl: retailers.logoUrl,
            logoAssetPath: retailers.logoAssetPath,
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
        lastCheckedAt: r.lastCheckedAt,
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
          lastCheckedAt: offers.lastCheckedAt,
          updatedAt: offers.updatedAt,
          retailer: {
            id: retailers.id,
            name: retailers.name,
            slug: retailers.slug,
            websiteUrl: retailers.websiteUrl,
            logoUrl: retailers.logoUrl,
            logoAssetPath: retailers.logoAssetPath,
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
        lastCheckedAt: r.lastCheckedAt,
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
        lastCheckedAt: r.offer.lastCheckedAt,
        updatedAt: r.offer.updatedAt,
        retailer: {
          id: r.retailer.id,
          name: r.retailer.name,
          slug: r.retailer.slug,
          websiteUrl: r.retailer.websiteUrl,
          logoUrl: r.retailer.logoUrl,
          logoAssetPath: r.retailer.logoAssetPath,
        },
        goUrl: `/go/${r.offer.id}`,
      }));
    }),

  listByProductIds: publicProcedure
    .input(
      z.object({
        productIds: z.array(z.string().uuid()).min(1).max(200),
        perProductLimit: z.number().int().min(1).max(25).default(8),
      }),
    )
    .query(async ({ ctx, input }) => {
      const productIds = Array.from(new Set(input.productIds));
      if (productIds.length === 0) return [];

      const rows = await ctx.db
        .select({
          offer: offers,
          retailer: retailers,
        })
        .from(offers)
        .innerJoin(retailers, eq(offers.retailerId, retailers.id))
        .where(inArray(offers.productId, productIds))
        .orderBy(offers.productId, offers.priceCents, desc(offers.updatedAt));

      const rowsByProductId = new Map<string, Array<(typeof rows)[number]>>();
      for (const row of rows) {
        const previousRows = rowsByProductId.get(row.offer.productId) ?? [];
        previousRows.push(row);
        rowsByProductId.set(row.offer.productId, previousRows);
      }

      const priceRank = (priceCents: number | null): number => {
        return priceCents ?? Number.POSITIVE_INFINITY;
      };

      return productIds.map((productId) => {
        const productRows = rowsByProductId.get(productId) ?? [];

        const sortedRows = [...productRows].sort((a, b) => {
          const aInStock = a.offer.inStock === true;
          const bInStock = b.offer.inStock === true;
          if (aInStock !== bInStock) return aInStock ? -1 : 1;

          const aPrice = priceRank(a.offer.priceCents);
          const bPrice = priceRank(b.offer.priceCents);
          if (aPrice !== bPrice) return aPrice - bPrice;

          return b.offer.updatedAt.getTime() - a.offer.updatedAt.getTime();
        });

        return {
          productId,
          offers: sortedRows.slice(0, input.perProductLimit).map((row) => ({
            id: row.offer.id,
            priceCents: row.offer.priceCents,
            currency: row.offer.currency,
            inStock: row.offer.inStock,
            lastCheckedAt: row.offer.lastCheckedAt,
            updatedAt: row.offer.updatedAt,
            retailer: {
              id: row.retailer.id,
              name: row.retailer.name,
              slug: row.retailer.slug,
              websiteUrl: row.retailer.websiteUrl,
              logoUrl: row.retailer.logoUrl,
              logoAssetPath: row.retailer.logoAssetPath,
            },
            goUrl: `/go/${row.offer.id}`,
          })),
        };
      });
    }),

  priceHistoryByProductId: publicProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        days: z.number().int().min(1).max(365).default(30),
        limit: z.number().int().min(1).max(2000).default(500),
      }),
    )
    .query(async ({ ctx, input }) => {
      const cutoff = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      const rows = await ctx.db
        .select({
          offerId: priceHistory.offerId,
          recordedAt: priceHistory.recordedAt,
          priceCents: priceHistory.priceCents,
          inStock: priceHistory.inStock,
          retailer: {
            id: retailers.id,
            name: retailers.name,
            slug: retailers.slug,
            logoUrl: retailers.logoUrl,
            logoAssetPath: retailers.logoAssetPath,
          },
        })
        .from(priceHistory)
        .innerJoin(offers, eq(priceHistory.offerId, offers.id))
        .innerJoin(retailers, eq(offers.retailerId, retailers.id))
        .where(and(eq(offers.productId, input.productId), gt(priceHistory.recordedAt, cutoff)))
        .orderBy(asc(priceHistory.recordedAt))
        .limit(input.limit);

      return rows;
    }),
});
