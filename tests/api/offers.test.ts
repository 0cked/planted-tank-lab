import { describe, expect, test } from "vitest";

import { db } from "../../src/server/db";
import { priceHistory } from "../../src/server/db/schema";
import { createTRPCContext } from "../../src/server/trpc/context";
import { appRouter } from "../../src/server/trpc/router";

async function getCaller() {
  return appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );
}

describe("tRPC offers router", () => {
  test("bestByProductIds returns best in-stock offers for seeded products", async () => {
    const caller = await getCaller();

    const seeded = await caller.products.getBySlug({ slug: "uns-60u" });
    const best = await caller.offers.bestByProductIds({ productIds: [seeded.id] });

    expect(best.length).toBe(1);
    expect(best[0]!.productId).toBe(seeded.id);
    expect(best[0]!.priceCents).toBeTypeOf("number");
    expect(best[0]!.goUrl).toMatch(/^\/go\//);
    expect(best[0]!.retailer.name).toBeTruthy();
  });

  test("priceHistoryByProductId returns history rows (after inserting a point)", async () => {
    const caller = await getCaller();
    const seeded = await caller.products.getBySlug({ slug: "uns-60u" });
    const offers = await caller.offers.listByProductId({ productId: seeded.id, limit: 5 });
    expect(offers.length).toBeGreaterThan(0);

    const offerId = offers[0]!.id;
    await db.insert(priceHistory).values({
      offerId,
      priceCents: 12345,
      inStock: true,
      recordedAt: new Date(),
    });

    const rows = await caller.offers.priceHistoryByProductId({
      productId: seeded.id,
      days: 365,
      limit: 50,
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[rows.length - 1]!.priceCents).toBeTypeOf("number");
    expect(rows[rows.length - 1]!.retailer.name).toBeTruthy();
  });
});
