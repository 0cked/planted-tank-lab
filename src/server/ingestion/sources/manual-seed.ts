import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import {
  ingestionEntities,
  ingestionEntitySnapshots,
  ingestionRuns,
} from "@/server/db/schema";
import { sha256Hex, stableJsonStringify } from "@/server/ingestion/hash";
import { ensureIngestionSource } from "@/server/ingestion/sources";

type ManualSeedEntityType = "product" | "plant" | "offer";

type TrustField = {
  value: unknown;
  trust: "manual_seed";
  provenance: {
    source: "manual_seed";
    fieldPath: string;
  };
};

function buildTrustFields(input: unknown, path = "", out: Record<string, TrustField> = {}) {
  if (input === null || input === undefined) {
    if (path) {
      out[path] = {
        value: input,
        trust: "manual_seed",
        provenance: {
          source: "manual_seed",
          fieldPath: path,
        },
      };
    }
    return out;
  }

  if (Array.isArray(input)) {
    if (path) {
      out[path] = {
        value: input,
        trust: "manual_seed",
        provenance: {
          source: "manual_seed",
          fieldPath: path,
        },
      };
    }
    return out;
  }

  if (typeof input === "object") {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        buildTrustFields(value, nextPath, out);
      } else {
        out[nextPath] = {
          value,
          trust: "manual_seed",
          provenance: {
            source: "manual_seed",
            fieldPath: nextPath,
            },
        };
      }
    }
    return out;
  }

  if (path) {
    out[path] = {
      value: input,
      trust: "manual_seed",
      provenance: {
        source: "manual_seed",
        fieldPath: path,
      },
    };
  }

  return out;
}

export async function ensureManualSeedSource(): Promise<string> {
  return ensureIngestionSource({
    slug: "manual_seed",
    name: "Manual seed import",
    kind: "manual_seed",
    defaultTrust: "manual_seed",
    scheduleEveryMinutes: null,
    config: {
      mode: "seed",
      ingestionBoundary: "ingestion -> normalization -> canonical",
    },
  });
}

export async function createManualSeedRun(sourceId: string): Promise<string> {
  const rows = await db
    .insert(ingestionRuns)
    .values({
      sourceId,
      status: "running",
      startedAt: new Date(),
      createdAt: new Date(),
      stats: {},
    })
    .returning({ id: ingestionRuns.id });

  const runId = rows[0]?.id;
  if (!runId) throw new Error("Failed to create manual seed ingestion run");
  return runId;
}

export async function finishManualSeedRun(params: {
  runId: string;
  status: "success" | "failed";
  stats: Record<string, unknown>;
  error?: string;
}): Promise<void> {
  await db
    .update(ingestionRuns)
    .set({
      status: params.status,
      finishedAt: new Date(),
      stats: params.stats,
      error: params.error ?? null,
    })
    .where(eq(ingestionRuns.id, params.runId));
}

export async function ingestManualSeedSnapshot(params: {
  sourceId: string;
  runId: string;
  entityType: ManualSeedEntityType;
  sourceEntityId: string;
  url?: string | null;
  raw: Record<string, unknown>;
}): Promise<{ entityId: string; snapshotCreated: boolean }> {
  const entityRows = await db
    .insert(ingestionEntities)
    .values({
      sourceId: params.sourceId,
      entityType: params.entityType,
      sourceEntityId: params.sourceEntityId,
      url: params.url ?? null,
      active: true,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
      meta: {
        seed: true,
        sourceEntityId: params.sourceEntityId,
      },
    })
    .onConflictDoUpdate({
      target: [
        ingestionEntities.sourceId,
        ingestionEntities.entityType,
        ingestionEntities.sourceEntityId,
      ],
      set: {
        url: params.url ?? null,
        active: true,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning({ id: ingestionEntities.id });

  const entityId = entityRows[0]?.id;
  if (!entityId) {
    const fallback = await db
      .select({ id: ingestionEntities.id })
      .from(ingestionEntities)
      .where(
        and(
          eq(ingestionEntities.sourceId, params.sourceId),
          eq(ingestionEntities.entityType, params.entityType),
          eq(ingestionEntities.sourceEntityId, params.sourceEntityId),
        ),
      )
      .limit(1);

    if (!fallback[0]?.id) {
      throw new Error(`Failed to upsert ingestion entity ${params.entityType}:${params.sourceEntityId}`);
    }
  }

  const resolvedEntityId = entityId ?? (await db
    .select({ id: ingestionEntities.id })
    .from(ingestionEntities)
    .where(
      and(
        eq(ingestionEntities.sourceId, params.sourceId),
        eq(ingestionEntities.entityType, params.entityType),
        eq(ingestionEntities.sourceEntityId, params.sourceEntityId),
      ),
    )
    .limit(1))[0]?.id;

  if (!resolvedEntityId) {
    throw new Error(`Missing ingestion entity id for ${params.entityType}:${params.sourceEntityId}`);
  }

  const canonicalRaw = stableJsonStringify(params.raw);
  const contentHash = sha256Hex(canonicalRaw);
  const observedAt = new Date().toISOString();
  const trustFields = buildTrustFields(params.raw);

  const snapshotRows = await db
    .insert(ingestionEntitySnapshots)
    .values({
      entityId: resolvedEntityId,
      runId: params.runId,
      fetchedAt: new Date(),
      rawJson: params.raw,
      extracted: {
        fields: trustFields,
        meta: {
          source: "manual_seed",
          observedAt,
          entityType: params.entityType,
          sourceEntityId: params.sourceEntityId,
        },
      },
      contentHash,
      trust: {
        default: "manual_seed",
        fields: Object.fromEntries(
          Object.keys(trustFields).map((fieldPath) => [fieldPath, "manual_seed"]),
        ),
      },
      createdAt: new Date(),
    })
    .onConflictDoNothing({
      target: [ingestionEntitySnapshots.entityId, ingestionEntitySnapshots.contentHash],
    })
    .returning({ id: ingestionEntitySnapshots.id });

  return {
    entityId: resolvedEntityId,
    snapshotCreated: Boolean(snapshotRows[0]?.id),
  };
}
