import { and, eq, isNotNull, sql as dsql } from "drizzle-orm";

import type { DbClient } from "@/server/db";
import {
  canonicalEntityMappings,
  ingestionEntities,
  ingestionEntitySnapshots,
  offers,
  retailers,
} from "@/server/db/schema";
import { sha256Hex, stableJsonStringify } from "@/server/ingestion/hash";
import { applyOfferDetailObservation } from "@/server/normalization/offers";

type OfferRow = {
  id: string;
  url: string;
  currency: string;
  retailerSlug: string;
};

type ParsedOfferDetail = {
  priceCents: number | null;
  currency: string | null;
  inStock: boolean | null;
  parser: string;
  confidence: "high" | "medium" | "low";
};

type OfferDetailParser = (params: {
  html: string;
  retailerSlug: string;
}) => ParsedOfferDetail | null;

export type OffersDetailRefreshResult = {
  scanned: number;
  updated: number;
  failed: number;
};

function toMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

function hasSignal(parsed: ParsedOfferDetail | null): parsed is ParsedOfferDetail {
  return !!parsed &&
    (parsed.priceCents != null || parsed.currency != null || parsed.inStock != null);
}

function normalizeCurrency(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) return null;
  return normalized;
}

function parsePriceCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value < 0) return null;
    return Math.round(value * 100);
  }

  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^0-9.,]/g, "").trim();
  if (!cleaned) return null;

  // Keep last decimal separator as decimal point and strip other separators.
  const normalized = cleaned
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(/,/g, ".");
  const asNumber = Number.parseFloat(normalized);
  if (!Number.isFinite(asNumber) || asNumber < 0) return null;

  return Math.round(asNumber * 100);
}

function parseAvailability(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;

  const s = value.toLowerCase();
  if (
    s.includes("outofstock") ||
    s.includes("out of stock") ||
    s.includes("unavailable") ||
    s.includes("sold out")
  ) {
    return false;
  }

  if (
    s.includes("instock") ||
    s.includes("in stock") ||
    s.includes("available") ||
    s.includes("add to cart")
  ) {
    return true;
  }

  return null;
}

function extractJsonLdScripts(html: string): string[] {
  const out: string[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const body = match[1]?.trim();
    if (body) out.push(body);
  }
  return out;
}

function collectOfferNodes(input: unknown, out: Record<string, unknown>[]): void {
  if (!input) return;

  if (Array.isArray(input)) {
    for (const item of input) collectOfferNodes(item, out);
    return;
  }

  if (typeof input !== "object") return;

  const obj = input as Record<string, unknown>;
  const rawType = obj["@type"];
  const typeValues = Array.isArray(rawType)
    ? rawType.map((v) => String(v).toLowerCase())
    : [String(rawType ?? "").toLowerCase()];

  if (typeValues.some((v) => v.includes("offer"))) {
    out.push(obj);
  }

  for (const value of Object.values(obj)) {
    collectOfferNodes(value, out);
  }
}

function parseFromJsonLd(html: string): ParsedOfferDetail | null {
  const scripts = extractJsonLdScripts(html);
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script) as unknown;
      const offerNodes: Record<string, unknown>[] = [];
      collectOfferNodes(parsed, offerNodes);

      for (const node of offerNodes) {
        const priceCents =
          parsePriceCents(node.price) ??
          parsePriceCents(node.lowPrice) ??
          parsePriceCents(node.highPrice);
        const currency = normalizeCurrency(node.priceCurrency);
        const inStock = parseAvailability(node.availability);

        const result: ParsedOfferDetail = {
          priceCents,
          currency,
          inStock,
          parser: "jsonld",
          confidence: "high",
        };

        if (hasSignal(result)) return result;
      }
    } catch {
      // ignore invalid json-ld blocks
    }
  }

  return null;
}

function parseFromMetaTags(html: string): ParsedOfferDetail | null {
  const getMeta = (name: string): string | null => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    );
    const match = html.match(regex);
    return match?.[1]?.trim() ?? null;
  };

  const priceCents =
    parsePriceCents(getMeta("product:price:amount")) ??
    parsePriceCents(getMeta("og:price:amount"));
  const currency =
    normalizeCurrency(getMeta("product:price:currency")) ??
    normalizeCurrency(getMeta("og:price:currency"));
  const inStock =
    parseAvailability(getMeta("product:availability")) ??
    parseAvailability(getMeta("availability"));

  const parsed: ParsedOfferDetail = {
    priceCents,
    currency,
    inStock,
    parser: "meta",
    confidence: "medium",
  };

  return hasSignal(parsed) ? parsed : null;
}

function parseFromText(html: string): ParsedOfferDetail | null {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");

  const priceMatch = text.match(/\$\s*([0-9][0-9,]*(?:\.[0-9]{2})?)/);
  const priceCents = parsePriceCents(priceMatch?.[0] ?? null);

  const lowered = text.toLowerCase();
  let inStock: boolean | null = null;
  if (
    lowered.includes("currently unavailable") ||
    lowered.includes("out of stock") ||
    lowered.includes("sold out")
  ) {
    inStock = false;
  } else if (lowered.includes("in stock") || lowered.includes("add to cart")) {
    inStock = true;
  }

  const parsed: ParsedOfferDetail = {
    priceCents,
    currency: null,
    inStock,
    parser: "text",
    confidence: "low",
  };

  return hasSignal(parsed) ? parsed : null;
}

function parseAmazon(html: string): ParsedOfferDetail | null {
  const priceMatch = html.match(/class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*\$\s*([0-9][0-9,]*(?:\.[0-9]{2})?)/i);
  const fallbackPriceMatch = html.match(/\$\s*([0-9][0-9,]*(?:\.[0-9]{2})?)/);

  const priceCents =
    parsePriceCents(priceMatch?.[1] ?? null) ?? parsePriceCents(fallbackPriceMatch?.[1] ?? null);

  const lowered = html.toLowerCase();
  let inStock: boolean | null = null;
  if (lowered.includes("currently unavailable") || lowered.includes("out of stock")) {
    inStock = false;
  } else if (lowered.includes("in stock") || lowered.includes("add to cart")) {
    inStock = true;
  }

  const parsed: ParsedOfferDetail = {
    priceCents,
    currency: "USD",
    inStock,
    parser: "amazon_dom",
    confidence: "medium",
  };

  return hasSignal(parsed) ? parsed : null;
}

const retailerParsers: Record<string, OfferDetailParser[]> = {
  amazon: [({ html }) => parseAmazon(html)],
};

function parseOfferDetail(params: { html: string; retailerSlug: string }): ParsedOfferDetail {
  const parsers: OfferDetailParser[] = [
    ({ html }) => parseFromJsonLd(html),
    ({ html }) => parseFromMetaTags(html),
    ...(retailerParsers[params.retailerSlug] ?? []),
    ({ html }) => parseFromText(html),
  ];

  for (const parser of parsers) {
    const parsed = parser(params);
    if (hasSignal(parsed)) return parsed;
  }

  return {
    priceCents: null,
    currency: null,
    inStock: null,
    parser: "none",
    confidence: "low",
  };
}

async function getOffersToRefresh(params: {
  db: DbClient;
  olderThanDays: number;
  limit: number;
}): Promise<OfferRow[]> {
  const cutoff = new Date(Date.now() - toMs(params.olderThanDays));

  const rows = await params.db
    .select({
      id: offers.id,
      url: offers.url,
      currency: offers.currency,
      retailerSlug: retailers.slug,
    })
    .from(offers)
    .innerJoin(retailers, eq(offers.retailerId, retailers.id))
    .where(
      and(
        isNotNull(offers.url),
        dsql<boolean>`coalesce(${offers.lastCheckedAt}, ${offers.updatedAt}) < ${cutoff}`,
      ),
    )
    .limit(params.limit);

  return rows
    .map((r) => ({
      id: r.id,
      url: r.url,
      currency: r.currency,
      retailerSlug: r.retailerSlug,
    }))
    .filter((r): r is OfferRow => !!r.url);
}

async function getOfferById(params: { db: DbClient; offerId: string }): Promise<OfferRow | null> {
  const rows = await params.db
    .select({
      id: offers.id,
      url: offers.url,
      currency: offers.currency,
      retailerSlug: retailers.slug,
    })
    .from(offers)
    .innerJoin(retailers, eq(offers.retailerId, retailers.id))
    .where(eq(offers.id, params.offerId))
    .limit(1);

  const row = rows[0];
  if (!row?.url) return null;

  return {
    id: row.id,
    url: row.url,
    currency: row.currency,
    retailerSlug: row.retailerSlug,
  };
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

async function fetchOfferDetail(params: {
  url: string;
  timeoutMs: number;
}): Promise<{
  status: number | null;
  contentType: string | null;
  finalUrl: string | null;
  html: string | null;
}> {
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

    const text = await res.text();

    return {
      status: res.status,
      contentType: res.headers.get("content-type"),
      finalUrl: res.url || null,
      html: text,
    };
  } catch {
    return {
      status: null,
      contentType: null,
      finalUrl: null,
      html: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runOffersDetailRefresh(params: {
  db: DbClient;
  sourceId: string;
  runId: string;
  mode: "bulk" | "one";
  olderThanDays?: number;
  limit?: number;
  offerId?: string;
  timeoutMs: number;
}): Promise<OffersDetailRefreshResult> {
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
      olderThanDays: params.olderThanDays ?? 2,
      limit: params.limit ?? 30,
    });
  }

  let updated = 0;
  let failed = 0;

  for (const offer of offersToCheck) {
    try {
      const checkedAt = new Date();
      const minuteBucket = Math.floor(checkedAt.getTime() / 60000);

      const fetched = await fetchOfferDetail({
        url: offer.url,
        timeoutMs: params.timeoutMs,
      });

      const parsed = fetched.html
        ? parseOfferDetail({ html: fetched.html, retailerSlug: offer.retailerSlug })
        : {
            priceCents: null,
            currency: null,
            inStock: fetched.status != null && fetched.status >= 400 ? false : null,
            parser: "http_status_fallback",
            confidence: "low" as const,
          };

      const observed = {
        priceCents: parsed.priceCents,
        currency: parsed.currency,
        inStock: parsed.inStock,
      };

      const entityId = await upsertOfferEntity({
        db: params.db,
        sourceId: params.sourceId,
        offer,
      });

      await upsertCanonicalMapping({ db: params.db, entityId, offerId: offer.id });

      const extractedFields: Record<string, { value: unknown; trust: "retailer" }> = {};
      const trustFields: Record<string, "retailer"> = {};

      if (observed.priceCents != null) {
        extractedFields.price_cents = { value: observed.priceCents, trust: "retailer" };
        trustFields.price_cents = "retailer";
      }
      if (observed.currency != null) {
        extractedFields.currency = { value: observed.currency, trust: "retailer" };
        trustFields.currency = "retailer";
      }
      if (observed.inStock != null) {
        extractedFields.in_stock = { value: observed.inStock, trust: "retailer" };
        trustFields.in_stock = "retailer";
      }

      const rawJson = {
        url: offer.url,
        finalUrl: fetched.finalUrl,
        status: fetched.status,
        contentType: fetched.contentType,
        parser: parsed.parser,
        confidence: parsed.confidence,
        observed,
        observedMinute: minuteBucket,
      };
      const contentHash = sha256Hex(stableJsonStringify(rawJson));

      await params.db
        .insert(ingestionEntitySnapshots)
        .values({
          entityId,
          runId: params.runId,
          fetchedAt: checkedAt,
          httpStatus: fetched.status,
          contentType: fetched.contentType ?? undefined,
          rawJson,
          extracted: {
            fields: extractedFields,
            meta: {
              parser: parsed.parser,
              confidence: parsed.confidence,
              retailer: offer.retailerSlug,
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
        offerId: offer.id,
        checkedAt,
        observedPriceCents: observed.priceCents,
        observedCurrency: observed.currency,
        observedInStock: observed.inStock,
      });

      if (normalized.meaningfulChange) updated += 1;
    } catch {
      failed += 1;
    }
  }

  return { scanned: offersToCheck.length, updated, failed };
}
