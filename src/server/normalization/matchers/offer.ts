export type OfferMatchMethod =
  | "identifier_exact"
  | "product_retailer_url_fingerprint"
  | "new_canonical";

export const OFFER_MATCH_CONFIDENCE = {
  identifierExact: 100,
  productRetailerUrlFingerprint: 96,
  newCanonical: 80,
} as const;

export type ExistingCanonicalOffer = {
  id: string;
  productId: string;
  retailerId: string;
  url: string;
};

export type MatchCanonicalOfferParams = {
  existingEntityCanonicalId: string | null;
  productId: string;
  retailerId: string;
  url: string;
  existingOffers: ExistingCanonicalOffer[];
};

export type OfferMatchResult = {
  canonicalId: string | null;
  matchMethod: OfferMatchMethod;
  confidence: number;
};

function sortedSearchParams(url: URL): string {
  const params = [...url.searchParams.entries()].sort(([aKey, aValue], [bKey, bValue]) =>
    aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey),
  );

  const out = new URLSearchParams();
  for (const [key, value] of params) {
    out.append(key, value);
  }

  const query = out.toString();
  return query ? `?${query}` : "";
}

function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  if (collapsed === "/") return collapsed;
  return collapsed.replace(/\/+$/, "") || "/";
}

function normalizedPort(url: URL): string {
  if (!url.port) return "";

  const protocol = url.protocol.toLowerCase();
  if ((protocol === "https:" && url.port === "443") || (protocol === "http:" && url.port === "80")) {
    return "";
  }

  return `:${url.port}`;
}

export function normalizeOfferUrl(value: string): string {
  const parsed = new URL(value);
  parsed.hash = "";

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const port = normalizedPort(parsed);
  const pathname = normalizePathname(parsed.pathname);
  const query = sortedSearchParams(parsed);

  return `${protocol}//${hostname}${port}${pathname}${query}`;
}

export function buildOfferFingerprint(params: {
  productId: string;
  retailerId: string;
  url: string;
}): string {
  return `${params.productId}::${params.retailerId}::${normalizeOfferUrl(params.url)}`;
}

function getSingleMatchId(values: Iterable<string>): string | null {
  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] ?? null : null;
}

export function matchCanonicalOffer(
  params: MatchCanonicalOfferParams,
): OfferMatchResult {
  const existingById = new Map(
    params.existingOffers.map((offer) => [offer.id, offer] as const),
  );

  if (
    params.existingEntityCanonicalId &&
    existingById.has(params.existingEntityCanonicalId)
  ) {
    return {
      canonicalId: params.existingEntityCanonicalId,
      matchMethod: "identifier_exact",
      confidence: OFFER_MATCH_CONFIDENCE.identifierExact,
    };
  }

  const fingerprint = buildOfferFingerprint({
    productId: params.productId,
    retailerId: params.retailerId,
    url: params.url,
  });
  const matches = params.existingOffers
    .filter(
      (offer) =>
        buildOfferFingerprint({
          productId: offer.productId,
          retailerId: offer.retailerId,
          url: offer.url,
        }) === fingerprint,
    )
    .map((offer) => offer.id);

  const canonicalId = getSingleMatchId(matches);
  if (canonicalId) {
    return {
      canonicalId,
      matchMethod: "product_retailer_url_fingerprint",
      confidence: OFFER_MATCH_CONFIDENCE.productRetailerUrlFingerprint,
    };
  }

  return {
    canonicalId: null,
    matchMethod: "new_canonical",
    confidence: OFFER_MATCH_CONFIDENCE.newCanonical,
  };
}
