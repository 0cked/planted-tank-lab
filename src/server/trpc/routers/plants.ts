import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, ilike, or } from "drizzle-orm";

import { plants } from "@/server/db/schema";
import { createTRPCRouter, publicProcedure } from "@/server/trpc/trpc";

const ACTIVE_PLANT_STATUS = "active" as const;

export const plantsRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(500).default(200),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 200;
      return ctx.db
        .select()
        .from(plants)
        .where(eq(plants.status, ACTIVE_PLANT_STATUS))
        .orderBy(plants.commonName)
        .limit(limit);
    }),

  search: publicProcedure
    .input(
      z
        .object({
          q: z.string().trim().min(1).max(200).optional(),
          difficulty: z.string().trim().min(1).max(20).optional(),
          lightDemand: z.string().trim().min(1).max(20).optional(),
          co2Demand: z.string().trim().min(1).max(20).optional(),
          placement: z.string().trim().min(1).max(30).optional(),
          beginnerFriendly: z.boolean().optional(),
          shrimpSafe: z.boolean().optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;

      const where = and(
        eq(plants.status, ACTIVE_PLANT_STATUS),
        input?.difficulty ? eq(plants.difficulty, input.difficulty) : undefined,
        input?.lightDemand ? eq(plants.lightDemand, input.lightDemand) : undefined,
        input?.co2Demand ? eq(plants.co2Demand, input.co2Demand) : undefined,
        input?.placement ? eq(plants.placement, input.placement) : undefined,
        typeof input?.beginnerFriendly === "boolean"
          ? eq(plants.beginnerFriendly, input.beginnerFriendly)
          : undefined,
        typeof input?.shrimpSafe === "boolean"
          ? eq(plants.shrimpSafe, input.shrimpSafe)
          : undefined,
        input?.q
          ? or(
              ilike(plants.commonName, `%${input.q}%`),
              ilike(plants.scientificName, `%${input.q}%`),
            )
          : undefined,
      );

      return ctx.db.select().from(plants).where(where).orderBy(plants.commonName).limit(limit);
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(300) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(plants)
        .where(
          and(
            eq(plants.slug, input.slug),
            eq(plants.status, ACTIVE_PLANT_STATUS),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),
});
