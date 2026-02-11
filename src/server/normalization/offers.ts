import { eq } from "drizzle-orm";

import type { DbClient } from "@/server/db";
import { offers, priceHistory } from "@/server/db/schema";

export type OfferObservationApplyResult = {
  meaningfulChange: boolean;
  priceHistoryAppended: boolean;
};

export async function applyOfferDetailObservation(params: {
  db: DbClient;
  offerId: string;
  checkedAt: Date;
  observedPriceCents?: number | null;
  observedCurrency?: string | null;
  observedInStock?: boolean | null;
}): Promise<OfferObservationApplyResult> {
  const rows = await params.db
    .select({
      priceCents: offers.priceCents,
      currency: offers.currency,
      inStock: offers.inStock,
    })
    .from(offers)
    .where(eq(offers.id, params.offerId))
    .limit(1);

  const current = rows[0];
  if (!current) {
    return { meaningfulChange: false, priceHistoryAppended: false };
  }

  const nextPriceCents =
    params.observedPriceCents !== undefined && params.observedPriceCents !== null
      ? params.observedPriceCents
      : current.priceCents;

  const nextCurrency =
    params.observedCurrency !== undefined && params.observedCurrency !== null
      ? params.observedCurrency
      : current.currency;

  const nextInStock =
    params.observedInStock !== undefined && params.observedInStock !== null
      ? params.observedInStock
      : current.inStock;

  const priceChanged =
    params.observedPriceCents !== undefined &&
    params.observedPriceCents !== null &&
    params.observedPriceCents !== current.priceCents;
  const currencyChanged =
    params.observedCurrency !== undefined &&
    params.observedCurrency !== null &&
    params.observedCurrency !== current.currency;
  const stockChanged =
    params.observedInStock !== undefined &&
    params.observedInStock !== null &&
    params.observedInStock !== current.inStock;

  const meaningfulChange = priceChanged || currencyChanged || stockChanged;

  const updateValues: {
    lastCheckedAt: Date;
    updatedAt?: Date;
    priceCents?: number | null;
    currency?: string;
    inStock?: boolean;
  } = {
    lastCheckedAt: params.checkedAt,
  };

  if (meaningfulChange) {
    updateValues.updatedAt = params.checkedAt;
    updateValues.priceCents = nextPriceCents;
    updateValues.currency = nextCurrency;
    updateValues.inStock = nextInStock;
  }

  await params.db
    .update(offers)
    .set(updateValues)
    .where(eq(offers.id, params.offerId));

  let priceHistoryAppended = false;
  if (meaningfulChange && nextPriceCents != null) {
    await params.db.insert(priceHistory).values({
      offerId: params.offerId,
      priceCents: nextPriceCents,
      inStock: nextInStock,
      recordedAt: params.checkedAt,
    });
    priceHistoryAppended = true;
  }

  return { meaningfulChange, priceHistoryAppended };
}

export async function applyOfferHeadObservation(params: {
  db: DbClient;
  offerId: string;
  ok: boolean;
  checkedAt: Date;
}): Promise<void> {
  await applyOfferDetailObservation({
    db: params.db,
    offerId: params.offerId,
    checkedAt: params.checkedAt,
    observedInStock: params.ok,
  });
}
