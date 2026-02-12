import { and, eq, isNotNull } from "drizzle-orm";
import { describe, expect, test } from "vitest";

import { db } from "../../src/server/db";
import { categories, offers, products } from "../../src/server/db/schema";
import { createTRPCContext } from "../../src/server/trpc/context";
import { appRouter } from "../../src/server/trpc/router";

async function getCaller() {
  return appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );
}

type BuildFixture = {
  categorySlug: string;
  productId: string;
  offerId: string;
};

async function pickBuildFixture(): Promise<BuildFixture> {
  const rows = await db
    .select({
      categorySlug: categories.slug,
      productId: products.id,
      offerId: offers.id,
    })
    .from(offers)
    .innerJoin(products, eq(offers.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.status, "active"),
        eq(offers.inStock, true),
        isNotNull(offers.priceCents),
      ),
    )
    .limit(1);

  const fixture = rows[0];
  if (!fixture) {
    throw new Error("Expected at least one active product+offer fixture for build tests.");
  }

  return fixture;
}

describe("tRPC builds router", () => {
  test("share snapshot persists selected offer overrides", async () => {
    const caller = await getCaller();
    const fixture = await pickBuildFixture();

    const saved = await caller.builds.upsertAnonymous({
      productsByCategory: { [fixture.categorySlug]: fixture.productId },
      plantIds: [],
      selectedOfferIdByProductId: { [fixture.productId]: fixture.offerId },
    });

    const loaded = await caller.builds.getByShareSlug({ shareSlug: saved.shareSlug });
    expect(loaded.snapshot.productsByCategory[fixture.categorySlug]?.id).toBe(
      fixture.productId,
    );
    expect(loaded.snapshot.selectedOfferIdByProductId?.[fixture.productId]).toBe(
      fixture.offerId,
    );
  });
});
