import { and, desc, eq, inArray, like } from "drizzle-orm";
import { z } from "zod";

import { sanitizeCatalogImageUrl } from "@/lib/catalog-guardrails";
import type { DbClient } from "@/server/db";
import {
  canonicalEntityMappings,
  categories,
  ingestionEntities,
  ingestionEntitySnapshots,
  offers,
  products,
  retailers,
} from "@/server/db/schema";
import { sha256Hex, stableJsonStringify } from "@/server/ingestion/hash";
import { applyOfferDetailObservation } from "@/server/normalization/offers";

const BUCEPLANT_BASE_URL = "https://buceplant.com";
const BUCEPLANT_UNS_TANKS_URL =
  "https://buceplant.com/collections/uns-ultracleartanks/products/ultum-clear-rimless-tanks-by-ultum-nature-systems";
const BUCEPLANT_SPIDERWOOD_URL =
  "https://buceplant.com/collections/wood/products/spiderwood?variant=3836994322472";
const BUCEPLANT_SPIDERWOOD_PREFERRED_VARIANT_ID = "3836994322472";

const RawBuceVariantSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().nullable().optional(),
  price: z.union([z.string(), z.number()]).nullable().optional(),
  available: z.boolean().nullable().optional(),
  sku: z.string().nullable().optional(),
  option1: z.string().nullable().optional(),
  option2: z.string().nullable().optional(),
  option3: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  featured_image: z.unknown().nullable().optional(),
});

const RawBuceProductSchema = z.object({
  handle: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  featured_image: z.string().nullable().optional(),
  variants: z.array(RawBuceVariantSchema),
});

type BuceVariant = {
  id: string;
  title: string;
  priceCents: number | null;
  available: boolean | null;
  sku: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  name: string | null;
  featuredImageUrl: string | null;
};

type BuceProductPayload = {
  handle: string | null;
  title: string | null;
  featuredImageUrl: string | null;
  variants: BuceVariant[];
};

export type OffersBuceplantVariantsRefreshResult = {
  scanned: number;
  updated: number;
  failed: number;
  createdOffers: number;
};

function normalizeAbsoluteUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withScheme = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;

  try {
    const parsed = new URL(withScheme, BUCEPLANT_BASE_URL);
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeCatalogImageUrl(value: string | null | undefined): string | null {
  const absolute = normalizeAbsoluteUrl(value);
  if (!absolute) return null;
  return sanitizeCatalogImageUrl(absolute);
}

function parsePriceCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }

  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;

  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  if (cleaned.includes(".")) {
    return Math.round(parsed * 100);
  }

  return Math.round(parsed);
}

function extractVariantImageUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  if (typeof obj.src === "string") {
    return normalizeCatalogImageUrl(obj.src);
  }

  if (typeof obj.url === "string") {
    return normalizeCatalogImageUrl(obj.url);
  }

  return null;
}

function parseBuceProduct(raw: unknown): BuceProductPayload | null {
  const parsed = RawBuceProductSchema.safeParse(raw);
  if (!parsed.success) return null;

  return {
    handle: parsed.data.handle?.trim() || null,
    title: parsed.data.title?.trim() || null,
    featuredImageUrl: normalizeCatalogImageUrl(parsed.data.featured_image),
    variants: parsed.data.variants.map((variant) => ({
      id: String(variant.id),
      title: variant.title?.trim() || "",
      priceCents: parsePriceCents(variant.price),
      available: typeof variant.available === "boolean" ? variant.available : null,
      sku: variant.sku?.trim() || null,
      option1: variant.option1?.trim() || null,
      option2: variant.option2?.trim() || null,
      option3: variant.option3?.trim() || null,
      name: variant.name?.trim() || null,
      featuredImageUrl: extractVariantImageUrl(variant.featured_image),
    })),
  };
}

export function extractBuceplantStaticProductPayload(html: string): BuceProductPayload | null {
  const scriptRegex =
    /<script[^>]*data-section-type=["']static-product["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const body = match[1]?.trim();
    if (!body) continue;

    try {
      const parsed = JSON.parse(body) as unknown;
      if (!parsed || typeof parsed !== "object") continue;
      const product = (parsed as { product?: unknown }).product;
      const payload = parseBuceProduct(product);
      if (payload) return payload;
    } catch {
      // ignore malformed inline scripts
    }
  }

  return null;
}

function extractUnsModelCode(value: string | null | undefined): string | null {
  if (!value) return null;

  const fromBracket = value.match(/\[\s*([A-Za-z0-9]+)\s*\]/);
  if (fromBracket?.[1]) {
    return fromBracket[1].toUpperCase();
  }

  const compact = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const fromSku = compact.match(/UNS([0-9]+[A-Z]+)/);
  if (fromSku?.[1]) {
    return fromSku[1].toUpperCase();
  }

  return null;
}

export function unsModelCodeFromProductSlug(slug: string): string | null {
  if (!slug.startsWith("uns-")) return null;
  const suffix = slug.slice(4).trim();
  if (!suffix || suffix.startsWith("stand-")) return null;
  return suffix.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export function matchUnsVariantForProductSlug(
  variants: BuceVariant[],
  productSlug: string,
): BuceVariant | null {
  const modelCode = unsModelCodeFromProductSlug(productSlug);
  if (!modelCode) return null;

  for (const variant of variants) {
    const code =
      extractUnsModelCode(variant.title) ||
      extractUnsModelCode(variant.option1) ||
      extractUnsModelCode(variant.sku);

    if (code && code === modelCode) {
      return variant;
    }
  }

  return null;
}

export function selectSpiderwoodVariant(variants: BuceVariant[]): BuceVariant | null {
  const explicit = variants.find(
    (variant) => variant.id === BUCEPLANT_SPIDERWOOD_PREFERRED_VARIANT_ID,
  );
  if (explicit) return explicit;

  const smallSingle = variants.find((variant) => {
    const t = variant.title.toLowerCase();
    return t.includes("small") && t.includes("single");
  });
  if (smallSingle) return smallSingle;

  const firstAvailable = variants.find((variant) => variant.available === true);
  if (firstAvailable) return firstAvailable;

  return variants[0] ?? null;
}

async function fetchHtml(params: {
  url: string;
  timeoutMs: number;
}): Promise<{ finalUrl: string; html: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);

  try {
    const res = await fetch(params.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "PlantedTankLabIngestion/1.0",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    const html = await res.text();
    if (!res.ok || !html) return null;

    return {
      finalUrl: res.url || params.url,
      html,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function findBuceRetailerId(db: DbClient): Promise<string> {
  const rows = await db
    .select({ id: retailers.id })
    .from(retailers)
    .where(eq(retailers.slug, "buceplant"))
    .limit(1);

  const id = rows[0]?.id;
  if (!id) {
    throw new Error("Missing buceplant retailer row");
  }

  return id;
}

async function loadUnsTankProducts(db: DbClient): Promise<Array<{ id: string; slug: string }>> {
  return db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(categories.slug, "tank"), like(products.slug, "uns-%")));
}

async function loadSpiderwoodProduct(db: DbClient): Promise<{ id: string; slug: string } | null> {
  const rows = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(eq(products.slug, "spider-wood"))
    .limit(1);

  return rows[0] ?? null;
}

async function loadExistingRetailerOffers(params: {
  db: DbClient;
  retailerId: string;
  productIds: string[];
}): Promise<Map<string, { id: string; url: string }>> {
  if (params.productIds.length === 0) return new Map();

  const rows = await params.db
    .select({ id: offers.id, productId: offers.productId, url: offers.url })
    .from(offers)
    .where(
      and(
        eq(offers.retailerId, params.retailerId),
        inArray(offers.productId, params.productIds),
      ),
    )
    .orderBy(desc(offers.updatedAt), desc(offers.createdAt));

  const map = new Map<string, { id: string; url: string }>();
  for (const row of rows) {
    if (map.has(row.productId)) continue;
    map.set(row.productId, { id: row.id, url: row.url });
  }

  return map;
}

async function ensureOfferForProduct(params: {
  db: DbClient;
  retailerId: string;
  productId: string;
  defaultUrl: string;
  existingOffersByProductId: Map<string, { id: string; url: string }>;
}): Promise<{ id: string; created: boolean; previousUrl: string | null }> {
  const existing = params.existingOffersByProductId.get(params.productId);
  if (existing) {
    return { id: existing.id, created: false, previousUrl: existing.url };
  }

  const inserted = await params.db
    .insert(offers)
    .values({
      productId: params.productId,
      retailerId: params.retailerId,
      priceCents: null,
      currency: "USD",
      url: params.defaultUrl,
      inStock: false,
      lastCheckedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: offers.id, url: offers.url });

  const row = inserted[0];
  if (!row) {
    throw new Error("Failed to create retailer offer");
  }

  params.existingOffersByProductId.set(params.productId, { id: row.id, url: row.url });

  return {
    id: row.id,
    created: true,
    previousUrl: null,
  };
}

async function upsertOfferEntity(params: {
  db: DbClient;
  sourceId: string;
  offerId: string;
  url: string;
}): Promise<string> {
  const rows = await params.db
    .insert(ingestionEntities)
    .values({
      sourceId: params.sourceId,
      entityType: "offer",
      sourceEntityId: params.offerId,
      url: params.url,
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
        url: params.url,
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
        eq(ingestionEntities.sourceEntityId, params.offerId),
      ),
    )
    .limit(1);

  const fallbackId = fallback[0]?.id;
  if (!fallbackId) {
    throw new Error("Failed to upsert ingestion entity for buceplant offer variant");
  }

  return fallbackId;
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

function buildVariantUrl(params: {
  fallbackUrl: string;
  productHandle: string | null;
  variantId: string;
}): string {
  if (!params.productHandle) {
    const parsedFallback = normalizeAbsoluteUrl(params.fallbackUrl);
    if (parsedFallback) return `${parsedFallback}?variant=${params.variantId}`;
    return `${BUCEPLANT_BASE_URL}/?variant=${params.variantId}`;
  }

  return `${BUCEPLANT_BASE_URL}/products/${params.productHandle}?variant=${params.variantId}`;
}

async function syncVariantToOffer(params: {
  db: DbClient;
  sourceId: string;
  runId: string;
  offerId: string;
  previousUrl: string | null;
  url: string;
  checkedAt: Date;
  variant: BuceVariant;
  productHandle: string | null;
  productImageUrl: string | null;
  sourceLabel: "uns_tanks" | "spiderwood";
}): Promise<{ updated: boolean; urlChanged: boolean }> {
  const urlChanged = params.previousUrl !== params.url;

  if (urlChanged) {
    await params.db
      .update(offers)
      .set({ url: params.url, updatedAt: params.checkedAt })
      .where(eq(offers.id, params.offerId));
  }

  const entityId = await upsertOfferEntity({
    db: params.db,
    sourceId: params.sourceId,
    offerId: params.offerId,
    url: params.url,
  });

  await upsertCanonicalMapping({ db: params.db, entityId, offerId: params.offerId });

  const rawJson = {
    source: "buceplant_static_product",
    sourceLabel: params.sourceLabel,
    observationUrl: params.url,
    productHandle: params.productHandle,
    variant: {
      id: params.variant.id,
      title: params.variant.title,
      sku: params.variant.sku,
      option1: params.variant.option1,
      option2: params.variant.option2,
      option3: params.variant.option3,
      priceCents: params.variant.priceCents,
      available: params.variant.available,
      featuredImageUrl: params.variant.featuredImageUrl,
    },
    observedMinute: Math.floor(params.checkedAt.getTime() / 60000),
  };
  const contentHash = sha256Hex(stableJsonStringify(rawJson));

  const extractedFields: Record<string, { value: unknown; trust: "retailer" }> = {};
  const trustFields: Record<string, "retailer"> = {};

  if (params.variant.priceCents != null) {
    extractedFields.price_cents = { value: params.variant.priceCents, trust: "retailer" };
    trustFields.price_cents = "retailer";
  }

  if (typeof params.variant.available === "boolean") {
    extractedFields.in_stock = { value: params.variant.available, trust: "retailer" };
    trustFields.in_stock = "retailer";
  }

  extractedFields.currency = { value: "USD", trust: "retailer" };
  trustFields.currency = "retailer";

  extractedFields.variant_id = { value: params.variant.id, trust: "retailer" };
  trustFields.variant_id = "retailer";

  if (params.variant.sku) {
    extractedFields.source_sku = { value: params.variant.sku, trust: "retailer" };
    trustFields.source_sku = "retailer";
  }

  const observedImage =
    params.variant.featuredImageUrl ?? params.productImageUrl ?? null;

  if (observedImage) {
    extractedFields.product_image_url = { value: observedImage, trust: "retailer" };
    trustFields.product_image_url = "retailer";
  }

  await params.db
    .insert(ingestionEntitySnapshots)
    .values({
      entityId,
      runId: params.runId,
      fetchedAt: params.checkedAt,
      rawJson,
      extracted: {
        fields: extractedFields,
        meta: {
          parser: "shopify_static_product",
          confidence: "high",
          retailer: "buceplant",
          sourceLabel: params.sourceLabel,
        },
      },
      trust: {
        ...trustFields,
      },
      contentHash,
    })
    .onConflictDoNothing({
      target: [ingestionEntitySnapshots.entityId, ingestionEntitySnapshots.contentHash],
    });

  const normalized = await applyOfferDetailObservation({
    db: params.db,
    offerId: params.offerId,
    checkedAt: params.checkedAt,
    observedPriceCents: params.variant.priceCents,
    observedCurrency: "USD",
    observedInStock: params.variant.available,
    observedProductImageUrl: observedImage,
    allowOfferStateUpdate: true,
  });

  return {
    updated: urlChanged || normalized.meaningfulChange || normalized.productImageHydrated,
    urlChanged,
  };
}

export async function runOffersBuceplantVariantsRefresh(params: {
  db: DbClient;
  sourceId: string;
  runId: string;
  timeoutMs: number;
}): Promise<OffersBuceplantVariantsRefreshResult> {
  let scanned = 0;
  let updated = 0;
  let failed = 0;
  let createdOffers = 0;

  const retailerId = await findBuceRetailerId(params.db);

  const [unsFetch, spiderFetch, unsProducts, spiderwoodProduct] = await Promise.all([
    fetchHtml({ url: BUCEPLANT_UNS_TANKS_URL, timeoutMs: params.timeoutMs }),
    fetchHtml({ url: BUCEPLANT_SPIDERWOOD_URL, timeoutMs: params.timeoutMs }),
    loadUnsTankProducts(params.db),
    loadSpiderwoodProduct(params.db),
  ]);

  const allProductIds = [
    ...unsProducts.map((product) => product.id),
    ...(spiderwoodProduct ? [spiderwoodProduct.id] : []),
  ];

  const existingOffersByProductId = await loadExistingRetailerOffers({
    db: params.db,
    retailerId,
    productIds: allProductIds,
  });

  const checkedAt = new Date();

  if (!unsFetch) {
    scanned += unsProducts.length;
    failed += unsProducts.length;
  } else {
    const unsPayload = extractBuceplantStaticProductPayload(unsFetch.html);
    if (!unsPayload || unsPayload.variants.length === 0) {
      scanned += unsProducts.length;
      failed += unsProducts.length;
    } else {
      for (const product of unsProducts) {
        scanned += 1;

        const variant = matchUnsVariantForProductSlug(unsPayload.variants, product.slug);
        if (!variant) {
          failed += 1;
          continue;
        }

        const variantUrl = buildVariantUrl({
          fallbackUrl: unsFetch.finalUrl,
          productHandle: unsPayload.handle,
          variantId: variant.id,
        });

        try {
          const offerRow = await ensureOfferForProduct({
            db: params.db,
            retailerId,
            productId: product.id,
            defaultUrl: variantUrl,
            existingOffersByProductId,
          });

          if (offerRow.created) {
            createdOffers += 1;
          }

          const res = await syncVariantToOffer({
            db: params.db,
            sourceId: params.sourceId,
            runId: params.runId,
            offerId: offerRow.id,
            previousUrl: offerRow.previousUrl,
            url: variantUrl,
            checkedAt,
            variant,
            productHandle: unsPayload.handle,
            productImageUrl: unsPayload.featuredImageUrl,
            sourceLabel: "uns_tanks",
          });

          if (res.updated) {
            updated += 1;
          }
        } catch {
          failed += 1;
        }
      }
    }
  }

  if (!spiderwoodProduct) {
    failed += 1;
    scanned += 1;
    return {
      scanned,
      updated,
      failed,
      createdOffers,
    };
  }

  scanned += 1;

  if (!spiderFetch) {
    failed += 1;
    return {
      scanned,
      updated,
      failed,
      createdOffers,
    };
  }

  const spiderPayload = extractBuceplantStaticProductPayload(spiderFetch.html);
  const spiderVariant = spiderPayload
    ? selectSpiderwoodVariant(spiderPayload.variants)
    : null;

  if (!spiderPayload || !spiderVariant) {
    failed += 1;
    return {
      scanned,
      updated,
      failed,
      createdOffers,
    };
  }

  const spiderVariantUrl = buildVariantUrl({
    fallbackUrl: spiderFetch.finalUrl,
    productHandle: spiderPayload.handle,
    variantId: spiderVariant.id,
  });

  try {
    const offerRow = await ensureOfferForProduct({
      db: params.db,
      retailerId,
      productId: spiderwoodProduct.id,
      defaultUrl: spiderVariantUrl,
      existingOffersByProductId,
    });

    if (offerRow.created) {
      createdOffers += 1;
    }

    const res = await syncVariantToOffer({
      db: params.db,
      sourceId: params.sourceId,
      runId: params.runId,
      offerId: offerRow.id,
      previousUrl: offerRow.previousUrl,
      url: spiderVariantUrl,
      checkedAt,
      variant: spiderVariant,
      productHandle: spiderPayload.handle,
      productImageUrl: spiderPayload.featuredImageUrl,
      sourceLabel: "spiderwood",
    });

    if (res.updated) {
      updated += 1;
    }
  } catch {
    failed += 1;
  }

  return {
    scanned,
    updated,
    failed,
    createdOffers,
  };
}
