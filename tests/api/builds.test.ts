import { describe, expect, test } from "vitest";

import { createTRPCContext } from "../../src/server/trpc/context";
import { appRouter } from "../../src/server/trpc/router";

async function getCaller() {
  return appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );
}

describe("tRPC builds router", () => {
  test("share snapshot persists selected offer overrides", async () => {
    const caller = await getCaller();

    const tank = await caller.products.getBySlug({ slug: "uns-60u" });
    const offers = await caller.offers.listByProductId({ productId: tank.id, limit: 50 });
    expect(offers.length).toBeGreaterThan(0);
    const offerId = offers[0]!.id;

    const saved = await caller.builds.upsertAnonymous({
      productsByCategory: { tank: tank.id },
      plantIds: [],
      selectedOfferIdByProductId: { [tank.id]: offerId },
    });

    const loaded = await caller.builds.getByShareSlug({ shareSlug: saved.shareSlug });
    expect(loaded.snapshot.productsByCategory.tank?.id).toBe(tank.id);
    expect(loaded.snapshot.selectedOfferIdByProductId?.[tank.id]).toBe(offerId);
  });
});

