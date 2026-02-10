import { z } from "zod";

import { desc, isNull } from "drizzle-orm";

import { problemReports } from "@/server/db/schema";
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "@/server/trpc/trpc";

const targetTypeSchema = z.enum(["page", "product", "plant", "offer", "build", "other"]);

export const reportsRouter = createTRPCRouter({
  submit: publicProcedure
    .input(
      z.object({
        targetType: targetTypeSchema.default("page"),
        targetId: z.string().uuid().optional(),
        targetUrl: z.string().trim().min(1).max(1200).optional(),
        message: z.string().trim().min(5).max(2000),
        contactEmail: z
          .string()
          .trim()
          .email()
          .max(300)
          .optional()
          .or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(problemReports).values({
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        targetUrl: input.targetUrl ?? null,
        message: input.message.trim(),
        contactEmail: input.contactEmail ? input.contactEmail : null,
        reporterUserId: ctx.session?.user?.id ?? null,
      });

      return { ok: true as const };
    }),

  listOpen: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).default(100),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 100;
      return ctx.db
        .select()
        .from(problemReports)
        .where(isNull(problemReports.resolvedAt))
        .orderBy(desc(problemReports.createdAt))
        .limit(limit);
    }),
});
