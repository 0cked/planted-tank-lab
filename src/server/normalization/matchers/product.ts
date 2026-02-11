type JsonRecord = Record<string, unknown>;

export type ProductMatchMethod =
  | "identifier_exact"
  | "brand_model_fingerprint"
  | "new_canonical";

export const PRODUCT_MATCH_CONFIDENCE = {
  identifierExact: 100,
  brandModelFingerprint: 92,
  newCanonical: 80,
} as const;

export type ExistingCanonicalProduct = {
  id: string;
  slug: string;
  brandId: string | null;
  name: string;
  meta: unknown;
};

export type MatchCanonicalProductParams = {
  existingEntityCanonicalId: string | null;
  slug: string;
  sourceEntityId: string;
  brandId: string;
  name: string;
  model: string | null;
  modelNumber: string | null;
  sku: string | null;
  upc: string | null;
  ean: string | null;
  gtin: string | null;
  mpn: string | null;
  asin: string | null;
  identifiers: Record<string, unknown> | null;
  existingProducts: ExistingCanonicalProduct[];
};

export type ProductMatchResult = {
  canonicalId: string | null;
  matchMethod: ProductMatchMethod;
  confidence: number;
};

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

function toIdentifierText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

export function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function dedupeOrderedIdentifiers(values: Array<string | null | undefined>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (!value) continue;
    const normalized = normalizeIdentifier(value);
    if (!normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function collectIncomingIdentifiers(params: MatchCanonicalProductParams): string[] {
  const values: Array<string | null | undefined> = [
    params.slug,
    params.sourceEntityId,
    params.sku,
    params.upc,
    params.ean,
    params.gtin,
    params.mpn,
    params.asin,
    params.modelNumber,
  ];

  if (params.identifiers) {
    for (const [, rawValue] of Object.entries(params.identifiers).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      values.push(toIdentifierText(rawValue));
    }
  }

  return dedupeOrderedIdentifiers(values);
}

function collectExistingIdentifiers(product: ExistingCanonicalProduct): string[] {
  const values: Array<string | null | undefined> = [product.slug];

  const meta = asRecord(product.meta);
  if (meta) {
    values.push(toIdentifierText(meta.sku));
    values.push(toIdentifierText(meta.upc));
    values.push(toIdentifierText(meta.ean));
    values.push(toIdentifierText(meta.gtin));
    values.push(toIdentifierText(meta.mpn));
    values.push(toIdentifierText(meta.asin));
    values.push(toIdentifierText(meta.model_number));

    const metaIdentifiers = asRecord(meta.identifiers);
    if (metaIdentifiers) {
      for (const [, rawValue] of Object.entries(metaIdentifiers).sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        values.push(toIdentifierText(rawValue));
      }
    }
  }

  return dedupeOrderedIdentifiers(values);
}

function normalizeFingerprintModel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildBrandModelFingerprint(params: {
  brandId: string | null;
  name: string;
  model: string | null;
  modelNumber: string | null;
}): string | null {
  if (!params.brandId) return null;

  const candidate =
    params.modelNumber?.trim() || params.model?.trim() || params.name.trim();
  if (!candidate) return null;

  const normalizedModel = normalizeFingerprintModel(candidate);
  if (!normalizedModel) return null;

  return `${params.brandId}::${normalizedModel}`;
}

function buildExistingBrandModelFingerprint(
  product: ExistingCanonicalProduct,
): string | null {
  const meta = asRecord(product.meta);
  return buildBrandModelFingerprint({
    brandId: product.brandId,
    name: product.name,
    model: toIdentifierText(meta?.model),
    modelNumber: toIdentifierText(meta?.model_number),
  });
}

function getSingleMatchId(values: Iterable<string>): string | null {
  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] ?? null : null;
}

export function matchCanonicalProduct(
  params: MatchCanonicalProductParams,
): ProductMatchResult {
  const existingById = new Map(
    params.existingProducts.map((product) => [product.id, product] as const),
  );

  if (
    params.existingEntityCanonicalId &&
    existingById.has(params.existingEntityCanonicalId)
  ) {
    return {
      canonicalId: params.existingEntityCanonicalId,
      matchMethod: "identifier_exact",
      confidence: PRODUCT_MATCH_CONFIDENCE.identifierExact,
    };
  }

  const identifierToCanonicalIds = new Map<string, string[]>();
  for (const product of params.existingProducts) {
    for (const identifier of collectExistingIdentifiers(product)) {
      const existing = identifierToCanonicalIds.get(identifier) ?? [];
      existing.push(product.id);
      identifierToCanonicalIds.set(identifier, existing);
    }
  }

  for (const incomingIdentifier of collectIncomingIdentifiers(params)) {
    const matchIds = identifierToCanonicalIds.get(incomingIdentifier);
    if (!matchIds) continue;

    const canonicalId = getSingleMatchId(matchIds);
    if (!canonicalId) continue;

    return {
      canonicalId,
      matchMethod: "identifier_exact",
      confidence: PRODUCT_MATCH_CONFIDENCE.identifierExact,
    };
  }

  const incomingFingerprint = buildBrandModelFingerprint({
    brandId: params.brandId,
    name: params.name,
    model: params.model,
    modelNumber: params.modelNumber,
  });

  if (incomingFingerprint) {
    const fingerprintToCanonicalIds = new Map<string, string[]>();
    for (const product of params.existingProducts) {
      const fingerprint = buildExistingBrandModelFingerprint(product);
      if (!fingerprint) continue;

      const existing = fingerprintToCanonicalIds.get(fingerprint) ?? [];
      existing.push(product.id);
      fingerprintToCanonicalIds.set(fingerprint, existing);
    }

    const fingerprintMatches = fingerprintToCanonicalIds.get(incomingFingerprint);
    if (fingerprintMatches) {
      const canonicalId = getSingleMatchId(fingerprintMatches);
      if (canonicalId) {
        return {
          canonicalId,
          matchMethod: "brand_model_fingerprint",
          confidence: PRODUCT_MATCH_CONFIDENCE.brandModelFingerprint,
        };
      }
    }
  }

  return {
    canonicalId: null,
    matchMethod: "new_canonical",
    confidence: PRODUCT_MATCH_CONFIDENCE.newCanonical,
  };
}
