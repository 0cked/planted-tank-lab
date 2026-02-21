import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { buildItems, buildTags, buildVersions, builds, users } from "@/server/db/schema";
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

const ONE_PIXEL_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBAQEAH4QAAAAASUVORK5CYII=";

describe("tRPC visualBuilder router", () => {
  beforeEach(async () => {
    await db.execute(sql`
      create table if not exists "build_versions" (
        "build_id" uuid not null references "builds"("id") on delete cascade,
        "version_number" integer not null,
        "canvas_state" jsonb not null default '{}'::jsonb,
        "created_at" timestamp with time zone not null default now(),
        primary key ("build_id", "version_number")
      );
    `);
  });

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
          frontDepthIn: 1.4,
          backDepthIn: 3.1,
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
    expect(loaded.initialState.canvasState.version).toBe(4);
    expect(loaded.initialState.canvasState.substrateHeightfield).toBeInstanceOf(Float32Array);
    expect(loaded.initialState.canvasState.substrateHeightfield.length).toBe(32 * 32);
    expect(loaded.initialState.canvasState.substrateMaterialGrid).toBeInstanceOf(Uint8Array);
    expect(loaded.initialState.canvasState.substrateMaterialGrid.length).toBe(32 * 32);

    await db.delete(buildItems).where(eq(buildItems.buildId, saved.buildId));
    await db.delete(builds).where(eq(builds.id, saved.buildId));
  }, 40_000);

  it("persists build tags and returns them in visual builder snapshots", async () => {
    const anon = await getAnonCaller();
    const catalog = await anon.visualBuilder.catalog();
    const tank = catalog.tanks[0];
    expect(tank?.id).toBeTruthy();

    const saved = await anon.visualBuilder.save({
      name: "Visual Builder Tag Test",
      description: "Tags round-trip through save and load",
      tankId: tank!.id,
      canvasState: {
        version: 4,
        widthIn: 40,
        heightIn: 16,
        depthIn: 20,
        substrateHeightfield: Array.from({ length: 32 * 32 }, () => 1.1),
        substrateMaterialGrid: Array.from({ length: 32 * 32 }, (_, index) =>
          index < 32 * 16 ? 1 : 0,
        ),
        sceneSettings: {
          qualityTier: "auto",
          postprocessingEnabled: true,
          guidesVisible: true,
          tankBackgroundStyle: "custom",
          tankBackgroundColor: "#334455",
          cabinetFinishStyle: "custom",
          cabinetColor: "#6e543d",
          audioEnabled: false,
          cameraPreset: "step",
        },
        items: [],
      },
      lineItems: [],
      tags: ["nature", "iwagumi", "nature"],
      isPublic: true,
      flags: {},
    });

    const loaded = await anon.visualBuilder.getByShareSlug({ shareSlug: saved.shareSlug });
    expect(loaded.initialState.tags).toEqual(["iwagumi", "nature"]);
    expect(loaded.build.tags).toEqual(["iwagumi", "nature"]);
    expect(loaded.initialState.canvasState.sceneSettings.lightingSimulationEnabled).toBe(false);
    expect(loaded.initialState.canvasState.sceneSettings.lightMountHeightIn).toBe(4);
    expect(loaded.initialState.canvasState.sceneSettings.growthTimelineMonths).toBe(1);
    expect(loaded.initialState.canvasState.sceneSettings.rendererPreference).toBe("auto");
    expect(loaded.initialState.canvasState.sceneSettings.tankBackgroundStyle).toBe("custom");
    expect(loaded.initialState.canvasState.sceneSettings.tankBackgroundColor).toBe("#334455");
    expect(loaded.initialState.canvasState.sceneSettings.cabinetFinishStyle).toBe("custom");
    expect(loaded.initialState.canvasState.sceneSettings.cabinetColor).toBe("#6e543d");
    expect(loaded.initialState.canvasState.widthIn).toBe(40);
    expect(loaded.initialState.canvasState.heightIn).toBe(16);
    expect(loaded.initialState.canvasState.depthIn).toBe(20);
    expect(loaded.initialState.canvasState.substrateMaterialGrid[0]).toBe(1);
    expect(loaded.initialState.canvasState.substrateMaterialGrid[32 * 20]).toBe(0);

    const tagRows = await db
      .select({ tagSlug: buildTags.tagSlug })
      .from(buildTags)
      .where(eq(buildTags.buildId, saved.buildId));

    expect(tagRows.map((row) => row.tagSlug).sort()).toEqual(["iwagumi", "nature"]);

    await db.delete(buildItems).where(eq(buildItems.buildId, saved.buildId));
    await db.delete(builds).where(eq(builds.id, saved.buildId));
  }, 40_000);

  it("stores visual build thumbnails for gallery cards and social previews", async () => {
    const anon = await getAnonCaller();
    const catalog = await anon.visualBuilder.catalog();
    const tank = catalog.tanks[0];
    expect(tank?.id).toBeTruthy();

    const saved = await anon.visualBuilder.save({
      name: "Visual Builder Thumbnail Test",
      description: "Stores a scene screenshot thumbnail",
      tankId: tank!.id,
      canvasState: {
        version: 4,
        widthIn: tank!.widthIn,
        heightIn: tank!.heightIn,
        depthIn: tank!.depthIn,
        substrateHeightfield: Array.from({ length: 32 * 32 }, () => 1),
        sceneSettings: {
          qualityTier: "auto",
          postprocessingEnabled: true,
          guidesVisible: true,
          audioEnabled: false,
          cameraPreset: "step",
        },
        items: [],
      },
      lineItems: [],
      isPublic: true,
      flags: {},
      thumbnailDataUrl: ONE_PIXEL_PNG_DATA_URL,
    });

    const loaded = await anon.visualBuilder.getByShareSlug({ shareSlug: saved.shareSlug });
    expect(loaded.build.coverImageUrl).toBe(`/api/builds/${saved.shareSlug}/thumbnail`);
    expect(loaded.initialState.flags).toEqual({ hasShrimp: false, lowTechNoCo2: false });
    expect(loaded.initialState.canvasState.sceneSettings.cabinetFinishStyle).toBe("oak");
    expect(loaded.initialState.canvasState.sceneSettings.cabinetColor).toBe("#b38b61");
    expect(loaded.initialState.canvasState.sceneSettings.rendererPreference).toBe("auto");

    const persistedRows = await db
      .select({ coverImageUrl: builds.coverImageUrl, flags: builds.flags })
      .from(builds)
      .where(eq(builds.id, saved.buildId))
      .limit(1);

    const persisted = persistedRows[0];
    expect(persisted?.coverImageUrl).toBe(`/api/builds/${saved.shareSlug}/thumbnail`);
    expect(typeof (persisted?.flags as Record<string, unknown>)?.["thumbnailDataUrl"]).toBe(
      "string",
    );

    await db.delete(buildItems).where(eq(buildItems.buildId, saved.buildId));
    await db.delete(builds).where(eq(builds.id, saved.buildId));
  }, 40_000);

  it("normalizes legacy v1 canvas payloads to v4 on read", async () => {
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
    expect(loaded.initialState.canvasState.version).toBe(4);
    expect(loaded.initialState.canvasState.substrateHeightfield).toBeInstanceOf(Float32Array);
    expect(loaded.initialState.canvasState.substrateHeightfield.length).toBe(32 * 32);
    expect(loaded.initialState.canvasState.substrateMaterialGrid).toBeInstanceOf(Uint8Array);
    expect(loaded.initialState.canvasState.substrateMaterialGrid.length).toBe(32 * 32);
    expect(loaded.initialState.canvasState.substrateHeightfield[16 * 32 + 16]).toBeGreaterThan(0.2);

    await db.delete(buildItems).where(eq(buildItems.buildId, saved.buildId));
    await db.delete(builds).where(eq(builds.id, saved.buildId));
  }, 40_000);

  it("stores build versions and restores an older snapshot", async () => {
    const email = `visual-version-owner-${crypto.randomUUID()}@example.com`;
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

    const firstSave = await owner.visualBuilder.save({
      name: "Visual Builder Versioning Test",
      tankId: tank!.id,
      canvasState: {
        version: 4,
        widthIn: 30,
        heightIn: tank!.heightIn,
        depthIn: tank!.depthIn,
        substrateHeightfield: Array.from({ length: 32 * 32 }, () => 1.2),
        items: [],
      },
      lineItems: [],
      isPublic: false,
      flags: {},
    });

    const secondSave = await owner.visualBuilder.save({
      buildId: firstSave.buildId,
      shareSlug: firstSave.shareSlug,
      name: "Visual Builder Versioning Test",
      tankId: tank!.id,
      canvasState: {
        version: 4,
        widthIn: 42,
        heightIn: tank!.heightIn,
        depthIn: tank!.depthIn,
        substrateHeightfield: Array.from({ length: 32 * 32 }, () => 0.9),
        items: [],
      },
      lineItems: [],
      isPublic: false,
      flags: {},
    });

    expect(firstSave.versionNumber).toBe(1);
    expect(secondSave.versionNumber).toBe(2);

    const versions = await owner.visualBuilder.listVersions({ shareSlug: firstSave.shareSlug });
    expect(versions.versions.map((entry) => entry.versionNumber)).toEqual([2, 1]);

    const versionOneSnapshot = await owner.visualBuilder.getByShareSlug({
      shareSlug: firstSave.shareSlug,
      versionNumber: 1,
    });
    expect(versionOneSnapshot.initialState.canvasState.widthIn).toBe(30);

    const restored = await owner.visualBuilder.restoreVersion({
      shareSlug: firstSave.shareSlug,
      versionNumber: 1,
    });
    expect(restored.restoredFromVersion).toBe(1);
    expect(restored.versionNumber).toBe(3);

    const current = await owner.visualBuilder.getByShareSlug({ shareSlug: firstSave.shareSlug });
    expect(current.initialState.canvasState.widthIn).toBe(30);

    const persistedVersions = await db
      .select({
        versionNumber: buildVersions.versionNumber,
      })
      .from(buildVersions)
      .where(eq(buildVersions.buildId, firstSave.buildId));
    expect(persistedVersions.map((row) => row.versionNumber).sort((a, b) => a - b)).toEqual([
      1, 2, 3,
    ]);

    await db.delete(buildItems).where(eq(buildItems.buildId, firstSave.buildId));
    await db.delete(builds).where(eq(builds.id, firstSave.buildId));
    await db.delete(users).where(eq(users.id, userId!));
  }, 40_000);

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
          frontDepthIn: 1.1,
          backDepthIn: 2.7,
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
  }, 40_000);
});
