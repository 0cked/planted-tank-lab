import { afterAll, describe, expect, test } from "vitest";
import { and, desc, eq } from "drizzle-orm";

import { db } from "../../src/server/db";
import {
  adminLogs,
  categories,
  normalizationOverrides,
  products,
  users,
} from "../../src/server/db/schema";
import {
  createNormalizationOverride,
  deleteNormalizationOverride,
  updateNormalizationOverride,
} from "../../src/server/services/admin/overrides";

const suffix = Date.now();
const adminEmail = `vitest-admin-overrides-${suffix}@example.com`;
const categorySlug = `vitest-overrides-category-${suffix}`;
const productSlug = `vitest-overrides-product-${suffix}`;

let actorUserId: string | null = null;
let categoryId: string | null = null;
let canonicalProductId: string | null = null;
let overrideId: string | null = null;

afterAll(async () => {
  if (overrideId) {
    await db.delete(normalizationOverrides).where(eq(normalizationOverrides.id, overrideId));
  }

  if (overrideId) {
    await db
      .delete(adminLogs)
      .where(
        and(
          eq(adminLogs.targetType, "normalization_override"),
          eq(adminLogs.targetId, overrideId),
        ),
      );
  }

  if (canonicalProductId) {
    await db.delete(products).where(eq(products.id, canonicalProductId));
  }

  if (categoryId) {
    await db.delete(categories).where(eq(categories.id, categoryId));
  }

  if (actorUserId) {
    await db.delete(users).where(eq(users.id, actorUserId));
  }
});

describe("admin normalization overrides", () => {
  test("create/update/delete stores reason + actor + timestamps and logs actions", async () => {
    const userRows = await db
      .insert(users)
      .values({
        email: adminEmail,
        role: "admin",
        authProvider: "email",
        updatedAt: new Date(),
      })
      .returning({ id: users.id });

    actorUserId = userRows[0]?.id ?? null;
    expect(actorUserId).toBeTruthy();

    const categoryRows = await db
      .insert(categories)
      .values({
        slug: categorySlug,
        name: `Vitest Overrides Category ${suffix}`,
        displayOrder: 9999,
        builderRequired: false,
        updatedAt: new Date(),
      })
      .returning({ id: categories.id });

    categoryId = categoryRows[0]?.id ?? null;
    expect(categoryId).toBeTruthy();

    const productRows = await db
      .insert(products)
      .values({
        categoryId: categoryId!,
        name: `Vitest override product ${suffix}`,
        slug: productSlug,
        specs: {},
        meta: {},
        imageUrls: [],
        updatedAt: new Date(),
      })
      .returning({ id: products.id });

    canonicalProductId = productRows[0]?.id ?? null;
    expect(canonicalProductId).toBeTruthy();

    const created = await createNormalizationOverride({
      canonicalType: "product",
      canonicalId: canonicalProductId!,
      fieldPath: "name",
      value: "Manual Override Name",
      reason: "Correct product naming mismatch",
      actorUserId: actorUserId!,
    });

    overrideId = created.id;

    const createdRows = await db
      .select({
        id: normalizationOverrides.id,
        reason: normalizationOverrides.reason,
        actorUserId: normalizationOverrides.actorUserId,
        fieldPath: normalizationOverrides.fieldPath,
        value: normalizationOverrides.value,
        createdAt: normalizationOverrides.createdAt,
        updatedAt: normalizationOverrides.updatedAt,
      })
      .from(normalizationOverrides)
      .where(eq(normalizationOverrides.id, created.id))
      .limit(1);

    expect(createdRows).toHaveLength(1);
    const createdRow = createdRows[0]!;
    expect(createdRow.reason).toBe("Correct product naming mismatch");
    expect(createdRow.actorUserId).toBe(actorUserId);
    expect(createdRow.fieldPath).toBe("name");
    expect(createdRow.value).toBe("Manual Override Name");
    expect(createdRow.createdAt).toBeInstanceOf(Date);
    expect(createdRow.updatedAt).toBeInstanceOf(Date);

    await updateNormalizationOverride({
      overrideId: created.id,
      canonicalType: "product",
      canonicalId: canonicalProductId!,
      fieldPath: "specs.tankVolumeGallons",
      value: 20,
      reason: "Correct measured tank volume",
      actorUserId: actorUserId!,
    });

    const updatedRows = await db
      .select({
        reason: normalizationOverrides.reason,
        actorUserId: normalizationOverrides.actorUserId,
        fieldPath: normalizationOverrides.fieldPath,
        value: normalizationOverrides.value,
        updatedAt: normalizationOverrides.updatedAt,
      })
      .from(normalizationOverrides)
      .where(eq(normalizationOverrides.id, created.id))
      .limit(1);

    expect(updatedRows).toHaveLength(1);
    const updatedRow = updatedRows[0]!;
    expect(updatedRow.reason).toBe("Correct measured tank volume");
    expect(updatedRow.actorUserId).toBe(actorUserId);
    expect(updatedRow.fieldPath).toBe("specs.tankVolumeGallons");
    expect(updatedRow.value).toBe(20);
    expect(updatedRow.updatedAt.getTime()).toBeGreaterThanOrEqual(
      createdRow.updatedAt.getTime(),
    );

    await deleteNormalizationOverride({
      overrideId: created.id,
      actorUserId: actorUserId!,
    });

    const deletedRows = await db
      .select({ id: normalizationOverrides.id })
      .from(normalizationOverrides)
      .where(eq(normalizationOverrides.id, created.id))
      .limit(1);

    expect(deletedRows).toHaveLength(0);

    const logRows = await db
      .select({ action: adminLogs.action })
      .from(adminLogs)
      .where(
        and(
          eq(adminLogs.targetType, "normalization_override"),
          eq(adminLogs.targetId, created.id),
        ),
      )
      .orderBy(desc(adminLogs.createdAt));

    const actions = logRows.map((row) => row.action);
    expect(actions).toContain("normalization.override.create");
    expect(actions).toContain("normalization.override.update");
    expect(actions).toContain("normalization.override.delete");
  });

  test("duplicate field override for the same canonical entity is rejected", async () => {
    if (!actorUserId || !canonicalProductId) {
      throw new Error("Override fixtures were not initialized.");
    }

    const created = await createNormalizationOverride({
      canonicalType: "product",
      canonicalId: canonicalProductId,
      fieldPath: "meta.notes",
      value: "first",
      reason: "initial note override",
      actorUserId,
    });

    await expect(
      createNormalizationOverride({
        canonicalType: "product",
        canonicalId: canonicalProductId,
        fieldPath: "meta.notes",
        value: "second",
        reason: "duplicate note override",
        actorUserId,
      }),
    ).rejects.toThrow("already exists");

    await deleteNormalizationOverride({
      overrideId: created.id,
      actorUserId,
    });

    await db
      .delete(adminLogs)
      .where(
        and(
          eq(adminLogs.targetType, "normalization_override"),
          eq(adminLogs.targetId, created.id),
        ),
      );
  });
});
