import { afterAll, describe, expect, test } from "vitest";
import { eq, inArray } from "drizzle-orm";

import { db } from "../../src/server/db";
import { brands, categories, products } from "../../src/server/db/schema";
import { createTRPCContext } from "../../src/server/trpc/context";
import { appRouter } from "../../src/server/trpc/router";

async function getCaller() {
  return appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );
}

const createdProductIds: string[] = [];

async function createInactiveProductFixture(): Promise<{ slug: string }> {
  const categoryRow = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, "tank"))
    .limit(1);
  if (!categoryRow[0]?.id) {
    throw new Error("Missing tank category fixture.");
  }

  const brandRow = await db
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.slug, "uns"))
    .limit(1);
  if (!brandRow[0]?.id) {
    throw new Error("Missing UNS brand fixture.");
  }

  const slug = `vitest-inactive-product-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const inserted = await db
    .insert(products)
    .values({
      categoryId: categoryRow[0].id,
      brandId: brandRow[0].id,
      name: "Vitest Inactive Product",
      slug,
      specs: { volume_gal: 10 },
      status: "inactive",
      source: "manual_seed",
      verified: false,
      updatedAt: new Date(),
    })
    .returning({ id: products.id, slug: products.slug });

  const row = inserted[0];
  if (!row) {
    throw new Error("Failed to insert inactive product fixture.");
  }

  createdProductIds.push(row.id);
  return { slug: row.slug };
}

afterAll(async () => {
  if (createdProductIds.length > 0) {
    await db.delete(products).where(inArray(products.id, createdProductIds));
  }
});

describe("tRPC products router", () => {
  test("categoryBySlug returns the tank category", async () => {
    const caller = await getCaller();
    const cat = await caller.products.categoryBySlug({ slug: "tank" });
    expect(cat?.slug).toBe("tank");
  });

  test("getBySlug returns a seeded product", async () => {
    const caller = await getCaller();
    const p = await caller.products.getBySlug({ slug: "uns-60u" });
    expect(p.slug).toBe("uns-60u");
    expect(p.category.slug).toBe("tank");
  });

  test("search can filter by query string", async () => {
    const caller = await getCaller();
    const rows = await caller.products.search({
      categorySlug: "tank",
      q: "UNS",
      limit: 50,
    });
    expect(rows.some((r) => r.slug === "uns-60u")).toBe(true);
  });

  test("search/getBySlug exclude inactive products", async () => {
    const caller = await getCaller();
    const fixture = await createInactiveProductFixture();

    const rows = await caller.products.search({
      categorySlug: "tank",
      q: "Vitest Inactive Product",
      limit: 50,
    });
    expect(rows.some((row) => row.slug === fixture.slug)).toBe(false);

    await expect(
      caller.products.getBySlug({ slug: fixture.slug }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
