import { and, eq, isNotNull, sql as dsql } from "drizzle-orm";

import type { DbClient } from "@/server/db";
import {
  canonicalEntityMappings,
  ingestionEntities,
  ingestionEntitySnapshots,
  offers,
} from "@/server/db/schema";
import { sha256Hex, stableJsonStringify } from "@/server/ingestion/hash";
import { availabilitySignalFromStatus } from "@/server/ingestion/sources/availability-signal";
import {
  DEFAULT_OFFERS_REFRESH_OLDER_THAN_HOURS,
  resolveOffersRefreshWindowHours,
} from "@/server/ingestion/sources/offers-refresh-window";
import { applyOfferHeadObservation } from "@/server/normalization/offers";

type OfferRow = {
  id: string;
  url: string;
};

export type OffersHeadRefreshResult = {
  scanned: number;
  updated: number;
  failed: number;
};

async function getOffersToRefresh(params: {
  db: DbClient;
  olderThanHours?: number;
  olderThanDays?: number;
  limit: number;
}): Promise<OfferRow[]> {
  const refreshWindowHours = resolveOffersRefreshWindowHours({
    olderThanHours: params.olderThanHours,
    olderThanDays: params.olderThanDays,
    defaultHours: DEFAULT_OFFERS_REFRESH_OLDER_THAN_HOURS,
  });

  const rows = await params.db
    .select({ id: offers.id, url: offers.url })
    .from(offers)
    .where(
      and(
        isNotNull(offers.url),
        dsql<boolean>`coalesce(${offers.lastCheckedAt}, ${offers.updatedAt}) < now() - (${refreshWindowHours} * interval '1 hour')`,
      ),
    )
    .orderBy(
      dsql`coalesce(${offers.lastCheckedAt}, ${offers.updatedAt}) asc`,
      offers.id,
    )
    .limit(params.limit);

  return rows
    .map((r) => ({ id: r.id, url: r.url }))
    .filter((r): r is OfferRow => !!r.url);
}

async function getOfferById(params: { db: DbClient; offerId: string }): Promise<OfferRow | null> {
  const rows = await params.db
    .select({ id: offers.id, url: offers.url })
    .from(offers)
    .where(eq(offers.id, params.offerId))
    .limit(1);
  const row = rows[0];
  if (!row?.url) return null;
  return { id: row.id, url: row.url };
}

async function upsertOfferEntity(params: {
  db: DbClient;
  sourceId: string;
  offer: OfferRow;
}): Promise<string> {
  const rows = await params.db
    .insert(ingestionEntities)
    .values({
      sourceId: params.sourceId,
      entityType: "offer",
      sourceEntityId: params.offer.id,
      url: params.offer.url,
      active: true,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        ingestionEntities.sourceId,
        ingestionEntities.entityType,
        ingestionEntities.sourceEntityId,
      ],
      set: {
        url: params.offer.url,
        active: true,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning({ id: ingestionEntities.id });

  const id = rows[0]?.id;
  if (id) return id;

  const fallback = await params.db
    .select({ id: ingestionEntities.id })
    .from(ingestionEntities)
    .where(
      and(
        eq(ingestionEntities.sourceId, params.sourceId),
        eq(ingestionEntities.entityType, "offer"),
        eq(ingestionEntities.sourceEntityId, params.offer.id),
      ),
    )
    .limit(1);

  const fb = fallback[0]?.id;
  if (!fb) throw new Error("Failed to upsert ingestion entity for offer");
  return fb;
}

async function upsertCanonicalMapping(params: {
  db: DbClient;
  entityId: string;
  offerId: string;
}): Promise<void> {
  await params.db
    .insert(canonicalEntityMappings)
    .values({
      entityId: params.entityId,
      canonicalType: "offer",
      canonicalId: params.offerId,
      matchMethod: "offer_id",
      confidence: 100,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: canonicalEntityMappings.entityId,
      set: {
        canonicalType: "offer",
        canonicalId: params.offerId,
        matchMethod: "offer_id",
        confidence: 100,
        updatedAt: new Date(),
      },
    });
}

async function headCheck(params: {
  url: string;
  timeoutMs: number;
}): Promise<{
  availabilitySignal: boolean | null;
  status: number | null;
  finalUrl: string | null;
  contentType: string | null;
}> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), params.timeoutMs);
  try {
    const res = await fetch(params.url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "PlantedTankLabIngestion/1.0",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    return {
      availabilitySignal: availabilitySignalFromStatus(res.status),
      status: res.status,
      finalUrl: res.url || null,
      contentType: res.headers.get("content-type"),
    };
  } catch {
    return {
      availabilitySignal: null,
      status: null,
      finalUrl: null,
      contentType: null,
    };
  } finally {
    clearTimeout(t);
  }
}

export async function runOffersHeadRefresh(params: {
  db: DbClient;
  sourceId: string;
  runId: string;
  mode: "bulk" | "one";
  olderThanHours?: number;
  olderThanDays?: number;
  limit?: number;
  offerId?: string;
  timeoutMs: number;
}): Promise<OffersHeadRefreshResult> {
  let offersToCheck: OfferRow[] = [];
  if (params.mode === "one") {
    const offerId = params.offerId;
    if (!offerId) return { scanned: 0, updated: 0, failed: 0 };
    const row = await getOfferById({ db: params.db, offerId });
    if (!row) return { scanned: 0, updated: 0, failed: 0 };
    offersToCheck = [row];
  } else {
    offersToCheck = await getOffersToRefresh({
      db: params.db,
      olderThanHours: params.olderThanHours,
      olderThanDays: params.olderThanDays,
      limit: params.limit ?? 30,
    });
  }

  let updated = 0;
  let failed = 0;

  for (const offer of offersToCheck) {
    try {
      const checkedAt = new Date();
      const minuteBucket = Math.floor(checkedAt.getTime() / 60000);

      const result = await headCheck({ url: offer.url, timeoutMs: params.timeoutMs });

      const entityId = await upsertOfferEntity({
        db: params.db,
        sourceId: params.sourceId,
        offer,
      });

      await upsertCanonicalMapping({ db: params.db, entityId, offerId: offer.id });

      const rawJson = {
        url: offer.url,
        finalUrl: result.finalUrl,
        status: result.status,
        contentType: result.contentType,
        availabilitySignal: result.availabilitySignal,
        observedMinute: minuteBucket,
      };
      const contentHash = sha256Hex(stableJsonStringify(rawJson));

      const extractedFields: Record<string, { value: unknown; trust: "retailer" }> = {};
      const trustFields: Record<string, "retailer"> = {};
      if (result.availabilitySignal != null) {
        extractedFields.in_stock = {
          value: result.availabilitySignal,
          trust: "retailer",
        };
        trustFields.in_stock = "retailer";
      }

      const inserted = await params.db
        .insert(ingestionEntitySnapshots)
        .values({
          entityId,
          runId: params.runId,
          fetchedAt: checkedAt,
          httpStatus: result.status,
          contentType: result.contentType ?? undefined,
          rawJson,
          extracted: {
            fields: extractedFields,
          },
          trust: trustFields,
          contentHash,
        })
        .onConflictDoNothing({
          target: [ingestionEntitySnapshots.entityId, ingestionEntitySnapshots.contentHash],
        })
        .returning({ id: ingestionEntitySnapshots.id });

      if (result.status == null) {
        failed += 1;
        continue;
      }

      // Even if we dedupe snapshots within a minute window, we still update canonical freshness.
      await applyOfferHeadObservation({
        db: params.db,
        offerId: offer.id,
        ok: result.availabilitySignal,
        checkedAt,
      });

      // If a snapshot was inserted, count it as updated (useful for run stats).
      if (inserted.length > 0) updated += 1;
    } catch {
      failed += 1;
    }
  }

  return { scanned: offersToCheck.length, updated, failed };
}
