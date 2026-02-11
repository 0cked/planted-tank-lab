import { and, eq, ne } from "drizzle-orm";

import { db } from "@/server/db";
import { normalizationOverrides, offers, plants, products } from "@/server/db/schema";
import { logAdminAction } from "@/server/services/admin-log";

export type CanonicalType = "product" | "plant" | "offer";

const FIELD_PATH_RE = /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/;

export class AdminOverrideError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminOverrideError";
  }
}

function serializeValuePreview(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    if (!json) return "null";
    if (json.length <= 400) return json;
    return `${json.slice(0, 400)}…`;
  } catch {
    return "[unserializable]";
  }
}

function normalizeFieldPath(fieldPath: string): string {
  const normalized = fieldPath.trim();
  if (!normalized) {
    throw new AdminOverrideError("Field path is required.");
  }
  if (normalized.length > 200) {
    throw new AdminOverrideError("Field path must be at most 200 characters.");
  }
  if (!FIELD_PATH_RE.test(normalized)) {
    throw new AdminOverrideError(
      "Field path must use dot notation with letters, numbers, or underscore.",
    );
  }
  return normalized;
}

function normalizeReason(reason: string): string {
  const normalized = reason.trim();
  if (!normalized) {
    throw new AdminOverrideError("Reason is required.");
  }
  if (normalized.length > 500) {
    throw new AdminOverrideError("Reason must be at most 500 characters.");
  }
  return normalized;
}

function normalizeActorUserId(actorUserId: string): string {
  const normalized = actorUserId.trim();
  if (!normalized) {
    throw new AdminOverrideError("Actor user id is required.");
  }
  return normalized;
}

async function ensureCanonicalRecordExists(params: {
  canonicalType: CanonicalType;
  canonicalId: string;
}): Promise<void> {
  switch (params.canonicalType) {
    case "product": {
      const rows = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, params.canonicalId))
        .limit(1);
      if (rows.length === 0) {
        throw new AdminOverrideError("Canonical product not found.");
      }
      return;
    }
    case "plant": {
      const rows = await db
        .select({ id: plants.id })
        .from(plants)
        .where(eq(plants.id, params.canonicalId))
        .limit(1);
      if (rows.length === 0) {
        throw new AdminOverrideError("Canonical plant not found.");
      }
      return;
    }
    case "offer": {
      const rows = await db
        .select({ id: offers.id })
        .from(offers)
        .where(eq(offers.id, params.canonicalId))
        .limit(1);
      if (rows.length === 0) {
        throw new AdminOverrideError("Canonical offer not found.");
      }
      return;
    }
    default:
      throw new AdminOverrideError("Unsupported canonical type.");
  }
}

export async function createNormalizationOverride(params: {
  canonicalType: CanonicalType;
  canonicalId: string;
  fieldPath: string;
  value: unknown;
  reason: string;
  actorUserId: string;
}): Promise<{ id: string }> {
  const fieldPath = normalizeFieldPath(params.fieldPath);
  const reason = normalizeReason(params.reason);
  const actorUserId = normalizeActorUserId(params.actorUserId);

  await ensureCanonicalRecordExists({
    canonicalType: params.canonicalType,
    canonicalId: params.canonicalId,
  });

  const duplicateRows = await db
    .select({ id: normalizationOverrides.id })
    .from(normalizationOverrides)
    .where(
      and(
        eq(normalizationOverrides.canonicalType, params.canonicalType),
        eq(normalizationOverrides.canonicalId, params.canonicalId),
        eq(normalizationOverrides.fieldPath, fieldPath),
      ),
    )
    .limit(1);

  if (duplicateRows[0]?.id) {
    throw new AdminOverrideError(
      "An override already exists for this canonical entity and field path.",
    );
  }

  const now = new Date();
  const createdRows = await db
    .insert(normalizationOverrides)
    .values({
      canonicalType: params.canonicalType,
      canonicalId: params.canonicalId,
      fieldPath,
      value: params.value,
      reason,
      actorUserId,
      updatedAt: now,
    })
    .returning({ id: normalizationOverrides.id });

  const created = createdRows[0];
  if (!created?.id) {
    throw new AdminOverrideError("Failed to create normalization override.");
  }

  await logAdminAction({
    actorUserId,
    action: "normalization.override.create",
    targetType: "normalization_override",
    targetId: created.id,
    meta: {
      canonicalType: params.canonicalType,
      canonicalId: params.canonicalId,
      fieldPath,
      reason,
      valuePreview: serializeValuePreview(params.value),
    },
  });

  return { id: created.id };
}

export async function updateNormalizationOverride(params: {
  overrideId: string;
  canonicalType: CanonicalType;
  canonicalId: string;
  fieldPath: string;
  value: unknown;
  reason: string;
  actorUserId: string;
}): Promise<void> {
  const fieldPath = normalizeFieldPath(params.fieldPath);
  const reason = normalizeReason(params.reason);
  const actorUserId = normalizeActorUserId(params.actorUserId);

  const existingRows = await db
    .select({
      id: normalizationOverrides.id,
      canonicalType: normalizationOverrides.canonicalType,
      canonicalId: normalizationOverrides.canonicalId,
      fieldPath: normalizationOverrides.fieldPath,
      reason: normalizationOverrides.reason,
      value: normalizationOverrides.value,
    })
    .from(normalizationOverrides)
    .where(eq(normalizationOverrides.id, params.overrideId))
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    throw new AdminOverrideError("Normalization override not found.");
  }

  await ensureCanonicalRecordExists({
    canonicalType: params.canonicalType,
    canonicalId: params.canonicalId,
  });

  const duplicateRows = await db
    .select({ id: normalizationOverrides.id })
    .from(normalizationOverrides)
    .where(
      and(
        eq(normalizationOverrides.canonicalType, params.canonicalType),
        eq(normalizationOverrides.canonicalId, params.canonicalId),
        eq(normalizationOverrides.fieldPath, fieldPath),
        ne(normalizationOverrides.id, params.overrideId),
      ),
    )
    .limit(1);

  if (duplicateRows[0]?.id) {
    throw new AdminOverrideError(
      "Another override already exists for this canonical entity and field path.",
    );
  }

  const now = new Date();

  await db
    .update(normalizationOverrides)
    .set({
      canonicalType: params.canonicalType,
      canonicalId: params.canonicalId,
      fieldPath,
      value: params.value,
      reason,
      actorUserId,
      updatedAt: now,
    })
    .where(eq(normalizationOverrides.id, params.overrideId));

  await logAdminAction({
    actorUserId,
    action: "normalization.override.update",
    targetType: "normalization_override",
    targetId: params.overrideId,
    meta: {
      canonicalType: params.canonicalType,
      canonicalId: params.canonicalId,
      fieldPath,
      reason,
      valuePreview: serializeValuePreview(params.value),
      previous: {
        canonicalType: existing.canonicalType,
        canonicalId: existing.canonicalId,
        fieldPath: existing.fieldPath,
        reason: existing.reason,
        valuePreview: serializeValuePreview(existing.value),
      },
    },
  });
}

export async function deleteNormalizationOverride(params: {
  overrideId: string;
  actorUserId: string;
}): Promise<void> {
  const actorUserId = normalizeActorUserId(params.actorUserId);

  const existingRows = await db
    .select({
      id: normalizationOverrides.id,
      canonicalType: normalizationOverrides.canonicalType,
      canonicalId: normalizationOverrides.canonicalId,
      fieldPath: normalizationOverrides.fieldPath,
      reason: normalizationOverrides.reason,
      value: normalizationOverrides.value,
    })
    .from(normalizationOverrides)
    .where(eq(normalizationOverrides.id, params.overrideId))
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    throw new AdminOverrideError("Normalization override not found.");
  }

  await db.delete(normalizationOverrides).where(eq(normalizationOverrides.id, params.overrideId));

  await logAdminAction({
    actorUserId,
    action: "normalization.override.delete",
    targetType: "normalization_override",
    targetId: params.overrideId,
    meta: {
      previous: {
        canonicalType: existing.canonicalType,
        canonicalId: existing.canonicalId,
        fieldPath: existing.fieldPath,
        reason: existing.reason,
        valuePreview: serializeValuePreview(existing.value),
      },
    },
  });
}
