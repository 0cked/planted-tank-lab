import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { buildVotes, builds, users } from "@/server/db/schema";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/router";

const createdBuildIds: string[] = [];
const createdUserIds: string[] = [];

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

async function createPublicBuild(ownerUserId: string, name: string) {
  const shareSlug = `vote-${randomSuffix()}`;
  const inserted = await db
    .insert(builds)
    .values({
      userId: ownerUserId,
      name,
      shareSlug,
      isPublic: true,
      updatedAt: new Date(),
    })
    .returning({ id: builds.id });

  const row = inserted[0];
  if (!row) {
    throw new Error("Failed to create test build");
  }

  createdBuildIds.push(row.id);
  return row.id;
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
    await db.delete(buildVotes).where(eq(buildVotes.buildId, createdBuildIds[0]!));
    for (const buildId of createdBuildIds.slice(1)) {
      await db.delete(buildVotes).where(eq(buildVotes.buildId, buildId));
    }

    await db.delete(builds).where(eq(builds.id, createdBuildIds[0]!));
    for (const buildId of createdBuildIds.slice(1)) {
      await db.delete(builds).where(eq(builds.id, buildId));
    }

    createdBuildIds.length = 0;
  }

  if (createdUserIds.length > 0) {
    await db.delete(users).where(eq(users.id, createdUserIds[0]!));
    for (const userId of createdUserIds.slice(1)) {
      await db.delete(users).where(eq(users.id, userId));
    }

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
  });

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
});
