import { and, eq, isNotNull } from "drizzle-orm";
import { describe, expect, test } from "vitest";

import { db } from "../../src/server/db";
import { offers, priceHistory, products } from "../../src/server/db/schema";
import { createTRPCContext } from "../../src/server/trpc/context";
import { appRouter } from "../../src/server/trpc/router";

async function getCaller() {
  return appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );
}

async function pickProductWithOffers(): Promise<string> {
  const rows = await db
    .select({ productId: products.id })
    .from(offers)
    .innerJoin(products, eq(offers.productId, products.id))
    .where(
      and(
        eq(products.status, "active"),
        eq(offers.inStock, true),
        isNotNull(offers.priceCents),
      ),
    )
    .limit(1);

  const productId = rows[0]?.productId;
  if (!productId) {
    throw new Error("Expected at least one active product with an in-stock priced offer.");
  }

  return productId;
}

describe("tRPC offers router", () => {
  test("bestByProductIds returns best in-stock offers for an active product", async () => {
    const caller = await getCaller();
    const productId = await pickProductWithOffers();

    const best = await caller.offers.bestByProductIds({ productIds: [productId] });

    expect(best.length).toBe(1);
    expect(best[0]!.productId).toBe(productId);
    expect(best[0]!.priceCents).toBeTypeOf("number");
    expect(best[0]!.goUrl).toMatch(/^\/go\//);
    expect(best[0]!.retailer.name).toBeTruthy();
  });

  test("summaryByProductIds returns derived offer summaries", async () => {
    const caller = await getCaller();
    const productId = await pickProductWithOffers();

    const summaries = await caller.offers.summaryByProductIds({ productIds: [productId] });

    expect(summaries.length).toBe(1);
    expect(summaries[0]!.productId).toBe(productId);
    expect(summaries[0]!.inStockCount).toBeGreaterThanOrEqual(0);
    expect(typeof summaries[0]!.staleFlag).toBe("boolean");

    expect(
      summaries[0]!.minPriceCents == null ||
        Number.isInteger(summaries[0]!.minPriceCents),
    ).toBe(true);
  });

  test("listByProductIds returns grouped retailer options with tracked go URLs", async () => {
    const caller = await getCaller();
    const productId = await pickProductWithOffers();

    const grouped = await caller.offers.listByProductIds({
      productIds: [productId],
      perProductLimit: 5,
    });

    expect(grouped.length).toBe(1);
    expect(grouped[0]!.productId).toBe(productId);
    expect(grouped[0]!.offers.length).toBeGreaterThan(0);
    expect(grouped[0]!.offers[0]!.goUrl).toMatch(/^\/go\//);
  });

  test("priceHistoryByProductId returns history rows (after inserting a point)", async () => {
    const caller = await getCaller();
    const productId = await pickProductWithOffers();

    const offerRows = await caller.offers.listByProductId({ productId, limit: 5 });
    expect(offerRows.length).toBeGreaterThan(0);

    const offerId = offerRows[0]!.id;
    await db.insert(priceHistory).values({
      offerId,
      priceCents: 12345,
      inStock: true,
      recordedAt: new Date(),
    });

    const rows = await caller.offers.priceHistoryByProductId({
      productId,
      days: 365,
      limit: 50,
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[rows.length - 1]!.priceCents).toBeTypeOf("number");
    expect(rows[rows.length - 1]!.retailer.name).toBeTruthy();
  });
});
