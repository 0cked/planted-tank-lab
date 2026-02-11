import { and, asc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { normalizationOverrides } from "@/server/db/schema";

export type CanonicalType = "product" | "plant" | "offer";

export type OverrideWinnerMetadata = {
  winner: "override";
  reason: string;
  overrideId: string;
  updatedAt: string;
};

export type OverrideExplainability = {
  winnerByField: Record<string, OverrideWinnerMetadata>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function applyValueAtFieldPath(params: {
  target: Record<string, unknown>;
  fieldPath: string;
  value: unknown;
}): boolean {
  const segments = params.fieldPath
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return false;
  }

  const rootKey = segments[0]!;
  if (!Object.prototype.hasOwnProperty.call(params.target, rootKey)) {
    return false;
  }

  if (segments.length === 1) {
    params.target[rootKey] = params.value;
    return true;
  }

  const rootValue = params.target[rootKey];
  if (!isRecord(rootValue)) {
    return false;
  }

  let cursor = rootValue;
  for (let index = 1; index < segments.length - 1; index += 1) {
    const segment = segments[index]!;
    const next = cursor[segment];

    if (!isRecord(next)) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  }

  cursor[segments[segments.length - 1]!] = params.value;
  return true;
}

export async function applyNormalizationOverrides<T extends Record<string, unknown>>(params: {
  canonicalType: CanonicalType;
  canonicalId: string;
  normalizedValues: T;
}): Promise<{
  resolvedValues: T;
  explainability: OverrideExplainability | null;
}> {
  const rows = await db
    .select({
      id: normalizationOverrides.id,
      fieldPath: normalizationOverrides.fieldPath,
      value: normalizationOverrides.value,
      reason: normalizationOverrides.reason,
      updatedAt: normalizationOverrides.updatedAt,
    })
    .from(normalizationOverrides)
    .where(
      and(
        eq(normalizationOverrides.canonicalType, params.canonicalType),
        eq(normalizationOverrides.canonicalId, params.canonicalId),
      ),
    )
    .orderBy(asc(normalizationOverrides.fieldPath));

  if (rows.length === 0) {
    return {
      resolvedValues: params.normalizedValues,
      explainability: null,
    };
  }

  const resolvedValues = structuredClone(params.normalizedValues) as Record<
    string,
    unknown
  >;
  const winnerByField: Record<string, OverrideWinnerMetadata> = {};

  for (const row of rows) {
    const fieldPath = row.fieldPath.trim();
    if (!fieldPath) {
      continue;
    }

    const applied = applyValueAtFieldPath({
      target: resolvedValues,
      fieldPath,
      value: row.value,
    });

    if (!applied) {
      continue;
    }

    winnerByField[fieldPath] = {
      winner: "override",
      reason: row.reason?.trim() || "normalization_override",
      overrideId: row.id,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  if (Object.keys(winnerByField).length === 0) {
    return {
      resolvedValues: resolvedValues as T,
      explainability: null,
    };
  }

  return {
    resolvedValues: resolvedValues as T,
    explainability: {
      winnerByField,
    },
  };
}

export function serializeOverrideExplainability(
  explainability: OverrideExplainability | null,
): string | null {
  if (!explainability || Object.keys(explainability.winnerByField).length === 0) {
    return null;
  }

  return JSON.stringify({
    version: 1,
    source: "normalization_overrides",
    winnerByField: explainability.winnerByField,
  });
}
