import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { ingestionJobs, ingestionRuns } from "@/server/db/schema";
import {
  claimNextJob,
  markJobFailure,
  markJobSuccess,
  OffersBuceplantVariantsRefreshPayloadSchema,
  OffersDetailRefreshBulkPayloadSchema,
  OffersDetailRefreshOnePayloadSchema,
  OffersHeadRefreshBulkPayloadSchema,
  OffersHeadRefreshOnePayloadSchema,
} from "@/server/ingestion/job-queue";
import { ensureIngestionSource } from "@/server/ingestion/sources";
import { runOffersBuceplantVariantsRefresh } from "@/server/ingestion/sources/offers-buceplant-variants";
import { runOffersDetailRefresh } from "@/server/ingestion/sources/offers-detail";
import { runOffersHeadRefresh } from "@/server/ingestion/sources/offers-head";

async function ensureOffersHeadSource(): Promise<string> {
  return ensureIngestionSource({
    slug: "offers-head",
    name: "Retailer offer HEAD checks",
    kind: "offer_head",
    defaultTrust: "retailer",
    scheduleEveryMinutes: 60,
    config: {
      jobKind: "offers.head_refresh.bulk",
      // Keep checks fresher than 24h SLO with enough time for queue drain.
      jobPayload: { olderThanHours: 20, limit: 75, timeoutMs: 6000 },
      idempotencyPrefix: "schedule:offers-head",
    },
  });
}

async function ensureOffersDetailSource(): Promise<string> {
  return ensureIngestionSource({
    slug: "offers-detail",
    name: "Retailer offer detail checks",
    kind: "offer_detail",
    defaultTrust: "retailer",
    scheduleEveryMinutes: 120,
    config: {
      jobKind: "offers.detail_refresh.bulk",
      // Detail checks are slower than HEAD; keep a slightly smaller batch while
      // still satisfying 24h freshness SLO for current catalog volume.
      jobPayload: { olderThanHours: 20, limit: 60, timeoutMs: 12000 },
      idempotencyPrefix: "schedule:offers-detail",
    },
  });
}

async function ensureBuceplantVariantsSource(): Promise<string> {
  return ensureIngestionSource({
    slug: "offers-buceplant-variants",
    name: "BucePlant variant product checks",
    kind: "offer_detail",
    defaultTrust: "retailer",
    scheduleEveryMinutes: 240,
    config: {
      jobKind: "offers.buceplant_variants_refresh",
      jobPayload: { timeoutMs: 15000 },
      idempotencyPrefix: "schedule:offers-buceplant-variants",
    },
  });
}

async function createIngestionRun(sourceId: string): Promise<string> {
  const runRows = await db
    .insert(ingestionRuns)
    .values({
      sourceId,
      status: "running",
      startedAt: new Date(),
      createdAt: new Date(),
    })
    .returning({ id: ingestionRuns.id });

  const runId = runRows[0]?.id;
  if (!runId) throw new Error("Failed to create ingestion run");
  return runId;
}

async function finishIngestionRunSuccess(params: {
  runId: string;
  stats: Record<string, unknown>;
}): Promise<void> {
  await db
    .update(ingestionRuns)
    .set({
      status: "success",
      finishedAt: new Date(),
      stats: params.stats,
    })
    .where(eq(ingestionRuns.id, params.runId));
}

export async function runIngestionWorker(params: {
  workerId: string;
  maxJobs: number;
  dryRun: boolean;
}): Promise<{ processed: number; succeeded: number; failed: number }> {
  if (params.dryRun) {
    const rows = await db
      .select({
        id: ingestionJobs.id,
        kind: ingestionJobs.kind,
        runAfter: ingestionJobs.runAfter,
        attempts: ingestionJobs.attempts,
        lastError: ingestionJobs.lastError,
      })
      .from(ingestionJobs)
      .where(eq(ingestionJobs.status, "queued"))
      .orderBy(desc(ingestionJobs.priority), asc(ingestionJobs.runAfter), asc(ingestionJobs.createdAt))
      .limit(1);

    const next = rows[0];
    if (!next) {
      console.log("No queued ingestion jobs.");
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    console.log("Next job (dry run):", next);
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < params.maxJobs; i += 1) {
    const job = await claimNextJob({ workerId: params.workerId });
    if (!job) break;
    processed += 1;

    try {
      if (job.kind === "offers.head_refresh.bulk") {
        const payload = OffersHeadRefreshBulkPayloadSchema.parse(job.payload);
        const sourceId = await ensureOffersHeadSource();
        const runId = await createIngestionRun(sourceId);

        const result = await runOffersHeadRefresh({
          db,
          sourceId,
          runId,
          mode: "bulk",
          olderThanHours: payload.olderThanHours,
          olderThanDays: payload.olderThanDays,
          limit: payload.limit,
          timeoutMs: payload.timeoutMs ?? 6000,
        });

        await finishIngestionRunSuccess({ runId, stats: result });
        await markJobSuccess(job.id);
        succeeded += 1;
        continue;
      }

      if (job.kind === "offers.head_refresh.one") {
        const payload = OffersHeadRefreshOnePayloadSchema.parse(job.payload);
        const sourceId = await ensureOffersHeadSource();
        const runId = await createIngestionRun(sourceId);

        const result = await runOffersHeadRefresh({
          db,
          sourceId,
          runId,
          mode: "one",
          offerId: payload.offerId,
          timeoutMs: payload.timeoutMs ?? 6000,
        });

        await finishIngestionRunSuccess({ runId, stats: result });
        await markJobSuccess(job.id);
        succeeded += 1;
        continue;
      }

      if (job.kind === "offers.detail_refresh.bulk") {
        const payload = OffersDetailRefreshBulkPayloadSchema.parse(job.payload);
        const sourceId = await ensureOffersDetailSource();
        const runId = await createIngestionRun(sourceId);

        const result = await runOffersDetailRefresh({
          db,
          sourceId,
          runId,
          mode: "bulk",
          olderThanHours: payload.olderThanHours,
          olderThanDays: payload.olderThanDays,
          limit: payload.limit,
          timeoutMs: payload.timeoutMs ?? 12000,
        });

        await finishIngestionRunSuccess({ runId, stats: result });
        await markJobSuccess(job.id);
        succeeded += 1;
        continue;
      }

      if (job.kind === "offers.detail_refresh.one") {
        const payload = OffersDetailRefreshOnePayloadSchema.parse(job.payload);
        const sourceId = await ensureOffersDetailSource();
        const runId = await createIngestionRun(sourceId);

        const result = await runOffersDetailRefresh({
          db,
          sourceId,
          runId,
          mode: "one",
          offerId: payload.offerId,
          timeoutMs: payload.timeoutMs ?? 12000,
        });

        await finishIngestionRunSuccess({ runId, stats: result });
        await markJobSuccess(job.id);
        succeeded += 1;
        continue;
      }

      if (job.kind === "offers.buceplant_variants_refresh") {
        const payload = OffersBuceplantVariantsRefreshPayloadSchema.parse(job.payload);
        const sourceId = await ensureBuceplantVariantsSource();
        const runId = await createIngestionRun(sourceId);

        const result = await runOffersBuceplantVariantsRefresh({
          db,
          sourceId,
          runId,
          timeoutMs: payload.timeoutMs ?? 15000,
        });

        await finishIngestionRunSuccess({ runId, stats: result });
        await markJobSuccess(job.id);
        succeeded += 1;
        continue;
      }

      throw new Error(`Unknown ingestion job kind: ${job.kind}`);
    } catch (err) {
      const msg =
        err instanceof Error ? `${err.name}: ${err.message}` : `Error: ${String(err)}`;

      // This is a long-running worker; job-level failures must be visible in logs.
      // Keep logs free of secrets (URLs are acceptable; no credentials should be embedded).
      console.error("[ingestion] job failed", {
        jobId: job.id,
        kind: job.kind,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        error: msg,
      });

      try {
        await markJobFailure({
          jobId: job.id,
          error: msg,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
        });
      } catch {
        // ignore (best-effort)
      }

      failed += 1;
    }
  }

  return { processed, succeeded, failed };
}

export const IngestionCliArgsSchema = z.object({
  maxJobs: z.number().int().min(1).max(500).default(25),
  dryRun: z.boolean().default(false),
});
