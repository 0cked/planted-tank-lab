import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { builds, users } from "@/server/db/schema";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/router";

const createdBuildIds: string[] = [];
const createdUserIds: string[] = [];

function randomSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

async function createUser(params?: { displayName?: string }) {
  const email = `comment-test-${randomSuffix()}@example.com`;
  const inserted = await db
    .insert(users)
    .values({
      email,
      displayName: params?.displayName,
      authProvider: "email",
    })
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    });

  const user = inserted[0];
  if (!user) {
    throw new Error("Failed to create test user");
  }

  createdUserIds.push(user.id);
  return user;
}

async function createBuild(ownerUserId: string): Promise<{
  id: string;
  shareSlug: string;
}> {
  const shareSlug = `comment-${randomSuffix()}`;
  const inserted = await db
    .insert(builds)
    .values({
      userId: ownerUserId,
      name: `Comment Test ${randomSuffix()}`,
      shareSlug,
      isPublic: true,
      updatedAt: new Date(),
    })
    .returning({
      id: builds.id,
      shareSlug: builds.shareSlug,
    });

  const build = inserted[0];
  if (!build) {
    throw new Error("Failed to create test build");
  }

  if (!build.shareSlug) {
    throw new Error("Expected share slug for created build");
  }

  createdBuildIds.push(build.id);
  return {
    id: build.id,
    shareSlug: build.shareSlug,
  };
}

async function createPublicCaller() {
  return appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );
}

function createAuthedCaller(user: { id: string; email: string | null }) {
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

async function expectTrpcErrorCode<T>(promise: Promise<T>, code: string) {
  try {
    await promise;
    throw new Error("Expected tRPC call to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe(code);
  }
}

afterEach(async () => {
  if (createdBuildIds.length > 0) {
    for (const buildId of createdBuildIds) {
      await db.delete(builds).where(eq(builds.id, buildId));
    }
    createdBuildIds.length = 0;
  }

  if (createdUserIds.length > 0) {
    for (const userId of createdUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
    createdUserIds.length = 0;
  }
});

describe("tRPC builds comments", () => {
  it("adds comments and one-level replies on shared builds", async () => {
    const owner = await createUser({ displayName: "Build Owner" });
    const commenter = await createUser({ displayName: "Aqua Friend" });
    const replier = await createUser();
    const build = await createBuild(owner.id);

    const commenterCaller = createAuthedCaller(commenter);
    const replierCaller = createAuthedCaller(replier);
    const publicCaller = await createPublicCaller();

    const topLevel = await commenterCaller.builds.addComment({
      shareSlug: build.shareSlug,
      body: "Love the hardscape layout.",
    });

    await replierCaller.builds.addComment({
      shareSlug: build.shareSlug,
      body: "Same here. The slope works really well.",
      parentId: topLevel.id,
    });

    const listed = await publicCaller.builds.listComments({
      shareSlug: build.shareSlug,
    });

    expect(listed.comments).toHaveLength(1);

    const thread = listed.comments[0];
    expect(thread?.body).toBe("Love the hardscape layout.");
    expect(thread?.author.name).toBe("Aqua Friend");

    expect(thread?.replies).toHaveLength(1);
    expect(thread?.replies[0]?.body).toBe("Same here. The slope works really well.");
    expect(thread?.replies[0]?.parentId).toBe(topLevel.id);
  });

  it("rejects replies to replies (one thread level only)", async () => {
    const owner = await createUser();
    const commenter = await createUser();
    const build = await createBuild(owner.id);

    const caller = createAuthedCaller(commenter);

    const topLevel = await caller.builds.addComment({
      shareSlug: build.shareSlug,
      body: "Top-level comment",
    });

    const reply = await caller.builds.addComment({
      shareSlug: build.shareSlug,
      body: "First-level reply",
      parentId: topLevel.id,
    });

    await expectTrpcErrorCode(
      caller.builds.addComment({
        shareSlug: build.shareSlug,
        body: "Second-level reply should fail",
        parentId: reply.id,
      }),
      "BAD_REQUEST",
    );
  });

  it("requires authentication for addComment", async () => {
    const owner = await createUser();
    const build = await createBuild(owner.id);

    const publicCaller = await createPublicCaller();

    await expectTrpcErrorCode(
      publicCaller.builds.addComment({
        shareSlug: build.shareSlug,
        body: "Guests cannot comment.",
      }),
      "UNAUTHORIZED",
    );
  });
});
