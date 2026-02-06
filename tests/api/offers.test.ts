import { describe, expect, test } from "vitest";

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
});

