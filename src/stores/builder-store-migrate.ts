import type { BuildFlags, PlantSnapshot, ProductSnapshot } from "@/engine/types";

export type PersistedBuilderStateV2 = {
  buildId: string | null;
  shareSlug: string | null;
  lastSyncedUserId?: string | null;
  productsByCategory: Record<string, ProductSnapshot | undefined>;
  plants: PlantSnapshot[];
  selectedOfferIdByProductId: Record<string, string | undefined>;
  flags: BuildFlags;
  compatibilityEnabled: boolean;
  lowTechNoCo2: boolean;
  curatedOnly: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function migratePersistedBuilderState(
  persistedState: unknown,
  persistedVersion: number,
): Partial<PersistedBuilderStateV2> {
  if (!isPlainObject(persistedState)) return {};

  const next: Partial<PersistedBuilderStateV2> = {};

  const buildId = persistedState["buildId"];
  if (typeof buildId === "string" || buildId === null) next.buildId = buildId;

  const shareSlug = persistedState["shareSlug"];
  if (typeof shareSlug === "string" || shareSlug === null) next.shareSlug = shareSlug;

  const lastSyncedUserId = persistedState["lastSyncedUserId"];
  if (typeof lastSyncedUserId === "string" || lastSyncedUserId === null) {
    next.lastSyncedUserId = lastSyncedUserId;
  }

  const productsByCategory = persistedState["productsByCategory"];
  if (isPlainObject(productsByCategory)) {
    next.productsByCategory = productsByCategory as Record<string, ProductSnapshot | undefined>;
  }

  const plants = persistedState["plants"];
  if (Array.isArray(plants)) next.plants = plants as PlantSnapshot[];

  const flags = persistedState["flags"];
  if (isPlainObject(flags)) next.flags = flags as BuildFlags;

  const compatibilityEnabled = persistedState["compatibilityEnabled"];
  if (typeof compatibilityEnabled === "boolean") next.compatibilityEnabled = compatibilityEnabled;

  const lowTechNoCo2 = persistedState["lowTechNoCo2"];
  if (typeof lowTechNoCo2 === "boolean") next.lowTechNoCo2 = lowTechNoCo2;

  const curatedOnly = persistedState["curatedOnly"];
  if (typeof curatedOnly === "boolean") next.curatedOnly = curatedOnly;

  const selectedOfferIdByProductId = persistedState["selectedOfferIdByProductId"];
  if (isPlainObject(selectedOfferIdByProductId)) {
    next.selectedOfferIdByProductId = selectedOfferIdByProductId as Record<
      string,
      string | undefined
    >;
  } else if (persistedVersion < 2) {
    next.selectedOfferIdByProductId = {};
  }

  if (next.lowTechNoCo2 && next.productsByCategory && isPlainObject(next.productsByCategory)) {
    const nextProducts = {
      ...(next.productsByCategory as Record<string, ProductSnapshot | undefined>),
    };
    delete nextProducts["co2"];
    next.productsByCategory = nextProducts;
  }

  return next;
}
