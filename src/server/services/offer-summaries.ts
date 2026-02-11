import { eq, inArray, max, sql } from "drizzle-orm";

import type { DbClient } from "@/server/db";
import { offers, offerSummaries } from "@/server/db/schema";

export const OFFER_SUMMARY_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export type OfferSummaryRow = {
  productId: string;
  minPriceCents: number | null;
  inStockCount: number;
  staleFlag: boolean;
  checkedAt: Date | null;
  updatedAt: Date;
};

function uniqueProductIds(productIds: string[]): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const productId of productIds) {
    if (!productId || seen.has(productId)) continue;
    seen.add(productId);
    deduped.push(productId);
  }

  return deduped;
}

export function computeOfferSummaryStaleFlag(params: {
  checkedAt: Date | null;
  now?: Date;
  staleAfterMs?: number;
}): boolean {
  const staleAfterMs = params.staleAfterMs ?? OFFER_SUMMARY_STALE_AFTER_MS;
  if (!params.checkedAt) return true;

  const nowMs = (params.now ?? new Date()).getTime();
  return params.checkedAt.getTime() < nowMs - staleAfterMs;
}

async function aggregateSummaryForProduct(params: {
  db: DbClient;
  productId: string;
}): Promise<
  | {
      productId: string;
      minPriceCents: number | null;
      inStockCount: number;
      checkedAt: Date | null;
    }
  | null
> {
  const rows = await params.db
    .select({
      productId: offers.productId,
      minPriceCents: sql<number | null>`
        min(case when ${offers.inStock} = true and ${offers.priceCents} is not null then ${offers.priceCents} else null end)
      `.as("min_price_cents"),
      inStockCount: sql<number>`
        coalesce(sum(case when ${offers.inStock} = true then 1 else 0 end), 0)::int
      `.as("in_stock_count"),
      checkedAt: max(offers.lastCheckedAt).as("checked_at"),
    })
    .from(offers)
    .where(eq(offers.productId, params.productId))
    .groupBy(offers.productId)
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    productId: row.productId,
    minPriceCents: row.minPriceCents,
    inStockCount: Number(row.inStockCount ?? 0),
    checkedAt: row.checkedAt,
  };
}

export async function refreshOfferSummaryForProductId(params: {
  db: DbClient;
  productId: string;
  now?: Date;
  staleAfterMs?: number;
}): Promise<void> {
  const summary = await aggregateSummaryForProduct({
    db: params.db,
    productId: params.productId,
  });

  if (!summary) {
    await params.db
      .delete(offerSummaries)
      .where(eq(offerSummaries.productId, params.productId));
    return;
  }

  const now = params.now ?? new Date();
  const staleFlag = computeOfferSummaryStaleFlag({
    checkedAt: summary.checkedAt,
    now,
    staleAfterMs: params.staleAfterMs,
  });

  await params.db
    .insert(offerSummaries)
    .values({
      productId: summary.productId,
      minPriceCents: summary.minPriceCents,
      inStockCount: summary.inStockCount,
      staleFlag,
      checkedAt: summary.checkedAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: offerSummaries.productId,
      set: {
        minPriceCents: summary.minPriceCents,
        inStockCount: summary.inStockCount,
        staleFlag,
        checkedAt: summary.checkedAt,
        updatedAt: now,
      },
    });
}

export async function refreshOfferSummariesForProductIds(params: {
  db: DbClient;
  productIds: string[];
  now?: Date;
  staleAfterMs?: number;
}): Promise<void> {
  const productIds = uniqueProductIds(params.productIds);
  if (productIds.length === 0) return;

  for (const productId of productIds) {
    await refreshOfferSummaryForProductId({
      db: params.db,
      productId,
      now: params.now,
      staleAfterMs: params.staleAfterMs,
    });
  }
}

export async function listOfferSummariesByProductIds(params: {
  db: DbClient;
  productIds: string[];
}): Promise<OfferSummaryRow[]> {
  const productIds = uniqueProductIds(params.productIds);
  if (productIds.length === 0) return [];

  const rows = await params.db
    .select({
      productId: offerSummaries.productId,
      minPriceCents: offerSummaries.minPriceCents,
      inStockCount: offerSummaries.inStockCount,
      staleFlag: offerSummaries.staleFlag,
      checkedAt: offerSummaries.checkedAt,
      updatedAt: offerSummaries.updatedAt,
    })
    .from(offerSummaries)
    .where(inArray(offerSummaries.productId, productIds));

  const rowByProductId = new Map(rows.map((row) => [row.productId, row] as const));
  return productIds.flatMap((productId) => {
    const row = rowByProductId.get(productId);
    return row ? [row] : [];
  });
}

export async function ensureOfferSummariesByProductIds(params: {
  db: DbClient;
  productIds: string[];
  now?: Date;
  staleAfterMs?: number;
}): Promise<OfferSummaryRow[]> {
  const productIds = uniqueProductIds(params.productIds);
  if (productIds.length === 0) return [];

  let rows = await listOfferSummariesByProductIds({
    db: params.db,
    productIds,
  });

  const present = new Set(rows.map((row) => row.productId));
  const missing = productIds.filter((productId) => !present.has(productId));

  if (missing.length > 0) {
    await refreshOfferSummariesForProductIds({
      db: params.db,
      productIds: missing,
      now: params.now,
      staleAfterMs: params.staleAfterMs,
    });

    rows = await listOfferSummariesByProductIds({
      db: params.db,
      productIds,
    });
  }

  return rows;
}
