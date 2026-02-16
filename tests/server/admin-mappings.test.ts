import { afterAll, describe, expect, test } from "vitest";
import { and, desc, eq } from "drizzle-orm";

import { db } from "../../src/server/db";
import {
  adminLogs,
  canonicalEntityMappings,
  categories,
  ingestionEntities,
  ingestionSources,
  products,
} from "../../src/server/db/schema";
import { ensureIngestionSource } from "../../src/server/ingestion/sources";
import {
  mapIngestionEntityToCanonical,
  unmapIngestionEntity,
} from "../../src/server/services/admin/mappings";

const suffix = Date.now();
const sourceSlug = `vitest-admin-mappings-${suffix}`;
const sourceEntityId = `vitest-ingestion-product-${suffix}`;
const productSlug = `vitest-canonical-product-${suffix}`;

let sourceId: string | null = null;
let entityId: string | null = null;
let canonicalProductId: string | null = null;

afterAll(async () => {
  if (entityId) {
    await db
      .delete(adminLogs)
      .where(
        and(
          eq(adminLogs.targetType, "ingestion_entity"),
          eq(adminLogs.targetId, entityId),
        ),
      );
  }

  if (sourceId) {
    await db.delete(ingestionSources).where(eq(ingestionSources.id, sourceId));
  }

  if (canonicalProductId) {
    await db.delete(products).where(eq(products.id, canonicalProductId));
  }
});

describe("admin ingestion mappings", () => {
  test("maps and unmaps an ingestion entity with admin logs", async () => {
    sourceId = await ensureIngestionSource({
      slug: sourceSlug,
      name: "Vitest admin mappings source",
      kind: "manual_seed",
      defaultTrust: "manual_seed",
      scheduleEveryMinutes: null,
      config: { test: true, scope: "admin-mappings" },
    });

    const entityRows = await db
      .insert(ingestionEntities)
      .values({
        sourceId,
        entityType: "product",
        sourceEntityId,
        active: true,
        meta: { test: true },
        updatedAt: new Date(),
      })
      .returning({ id: ingestionEntities.id });

    entityId = entityRows[0]?.id ?? null;
    expect(entityId).toBeTruthy();

    const categoryRows = await db
      .select({ id: categories.id })
      .from(categories)
      .limit(1);
    const categoryId = categoryRows[0]?.id ?? null;

    expect(categoryId).toBeTruthy();

    const productRows = await db
      .insert(products)
      .values({
        categoryId: categoryId!,
        name: `Vitest canonical product ${suffix}`,
        slug: productSlug,
        specs: {},
        meta: {},
        imageUrls: [],
        updatedAt: new Date(),
      })
      .returning({ id: products.id });

    canonicalProductId = productRows[0]?.id ?? null;
    expect(canonicalProductId).toBeTruthy();

    await mapIngestionEntityToCanonical({
      entityId: entityId!,
      canonicalType: "product",
      canonicalId: canonicalProductId!,
      actorUserId: null,
      reason: "manual admin map test",
    });

    const mappedRows = await db
      .select({
        canonicalId: canonicalEntityMappings.canonicalId,
        matchMethod: canonicalEntityMappings.matchMethod,
        confidence: canonicalEntityMappings.confidence,
      })
      .from(canonicalEntityMappings)
      .where(eq(canonicalEntityMappings.entityId, entityId!))
      .limit(1);

    expect(mappedRows).toHaveLength(1);
    expect(mappedRows[0]?.canonicalId).toBe(canonicalProductId);
    expect(mappedRows[0]?.matchMethod).toBe("admin_manual");
    expect(mappedRows[0]?.confidence).toBe(100);

    const mapLogRows = await db
      .select({ action: adminLogs.action })
      .from(adminLogs)
      .where(
        and(
          eq(adminLogs.action, "ingestion.mapping.map"),
          eq(adminLogs.targetId, entityId!),
        ),
      )
      .orderBy(desc(adminLogs.createdAt))
      .limit(1);

    expect(mapLogRows).toHaveLength(1);

    await unmapIngestionEntity({
      entityId: entityId!,
      actorUserId: null,
    });

    const unmappedRows = await db
      .select({ id: canonicalEntityMappings.id })
      .from(canonicalEntityMappings)
      .where(eq(canonicalEntityMappings.entityId, entityId!))
      .limit(1);

    expect(unmappedRows).toHaveLength(0);

    const unmapLogRows = await db
      .select({ action: adminLogs.action })
      .from(adminLogs)
      .where(
        and(
          eq(adminLogs.action, "ingestion.mapping.unmap"),
          eq(adminLogs.targetId, entityId!),
        ),
      )
      .orderBy(desc(adminLogs.createdAt))
      .limit(1);

    expect(unmapLogRows).toHaveLength(1);
  }, 30_000);

  test("rejects canonical type mismatch", async () => {
    if (!entityId || !canonicalProductId) {
      throw new Error("Mapping fixture was not created.");
    }

    await expect(
      mapIngestionEntityToCanonical({
        entityId,
        canonicalType: "plant",
        canonicalId: canonicalProductId,
        actorUserId: null,
      }),
    ).rejects.toThrow("Canonical type mismatch");
  });
});
