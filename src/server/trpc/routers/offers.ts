import { z } from "zod";
import { and, eq, inArray, isNotNull, min } from "drizzle-orm";

import { offers } from "@/server/db/schema";
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
      return ctx.db.select().from(offers).limit(limit);
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
});
