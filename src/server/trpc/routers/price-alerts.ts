import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNotNull, min } from "drizzle-orm";
import { z } from "zod";

import { categories, offers, priceAlerts, products } from "@/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

const CHECK_ALERT_INTERVAL_MS = 24 * 60 * 60 * 1000;

function toPriceCents(value: number): number {
  const cents = Math.round(value * 100);
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Target price must be greater than $0.00.",
    });
  }
  return cents;
}

function buildBestPriceMap(
  rows: Array<{
    productId: string;
    minPriceCents: number | string | null;
  }>,
): Map<string, number> {
  const bestPriceByProductId = new Map<string, number>();

  for (const row of rows) {
    const minPriceCents = row.minPriceCents == null ? null : Number(row.minPriceCents);
    if (!Number.isFinite(minPriceCents) || minPriceCents == null) {
      continue;
    }
    bestPriceByProductId.set(row.productId, minPriceCents);
  }

  return bestPriceByProductId;
}

export const priceAlertsRouter = createTRPCRouter({
  upsert: protectedProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        targetPrice: z.number().positive().max(100_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetPriceCents = toPriceCents(input.targetPrice);

      const productRows = await ctx.db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);

      if (!productRows[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
      }

      const now = new Date();
      const upsertedRows = await ctx.db
        .insert(priceAlerts)
        .values({
          userId: ctx.session.user.id,
          productId: input.productId,
          targetPrice: targetPriceCents,
          active: true,
          lastNotifiedAt: null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [priceAlerts.userId, priceAlerts.productId],
          set: {
            targetPrice: targetPriceCents,
            active: true,
            lastNotifiedAt: null,
            updatedAt: now,
          },
        })
        .returning({
          id: priceAlerts.id,
          productId: priceAlerts.productId,
          targetPriceCents: priceAlerts.targetPrice,
          active: priceAlerts.active,
          lastNotifiedAt: priceAlerts.lastNotifiedAt,
        });

      const alert = upsertedRows[0];
      if (!alert) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save alert." });
      }

      return {
        id: alert.id,
        productId: alert.productId,
        targetPriceCents: alert.targetPriceCents,
        targetPrice: alert.targetPriceCents / 100,
        active: alert.active,
        lastNotifiedAt: alert.lastNotifiedAt,
      };
    }),

  listMine: protectedProcedure
    .input(
      z
        .object({
          onlyTriggered: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: priceAlerts.id,
          productId: priceAlerts.productId,
          targetPriceCents: priceAlerts.targetPrice,
          active: priceAlerts.active,
          lastNotifiedAt: priceAlerts.lastNotifiedAt,
          updatedAt: priceAlerts.updatedAt,
          product: {
            slug: products.slug,
            name: products.name,
          },
          category: {
            slug: categories.slug,
          },
        })
        .from(priceAlerts)
        .innerJoin(products, eq(priceAlerts.productId, products.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(priceAlerts.userId, ctx.session.user.id),
            eq(priceAlerts.active, true),
            input?.onlyTriggered ? isNotNull(priceAlerts.lastNotifiedAt) : undefined,
          ),
        )
        .orderBy(desc(priceAlerts.updatedAt));

      const productIds = rows.map((row) => row.productId);
      const bestPriceRows =
        productIds.length === 0
          ? []
          : await ctx.db
              .select({
                productId: offers.productId,
                minPriceCents: min(offers.priceCents).as("min_price_cents"),
              })
              .from(offers)
              .where(
                and(
                  inArray(offers.productId, productIds),
                  eq(offers.inStock, true),
                  isNotNull(offers.priceCents),
                ),
              )
              .groupBy(offers.productId);

      const bestPriceByProductId = buildBestPriceMap(bestPriceRows);

      return rows.map((row) => ({
        id: row.id,
        productId: row.productId,
        targetPriceCents: row.targetPriceCents,
        targetPrice: row.targetPriceCents / 100,
        active: row.active,
        lastNotifiedAt: row.lastNotifiedAt,
        updatedAt: row.updatedAt,
        product: row.product,
        category: row.category,
        bestPriceCents: bestPriceByProductId.get(row.productId) ?? null,
      }));
    }),

  checkAndTrigger: protectedProcedure.mutation(async ({ ctx }) => {
    const alerts = await ctx.db
      .select({
        id: priceAlerts.id,
        productId: priceAlerts.productId,
        targetPriceCents: priceAlerts.targetPrice,
        lastNotifiedAt: priceAlerts.lastNotifiedAt,
      })
      .from(priceAlerts)
      .where(and(eq(priceAlerts.userId, ctx.session.user.id), eq(priceAlerts.active, true)));

    if (alerts.length === 0) {
      return { triggeredCount: 0, triggeredAlertIds: [] as string[] };
    }

    const bestPriceRows = await ctx.db
      .select({
        productId: offers.productId,
        minPriceCents: min(offers.priceCents).as("min_price_cents"),
      })
      .from(offers)
      .where(
        and(
          inArray(
            offers.productId,
            alerts.map((alert) => alert.productId),
          ),
          eq(offers.inStock, true),
          isNotNull(offers.priceCents),
        ),
      )
      .groupBy(offers.productId);

    const bestPriceByProductId = buildBestPriceMap(bestPriceRows);

    const now = new Date();
    const cooldownCutoff = new Date(now.getTime() - CHECK_ALERT_INTERVAL_MS);

    const triggeredAlertIds = alerts
      .filter((alert) => {
        const bestPriceCents = bestPriceByProductId.get(alert.productId);
        if (bestPriceCents == null) {
          return false;
        }

        const cooldownPassed =
          alert.lastNotifiedAt == null || alert.lastNotifiedAt <= cooldownCutoff;

        return cooldownPassed && bestPriceCents < alert.targetPriceCents;
      })
      .map((alert) => alert.id);

    if (triggeredAlertIds.length > 0) {
      await ctx.db
        .update(priceAlerts)
        .set({
          lastNotifiedAt: now,
          updatedAt: now,
        })
        .where(inArray(priceAlerts.id, triggeredAlertIds));
    }

    return {
      triggeredCount: triggeredAlertIds.length,
      triggeredAlertIds,
    };
  }),
});
