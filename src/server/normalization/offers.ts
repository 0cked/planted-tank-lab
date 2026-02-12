import { and, eq, inArray } from "drizzle-orm";

import { sanitizeCatalogImageUrl } from "@/lib/catalog-guardrails";
import type { DbClient } from "@/server/db";
import {
  normalizationOverrides,
  offers,
  priceHistory,
  products,
} from "@/server/db/schema";
import { refreshOfferSummaryForProductId } from "@/server/services/offer-summaries";

const PRODUCT_IMAGE_OVERRIDE_FIELD_PATHS = [
  "imageUrl",
  "imageUrls",
  "image_url",
  "image_urls",
] as const;

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function hasCatalogImage(imageUrl: string | null, imageUrls: unknown): boolean {
  return (imageUrl ?? "").trim().length > 0 || toStringArray(imageUrls).length > 0;
}

async function hasProductImageOverride(params: {
  db: DbClient;
  productId: string;
}): Promise<boolean> {
  const rows = await params.db
    .select({ id: normalizationOverrides.id })
    .from(normalizationOverrides)
    .where(
      and(
        eq(normalizationOverrides.canonicalType, "product"),
        eq(normalizationOverrides.canonicalId, params.productId),
        inArray(normalizationOverrides.fieldPath, [
          ...PRODUCT_IMAGE_OVERRIDE_FIELD_PATHS,
        ]),
      ),
    )
    .limit(1);

  return Boolean(rows[0]?.id);
}

async function hydrateProductImageFromOfferObservation(params: {
  db: DbClient;
  productId: string;
  checkedAt: Date;
  observedProductImageUrl?: string | null;
}): Promise<boolean> {
  const sanitizedImageUrl = sanitizeCatalogImageUrl(
    params.observedProductImageUrl ?? null,
  );
  if (!sanitizedImageUrl) return false;

  if (
    await hasProductImageOverride({
      db: params.db,
      productId: params.productId,
    })
  ) {
    return false;
  }

  const rows = await params.db
    .select({
      imageUrl: products.imageUrl,
      imageUrls: products.imageUrls,
    })
    .from(products)
    .where(eq(products.id, params.productId))
    .limit(1);

  const current = rows[0];
  if (!current) return false;
  if (hasCatalogImage(current.imageUrl, current.imageUrls)) return false;

  await params.db
    .update(products)
    .set({
      imageUrl: sanitizedImageUrl,
      imageUrls: [sanitizedImageUrl],
      updatedAt: params.checkedAt,
    })
    .where(eq(products.id, params.productId));

  return true;
}

export type OfferObservationApplyResult = {
  meaningfulChange: boolean;
  priceHistoryAppended: boolean;
  productImageHydrated: boolean;
};

export async function applyOfferDetailObservation(params: {
  db: DbClient;
  offerId: string;
  checkedAt: Date;
  observedPriceCents?: number | null;
  observedCurrency?: string | null;
  observedInStock?: boolean | null;
  observedProductImageUrl?: string | null;
}): Promise<OfferObservationApplyResult> {
  const rows = await params.db
    .select({
      productId: offers.productId,
      priceCents: offers.priceCents,
      currency: offers.currency,
      inStock: offers.inStock,
    })
    .from(offers)
    .where(eq(offers.id, params.offerId))
    .limit(1);

  const current = rows[0];
  if (!current) {
    return {
      meaningfulChange: false,
      priceHistoryAppended: false,
      productImageHydrated: false,
    };
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

  await params.db.update(offers).set(updateValues).where(eq(offers.id, params.offerId));

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

  const productImageHydrated = await hydrateProductImageFromOfferObservation({
    db: params.db,
    productId: current.productId,
    checkedAt: params.checkedAt,
    observedProductImageUrl: params.observedProductImageUrl,
  });

  await refreshOfferSummaryForProductId({
    db: params.db,
    productId: current.productId,
    now: params.checkedAt,
  });

  return { meaningfulChange, priceHistoryAppended, productImageHydrated };
}

export async function applyOfferHeadObservation(params: {
  db: DbClient;
  offerId: string;
  ok: boolean | null;
  checkedAt: Date;
}): Promise<void> {
  await applyOfferDetailObservation({
    db: params.db,
    offerId: params.offerId,
    checkedAt: params.checkedAt,
    observedInStock: typeof params.ok === "boolean" ? params.ok : undefined,
  });
}
