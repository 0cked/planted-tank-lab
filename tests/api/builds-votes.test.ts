import { inArray } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { buildItems, buildTags, buildVotes, builds, categories, products, users } from "@/server/db/schema";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/router";

const createdBuildIds: string[] = [];
const createdUserIds: string[] = [];
const createdProductIds: string[] = [];
const createdCategoryIds: string[] = [];

function randomSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

async function createUser() {
  const email = `vote-test-${randomSuffix()}@example.com`;
  const inserted = await db
    .insert(users)
    .values({ email, authProvider: "email" })
    .returning({ id: users.id, email: users.email });

  const user = inserted[0];
  if (!user) {
    throw new Error("Failed to create test user");
  }

  createdUserIds.push(user.id);
  return user;
}

async function createPublicBuild(
  ownerUserId: string,
  name: string,
  options?: {
    description?: string | null;
    itemCount?: number;
    updatedAt?: Date;
  },
) {
  const shareSlug = `vote-${randomSuffix()}`;
  const inserted = await db
    .insert(builds)
    .values({
      userId: ownerUserId,
      name,
      description: options?.description,
      shareSlug,
      isPublic: true,
      itemCount: options?.itemCount ?? 0,
      updatedAt: options?.updatedAt ?? new Date(),
    })
    .returning({ id: builds.id });

  const row = inserted[0];
  if (!row) {
    throw new Error("Failed to create test build");
  }

  createdBuildIds.push(row.id);
  return row.id;
}

async function createCategoryAndProduct(productName: string) {
  const suffix = randomSuffix();
  const categoryInserted = await db
    .insert(categories)
    .values({
      slug: `vote-search-${suffix}`,
      name: `Vote Search ${suffix}`,
      displayOrder: 9_000,
    })
    .returning({ id: categories.id });

  const category = categoryInserted[0];
  if (!category) {
    throw new Error("Failed to create test category");
  }

  createdCategoryIds.push(category.id);

  const productInserted = await db
    .insert(products)
    .values({
      categoryId: category.id,
      name: productName,
      slug: `vote-search-product-${suffix}`,
    })
    .returning({ id: products.id });

  const product = productInserted[0];
  if (!product) {
    throw new Error("Failed to create test product");
  }

  createdProductIds.push(product.id);

  return {
    categoryId: category.id,
    productId: product.id,
  };
}

async function createPublicCaller() {
  return appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );
}

function createAuthedCaller(user: { id: string; email: string }) {
  return appRouter.createCaller({
    db,
    req: new Request("http://localhost"),
    session: {
      user: {
        id: user.id,
        email: user.email,
        role: "user",
      },
    },
  });
}

afterEach(async () => {
  if (createdBuildIds.length > 0) {
    await db.delete(buildVotes).where(inArray(buildVotes.buildId, createdBuildIds));
    await db.delete(builds).where(inArray(builds.id, createdBuildIds));
    createdBuildIds.length = 0;
  }

  if (createdProductIds.length > 0) {
    await db.delete(products).where(inArray(products.id, createdProductIds));
    createdProductIds.length = 0;
  }

  if (createdCategoryIds.length > 0) {
    await db.delete(categories).where(inArray(categories.id, createdCategoryIds));
    createdCategoryIds.length = 0;
  }

  if (createdUserIds.length > 0) {
    await db.delete(users).where(inArray(users.id, createdUserIds));
    createdUserIds.length = 0;
  }
});

describe("tRPC builds voting", () => {
  it("allows one vote per user per build", async () => {
    const owner = await createUser();
    const voter = await createUser();
    const buildId = await createPublicBuild(owner.id, "Vote once build");

    const caller = createAuthedCaller(voter);

    const first = await caller.builds.vote({ buildId });
    const second = await caller.builds.vote({ buildId });

    expect(first.didVote).toBe(true);
    expect(first.voteCount).toBe(1);

    expect(second.didVote).toBe(false);
    expect(second.voteCount).toBe(1);

    const voteState = await caller.builds.getVotes({ buildIds: [buildId] });
    expect(voteState.totalsByBuildId[buildId]).toBe(1);
    expect(voteState.viewerVotedBuildIds).toContain(buildId);
  }, 20_000);

  it("sorts public builds by vote count descending", async () => {
    const owner = await createUser();
    const voterA = await createUser();
    const voterB = await createUser();

    const lowVoteBuildId = await createPublicBuild(owner.id, "Low vote build");
    const highVoteBuildId = await createPublicBuild(owner.id, "High vote build");

    await db.insert(buildVotes).values({
      buildId: lowVoteBuildId,
      userId: voterA.id,
    });

    await db.insert(buildVotes).values([
      { buildId: highVoteBuildId, userId: voterA.id },
      { buildId: highVoteBuildId, userId: voterB.id },
    ]);

    const caller = await createPublicCaller();
    const rows = await caller.builds.listPublic({ limit: 100 });

    const lowIndex = rows.findIndex((row) => row.id === lowVoteBuildId);
    const highIndex = rows.findIndex((row) => row.id === highVoteBuildId);

    expect(lowIndex).toBeGreaterThanOrEqual(0);
    expect(highIndex).toBeGreaterThanOrEqual(0);
    expect(highIndex).toBeLessThan(lowIndex);

    const lowRow = rows.find((row) => row.id === lowVoteBuildId);
    const highRow = rows.find((row) => row.id === highVoteBuildId);

    expect(lowRow?.voteCount).toBe(1);
    expect(highRow?.voteCount).toBe(2);
  });

  it("filters public builds by tag and returns attached tags", async () => {
    const owner = await createUser();
    const iwagumiBuildId = await createPublicBuild(owner.id, "Tag filter Iwagumi");
    const jungleBuildId = await createPublicBuild(owner.id, "Tag filter Jungle");

    await db.insert(buildTags).values([
      { buildId: iwagumiBuildId, tagSlug: "iwagumi" },
      { buildId: iwagumiBuildId, tagSlug: "nano" },
      { buildId: jungleBuildId, tagSlug: "jungle" },
    ]);

    const caller = await createPublicCaller();
    const filtered = await caller.builds.listPublic({ limit: 100, tag: "iwagumi" });

    expect(filtered.some((row) => row.id === iwagumiBuildId)).toBe(true);
    expect(filtered.some((row) => row.id === jungleBuildId)).toBe(false);

    const iwagumiRow = filtered.find((row) => row.id === iwagumiBuildId);
    expect(iwagumiRow?.tags).toEqual(["iwagumi", "nano"]);
  });

  it("supports search across build name, description, and equipment names", async () => {
    const owner = await createUser();

    const nameToken = `name-${randomSuffix()}`;
    const descriptionToken = `description-${randomSuffix()}`;
    const equipmentToken = `equipment-${randomSuffix()}`;

    const nameBuildId = await createPublicBuild(owner.id, `Search ${nameToken}`);
    const descriptionBuildId = await createPublicBuild(owner.id, "Description search", {
      description: `This layout uses ${descriptionToken} hardscape`,
    });
    const equipmentBuildId = await createPublicBuild(owner.id, "Equipment search");

    const { categoryId, productId } = await createCategoryAndProduct(
      `Canister Filter ${equipmentToken}`,
    );

    await db.insert(buildItems).values({
      buildId: equipmentBuildId,
      categoryId,
      productId,
      quantity: 1,
    });

    const caller = await createPublicCaller();

    const byName = await caller.builds.listPublic({ limit: 100, search: nameToken });
    expect(byName.some((row) => row.id === nameBuildId)).toBe(true);

    const byDescription = await caller.builds.listPublic({
      limit: 100,
      search: descriptionToken,
    });
    expect(byDescription.some((row) => row.id === descriptionBuildId)).toBe(true);

    const byEquipment = await caller.builds.listPublic({
      limit: 100,
      search: equipmentToken,
    });
    expect(byEquipment.some((row) => row.id === equipmentBuildId)).toBe(true);
  });

  it("combines search and tag filters", async () => {
    const owner = await createUser();
    const token = `tag-search-${randomSuffix()}`;

    const matchingBuildId = await createPublicBuild(owner.id, `Iwagumi ${token}`);
    const nonMatchingBuildId = await createPublicBuild(owner.id, `Jungle ${token}`);

    await db.insert(buildTags).values([
      { buildId: matchingBuildId, tagSlug: "iwagumi" },
      { buildId: nonMatchingBuildId, tagSlug: "jungle" },
    ]);

    const caller = await createPublicCaller();
    const rows = await caller.builds.listPublic({
      limit: 100,
      search: token,
      tag: "iwagumi",
    });

    expect(rows.some((row) => row.id === matchingBuildId)).toBe(true);
    expect(rows.some((row) => row.id === nonMatchingBuildId)).toBe(false);
  });

  it("supports newest, most items, and alphabetical sort options", async () => {
    const owner = await createUser();
    const token = `sort-${randomSuffix()}`;

    const oldestBuildId = await createPublicBuild(owner.id, `C-${token}`, {
      itemCount: 1,
      updatedAt: new Date("2024-01-01T12:00:00Z"),
    });
    const newestBuildId = await createPublicBuild(owner.id, `B-${token}`, {
      itemCount: 5,
      updatedAt: new Date("2026-01-01T12:00:00Z"),
    });
    const mostItemsBuildId = await createPublicBuild(owner.id, `A-${token}`, {
      itemCount: 40,
      updatedAt: new Date("2025-01-01T12:00:00Z"),
    });

    const caller = await createPublicCaller();

    const newestRows = await caller.builds.listPublic({
      limit: 100,
      search: token,
      sort: "newest",
    });
    expect(newestRows.map((row) => row.id).slice(0, 3)).toEqual([
      newestBuildId,
      mostItemsBuildId,
      oldestBuildId,
    ]);

    const mostItemsRows = await caller.builds.listPublic({
      limit: 100,
      search: token,
      sort: "most-items",
    });
    expect(mostItemsRows.map((row) => row.id).slice(0, 3)).toEqual([
      mostItemsBuildId,
      newestBuildId,
      oldestBuildId,
    ]);

    const alphabeticalRows = await caller.builds.listPublic({
      limit: 100,
      search: token,
      sort: "alphabetical",
    });
    expect(alphabeticalRows.map((row) => row.id).slice(0, 3)).toEqual([
      mostItemsBuildId,
      newestBuildId,
      oldestBuildId,
    ]);
  });
});
