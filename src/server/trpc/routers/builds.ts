import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { and, asc, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  buildComments,
  buildItems,
  buildReports,
  buildTags,
  buildVotes,
  builds,
  categories,
  offers,
  plants,
  products,
  users,
} from "@/server/db/schema";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/trpc/trpc";
import type { PlantSnapshot, ProductSnapshot } from "@/engine/types";
import {
  DEFAULT_BUILD_SORT_OPTION,
  buildSortOptionSchema,
} from "@/lib/build-sort";
import { buildTagSlugSchema, normalizeBuildTagSlugs } from "@/lib/build-tags";
import type * as fullSchema from "@/server/db/schema";

const buildFlagsSchema = z
  .object({
    hasShrimp: z.boolean().optional(),
    lowTechNoCo2: z.boolean().optional(),
  })
  .optional();

const commentBodySchema = z.string().trim().min(1).max(2000);

type BuildCommentSummary = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  author: {
    id: string;
    name: string;
  };
};

function displayNameForCommentAuthor(params: {
  displayName: string | null;
  email: string | null;
}): string {
  const trimmedDisplayName = params.displayName?.trim();
  if (trimmedDisplayName) return trimmedDisplayName;

  const localPart = params.email
    ?.split("@")[0]
    ?.replace(/[._-]+/g, " ")
    .trim();

  if (localPart) return localPart;
  return "Community member";
}

function escapeLikePattern(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

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
          tag: buildTagSlugSchema.optional(),
          search: z.string().trim().min(1).max(120).optional(),
          sort: buildSortOptionSchema.default(DEFAULT_BUILD_SORT_OPTION),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const activeTag = input?.tag;
      const sort = input?.sort ?? DEFAULT_BUILD_SORT_OPTION;
      const searchPattern = input?.search
        ? `%${escapeLikePattern(input.search)}%`
        : null;
      const voteCount = sql<number>`coalesce(count(${buildVotes.userId}), 0)::int`;

      const buildSelect = {
        id: builds.id,
        name: builds.name,
        style: builds.style,
        shareSlug: builds.shareSlug,
        description: builds.description,
        coverImageUrl: builds.coverImageUrl,
        totalPriceCents: builds.totalPriceCents,
        itemCount: builds.itemCount,
        updatedAt: builds.updatedAt,
        voteCount: voteCount.as("voteCount"),
      };

      const whereFilter = and(
        eq(builds.isPublic, true),
        searchPattern
          ? or(
              ilike(builds.name, searchPattern),
              ilike(builds.description, searchPattern),
              sql<boolean>`exists (
                select 1
                from ${buildItems}
                left join ${products} on ${products.id} = ${buildItems.productId}
                left join ${plants} on ${plants.id} = ${buildItems.plantId}
                where ${buildItems.buildId} = ${builds.id}
                  and (
                    ${products.name} ilike ${searchPattern}
                    or ${plants.commonName} ilike ${searchPattern}
                  )
              )`,
            )
          : undefined,
      );

      const orderBy =
        sort === "newest"
          ? [desc(builds.updatedAt), desc(voteCount)]
          : sort === "most-items"
            ? [desc(builds.itemCount), desc(voteCount), desc(builds.updatedAt)]
            : sort === "alphabetical"
              ? [asc(sql`lower(${builds.name})`), desc(voteCount), desc(builds.updatedAt)]
              : [desc(voteCount), desc(builds.updatedAt)];

      const rows = activeTag
        ? await ctx.db
            .select(buildSelect)
            .from(builds)
            .innerJoin(
              buildTags,
              and(eq(buildTags.buildId, builds.id), eq(buildTags.tagSlug, activeTag)),
            )
            .leftJoin(buildVotes, eq(buildVotes.buildId, builds.id))
            .where(whereFilter)
            .groupBy(
              builds.id,
              builds.name,
              builds.style,
              builds.shareSlug,
              builds.description,
              builds.coverImageUrl,
              builds.totalPriceCents,
              builds.itemCount,
              builds.updatedAt,
            )
            .orderBy(...orderBy)
            .limit(limit)
        : await ctx.db
            .select(buildSelect)
            .from(builds)
            .leftJoin(buildVotes, eq(buildVotes.buildId, builds.id))
            .where(whereFilter)
            .groupBy(
              builds.id,
              builds.name,
              builds.style,
              builds.shareSlug,
              builds.description,
              builds.coverImageUrl,
              builds.totalPriceCents,
              builds.itemCount,
              builds.updatedAt,
            )
            .orderBy(...orderBy)
            .limit(limit);

      const buildIds = rows.map((row) => row.id);
      const tagRows = buildIds.length
        ? await ctx.db
            .select({
              buildId: buildTags.buildId,
              tagSlug: buildTags.tagSlug,
            })
            .from(buildTags)
            .where(inArray(buildTags.buildId, buildIds))
        : [];

      const tagsByBuildId = new Map<string, string[]>();
      for (const row of tagRows) {
        const previous = tagsByBuildId.get(row.buildId) ?? [];
        previous.push(row.tagSlug);
        tagsByBuildId.set(row.buildId, previous);
      }

      return rows.map((row) => ({
        ...row,
        tags: normalizeBuildTagSlugs(tagsByBuildId.get(row.id) ?? []),
      }));
    }),

  getVotes: publicProcedure
    .input(
      z.object({
        buildIds: z.array(z.string().uuid()).min(1).max(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const countRows = await ctx.db
        .select({
          buildId: buildVotes.buildId,
          voteCount: sql<number>`count(*)::int`.as("voteCount"),
        })
        .from(buildVotes)
        .where(inArray(buildVotes.buildId, input.buildIds))
        .groupBy(buildVotes.buildId);

      const totalsByBuildId = Object.fromEntries(
        input.buildIds.map((buildId) => [buildId, 0] as const),
      ) as Record<string, number>;

      for (const row of countRows) {
        totalsByBuildId[row.buildId] = row.voteCount;
      }

      if (!ctx.session?.user?.id) {
        return { totalsByBuildId, viewerVotedBuildIds: [] as string[] };
      }

      const viewerRows = await ctx.db
        .select({ buildId: buildVotes.buildId })
        .from(buildVotes)
        .where(
          and(
            eq(buildVotes.userId, ctx.session.user.id),
            inArray(buildVotes.buildId, input.buildIds),
          ),
        );

      return {
        totalsByBuildId,
        viewerVotedBuildIds: viewerRows.map((row) => row.buildId),
      };
    }),

  vote: protectedProcedure
    .input(z.object({ buildId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const targetBuild = await ctx.db
        .select({ id: builds.id })
        .from(builds)
        .where(and(eq(builds.id, input.buildId), eq(builds.isPublic, true)))
        .limit(1);

      if (!targetBuild[0]) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const insertedVotes = await ctx.db
        .insert(buildVotes)
        .values({
          buildId: input.buildId,
          userId: ctx.session.user.id,
        })
        .onConflictDoNothing()
        .returning({ buildId: buildVotes.buildId });

      const voteRows = await ctx.db
        .select({ voteCount: sql<number>`count(*)::int`.as("voteCount") })
        .from(buildVotes)
        .where(eq(buildVotes.buildId, input.buildId));

      return {
        buildId: input.buildId,
        voteCount: voteRows[0]?.voteCount ?? 0,
        didVote: insertedVotes.length > 0,
      };
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

  addComment: protectedProcedure
    .input(
      z.object({
        shareSlug: z.string().min(1).max(20),
        body: commentBodySchema,
        parentId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const buildRow = await ctx.db
        .select({ id: builds.id })
        .from(builds)
        .where(eq(builds.shareSlug, input.shareSlug))
        .limit(1);
      const buildId = buildRow[0]?.id;

      if (!buildId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (input.parentId) {
        const parentRows = await ctx.db
          .select({ id: buildComments.id, parentId: buildComments.parentId })
          .from(buildComments)
          .where(
            and(
              eq(buildComments.id, input.parentId),
              eq(buildComments.buildId, buildId),
            ),
          )
          .limit(1);

        const parent = parentRows[0];
        if (!parent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent comment not found.",
          });
        }

        if (parent.parentId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only one level of replies is supported.",
          });
        }
      }

      const insertedRows = await ctx.db
        .insert(buildComments)
        .values({
          buildId,
          userId: ctx.session.user.id,
          body: input.body,
          parentId: input.parentId ?? null,
        })
        .returning({
          id: buildComments.id,
          createdAt: buildComments.createdAt,
        });

      const inserted = insertedRows[0];
      if (!inserted) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to save comment.",
        });
      }

      return inserted;
    }),

  listComments: publicProcedure
    .input(z.object({ shareSlug: z.string().min(1).max(20) }))
    .query(async ({ ctx, input }) => {
      const buildRow = await ctx.db
        .select({ id: builds.id })
        .from(builds)
        .where(eq(builds.shareSlug, input.shareSlug))
        .limit(1);
      const buildId = buildRow[0]?.id;

      if (!buildId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const rows = await ctx.db
        .select({
          id: buildComments.id,
          parentId: buildComments.parentId,
          body: buildComments.body,
          createdAt: buildComments.createdAt,
          authorId: users.id,
          authorDisplayName: users.displayName,
          authorEmail: users.email,
        })
        .from(buildComments)
        .innerJoin(users, eq(buildComments.userId, users.id))
        .where(eq(buildComments.buildId, buildId))
        .orderBy(buildComments.createdAt);

      const commentRows: BuildCommentSummary[] = rows.map((row) => ({
        id: row.id,
        parentId: row.parentId,
        body: row.body,
        createdAt: row.createdAt,
        author: {
          id: row.authorId,
          name: displayNameForCommentAuthor({
            displayName: row.authorDisplayName,
            email: row.authorEmail,
          }),
        },
      }));

      const topLevelComments: BuildCommentSummary[] = [];
      const repliesByParentId = new Map<string, BuildCommentSummary[]>();

      for (const comment of commentRows) {
        if (!comment.parentId) {
          topLevelComments.push(comment);
          continue;
        }

        const replies = repliesByParentId.get(comment.parentId) ?? [];
        replies.push(comment);
        repliesByParentId.set(comment.parentId, replies);
      }

      return {
        comments: topLevelComments.map((comment) => ({
          ...comment,
          replies: repliesByParentId.get(comment.id) ?? [],
        })),
      };
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
          categoryName: categories.name,
          product: products,
          plant: plants,
          item: buildItems,
        })
        .from(buildItems)
        .innerJoin(categories, eq(buildItems.categoryId, categories.id))
        .leftJoin(products, eq(buildItems.productId, products.id))
        .leftJoin(plants, eq(buildItems.plantId, plants.id))
        .where(eq(buildItems.buildId, build.id))
        .orderBy(buildItems.addedAt);

      const productsByCategory: Record<string, ProductSnapshot | undefined> = {};
      const plantList: PlantSnapshot[] = [];
      const selectedOfferIdByProductId: Record<string, string | undefined> = {};
      const detailedItems: Array<{
        id: string;
        categorySlug: string;
        categoryName: string;
        quantity: number;
        notes: string | null;
        type: "product" | "plant";
        product:
          | {
              id: string;
              name: string;
              slug: string;
            }
          | null;
        plant:
          | {
              id: string;
              commonName: string;
              slug: string;
            }
          | null;
      }> = [];
      const seenPlantIds = new Set<string>();

      for (const row of items) {
        if (row.product) {
          if (!productsByCategory[row.categorySlug]) {
            productsByCategory[row.categorySlug] = {
              id: row.product.id,
              name: row.product.name,
              slug: row.product.slug,
              categorySlug: row.categorySlug,
              specs: (row.product.specs ?? {}) as Record<string, unknown>,
            };
          }
          if (row.item.selectedOfferId) {
            selectedOfferIdByProductId[row.product.id] = row.item.selectedOfferId;
          }
          detailedItems.push({
            id: row.item.id,
            categorySlug: row.categorySlug,
            categoryName: row.categoryName,
            quantity: row.item.quantity,
            notes: row.item.notes,
            type: "product",
            product: {
              id: row.product.id,
              name: row.product.name,
              slug: row.product.slug,
            },
            plant: null,
          });
        } else if (row.plant) {
          if (!seenPlantIds.has(row.plant.id)) {
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
            seenPlantIds.add(row.plant.id);
          }
          detailedItems.push({
            id: row.item.id,
            categorySlug: row.categorySlug,
            categoryName: row.categoryName,
            quantity: row.item.quantity,
            notes: row.item.notes,
            type: "plant",
            product: null,
            plant: {
              id: row.plant.id,
              commonName: row.plant.commonName,
              slug: row.plant.slug,
            },
          });
        }
      }

      return {
        build: {
          id: build.id,
          name: build.name,
          style: build.style,
          shareSlug: build.shareSlug,
          description: build.description,
          coverImageUrl: build.coverImageUrl,
          isPublic: build.isPublic,
          itemCount: build.itemCount,
          totalPriceCents: build.totalPriceCents,
          updatedAt: build.updatedAt,
        },
        items: detailedItems,
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
