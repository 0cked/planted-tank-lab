import { z } from "zod";
import { and, eq, isNotNull } from "drizzle-orm";

import type { DbClient } from "@/server/db";
import { ingestionSources } from "@/server/db/schema";
import {
  enqueueIngestionJob,
  IngestionJobKindSchema,
} from "@/server/ingestion/job-queue";

const ScheduledSourceConfigSchema = z
  .object({
    jobKind: IngestionJobKindSchema,
    jobPayload: z.record(z.unknown()).optional(),
    idempotencyPrefix: z.string().min(1).optional(),
  })
  .passthrough();

export async function enqueueScheduledIngestionJobs(params: {
  db: DbClient;
  now?: Date;
  limitSources?: number;
}): Promise<{
  scanned: number;
  enqueued: number;
  deduped: number;
  skipped: number;
  errors: number;
}> {
  const now = params.now ?? new Date();

  const sources = await params.db
    .select({
      slug: ingestionSources.slug,
      scheduleEveryMinutes: ingestionSources.scheduleEveryMinutes,
      config: ingestionSources.config,
      active: ingestionSources.active,
    })
    .from(ingestionSources)
    .where(and(eq(ingestionSources.active, true), isNotNull(ingestionSources.scheduleEveryMinutes)))
    .limit(params.limitSources ?? 50);

  let enqueued = 0;
  let deduped = 0;
  let skipped = 0;
  let errors = 0;

  for (const src of sources) {
    try {
      const scheduleEveryMinutes = src.scheduleEveryMinutes;
      if (!scheduleEveryMinutes || scheduleEveryMinutes <= 0) {
        skipped += 1;
        continue;
      }

      const parsed = ScheduledSourceConfigSchema.safeParse(src.config ?? {});
      if (!parsed.success) {
        skipped += 1;
        continue;
      }

      const jobKind = parsed.data.jobKind;
      const jobPayload = parsed.data.jobPayload ?? {};
      const prefix = parsed.data.idempotencyPrefix ?? `schedule:${src.slug}`;

      const bucket = Math.floor(now.getTime() / (scheduleEveryMinutes * 60_000));
      const idempotencyKey = `${prefix}:${bucket}`;

      const res = await enqueueIngestionJob({
        kind: jobKind,
        payload: jobPayload,
        idempotencyKey,
        priority: 0,
      });

      if (res.deduped) deduped += 1;
      else enqueued += 1;
    } catch {
      errors += 1;
    }
  }

  return {
    scanned: sources.length,
    enqueued,
    deduped,
    skipped,
    errors,
  };
}
