import { describe, expect, test } from "vitest";
import { and, desc, eq, inArray } from "drizzle-orm";

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

type OverrideTestFixture = {
  actorUserId: string;
  categoryId: string;
  canonicalProductId: string;
  overrideIds: string[];
  adminEmail: string;
  categorySlug: string;
  productSlug: string;
};

async function createFixture(seed: string): Promise<OverrideTestFixture> {
  const shortSuffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 10_000)
    .toString(36)
    .padStart(3, "0")}`;
  const fixtureKey = `${seed.slice(0, 8)}-${shortSuffix}`;
  const adminEmail = `vitest-admin-overrides-${fixtureKey}@example.com`;
  const categorySlug = `vitest-ovr-cat-${fixtureKey}`;
  const productSlug = `vitest-ovr-prod-${fixtureKey}`;

  const userRows = await db
    .insert(users)
    .values({
      email: adminEmail,
      role: "admin",
      authProvider: "email",
      updatedAt: new Date(),
    })
    .returning({ id: users.id });

  const actorUserId = userRows[0]?.id;
  if (!actorUserId) throw new Error("Failed to create override test user fixture.");

  const categoryRows = await db
    .insert(categories)
    .values({
      slug: categorySlug,
      name: `Vitest Overrides Category ${fixtureKey}`,
      displayOrder: 9999,
      builderRequired: false,
      updatedAt: new Date(),
    })
    .returning({ id: categories.id });

  const categoryId = categoryRows[0]?.id;
  if (!categoryId) throw new Error("Failed to create override test category fixture.");

  const productRows = await db
    .insert(products)
    .values({
      categoryId,
      name: `Vitest override product ${fixtureKey}`,
      slug: productSlug,
      specs: {},
      meta: {},
      imageUrls: [],
      updatedAt: new Date(),
    })
    .returning({ id: products.id });

  const canonicalProductId = productRows[0]?.id;
  if (!canonicalProductId) throw new Error("Failed to create override test product fixture.");

  return {
    actorUserId,
    categoryId,
    canonicalProductId,
    overrideIds: [],
    adminEmail,
    categorySlug,
    productSlug,
  };
}

async function cleanupFixture(fixture: OverrideTestFixture): Promise<void> {
  const overrideRows = await db
    .select({ id: normalizationOverrides.id })
    .from(normalizationOverrides)
    .where(eq(normalizationOverrides.canonicalId, fixture.canonicalProductId));

  const overrideIds = Array.from(
    new Set([...fixture.overrideIds, ...overrideRows.map((row) => row.id)]),
  );

  if (overrideIds.length > 0) {
    await db
      .delete(normalizationOverrides)
      .where(inArray(normalizationOverrides.id, overrideIds));

    await db
      .delete(adminLogs)
      .where(
        and(
          eq(adminLogs.targetType, "normalization_override"),
          inArray(adminLogs.targetId, overrideIds),
        ),
      );
  }

  await db.delete(products).where(eq(products.id, fixture.canonicalProductId));
  await db.delete(categories).where(eq(categories.id, fixture.categoryId));
  await db.delete(users).where(eq(users.id, fixture.actorUserId));
}

describe("admin normalization overrides", () => {
  test("create/update/delete stores reason + actor + timestamps and logs actions", async () => {
    const fixture = await createFixture("create-update-delete");

    try {
      const created = await createNormalizationOverride({
        canonicalType: "product",
        canonicalId: fixture.canonicalProductId,
        fieldPath: "name",
        value: "Manual Override Name",
        reason: "Correct product naming mismatch",
        actorUserId: fixture.actorUserId,
      });
      fixture.overrideIds.push(created.id);

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
      expect(createdRow.actorUserId).toBe(fixture.actorUserId);
      expect(createdRow.fieldPath).toBe("name");
      expect(createdRow.value).toBe("Manual Override Name");
      expect(createdRow.createdAt).toBeInstanceOf(Date);
      expect(createdRow.updatedAt).toBeInstanceOf(Date);

      await updateNormalizationOverride({
        overrideId: created.id,
        canonicalType: "product",
        canonicalId: fixture.canonicalProductId,
        fieldPath: "specs.tankVolumeGallons",
        value: 20,
        reason: "Correct measured tank volume",
        actorUserId: fixture.actorUserId,
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
      expect(updatedRow.actorUserId).toBe(fixture.actorUserId);
      expect(updatedRow.fieldPath).toBe("specs.tankVolumeGallons");
      expect(updatedRow.value).toBe(20);
      expect(updatedRow.updatedAt.getTime()).toBeGreaterThanOrEqual(
        createdRow.updatedAt.getTime(),
      );

      await deleteNormalizationOverride({
        overrideId: created.id,
        actorUserId: fixture.actorUserId,
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
    } finally {
      await cleanupFixture(fixture);
    }
  }, 45_000);

  test("duplicate field override for the same canonical entity is rejected", async () => {
    const fixture = await createFixture("duplicate");

    try {
      const created = await createNormalizationOverride({
        canonicalType: "product",
        canonicalId: fixture.canonicalProductId,
        fieldPath: "meta.notes",
        value: "first",
        reason: "initial note override",
        actorUserId: fixture.actorUserId,
      });
      fixture.overrideIds.push(created.id);

      await expect(
        createNormalizationOverride({
          canonicalType: "product",
          canonicalId: fixture.canonicalProductId,
          fieldPath: "meta.notes",
          value: "second",
          reason: "duplicate note override",
          actorUserId: fixture.actorUserId,
        }),
      ).rejects.toThrow("already exists");
    } finally {
      await cleanupFixture(fixture);
    }
  });
});
