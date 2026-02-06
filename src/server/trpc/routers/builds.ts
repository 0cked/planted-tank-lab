import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  buildItems,
  buildReports,
  builds,
  categories,
  offers,
  plants,
  products,
  } from "@/server/db/schema";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/trpc/trpc";
import type { PlantSnapshot, ProductSnapshot } from "@/engine/types";
import type * as fullSchema from "@/server/db/schema";

const buildFlagsSchema = z
  .object({
    hasShrimp: z.boolean().optional(),
    lowTechNoCo2: z.boolean().optional(),
  })
  .optional();

async function computeTotalPriceCents(
  tx: PostgresJsDatabase<typeof fullSchema>,
  productIds: string[],
  selectedOfferIdByProductId?: Record<string, string>,
): Promise<{ totalPriceCents: number; missingOffersCount: number }> {
  if (productIds.length === 0) return { totalPriceCents: 0, missingOffersCount: 0 };

  // Validate overrides exist and are in-stock; otherwise fall back to best in-stock offer.
  let total = 0;
  let missing = 0;

  // Preload override offers in one query (keeps the save mutation snappy).
  const overrideOfferIds = Object.values(selectedOfferIdByProductId ?? {});
  const overrideById =
    overrideOfferIds.length > 0
      ? await tx
          .select({
            id: offers.id,
            productId: offers.productId,
            priceCents: offers.priceCents,
            inStock: offers.inStock,
          })
          .from(offers)
          .where(inArray(offers.id, overrideOfferIds))
      : [];
  const overrideOfferByProductId = new Map(
    overrideById.map((o) => [o.productId, o] as const),
  );

  for (const productId of productIds) {
    const override = overrideOfferByProductId.get(productId);
    if (override && override.inStock && override.priceCents != null) {
      total += override.priceCents;
      continue;
    }

    const best = await tx
      .select({ priceCents: offers.priceCents })
      .from(offers)
      .where(
        and(
          eq(offers.productId, productId),
          eq(offers.inStock, true),
          isNotNull(offers.priceCents),
        ),
      )
      .orderBy(offers.priceCents)
      .limit(1);
    const row = best[0];
    if (!row) {
      missing += 1;
      continue;
    }
    total += row.priceCents ?? 0;
  }

  return { totalPriceCents: total, missingOffersCount: missing };
}

export const buildsRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      return ctx.db.select().from(builds).limit(limit);
    }),

  listPublic: publicProcedure
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
        .select({
          id: builds.id,
          name: builds.name,
          shareSlug: builds.shareSlug,
          description: builds.description,
          coverImageUrl: builds.coverImageUrl,
          totalPriceCents: builds.totalPriceCents,
          itemCount: builds.itemCount,
          updatedAt: builds.updatedAt,
        })
        .from(builds)
        .where(eq(builds.isPublic, true))
        .orderBy(desc(builds.updatedAt))
        .limit(limit);
    }),

  listMine: protectedProcedure
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
        .from(builds)
        .where(eq(builds.userId, ctx.session.user.id))
        .limit(limit);
    }),

  setPublic: protectedProcedure
    .input(z.object({ buildId: z.string().uuid(), isPublic: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db
        .update(builds)
        .set({ isPublic: input.isPublic, updatedAt: new Date() })
        .where(and(eq(builds.id, input.buildId), eq(builds.userId, ctx.session.user.id)))
        .returning({ id: builds.id, isPublic: builds.isPublic });
      if (!updated[0]) throw new TRPCError({ code: "NOT_FOUND" });
      return updated[0];
    }),

  report: publicProcedure
    .input(
      z.object({
        shareSlug: z.string().min(1).max(20),
        reason: z.string().trim().min(1).max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const buildRow = await ctx.db
        .select({ id: builds.id })
        .from(builds)
        .where(eq(builds.shareSlug, input.shareSlug))
        .limit(1);
      const buildId = buildRow[0]?.id;
      if (!buildId) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.insert(buildReports).values({
        buildId,
        reporterUserId: ctx.session?.user?.id ?? null,
        reason: input.reason ?? null,
      });

      return { ok: true as const };
    }),

  getByShareSlug: publicProcedure
    .input(z.object({ shareSlug: z.string().min(1).max(20) }))
    .query(async ({ ctx, input }) => {
      const buildRow = await ctx.db
        .select()
        .from(builds)
        .where(eq(builds.shareSlug, input.shareSlug))
        .limit(1);

      const build = buildRow[0];
      if (!build) throw new TRPCError({ code: "NOT_FOUND" });

      const items = await ctx.db
        .select({
          categorySlug: categories.slug,
          product: products,
          plant: plants,
          item: buildItems,
        })
        .from(buildItems)
        .innerJoin(categories, eq(buildItems.categoryId, categories.id))
        .leftJoin(products, eq(buildItems.productId, products.id))
        .leftJoin(plants, eq(buildItems.plantId, plants.id))
        .where(eq(buildItems.buildId, build.id));

      const productsByCategory: Record<string, ProductSnapshot | undefined> = {};
      const plantList: PlantSnapshot[] = [];
      const selectedOfferIdByProductId: Record<string, string | undefined> = {};

      for (const row of items) {
        if (row.product) {
          productsByCategory[row.categorySlug] = {
            id: row.product.id,
            name: row.product.name,
            slug: row.product.slug,
            categorySlug: row.categorySlug,
            specs: (row.product.specs ?? {}) as Record<string, unknown>,
          };
          if (row.item.selectedOfferId) {
            selectedOfferIdByProductId[row.product.id] = row.item.selectedOfferId;
          }
        } else if (row.plant) {
          plantList.push({
            id: row.plant.id,
            commonName: row.plant.commonName,
            slug: row.plant.slug,
            difficulty: row.plant.difficulty,
            lightDemand: row.plant.lightDemand,
            co2Demand: row.plant.co2Demand,
            growthRate: row.plant.growthRate,
            placement: row.plant.placement,
            tempMinF: row.plant.tempMinF ? Number(row.plant.tempMinF) : null,
            tempMaxF: row.plant.tempMaxF ? Number(row.plant.tempMaxF) : null,
            phMin: row.plant.phMin ? Number(row.plant.phMin) : null,
            phMax: row.plant.phMax ? Number(row.plant.phMax) : null,
            ghMin: row.plant.ghMin ?? null,
            ghMax: row.plant.ghMax ?? null,
            khMin: row.plant.khMin ?? null,
            khMax: row.plant.khMax ?? null,
            maxHeightIn: row.plant.maxHeightIn ? Number(row.plant.maxHeightIn) : null,
          });
        }
      }

      return {
        build: {
          id: build.id,
          name: build.name,
          shareSlug: build.shareSlug,
          description: build.description,
          isPublic: build.isPublic,
          itemCount: build.itemCount,
          totalPriceCents: build.totalPriceCents,
          updatedAt: build.updatedAt,
        },
        snapshot: {
          buildId: build.id,
          shareSlug: build.shareSlug,
          productsByCategory,
          plants: plantList,
          selectedOfferIdByProductId,
          flags: {
            hasShrimp: Boolean((build.flags as Record<string, unknown> | null)?.["hasShrimp"]),
            lowTechNoCo2: Boolean((build.flags as Record<string, unknown> | null)?.["lowTechNoCo2"]),
          },
        },
      };
    }),

  upsertAnonymous: publicProcedure
    .input(
      z.object({
        buildId: z.string().uuid().optional(),
        shareSlug: z.string().min(1).max(20).optional(),
        name: z.string().min(1).max(300).optional(),
        description: z.string().max(5000).optional(),
        productsByCategory: z.record(z.string().min(1), z.string().uuid()),
        plantIds: z.array(z.string().uuid()).max(200).default([]),
        selectedOfferIdByProductId: z
          .record(z.string().uuid(), z.string().uuid())
          .optional(),
        flags: buildFlagsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        // Resolve categories to IDs once.
        const categoryRows = await tx
          .select({ id: categories.id, slug: categories.slug })
          .from(categories);
        const categoryIdBySlug = new Map(categoryRows.map((r) => [r.slug, r.id] as const));

        const plantsCategoryId = categoryIdBySlug.get("plants");
        if (!plantsCategoryId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Missing required category 'plants'. Seed categories first.",
          });
        }

        let buildId = input.buildId ?? null;
        let shareSlug = input.shareSlug ?? null;

        if (!buildId && shareSlug) {
          const existing = await tx
            .select({ id: builds.id })
            .from(builds)
            .where(eq(builds.shareSlug, shareSlug))
            .limit(1);
          buildId = existing[0]?.id ?? null;
        }

        if (!buildId) {
          shareSlug = shareSlug ?? nanoid(10);
          const created = await tx
            .insert(builds)
            .values({
              userId: null,
              name: input.name ?? "Untitled Build",
              description: input.description ?? null,
              shareSlug,
              isPublic: false,
              isCompleted: false,
              flags: input.flags ?? {},
              totalPriceCents: 0,
              itemCount: 0,
              warningsCount: 0,
              errorsCount: 0,
              updatedAt: new Date(),
            })
            .returning({ id: builds.id, shareSlug: builds.shareSlug });

          buildId = created[0]?.id ?? null;
          shareSlug = created[0]?.shareSlug ?? shareSlug;
        } else {
          const updated = await tx
            .update(builds)
            .set({
              name: input.name ?? undefined,
              description: input.description ?? undefined,
              flags: input.flags ?? undefined,
              updatedAt: new Date(),
            })
            .where(eq(builds.id, buildId))
            .returning({ shareSlug: builds.shareSlug });

          shareSlug = updated[0]?.shareSlug ?? shareSlug;
        }

        if (!buildId || !shareSlug) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create or update build.",
          });
        }

        // Replace items (simple and reliable for MVP).
        await tx.delete(buildItems).where(eq(buildItems.buildId, buildId));

        const productEntries = Object.entries(input.productsByCategory);
        const itemsToInsert: Array<{
          buildId: string;
          categoryId: string;
          productId?: string | null;
          plantId?: string | null;
          selectedOfferId?: string | null;
          quantity: number;
          addedAt?: Date;
        }> = [];

        for (const [categorySlug, productId] of productEntries) {
          const categoryId = categoryIdBySlug.get(categorySlug);
          if (!categoryId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Unknown category slug '${categorySlug}'.`,
            });
          }

          const selectedOfferId =
            input.selectedOfferIdByProductId?.[productId] ?? null;

          itemsToInsert.push({
            buildId,
            categoryId,
            productId,
            plantId: null,
            selectedOfferId,
            quantity: 1,
          });
        }

        for (const plantId of input.plantIds) {
          itemsToInsert.push({
            buildId,
            categoryId: plantsCategoryId,
            productId: null,
            plantId,
            quantity: 1,
          });
        }

        if (itemsToInsert.length > 0) {
          await tx.insert(buildItems).values(itemsToInsert);
        }

        const productIds = productEntries.map(([, productId]) => productId);
        const { totalPriceCents } = await computeTotalPriceCents(
          tx,
          productIds,
          input.selectedOfferIdByProductId,
        );

        await tx
          .update(builds)
          .set({
            itemCount: itemsToInsert.length,
            totalPriceCents,
            updatedAt: new Date(),
          })
          .where(eq(builds.id, buildId));

        return { buildId, shareSlug, itemCount: itemsToInsert.length };
      });
    }),

  upsertMine: protectedProcedure
    .input(
      z.object({
        buildId: z.string().uuid().optional(),
        shareSlug: z.string().min(1).max(20).optional(),
        name: z.string().min(1).max(300).optional(),
        description: z.string().max(5000).optional(),
        productsByCategory: z.record(z.string().min(1), z.string().uuid()),
        plantIds: z.array(z.string().uuid()).max(200).default([]),
        selectedOfferIdByProductId: z
          .record(z.string().uuid(), z.string().uuid())
          .optional(),
        flags: buildFlagsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const userId = ctx.session.user.id;

        // Resolve categories to IDs once.
        const categoryRows = await tx
          .select({ id: categories.id, slug: categories.slug })
          .from(categories);
        const categoryIdBySlug = new Map(categoryRows.map((r) => [r.slug, r.id] as const));

        const plantsCategoryId = categoryIdBySlug.get("plants");
        if (!plantsCategoryId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Missing required category 'plants'. Seed categories first.",
          });
        }

        let buildId = input.buildId ?? null;
        let shareSlug = input.shareSlug ?? null;

        if (buildId) {
          const owned = await tx
            .select({ id: builds.id })
            .from(builds)
            .where(and(eq(builds.id, buildId), eq(builds.userId, userId)))
            .limit(1);
          if (!owned[0]) throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (!buildId) {
          shareSlug = shareSlug ?? nanoid(10);
          const created = await tx
            .insert(builds)
            .values({
              userId,
              name: input.name ?? "Untitled Build",
              description: input.description ?? null,
              shareSlug,
              isPublic: false,
              isCompleted: false,
              flags: input.flags ?? {},
              totalPriceCents: 0,
              itemCount: 0,
              warningsCount: 0,
              errorsCount: 0,
              updatedAt: new Date(),
            })
            .returning({ id: builds.id, shareSlug: builds.shareSlug });
          buildId = created[0]?.id ?? null;
          shareSlug = created[0]?.shareSlug ?? shareSlug;
        } else {
          const updated = await tx
            .update(builds)
            .set({
              name: input.name ?? undefined,
              description: input.description ?? undefined,
              flags: input.flags ?? undefined,
              updatedAt: new Date(),
            })
            .where(and(eq(builds.id, buildId), eq(builds.userId, userId)))
            .returning({ shareSlug: builds.shareSlug });
          shareSlug = updated[0]?.shareSlug ?? shareSlug;
        }

        if (!buildId || !shareSlug) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create or update build.",
          });
        }

        await tx.delete(buildItems).where(eq(buildItems.buildId, buildId));

        const productEntries = Object.entries(input.productsByCategory);
        const itemsToInsert: Array<{
          buildId: string;
          categoryId: string;
          productId?: string | null;
          plantId?: string | null;
          selectedOfferId?: string | null;
          quantity: number;
        }> = [];

        for (const [categorySlug, productId] of productEntries) {
          const categoryId = categoryIdBySlug.get(categorySlug);
          if (!categoryId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Unknown category slug '${categorySlug}'.`,
            });
          }
          const selectedOfferId = input.selectedOfferIdByProductId?.[productId] ?? null;
          itemsToInsert.push({
            buildId,
            categoryId,
            productId,
            plantId: null,
            selectedOfferId,
            quantity: 1,
          });
        }

        for (const plantId of input.plantIds) {
          itemsToInsert.push({
            buildId,
            categoryId: plantsCategoryId,
            productId: null,
            plantId,
            quantity: 1,
          });
        }

        if (itemsToInsert.length > 0) {
          await tx.insert(buildItems).values(itemsToInsert);
        }

        const productIds = productEntries.map(([, productId]) => productId);
        const { totalPriceCents } = await computeTotalPriceCents(
          tx,
          productIds,
          input.selectedOfferIdByProductId,
        );

        await tx
          .update(builds)
          .set({
            userId,
            itemCount: itemsToInsert.length,
            totalPriceCents,
            updatedAt: new Date(),
          })
          .where(and(eq(builds.id, buildId), eq(builds.userId, userId)));

        return { buildId, shareSlug, itemCount: itemsToInsert.length };
      });
    }),
});
