import { z } from "zod";
import { eq } from "drizzle-orm";

import { compatibilityRules } from "@/server/db/schema";
import { createTRPCRouter, publicProcedure } from "@/server/trpc/trpc";

export const rulesRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).default(100),
          activeOnly: z.boolean().default(true),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 100;
      const activeOnly = input?.activeOnly ?? true;

      const q = ctx.db.select().from(compatibilityRules);
      if (!activeOnly) return q.limit(limit);

      return q.where(eq(compatibilityRules.active, true)).limit(limit);
    }),
});
