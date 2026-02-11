import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import {
  canonicalEntityMappings,
  ingestionEntities,
  offers,
  plants,
  products,
} from "@/server/db/schema";
import { logAdminAction } from "@/server/services/admin-log";

export type CanonicalType = "product" | "plant" | "offer";

function isMappableEntityType(value: string): value is CanonicalType {
  return value === "product" || value === "plant" || value === "offer";
}

export function canonicalTypeForEntityType(entityType: string): CanonicalType | null {
  return isMappableEntityType(entityType) ? entityType : null;
}

export class AdminMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminMappingError";
  }
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
        throw new AdminMappingError("Canonical product not found.");
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
        throw new AdminMappingError("Canonical plant not found.");
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
        throw new AdminMappingError("Canonical offer not found.");
      }
      return;
    }
    default:
      throw new AdminMappingError("Unsupported canonical type.");
  }
}

export async function mapIngestionEntityToCanonical(params: {
  entityId: string;
  canonicalType: CanonicalType;
  canonicalId: string;
  actorUserId: string | null;
  reason?: string | null;
}): Promise<void> {
  const entityRows = await db
    .select({
      id: ingestionEntities.id,
      entityType: ingestionEntities.entityType,
      sourceEntityId: ingestionEntities.sourceEntityId,
    })
    .from(ingestionEntities)
    .where(eq(ingestionEntities.id, params.entityId))
    .limit(1);

  const entity = entityRows[0];
  if (!entity) {
    throw new AdminMappingError("Ingestion entity not found.");
  }

  const expectedType = canonicalTypeForEntityType(entity.entityType);
  if (!expectedType) {
    throw new AdminMappingError(`Entity type '${entity.entityType}' is not mappable.`);
  }

  if (expectedType !== params.canonicalType) {
    throw new AdminMappingError(
      `Canonical type mismatch for entity type '${entity.entityType}'.`,
    );
  }

  await ensureCanonicalRecordExists({
    canonicalType: params.canonicalType,
    canonicalId: params.canonicalId,
  });

  const existingRows = await db
    .select({
      canonicalType: canonicalEntityMappings.canonicalType,
      canonicalId: canonicalEntityMappings.canonicalId,
      matchMethod: canonicalEntityMappings.matchMethod,
      confidence: canonicalEntityMappings.confidence,
      notes: canonicalEntityMappings.notes,
    })
    .from(canonicalEntityMappings)
    .where(eq(canonicalEntityMappings.entityId, params.entityId))
    .limit(1);

  const existing = existingRows[0] ?? null;
  const reason = params.reason?.trim() ? params.reason.trim() : null;
  const notes = reason
    ? JSON.stringify({ source: "admin_manual", reason })
    : existing?.notes ?? null;

  const now = new Date();

  await db
    .insert(canonicalEntityMappings)
    .values({
      entityId: params.entityId,
      canonicalType: params.canonicalType,
      canonicalId: params.canonicalId,
      matchMethod: "admin_manual",
      confidence: 100,
      notes,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: canonicalEntityMappings.entityId,
      set: {
        canonicalType: params.canonicalType,
        canonicalId: params.canonicalId,
        matchMethod: "admin_manual",
        confidence: 100,
        notes,
        updatedAt: now,
      },
    });

  await logAdminAction({
    actorUserId: params.actorUserId,
    action: "ingestion.mapping.map",
    targetType: "ingestion_entity",
    targetId: params.entityId,
    meta: {
      entityType: entity.entityType,
      sourceEntityId: entity.sourceEntityId,
      canonicalType: params.canonicalType,
      canonicalId: params.canonicalId,
      reason,
      previousMapping: existing
        ? {
            canonicalType: existing.canonicalType,
            canonicalId: existing.canonicalId,
            matchMethod: existing.matchMethod,
            confidence: existing.confidence,
          }
        : null,
    },
  });
}

export async function unmapIngestionEntity(params: {
  entityId: string;
  actorUserId: string | null;
}): Promise<void> {
  const entityRows = await db
    .select({
      id: ingestionEntities.id,
      entityType: ingestionEntities.entityType,
      sourceEntityId: ingestionEntities.sourceEntityId,
    })
    .from(ingestionEntities)
    .where(eq(ingestionEntities.id, params.entityId))
    .limit(1);

  const entity = entityRows[0];
  if (!entity) {
    throw new AdminMappingError("Ingestion entity not found.");
  }

  const mappingRows = await db
    .select({
      canonicalType: canonicalEntityMappings.canonicalType,
      canonicalId: canonicalEntityMappings.canonicalId,
      matchMethod: canonicalEntityMappings.matchMethod,
      confidence: canonicalEntityMappings.confidence,
    })
    .from(canonicalEntityMappings)
    .where(eq(canonicalEntityMappings.entityId, params.entityId))
    .limit(1);

  const mapping = mappingRows[0];
  if (!mapping) {
    throw new AdminMappingError("Mapping not found for this ingestion entity.");
  }

  await db.delete(canonicalEntityMappings).where(eq(canonicalEntityMappings.entityId, params.entityId));

  await logAdminAction({
    actorUserId: params.actorUserId,
    action: "ingestion.mapping.unmap",
    targetType: "ingestion_entity",
    targetId: params.entityId,
    meta: {
      entityType: entity.entityType,
      sourceEntityId: entity.sourceEntityId,
      previousMapping: {
        canonicalType: mapping.canonicalType,
        canonicalId: mapping.canonicalId,
        matchMethod: mapping.matchMethod,
        confidence: mapping.confidence,
      },
    },
  });
}
