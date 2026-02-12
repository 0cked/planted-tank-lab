import { afterAll, describe, expect, test } from "vitest";
import { eq, inArray } from "drizzle-orm";

import { db } from "../../src/server/db";
import { plants } from "../../src/server/db/schema";
import { createTRPCContext } from "../../src/server/trpc/context";
import { appRouter } from "../../src/server/trpc/router";

async function getCaller() {
  return appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );
}

const createdPlantIds: string[] = [];

async function ensurePlantFixture(): Promise<{ slug: string; difficulty: string }> {
  const existing = await db
    .select({ slug: plants.slug, difficulty: plants.difficulty })
    .from(plants)
    .where(eq(plants.status, "active"))
    .orderBy(plants.commonName)
    .limit(1);

  if (existing[0]?.slug && existing[0]?.difficulty) {
    return {
      slug: existing[0].slug,
      difficulty: existing[0].difficulty,
    };
  }

  const slug = `vitest-plant-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const inserted = await db
    .insert(plants)
    .values({
      commonName: "Vitest Plant Fixture",
      scientificName: "Testa aquaticus",
      slug,
      difficulty: "easy",
      lightDemand: "low",
      co2Demand: "low",
      placement: "midground",
      description: "Fixture plant for router regression tests.",
      status: "active",
      beginnerFriendly: true,
      shrimpSafe: true,
      updatedAt: new Date(),
    })
    .returning({ id: plants.id, slug: plants.slug, difficulty: plants.difficulty });

  const row = inserted[0];
  if (!row) {
    throw new Error("Failed to create fallback plant fixture.");
  }

  createdPlantIds.push(row.id);
  return { slug: row.slug, difficulty: row.difficulty };
}

async function createInactivePlantFixture(): Promise<{ slug: string }> {
  const slug = `vitest-inactive-plant-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const inserted = await db
    .insert(plants)
    .values({
      commonName: "Vitest Inactive Plant",
      scientificName: "Testa inactiveus",
      slug,
      difficulty: "easy",
      lightDemand: "low",
      co2Demand: "none",
      placement: "foreground",
      description: "Inactive fixture plant for visibility filtering tests.",
      sources: ["https://example.com/plant-source"],
      imageUrl: "https://example.com/plant.jpg",
      status: "inactive",
      beginnerFriendly: true,
      shrimpSafe: true,
      updatedAt: new Date(),
    })
    .returning({ id: plants.id, slug: plants.slug });

  const row = inserted[0];
  if (!row) {
    throw new Error("Failed to create inactive plant fixture.");
  }

  createdPlantIds.push(row.id);
  return { slug: row.slug };
}

afterAll(async () => {
  if (createdPlantIds.length > 0) {
    await db.delete(plants).where(inArray(plants.id, createdPlantIds));
  }
});

describe("tRPC plants router", () => {
  test("getBySlug returns an active seeded plant", async () => {
    const caller = await getCaller();
    const fixture = await ensurePlantFixture();

    const p = await caller.plants.getBySlug({ slug: fixture.slug });
    expect(p.slug).toBe(fixture.slug);
    expect(p.commonName.trim().length).toBeGreaterThan(0);
    expect(Array.isArray((p as { sources?: unknown }).sources)).toBe(true);
  });

  test("search can filter by difficulty", async () => {
    const caller = await getCaller();
    const fixture = await ensurePlantFixture();

    const rows = await caller.plants.search({ difficulty: fixture.difficulty, limit: 200 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.difficulty === fixture.difficulty)).toBe(true);
  });

  test("search/getBySlug exclude inactive plants", async () => {
    const caller = await getCaller();
    const fixture = await createInactivePlantFixture();

    const rows = await caller.plants.search({
      q: "Vitest Inactive Plant",
      limit: 200,
    });
    expect(rows.some((row) => row.slug === fixture.slug)).toBe(false);

    await expect(caller.plants.getBySlug({ slug: fixture.slug })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
