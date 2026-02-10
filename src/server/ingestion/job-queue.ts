import { z } from "zod";

import { eq } from "drizzle-orm";

import { db, sql } from "@/server/db";
import { ingestionJobs } from "@/server/db/schema";

export const IngestionJobKinds = ["offers.head_refresh.bulk", "offers.head_refresh.one"] as const;
export type IngestionJobKind = (typeof IngestionJobKinds)[number];
export const IngestionJobKindSchema = z.enum(IngestionJobKinds);

export const OffersHeadRefreshBulkPayloadSchema = z.object({
  olderThanDays: z.number().int().min(0).max(365).default(2),
  limit: z.number().int().min(1).max(500).default(30),
  timeoutMs: z.number().int().min(500).max(30000).default(6000).optional(),
});

export const OffersHeadRefreshOnePayloadSchema = z.object({
  offerId: z.string().uuid(),
  timeoutMs: z.number().int().min(500).max(30000).default(6000).optional(),
});

const JobRowSchema = z.object({
  id: z.string().uuid(),
  kind: z.string().min(1),
  payload: z.unknown(),
  idempotencyKey: z.string().nullable().optional(),
  priority: z.number().int(),
  status: z.string().min(1),
  // postgres-js returns timestamps as strings (e.g. "2026-02-10 18:30:35.362258+00").
  // We don't rely on the type beyond ordering/debug.
  runAfter: z.union([z.string(), z.date()]),
  attempts: z.number().int(),
  maxAttempts: z.number().int(),
});

export type ClaimedJob = z.infer<typeof JobRowSchema>;

export async function enqueueIngestionJob(params: {
  kind: IngestionJobKind;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  priority?: number;
}): Promise<{ id: string | null; deduped: boolean }> {
  const inserted = await db
    .insert(ingestionJobs)
    .values({
      kind: params.kind,
      payload: params.payload,
      idempotencyKey: params.idempotencyKey ?? null,
      priority: params.priority ?? 0,
      status: "queued",
      attempts: 0,
      maxAttempts: 5,
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: ingestionJobs.idempotencyKey })
    .returning({ id: ingestionJobs.id });

  const id = inserted[0]?.id ?? null;
  return { id, deduped: id === null && !!params.idempotencyKey };
}

export async function claimNextJob(params: {
  workerId: string;
}): Promise<ClaimedJob | null> {
  const rows = await sql`
    with next_job as (
      select id
      from ingestion_jobs
      where status = 'queued'
        and run_after <= now()
      order by priority desc, run_after asc, created_at asc
      for update skip locked
      limit 1
    )
    update ingestion_jobs
    set
      status = 'running',
      locked_at = now(),
      locked_by = ${params.workerId},
      attempts = attempts + 1,
      updated_at = now()
    where id in (select id from next_job)
    returning
      id,
      kind,
      payload,
      idempotency_key as "idempotencyKey",
      priority,
      status,
      run_after as "runAfter",
      attempts,
      max_attempts as "maxAttempts"
  `;

  const row = rows[0] as unknown;
  if (!row) return null;
  const parsed = JobRowSchema.safeParse(row);
  if (!parsed.success) return null;
  return parsed.data;
}

export async function markJobSuccess(jobId: string): Promise<void> {
  await db
    .update(ingestionJobs)
    .set({
      status: "success",
      finishedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(ingestionJobs.id, jobId));
}

export async function markJobFailure(params: {
  jobId: string;
  error: string;
  attempts: number;
  maxAttempts: number;
}): Promise<void> {
  const now = Date.now();

  if (params.attempts >= params.maxAttempts) {
    await db
      .update(ingestionJobs)
      .set({
        status: "failed",
        lastError: params.error,
        finishedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(ingestionJobs.id, params.jobId));
    return;
  }

  // Exponential backoff in minutes, capped.
  const backoffMinutes = Math.min(60, Math.pow(2, Math.max(0, params.attempts - 1)));
  const runAfter = new Date(now + backoffMinutes * 60 * 1000);

  await db
    .update(ingestionJobs)
    .set({
      status: "queued",
      lastError: params.error,
      runAfter,
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(ingestionJobs.id, params.jobId));
}
