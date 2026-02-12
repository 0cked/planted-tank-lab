import { and, eq, isNotNull, sql as dsql } from "drizzle-orm";

import { sanitizeCatalogImageUrl } from "@/lib/catalog-guardrails";
import type { DbClient } from "@/server/db";
import {
  canonicalEntityMappings,
  ingestionEntities,
  ingestionEntitySnapshots,
  offers,
  retailers,
} from "@/server/db/schema";
import { sha256Hex, stableJsonStringify } from "@/server/ingestion/hash";
import { availabilitySignalFromStatus } from "@/server/ingestion/sources/availability-signal";
import {
  DEFAULT_OFFERS_REFRESH_OLDER_THAN_HOURS,
  resolveOffersRefreshWindowHours,
} from "@/server/ingestion/sources/offers-refresh-window";
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

type ParsedOfferImageObservation = {
  imageUrl: string | null;
  parser: string;
  confidence: "high" | "medium" | "low";
  source: string | null;
  candidates: string[];
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

function isLikelySearchResultUrl(params: {
  url: string;
  retailerSlug: string;
}): boolean {
  try {
    const parsed = new URL(params.url);
    const path = parsed.pathname.toLowerCase();

    if (params.retailerSlug === "amazon") {
      return path === "/s" || path.startsWith("/s/");
    }

    if (params.retailerSlug === "buceplant") {
      return path.includes("/search") || parsed.searchParams.has("q");
    }

    if (params.retailerSlug === "petco") {
      return path.includes("/search") || parsed.searchParams.has("query");
    }

    return (
      path.includes("/search") ||
      parsed.searchParams.has("q") ||
      parsed.searchParams.has("query") ||
      parsed.searchParams.has("k")
    );
  } catch {
    return false;
  }
}

function isLikelyAutomationBlockedPage(params: {
  html: string;
  retailerSlug: string;
}): boolean {
  const lowered = params.html.toLowerCase();

  if (params.retailerSlug === "amazon") {
    return (
      lowered.includes("automated access to amazon data") ||
      lowered.includes("api-services-support@amazon.com") ||
      lowered.includes("sorry! something went wrong")
    );
  }

  return false;
}

function shouldApplyOfferStateObservation(params: {
  parsed: ParsedOfferDetail;
  retailerSlug: string;
  observationUrl: string;
}): boolean {
  if (isLikelySearchResultUrl({
    url: params.observationUrl,
    retailerSlug: params.retailerSlug,
  })) {
    return false;
  }

  if (params.parsed.confidence === "low") return false;
  if (params.parsed.parser === "text") return false;
  if (params.parsed.parser === "none") return false;
  if (params.parsed.parser === "http_status_fallback") return false;

  return true;
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#38;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();
}

function parseTagAttributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const regex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(tag)) !== null) {
    const key = String(match[1] ?? "").toLowerCase();
    if (!key) continue;
    const rawValue = match[2] ?? match[3] ?? match[4] ?? "";
    out[key] = decodeHtmlAttribute(rawValue);
  }

  return out;
}

function uniquePreservingOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }

  return out;
}

function normalizeImageCandidateUrl(params: {
  candidate: string;
  baseUrl: string;
}): string | null {
  const trimmed = params.candidate.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("data:") ||
    lower.startsWith("blob:") ||
    lower.startsWith("javascript:")
  ) {
    return null;
  }

  let resolved = trimmed;
  if (resolved.startsWith("//")) {
    resolved = `https:${resolved}`;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(resolved, params.baseUrl);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return null;
  }

  return sanitizeCatalogImageUrl(parsedUrl.toString());
}

function pushImageCandidatesFromValue(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    const normalized = decodeHtmlAttribute(value);
    if (normalized) out.push(normalized);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      pushImageCandidatesFromValue(item, out);
    }
    return;
  }

  if (!value || typeof value !== "object") return;

  const obj = value as Record<string, unknown>;
  for (const key of [
    "url",
    "contentUrl",
    "thumbnailUrl",
    "image",
    "src",
  ]) {
    if (key in obj) {
      pushImageCandidatesFromValue(obj[key], out);
    }
  }
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

function collectProductOrOfferNodes(
  input: unknown,
  out: Record<string, unknown>[],
): void {
  if (!input) return;

  if (Array.isArray(input)) {
    for (const item of input) collectProductOrOfferNodes(item, out);
    return;
  }

  if (typeof input !== "object") return;

  const obj = input as Record<string, unknown>;
  const rawType = obj["@type"];
  const typeValues = Array.isArray(rawType)
    ? rawType.map((v) => String(v).toLowerCase())
    : [String(rawType ?? "").toLowerCase()];

  if (typeValues.some((v) => v.includes("product") || v.includes("offer"))) {
    out.push(obj);
  }

  for (const value of Object.values(obj)) {
    collectProductOrOfferNodes(value, out);
  }
}

function extractImageCandidatesFromJsonLd(html: string): string[] {
  const candidates: string[] = [];
  const scripts = extractJsonLdScripts(html);

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script) as unknown;
      const nodes: Record<string, unknown>[] = [];
      collectProductOrOfferNodes(parsed, nodes);

      for (const node of nodes) {
        pushImageCandidatesFromValue(node.image, candidates);
        pushImageCandidatesFromValue(node.thumbnailUrl, candidates);
        pushImageCandidatesFromValue(node.contentUrl, candidates);
        pushImageCandidatesFromValue(node.itemOffered, candidates);
      }
    } catch {
      // ignore invalid json-ld blocks
    }
  }

  return uniquePreservingOrder(candidates);
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

function extractMetaImageCandidates(html: string): string[] {
  const candidates: string[] = [];
  const allowedMetaKeys = new Set([
    "og:image",
    "og:image:url",
    "twitter:image",
    "twitter:image:src",
    "image",
  ]);

  const metaRegex = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaRegex.exec(html)) !== null) {
    const attrs = parseTagAttributes(match[0]);
    const key =
      attrs.property?.toLowerCase() ??
      attrs.name?.toLowerCase() ??
      attrs.itemprop?.toLowerCase() ??
      "";
    if (!allowedMetaKeys.has(key)) continue;

    const content = attrs.content ?? attrs.href;
    if (typeof content === "string" && content.trim().length > 0) {
      candidates.push(content.trim());
    }
  }

  const linkRegex = /<link\b[^>]*>/gi;
  while ((match = linkRegex.exec(html)) !== null) {
    const attrs = parseTagAttributes(match[0]);
    const rel = attrs.rel?.toLowerCase() ?? "";
    if (rel !== "image_src") continue;
    const href = attrs.href;
    if (typeof href === "string" && href.trim().length > 0) {
      candidates.push(href.trim());
    }
  }

  return uniquePreservingOrder(candidates);
}

function extractAmazonImageCandidates(html: string): string[] {
  const out: string[] = [];

  const imgRegex =
    /<img[^>]+(?:id=["']landingImage["']|class=["'][^"']*(?:s-image|a-dynamic-image)[^"']*["'])[^>]*(?:src|data-old-hires)=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    const candidate = match[1]?.trim();
    if (candidate) out.push(candidate);
  }

  const dynamicRegex = /data-a-dynamic-image=["']([^"']+)["']/gi;
  while ((match = dynamicRegex.exec(html)) !== null) {
    const raw = decodeHtmlAttribute(match[1] ?? "");
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const key of Object.keys(parsed)) {
        if (typeof key === "string" && key.trim().length > 0) {
          out.push(key);
        }
      }
    } catch {
      // ignore malformed amazon dynamic-image payloads
    }
  }

  return uniquePreservingOrder(out);
}

function parseOfferImageObservation(params: {
  html: string;
  retailerSlug: string;
  baseUrl: string;
}): ParsedOfferImageObservation {
  const parserCandidates: Array<{
    parser: string;
    confidence: "high" | "medium" | "low";
    source: string;
    candidates: string[];
  }> = [
    {
      parser: "jsonld",
      confidence: "high",
      source: "jsonld.image",
      candidates: extractImageCandidatesFromJsonLd(params.html),
    },
    {
      parser: "meta",
      confidence: "medium",
      source: "meta:image",
      candidates: extractMetaImageCandidates(params.html),
    },
  ];

  if (params.retailerSlug === "amazon") {
    parserCandidates.push({
      parser: "amazon_dom",
      confidence: "low",
      source: "amazon:image",
      candidates: extractAmazonImageCandidates(params.html),
    });
  }

  for (const parserCandidate of parserCandidates) {
    for (const candidate of parserCandidate.candidates) {
      const normalized = normalizeImageCandidateUrl({
        candidate,
        baseUrl: params.baseUrl,
      });
      if (!normalized) continue;

      return {
        imageUrl: normalized,
        parser: parserCandidate.parser,
        confidence: parserCandidate.confidence,
        source: parserCandidate.source,
        candidates: uniquePreservingOrder(parserCandidate.candidates),
      };
    }
  }

  return {
    imageUrl: null,
    parser: "none",
    confidence: "low",
    source: null,
    candidates: [],
  };
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
        dsql<boolean>`coalesce(${offers.lastCheckedAt}, ${offers.updatedAt}) < now() - (${refreshWindowHours} * interval '1 hour')`,
      ),
    )
    .orderBy(
      dsql`coalesce(${offers.lastCheckedAt}, ${offers.updatedAt}) asc`,
      offers.id,
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
  olderThanHours?: number;
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

      const fetched = await fetchOfferDetail({
        url: offer.url,
        timeoutMs: params.timeoutMs,
      });

      const parsed = fetched.html
        ? parseOfferDetail({ html: fetched.html, retailerSlug: offer.retailerSlug })
        : {
            priceCents: null,
            currency: null,
            inStock: availabilitySignalFromStatus(fetched.status),
            parser: "http_status_fallback",
            confidence: "low" as const,
          };

      const imageObservation = fetched.html
        ? parseOfferImageObservation({
            html: fetched.html,
            retailerSlug: offer.retailerSlug,
            baseUrl: fetched.finalUrl ?? offer.url,
          })
        : {
            imageUrl: null,
            parser: "none",
            confidence: "low" as const,
            source: null,
            candidates: [],
          };

      const observed = {
        priceCents: parsed.priceCents,
        currency: parsed.currency,
        inStock: parsed.inStock,
        productImageUrl: imageObservation.imageUrl,
      };

      const observationUrl = fetched.finalUrl ?? offer.url;
      const blockedByAutomation = fetched.html
        ? isLikelyAutomationBlockedPage({
            html: fetched.html,
            retailerSlug: offer.retailerSlug,
          })
        : false;
      const allowOfferStateUpdate =
        fetched.status != null &&
        !blockedByAutomation &&
        shouldApplyOfferStateObservation({
          parsed,
          retailerSlug: offer.retailerSlug,
          observationUrl,
        });

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
      if (observed.productImageUrl != null) {
        extractedFields.product_image_url = {
          value: observed.productImageUrl,
          trust: "retailer",
        };
        trustFields.product_image_url = "retailer";
      }

      const rawJson = {
        url: offer.url,
        finalUrl: fetched.finalUrl,
        status: fetched.status,
        contentType: fetched.contentType,
        parser: parsed.parser,
        confidence: parsed.confidence,
        image: {
          parser: imageObservation.parser,
          confidence: imageObservation.confidence,
          source: imageObservation.source,
          selected: imageObservation.imageUrl,
          candidates: imageObservation.candidates,
        },
        observed,
        observation: {
          url: observationUrl,
          blockedByAutomation,
          allowOfferStateUpdate,
        },
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
              imageParser: imageObservation.parser,
              imageConfidence: imageObservation.confidence,
              imageSource: imageObservation.source,
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

      // Network/transport failures should not mutate canonical freshness or stock state.
      if (fetched.status == null) {
        failed += 1;
        continue;
      }

      // Anti-bot / automation block pages are not trustworthy for canonical state updates.
      if (blockedByAutomation) {
        failed += 1;
        continue;
      }

      const normalized = await applyOfferDetailObservation({
        db: params.db,
        offerId: offer.id,
        checkedAt,
        observedPriceCents: observed.priceCents,
        observedCurrency: observed.currency,
        observedInStock: observed.inStock,
        observedProductImageUrl: observed.productImageUrl,
        allowOfferStateUpdate,
      });

      if (normalized.meaningfulChange || normalized.productImageHydrated) {
        updated += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return { scanned: offersToCheck.length, updated, failed };
}
