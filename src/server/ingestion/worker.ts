import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { ingestionJobs, ingestionRuns } from "@/server/db/schema";
import {
  claimNextJob,
  markJobFailure,
  markJobSuccess,
  OffersHeadRefreshBulkPayloadSchema,
  OffersHeadRefreshOnePayloadSchema,
} from "@/server/ingestion/job-queue";
import { ensureIngestionSource } from "@/server/ingestion/sources";
import { runOffersHeadRefresh } from "@/server/ingestion/sources/offers-head";

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

        const sourceId = await ensureIngestionSource({
          slug: "offers-head",
          name: "Retailer offer HEAD checks",
          kind: "offer_head",
          defaultTrust: "retailer",
          scheduleEveryMinutes: 60,
          config: {
            jobKind: "offers.head_refresh.bulk",
            jobPayload: { olderThanDays: 2, limit: 50, timeoutMs: 6000 },
            idempotencyPrefix: "schedule:offers-head",
          },
        });

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

        const result = await runOffersHeadRefresh({
          db,
          sourceId,
          runId,
          mode: "bulk",
          olderThanDays: payload.olderThanDays,
          limit: payload.limit,
          timeoutMs: payload.timeoutMs ?? 6000,
        });

        await db
          .update(ingestionRuns)
          .set({
            status: "success",
            finishedAt: new Date(),
            stats: result,
          })
          .where(eq(ingestionRuns.id, runId));

        await markJobSuccess(job.id);
        succeeded += 1;
        continue;
      }

      if (job.kind === "offers.head_refresh.one") {
        const payload = OffersHeadRefreshOnePayloadSchema.parse(job.payload);

        const sourceId = await ensureIngestionSource({
          slug: "offers-head",
          name: "Retailer offer HEAD checks",
          kind: "offer_head",
          defaultTrust: "retailer",
          scheduleEveryMinutes: 60,
          config: {
            jobKind: "offers.head_refresh.bulk",
            jobPayload: { olderThanDays: 2, limit: 50, timeoutMs: 6000 },
            idempotencyPrefix: "schedule:offers-head",
          },
        });

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

        const result = await runOffersHeadRefresh({
          db,
          sourceId,
          runId,
          mode: "one",
          offerId: payload.offerId,
          timeoutMs: payload.timeoutMs ?? 6000,
        });

        await db
          .update(ingestionRuns)
          .set({
            status: "success",
            finishedAt: new Date(),
            stats: result,
          })
          .where(eq(ingestionRuns.id, runId));

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
