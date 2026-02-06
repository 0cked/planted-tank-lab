import { describe, expect, it } from "vitest";
import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "@/server/db";
import { buildItems, builds, categories, offers, products, users } from "@/server/db/schema";
import { appRouter } from "@/server/trpc/router";

describe("tRPC builds router (authenticated)", () => {
  it("upsertMine stores user ownership, flags, and cached pricing", async () => {
    const email = `test-${crypto.randomUUID()}@example.com`;
    const createdUsers = await db
      .insert(users)
      .values({ email, authProvider: "email" })
      .returning({ id: users.id });
    const userId = createdUsers[0]?.id;
    expect(userId).toBeTruthy();

    // Find a product with at least one in-stock offer with a known price.
    const offerRows = await db
      .select({
        productId: offers.productId,
        priceCents: offers.priceCents,
      })
      .from(offers)
      .where(and(eq(offers.inStock, true), isNotNull(offers.priceCents)))
      .orderBy(offers.priceCents)
      .limit(1);

    const bestOffer = offerRows[0];
    expect(bestOffer?.productId).toBeTruthy();
    expect(bestOffer?.priceCents).toBeTypeOf("number");

    const productId = bestOffer!.productId;
    const expectedTotal = bestOffer!.priceCents as number;

    // Ensure the chosen product belongs to some seeded category slug we can save under.
    const productRows = await db
      .select({ categoryId: products.categoryId })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    const categoryId = productRows[0]?.categoryId;
    expect(categoryId).toBeTruthy();

    const categorySlugRows = await db
      .select({ slug: categories.slug })
      .from(categories)
      .where(eq(categories.id, categoryId!))
      .limit(1);
    const categorySlug = categorySlugRows[0]?.slug;
    expect(categorySlug).toBeTruthy();

    const caller = appRouter.createCaller({
      db,
      req: new Request("http://localhost"),
      session: { user: { id: userId!, email, role: "user" } },
    });

    const res = await caller.builds.upsertMine({
      name: "Test Build",
      productsByCategory: { [categorySlug!]: productId },
      plantIds: [],
      flags: { hasShrimp: true, lowTechNoCo2: true },
    });

    expect(res.buildId).toBeTruthy();
    expect(res.shareSlug).toBeTruthy();
    expect(res.itemCount).toBe(1);

    const buildRows = await db
      .select({
        userId: builds.userId,
        itemCount: builds.itemCount,
        totalPriceCents: builds.totalPriceCents,
        flags: builds.flags,
      })
      .from(builds)
      .where(eq(builds.id, res.buildId))
      .limit(1);
    const build = buildRows[0];
    expect(build?.userId).toBe(userId);
    expect(build?.itemCount).toBe(1);
    expect(build?.totalPriceCents).toBe(expectedTotal);
    expect((build?.flags as Record<string, unknown>)["hasShrimp"]).toBe(true);
    expect((build?.flags as Record<string, unknown>)["lowTechNoCo2"]).toBe(true);

    // Clean up.
    await db.delete(buildItems).where(eq(buildItems.buildId, res.buildId));
    await db.delete(builds).where(eq(builds.id, res.buildId));
    await db.delete(users).where(eq(users.id, userId!));
  });
});

