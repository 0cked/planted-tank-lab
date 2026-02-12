import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";

import {
  CATALOG_OFFER_FRESHNESS_SLO_PERCENT,
  CATALOG_OFFER_FRESHNESS_WINDOW_HOURS,
} from "@/server/catalog/quality-audit";
import { db } from "@/server/db";
import type { DbClient } from "@/server/db";
import {
  canonicalEntityMappings,
  ingestionEntities,
  ingestionJobs,
  ingestionRuns,
  ingestionSources,
  offers,
  products,
} from "@/server/db/schema";
import { enqueueIngestionJob } from "@/server/ingestion/job-queue";

const MAPPABLE_ENTITY_TYPES = ["product", "plant", "offer"] as const;

export const DEFAULT_RECOVERY_LIMIT = 200;
export const DEFAULT_STALE_QUEUED_MINUTES = 120;
export const DEFAULT_STUCK_RUNNING_MINUTES = 45;

export type IngestionOpsSnapshot = {
  generatedAt: string;
  queue: {
    total: number;
    queued: number;
    running: number;
    failed: number;
    success: number;
    other: number;
    readyNow: number;
    staleQueued: number;
    stuckRunning: number;
  };
  freshness: {
    activeCatalogOffers: number;
    activeCheckedWithinWindow: number;
    activeStaleOrMissing: number;
    activeMissingCheckTimestamp: number;
    activeInStockPricedOffers: number;
    freshnessPercent: number;
    freshnessWindowHours: number;
    freshnessSloPercent: number;
  };
  counts: {
    unmappedEntities: number;
  };
  runStatusLast24h: Array<{ status: string; count: number }>;
  recentRuns: Array<{
    id: string;
    sourceSlug: string;
    sourceName: string;
    status: string;
    startedAt: Date;
    finishedAt: Date | null;
    durationMs: number | null;
    error: string | null;
  }>;
  recentFailedJobs: Array<{
    id: string;
    kind: string;
    attempts: number;
    maxAttempts: number;
    runAfter: Date;
    lastError: string | null;
    updatedAt: Date;
  }>;
};

export type IngestionRecoveryAction =
  | "retry_failed_jobs"
  | "requeue_stale_queued_jobs"
  | "recover_stuck_running_jobs"
  | "enqueue_freshness_refresh";

export type IngestionRecoveryResult = {
  action: IngestionRecoveryAction;
  affectedJobIds: string[];
  affectedCount: number;
  limit: number;
  staleQueuedMinutes: number;
  stuckRunningMinutes: number;
  enqueued?: {
    head: { id: string | null; deduped: boolean };
    detail: { id: string | null; deduped: boolean };
    buceVariants: { id: string | null; deduped: boolean };
  };
};

export function computeFreshnessPercent(params: {
  checkedWithinWindow: number;
  total: number;
}): number {
  if (params.total <= 0) return 0;
  return Number(((params.checkedWithinWindow / params.total) * 100).toFixed(2));
}

function toDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export type IngestionQueueRowForRecovery = {
  id: string;
  status: string;
  runAfter: Date | string | null;
  lockedAt: Date | string | null;
};

export function classifyRecoveryCandidates(params: {
  rows: IngestionQueueRowForRecovery[];
  now?: Date;
  staleQueuedMinutes?: number;
  stuckRunningMinutes?: number;
}): {
  staleQueuedIds: string[];
  stuckRunningIds: string[];
  failedIds: string[];
} {
  const now = params.now ?? new Date();
  const staleQueuedMinutes = params.staleQueuedMinutes ?? DEFAULT_STALE_QUEUED_MINUTES;
  const stuckRunningMinutes = params.stuckRunningMinutes ?? DEFAULT_STUCK_RUNNING_MINUTES;

  const staleQueuedCutoff = new Date(now.getTime() - staleQueuedMinutes * 60 * 1000);
  const stuckRunningCutoff = new Date(now.getTime() - stuckRunningMinutes * 60 * 1000);

  const staleQueuedIds: string[] = [];
  const stuckRunningIds: string[] = [];
  const failedIds: string[] = [];

  for (const row of params.rows) {
    const runAfter = toDate(row.runAfter);
    const lockedAt = toDate(row.lockedAt);

    if (row.status === "failed") {
      failedIds.push(row.id);
      continue;
    }

    if (row.status === "queued" && runAfter && runAfter.getTime() < staleQueuedCutoff.getTime()) {
      staleQueuedIds.push(row.id);
      continue;
    }

    if (row.status === "running" && lockedAt && lockedAt.getTime() < stuckRunningCutoff.getTime()) {
      stuckRunningIds.push(row.id);
    }
  }

  return { staleQueuedIds, stuckRunningIds, failedIds };
}

export async function getIngestionOpsSnapshot(database: DbClient = db): Promise<IngestionOpsSnapshot> {
  const now = new Date();
  const staleQueuedCutoff = new Date(
    now.getTime() - DEFAULT_STALE_QUEUED_MINUTES * 60 * 1000,
  );
  const stuckRunningCutoff = new Date(
    now.getTime() - DEFAULT_STUCK_RUNNING_MINUTES * 60 * 1000,
  );

  const queueCounts = await database
    .select({
      status: ingestionJobs.status,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(ingestionJobs)
    .groupBy(ingestionJobs.status);

  const queueCountByStatus = new Map(
    queueCounts.map((row) => [row.status, toNumber(row.count)] as const),
  );

  const readyNowRow = (
    await database
      .select({ count: sql<number>`count(*)::int`.as("count") })
      .from(ingestionJobs)
      .where(
        and(eq(ingestionJobs.status, "queued"), lt(ingestionJobs.runAfter, new Date(now.getTime() + 1))),
      )
  )[0];

  const staleQueuedRow = (
    await database
      .select({ count: sql<number>`count(*)::int`.as("count") })
      .from(ingestionJobs)
      .where(
        and(
          eq(ingestionJobs.status, "queued"),
          lt(ingestionJobs.runAfter, staleQueuedCutoff),
        ),
      )
  )[0];

  const stuckRunningRow = (
    await database
      .select({ count: sql<number>`count(*)::int`.as("count") })
      .from(ingestionJobs)
      .where(
        and(
          eq(ingestionJobs.status, "running"),
          isNotNull(ingestionJobs.lockedAt),
          lt(ingestionJobs.lockedAt, stuckRunningCutoff),
        ),
      )
  )[0];

  const recentFailedJobs = await database
    .select({
      id: ingestionJobs.id,
      kind: ingestionJobs.kind,
      attempts: ingestionJobs.attempts,
      maxAttempts: ingestionJobs.maxAttempts,
      runAfter: ingestionJobs.runAfter,
      lastError: ingestionJobs.lastError,
      updatedAt: ingestionJobs.updatedAt,
    })
    .from(ingestionJobs)
    .where(eq(ingestionJobs.status, "failed"))
    .orderBy(desc(ingestionJobs.updatedAt))
    .limit(15);

  const runStatusRows = await database
    .select({
      status: ingestionRuns.status,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(ingestionRuns)
    .where(gte(ingestionRuns.startedAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)))
    .groupBy(ingestionRuns.status);

  const recentRuns = await database
    .select({
      id: ingestionRuns.id,
      sourceSlug: ingestionSources.slug,
      sourceName: ingestionSources.name,
      status: ingestionRuns.status,
      startedAt: ingestionRuns.startedAt,
      finishedAt: ingestionRuns.finishedAt,
      error: ingestionRuns.error,
    })
    .from(ingestionRuns)
    .innerJoin(ingestionSources, eq(ingestionRuns.sourceId, ingestionSources.id))
    .orderBy(desc(ingestionRuns.startedAt))
    .limit(20);

  const unmappedEntityRow = (
    await database
      .select({ count: sql<number>`count(*)::int`.as("count") })
      .from(ingestionEntities)
      .leftJoin(
        canonicalEntityMappings,
        eq(canonicalEntityMappings.entityId, ingestionEntities.id),
      )
      .where(
        and(
          inArray(ingestionEntities.entityType, [...MAPPABLE_ENTITY_TYPES]),
          isNull(canonicalEntityMappings.entityId),
        ),
      )
  )[0];

  const activeOfferFreshnessRow = (
    await database
      .select({
        activeCatalogOffers: sql<number>`
          coalesce(sum(case when ${products.status} = 'active' then 1 else 0 end), 0)::int
        `.as("active_catalog_offers"),
        activeCheckedWithinWindow: sql<number>`
          coalesce(sum(case when ${products.status} = 'active' and ${offers.lastCheckedAt} is not null and ${offers.lastCheckedAt} >= now() - (${CATALOG_OFFER_FRESHNESS_WINDOW_HOURS} * interval '1 hour') then 1 else 0 end), 0)::int
        `.as("active_checked_within_window"),
        activeMissingCheckTimestamp: sql<number>`
          coalesce(sum(case when ${products.status} = 'active' and ${offers.lastCheckedAt} is null then 1 else 0 end), 0)::int
        `.as("active_missing_check_timestamp"),
        activeInStockPricedOffers: sql<number>`
          coalesce(sum(case when ${products.status} = 'active' and ${offers.inStock} = true and ${offers.priceCents} is not null then 1 else 0 end), 0)::int
        `.as("active_in_stock_priced_offers"),
      })
      .from(offers)
      .innerJoin(products, eq(offers.productId, products.id))
  )[0];

  const queued = queueCountByStatus.get("queued") ?? 0;
  const running = queueCountByStatus.get("running") ?? 0;
  const failed = queueCountByStatus.get("failed") ?? 0;
  const success = queueCountByStatus.get("success") ?? 0;
  const known = queued + running + failed + success;
  const total = [...queueCountByStatus.values()].reduce((sum, count) => sum + count, 0);

  const activeCatalogOffers = toNumber(activeOfferFreshnessRow?.activeCatalogOffers);
  const activeCheckedWithinWindow = toNumber(
    activeOfferFreshnessRow?.activeCheckedWithinWindow,
  );

  return {
    generatedAt: now.toISOString(),
    queue: {
      total,
      queued,
      running,
      failed,
      success,
      other: Math.max(0, total - known),
      readyNow: toNumber(readyNowRow?.count),
      staleQueued: toNumber(staleQueuedRow?.count),
      stuckRunning: toNumber(stuckRunningRow?.count),
    },
    freshness: {
      activeCatalogOffers,
      activeCheckedWithinWindow,
      activeStaleOrMissing: Math.max(0, activeCatalogOffers - activeCheckedWithinWindow),
      activeMissingCheckTimestamp: toNumber(activeOfferFreshnessRow?.activeMissingCheckTimestamp),
      activeInStockPricedOffers: toNumber(activeOfferFreshnessRow?.activeInStockPricedOffers),
      freshnessPercent: computeFreshnessPercent({
        checkedWithinWindow: activeCheckedWithinWindow,
        total: activeCatalogOffers,
      }),
      freshnessWindowHours: CATALOG_OFFER_FRESHNESS_WINDOW_HOURS,
      freshnessSloPercent: CATALOG_OFFER_FRESHNESS_SLO_PERCENT,
    },
    counts: {
      unmappedEntities: toNumber(unmappedEntityRow?.count),
    },
    runStatusLast24h: runStatusRows
      .map((row) => ({ status: row.status, count: toNumber(row.count) }))
      .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status)),
    recentRuns: recentRuns.map((row) => {
      const startedAt = toDate(row.startedAt) ?? new Date(0);
      const finishedAt = toDate(row.finishedAt);
      return {
        id: row.id,
        sourceSlug: row.sourceSlug,
        sourceName: row.sourceName,
        status: row.status,
        startedAt,
        finishedAt,
        durationMs:
          finishedAt && startedAt.getTime() > 0
            ? Math.max(0, finishedAt.getTime() - startedAt.getTime())
            : null,
        error: row.error,
      };
    }),
    recentFailedJobs: recentFailedJobs.map((row) => ({
      id: row.id,
      kind: row.kind,
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      runAfter: toDate(row.runAfter) ?? new Date(0),
      lastError: row.lastError,
      updatedAt: toDate(row.updatedAt) ?? new Date(0),
    })),
  };
}

async function recoverJobIds(params: {
  database: DbClient;
  action: Exclude<IngestionRecoveryAction, "enqueue_freshness_refresh">;
  limit: number;
  staleQueuedMinutes: number;
  stuckRunningMinutes: number;
}): Promise<string[]> {
  const now = new Date();

  if (params.action === "retry_failed_jobs") {
    const rows = await params.database
      .select({ id: ingestionJobs.id })
      .from(ingestionJobs)
      .where(eq(ingestionJobs.status, "failed"))
      .orderBy(desc(ingestionJobs.updatedAt))
      .limit(params.limit);
    return rows.map((row) => row.id);
  }

  if (params.action === "requeue_stale_queued_jobs") {
    const cutoff = new Date(now.getTime() - params.staleQueuedMinutes * 60 * 1000);
    const rows = await params.database
      .select({ id: ingestionJobs.id })
      .from(ingestionJobs)
      .where(and(eq(ingestionJobs.status, "queued"), lt(ingestionJobs.runAfter, cutoff)))
      .orderBy(ingestionJobs.runAfter)
      .limit(params.limit);
    return rows.map((row) => row.id);
  }

  const cutoff = new Date(now.getTime() - params.stuckRunningMinutes * 60 * 1000);
  const rows = await params.database
    .select({ id: ingestionJobs.id })
    .from(ingestionJobs)
    .where(
      and(
        eq(ingestionJobs.status, "running"),
        isNotNull(ingestionJobs.lockedAt),
        lt(ingestionJobs.lockedAt, cutoff),
      ),
    )
    .orderBy(ingestionJobs.lockedAt)
    .limit(params.limit);
  return rows.map((row) => row.id);
}

export async function applyIngestionRecoveryAction(params: {
  action: IngestionRecoveryAction;
  database?: DbClient;
  limit?: number;
  staleQueuedMinutes?: number;
  stuckRunningMinutes?: number;
}): Promise<IngestionRecoveryResult> {
  const database = params.database ?? db;
  const limit = Math.max(1, Math.min(1000, params.limit ?? DEFAULT_RECOVERY_LIMIT));
  const staleQueuedMinutes = Math.max(
    1,
    Math.min(24 * 60, params.staleQueuedMinutes ?? DEFAULT_STALE_QUEUED_MINUTES),
  );
  const stuckRunningMinutes = Math.max(
    1,
    Math.min(24 * 60, params.stuckRunningMinutes ?? DEFAULT_STUCK_RUNNING_MINUTES),
  );

  if (params.action === "enqueue_freshness_refresh") {
    const bucket = new Date().toISOString().slice(0, 16);
    const head = await enqueueIngestionJob({
      kind: "offers.head_refresh.bulk",
      payload: {
        olderThanHours: CATALOG_OFFER_FRESHNESS_WINDOW_HOURS,
        limit,
      },
      idempotencyKey: `admin-recovery:offers-head:${bucket}`,
      priority: 20,
    });
    const detail = await enqueueIngestionJob({
      kind: "offers.detail_refresh.bulk",
      payload: {
        olderThanHours: CATALOG_OFFER_FRESHNESS_WINDOW_HOURS,
        limit,
      },
      idempotencyKey: `admin-recovery:offers-detail:${bucket}`,
      priority: 20,
    });
    const buceVariants = await enqueueIngestionJob({
      kind: "offers.buceplant_variants_refresh",
      payload: {
        timeoutMs: 15000,
      },
      idempotencyKey: `admin-recovery:offers-buceplant-variants:${bucket}`,
      priority: 20,
    });

    return {
      action: params.action,
      affectedJobIds: [head.id, detail.id, buceVariants.id].filter(
        (value): value is string => Boolean(value),
      ),
      affectedCount: [head.id, detail.id, buceVariants.id].filter(
        (value) => value != null,
      ).length,
      limit,
      staleQueuedMinutes,
      stuckRunningMinutes,
      enqueued: { head, detail, buceVariants },
    };
  }

  const jobIds = await recoverJobIds({
    database,
    action: params.action,
    limit,
    staleQueuedMinutes,
    stuckRunningMinutes,
  });

  if (jobIds.length === 0) {
    return {
      action: params.action,
      affectedJobIds: [],
      affectedCount: 0,
      limit,
      staleQueuedMinutes,
      stuckRunningMinutes,
    };
  }

  const now = new Date();

  if (params.action === "retry_failed_jobs") {
    await database
      .update(ingestionJobs)
      .set({
        status: "queued",
        runAfter: now,
        lockedAt: null,
        lockedBy: null,
        finishedAt: null,
        lastError: null,
        attempts: 0,
        updatedAt: now,
      })
      .where(inArray(ingestionJobs.id, jobIds));
  } else {
    await database
      .update(ingestionJobs)
      .set({
        status: "queued",
        runAfter: now,
        lockedAt: null,
        lockedBy: null,
        finishedAt: null,
        lastError: null,
        updatedAt: now,
      })
      .where(inArray(ingestionJobs.id, jobIds));
  }

  return {
    action: params.action,
    affectedJobIds: jobIds,
    affectedCount: jobIds.length,
    limit,
    staleQueuedMinutes,
    stuckRunningMinutes,
  };
}
