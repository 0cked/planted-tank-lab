import { describe, expect, test } from "vitest";

import { createTRPCContext } from "../../src/server/trpc/context";
import { appRouter } from "../../src/server/trpc/router";

async function getCaller() {
  return appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );
}

describe("tRPC plants router", () => {
  test("getBySlug returns a seeded plant", async () => {
    const caller = await getCaller();
    const p = await caller.plants.getBySlug({ slug: "java-fern" });
    expect(p.slug).toBe("java-fern");
    expect(p.commonName.toLowerCase()).toContain("java");
  });

  test("search can filter by difficulty", async () => {
    const caller = await getCaller();
    const rows = await caller.plants.search({ difficulty: "easy", limit: 200 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.difficulty === "easy")).toBe(true);
  });
});

