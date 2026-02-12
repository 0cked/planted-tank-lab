import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { buildItems, builds, users } from "@/server/db/schema";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/router";

async function getAnonCaller() {
  return appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );
}

function getUserCaller(userId: string, email: string) {
  return appRouter.createCaller({
    db,
    req: new Request("http://localhost"),
    session: { user: { id: userId, email, role: "user" } },
  });
}

async function expectTrpcErrorCode<T>(promise: Promise<T>, code: TRPCError["code"]) {
  try {
    await promise;
    throw new Error("Expected tRPC call to throw.");
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe(code);
  }
}

describe("tRPC visualBuilder router", () => {
  it("saves and reloads a public visual build by share slug", async () => {
    const anon = await getAnonCaller();
    const catalog = await anon.visualBuilder.catalog();
    const tank = catalog.tanks[0];
    expect(tank?.id).toBeTruthy();
    expect(catalog.assets.some((asset) => asset.sourceMode === "design_archetype")).toBe(true);

    const saved = await anon.visualBuilder.save({
      name: "Visual Builder Public Test",
      description: "Public round-trip test",
      tankId: tank!.id,
      canvasState: {
        version: 2,
        widthIn: tank!.widthIn,
        heightIn: tank!.heightIn,
        depthIn: tank!.depthIn,
        substrateProfile: {
          leftDepthIn: 1.5,
          centerDepthIn: 2.3,
          rightDepthIn: 1.8,
          moundHeightIn: 0.8,
          moundPosition: 0.54,
        },
        items: [],
      },
      lineItems: [],
      isPublic: true,
      flags: {},
    });

    expect(saved.buildId).toBeTruthy();
    expect(saved.shareSlug).toBeTruthy();
    expect(saved.isPublic).toBe(true);

    const loaded = await anon.visualBuilder.getByShareSlug({ shareSlug: saved.shareSlug });
    expect(loaded.build.id).toBe(saved.buildId);
    expect(loaded.build.isPublic).toBe(true);
    expect(loaded.initialState.tankId).toBe(tank!.id);
    expect(loaded.initialState.canvasState.version).toBe(2);

    await db.delete(buildItems).where(eq(buildItems.buildId, saved.buildId));
    await db.delete(builds).where(eq(builds.id, saved.buildId));
  }, 20_000);

  it("normalizes legacy v1 canvas payloads to v2 on read", async () => {
    const anon = await getAnonCaller();
    const catalog = await anon.visualBuilder.catalog();
    const tank = catalog.tanks[0];
    expect(tank?.id).toBeTruthy();

    const saved = await anon.visualBuilder.save({
      name: "Visual Builder Legacy Canvas Test",
      tankId: tank!.id,
      canvasState: {
        version: 1,
        widthIn: tank!.widthIn,
        heightIn: tank!.heightIn,
        depthIn: tank!.depthIn,
        items: [],
      },
      lineItems: [],
      isPublic: true,
      flags: {},
    });

    const loaded = await anon.visualBuilder.getByShareSlug({ shareSlug: saved.shareSlug });
    expect(loaded.initialState.canvasState.version).toBe(2);
    expect(loaded.initialState.canvasState.substrateProfile.centerDepthIn).toBeGreaterThan(0.2);

    await db.delete(buildItems).where(eq(buildItems.buildId, saved.buildId));
    await db.delete(builds).where(eq(builds.id, saved.buildId));
  }, 20_000);

  it("hides private builds from anonymous callers while allowing owner access", async () => {
    const email = `visual-owner-${crypto.randomUUID()}@example.com`;
    const createdUser = await db
      .insert(users)
      .values({ email, authProvider: "email" })
      .returning({ id: users.id });
    const userId = createdUser[0]?.id;
    expect(userId).toBeTruthy();

    const owner = getUserCaller(userId!, email);
    const anon = await getAnonCaller();
    const catalog = await anon.visualBuilder.catalog();
    const tank = catalog.tanks[0];
    expect(tank?.id).toBeTruthy();

    const saved = await owner.visualBuilder.save({
      name: "Visual Builder Private Test",
      description: "Private access-control test",
      tankId: tank!.id,
      canvasState: {
        version: 2,
        widthIn: tank!.widthIn,
        heightIn: tank!.heightIn,
        depthIn: tank!.depthIn,
        substrateProfile: {
          leftDepthIn: 1.2,
          centerDepthIn: 2,
          rightDepthIn: 1.6,
          moundHeightIn: 0.4,
          moundPosition: 0.5,
        },
        items: [],
      },
      lineItems: [],
      isPublic: false,
      flags: {},
    });

    await expectTrpcErrorCode(
      anon.visualBuilder.getByShareSlug({ shareSlug: saved.shareSlug }),
      "NOT_FOUND",
    );

    const ownerLoaded = await owner.visualBuilder.getByShareSlug({ shareSlug: saved.shareSlug });
    expect(ownerLoaded.build.id).toBe(saved.buildId);
    expect(ownerLoaded.build.userId).toBe(userId);
    expect(ownerLoaded.build.isPublic).toBe(false);

    await db.delete(buildItems).where(eq(buildItems.buildId, saved.buildId));
    await db.delete(builds).where(eq(builds.id, saved.buildId));
    await db.delete(users).where(eq(users.id, userId!));
  }, 20_000);
});
