import { describe, expect, test } from "vitest";

import { createTRPCContext } from "../../src/server/trpc/context";
import { appRouter } from "../../src/server/trpc/router";

async function getCaller() {
  return appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );
}

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
});

