import { nanoid } from "nanoid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  SubstrateHeightfield,
  VisualAnchorType,
  VisualAsset,
  VisualBuildPayload,
  VisualCanvasItem,
  VisualCanvasState,
  VisualDepthZone,
  VisualItemConstraintMetadata,
  VisualItemTransform,
  VisualLineItem,
  VisualSceneSettings,
  VisualSubstrateProfile,
} from "@/components/builder/visual/types";
import {
  createFlatSubstrateHeightfield,
  normalizeSubstrateHeightfield,
} from "@/lib/visual/substrate";
import { migratePersistedSubstrateHeightfield } from "@/stores/visual-builder-store-migrate";

type VisualBuilderFlags = {
  lowTechNoCo2: boolean;
  hasShrimp: boolean;
};

type CanvasDimensions = {
  widthIn: number;
  heightIn: number;
  depthIn: number;
};

type VisualBuilderState = {
  buildId: string | null;
  shareSlug: string | null;
  name: string;
  description: string;
  isPublic: boolean;
  tankId: string | null;

  canvasState: VisualCanvasState;
  selectedItemId: string | null;

  // Single-select categories (light/filter/co2/...)
  selectedProductByCategory: Record<string, string | undefined>;

  // Persisted UX toggles
  compatibilityEnabled: boolean;
  flags: VisualBuilderFlags;

  setBuildIdentity: (next: { buildId: string | null; shareSlug: string | null }) => void;
  setName: (value: string) => void;
  setDescription: (value: string) => void;
  setPublic: (value: boolean) => void;
  setTank: (tankId: string, dims: { widthIn: number; heightIn: number; depthIn: number }) => void;
  setSubstrateHeightfield: (next: SubstrateHeightfield) => void;
  setSceneSettings: (patch: Partial<VisualSceneSettings>) => void;

  setCompatibilityEnabled: (value: boolean) => void;
  setLowTechNoCo2: (value: boolean) => void;
  setHasShrimp: (value: boolean) => void;

  setSelectedProduct: (categorySlug: string, productId: string | null) => void;

  addCanvasItemFromAsset: (
    asset: VisualAsset,
    pos?: {
      x: number;
      y: number;
      z?: number;
      scale?: number;
      rotation?: number;
      anchorType?: VisualAnchorType;
      depthZone?: VisualDepthZone | null;
      transform?: VisualItemTransform;
    },
  ) => void;
  updateCanvasItem: (itemId: string, patch: Partial<VisualCanvasItem>) => void;
  removeCanvasItem: (itemId: string) => void;
  duplicateCanvasItem: (itemId: string) => void;
  moveCanvasItemLayer: (itemId: string, direction: "up" | "down" | "top" | "bottom") => void;
  setSelectedItem: (itemId: string | null) => void;
  clearCanvas: () => void;

  hydrateFromBuild: (payload: {
    buildId: string | null;
    shareSlug: string | null;
    name: string;
    description: string | null;
    isPublic: boolean;
    tankId: string | null;
    canvasState: {
      widthIn: number;
      heightIn: number;
      depthIn: number;
      substrateHeightfield?: unknown;
      substrateProfile?: Partial<VisualSubstrateProfile>;
      sceneSettings?: Partial<VisualSceneSettings>;
      items: Array<Partial<VisualCanvasItem>>;
    };
    lineItems: Array<{
      categorySlug: string;
      product: { id: string } | null;
      plant: { id: string } | null;
    }>;
    flags: Record<string, unknown>;
  }) => void;

  resetAll: () => void;

  toBuildPayload: (params: { bomLineItems: VisualLineItem[] }) => VisualBuildPayload;
};

const ANCHOR_TYPES: ReadonlyArray<VisualAnchorType> = ["substrate", "hardscape", "glass"];
const DEPTH_ZONES: ReadonlyArray<VisualDepthZone> = ["foreground", "midground", "background"];
const ASSET_TYPES: ReadonlyArray<VisualCanvasItem["assetType"]> = ["product", "plant", "design"];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isAnchorType(value: unknown): value is VisualAnchorType {
  return typeof value === "string" && ANCHOR_TYPES.includes(value as VisualAnchorType);
}

function isDepthZone(value: unknown): value is VisualDepthZone {
  return typeof value === "string" && DEPTH_ZONES.includes(value as VisualDepthZone);
}

function isAssetType(value: unknown): value is VisualCanvasItem["assetType"] {
  return typeof value === "string" && ASSET_TYPES.includes(value as VisualCanvasItem["assetType"]);
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function clampDepthAxis(value: number): number {
  return clamp01(value);
}

function clampScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  if (value < 0.1) return 0.1;
  if (value > 6) return 6;
  return value;
}

function clampRotation(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < -180) return -180;
  if (value > 180) return 180;
  return value;
}

function defaultDepthForCategory(categorySlug: string): number {
  if (categorySlug === "hardscape") return 0.56;
  if (categorySlug === "plants") return 0.62;
  if (categorySlug === "equipment") return 0.22;
  return 0.45;
}

function defaultAnchorForCategory(categorySlug: string): VisualAnchorType {
  if (categorySlug === "hardscape") return "substrate";
  if (categorySlug === "plants") return "substrate";
  if (["filter", "heater", "co2", "light"].includes(categorySlug)) return "glass";
  return "substrate";
}

function depthZoneFromZ(z: number): VisualDepthZone {
  if (z <= 0.33) return "foreground";
  if (z <= 0.66) return "midground";
  return "background";
}

function defaultConstraintsForCategory(categorySlug: string): VisualItemConstraintMetadata {
  if (categorySlug === "plants") {
    return {
      snapToSurface: true,
      canAttachToHardscape: true,
      requiresSubstrate: true,
      rotationSnapDeg: 5,
      collisionRadiusIn: 1.1,
    };
  }
  if (categorySlug === "hardscape") {
    return {
      snapToSurface: true,
      canAttachToHardscape: false,
      requiresSubstrate: true,
      rotationSnapDeg: 15,
      collisionRadiusIn: 2,
    };
  }
  return {
    snapToSurface: true,
    canAttachToHardscape: false,
    requiresSubstrate: false,
    rotationSnapDeg: 15,
    collisionRadiusIn: 1.6,
  };
}

function normalizeSceneSettings(input: Partial<VisualSceneSettings> | undefined): VisualSceneSettings {
  const next = input ?? {};
  const qualityTier =
    next.qualityTier === "auto" ||
    next.qualityTier === "high" ||
    next.qualityTier === "medium" ||
    next.qualityTier === "low"
      ? next.qualityTier
      : "auto";
  const cameraPreset = next.cameraPreset === "free" ? "free" : "step";

  return {
    qualityTier,
    postprocessingEnabled: next.postprocessingEnabled ?? true,
    guidesVisible: next.guidesVisible ?? true,
    audioEnabled: next.audioEnabled ?? false,
    cameraPreset,
  };
}

function normalizeConstraints(
  input: Partial<VisualItemConstraintMetadata> | undefined,
  categorySlug: string,
): VisualItemConstraintMetadata {
  const defaults = defaultConstraintsForCategory(categorySlug);
  const next = input ?? {};

  return {
    snapToSurface: next.snapToSurface ?? defaults.snapToSurface,
    canAttachToHardscape: next.canAttachToHardscape ?? defaults.canAttachToHardscape,
    requiresSubstrate: next.requiresSubstrate ?? defaults.requiresSubstrate,
    rotationSnapDeg: isFiniteNumber(next.rotationSnapDeg)
      ? Math.max(1, Math.min(90, Math.round(next.rotationSnapDeg)))
      : defaults.rotationSnapDeg,
    collisionRadiusIn: isFiniteNumber(next.collisionRadiusIn)
      ? Math.max(0.1, Math.min(100, next.collisionRadiusIn))
      : defaults.collisionRadiusIn,
  };
}

function normalizeVector3(
  input: unknown,
  fallback: readonly [number, number, number],
): [number, number, number] {
  if (!Array.isArray(input) || input.length !== 3) {
    return [fallback[0], fallback[1], fallback[2]];
  }

  const x = Number(input[0]);
  const y = Number(input[1]);
  const z = Number(input[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return [fallback[0], fallback[1], fallback[2]];
  }

  return [round(x), round(y), round(z)];
}

function buildTransformFromNormalized(params: {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
  dims: CanvasDimensions;
}): VisualItemTransform {
  return {
    position: [
      round((params.x - 0.5) * params.dims.widthIn),
      round(params.y * params.dims.heightIn),
      round((params.z - 0.5) * params.dims.depthIn),
    ],
    rotation: [0, round((params.rotation * Math.PI) / 180), 0],
    scale: [round(params.scale), round(params.scale), round(params.scale)],
  };
}

function normalizedFromTransform(
  transform: Partial<VisualItemTransform> | undefined,
  dims: CanvasDimensions,
): { x: number; y: number; z: number; scale: number; rotation: number } | null {
  if (!transform) return null;

  if (!Array.isArray(transform.position) || transform.position.length !== 3) {
    return null;
  }

  const px = Number(transform.position[0]);
  const py = Number(transform.position[1]);
  const pz = Number(transform.position[2]);
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) {
    return null;
  }

  const sx = Array.isArray(transform.scale) && transform.scale.length === 3 ? Number(transform.scale[0]) : NaN;
  const sy = Array.isArray(transform.scale) && transform.scale.length === 3 ? Number(transform.scale[1]) : NaN;
  const sz = Array.isArray(transform.scale) && transform.scale.length === 3 ? Number(transform.scale[2]) : NaN;
  const scale = Number.isFinite(sx) && Number.isFinite(sy) && Number.isFinite(sz)
    ? clampScale((sx + sy + sz) / 3)
    : 1;

  const ry = Array.isArray(transform.rotation) && transform.rotation.length === 3 ? Number(transform.rotation[1]) : NaN;
  const rotation = Number.isFinite(ry) ? clampRotation((ry * 180) / Math.PI) : 0;

  return {
    x: clamp01(px / Math.max(1, dims.widthIn) + 0.5),
    y: clamp01(py / Math.max(1, dims.heightIn)),
    z: clampDepthAxis(pz / Math.max(1, dims.depthIn) + 0.5),
    scale,
    rotation,
  };
}

function normalizeTransform(
  input: Partial<VisualItemTransform> | undefined,
  fallback: {
    x: number;
    y: number;
    z: number;
    scale: number;
    rotation: number;
    dims: CanvasDimensions;
  },
): VisualItemTransform {
  const fallbackTransform = buildTransformFromNormalized(fallback);
  if (!input) return fallbackTransform;

  return {
    position: normalizeVector3(input.position, fallbackTransform.position),
    rotation: normalizeVector3(input.rotation, fallbackTransform.rotation),
    scale: normalizeVector3(input.scale, fallbackTransform.scale),
  };
}

function normalizeAssetType(
  value: unknown,
  categorySlug: string,
): VisualCanvasItem["assetType"] {
  if (isAssetType(value)) return value;
  if (categorySlug === "plants") return "plant";
  return "product";
}

function normalizeItem(
  input: Partial<VisualCanvasItem>,
  index: number,
  dims: CanvasDimensions,
): VisualCanvasItem {
  const categorySlug =
    typeof input.categorySlug === "string" && input.categorySlug.trim().length > 0
      ? input.categorySlug
      : "hardscape";

  const fromTransform = normalizedFromTransform(input.transform, dims);

  const x = clamp01(isFiniteNumber(input.x) ? input.x : fromTransform?.x ?? 0.5);
  const y = clamp01(isFiniteNumber(input.y) ? input.y : fromTransform?.y ?? 0.56);
  const z = clampDepthAxis(
    isFiniteNumber(input.z)
      ? input.z
      : fromTransform?.z ?? defaultDepthForCategory(categorySlug),
  );
  const scale = clampScale(isFiniteNumber(input.scale) ? input.scale : fromTransform?.scale ?? 1);
  const rotation = clampRotation(
    isFiniteNumber(input.rotation) ? input.rotation : fromTransform?.rotation ?? 0,
  );

  const anchorType = isAnchorType(input.anchorType)
    ? input.anchorType
    : defaultAnchorForCategory(categorySlug);
  const depthZone = isDepthZone(input.depthZone) ? input.depthZone : depthZoneFromZ(z);

  return {
    id: typeof input.id === "string" && input.id.trim().length > 0 ? input.id : nanoid(10),
    assetId:
      typeof input.assetId === "string" && input.assetId.trim().length > 0
        ? input.assetId
        : nanoid(10),
    assetType: normalizeAssetType(input.assetType, categorySlug),
    categorySlug,
    sku: typeof input.sku === "string" ? input.sku : null,
    variant: typeof input.variant === "string" ? input.variant : null,
    x,
    y,
    z,
    scale,
    rotation,
    layer: isFiniteNumber(input.layer) ? Math.max(0, Math.floor(input.layer)) : index,
    anchorType,
    depthZone,
    constraints: normalizeConstraints(input.constraints, categorySlug),
    transform: normalizeTransform(input.transform, {
      x,
      y,
      z,
      scale,
      rotation,
      dims,
    }),
  };
}

function normalizeItems(
  items: Array<Partial<VisualCanvasItem>>,
  dims: CanvasDimensions,
): VisualCanvasItem[] {
  return items
    .map((item, index) => normalizeItem(item, index, dims))
    .sort((a, b) => a.layer - b.layer)
    .map((item, index) => ({ ...item, layer: index }));
}

function normalizeCanvasState(input: {
  widthIn: number;
  heightIn: number;
  depthIn: number;
  substrateHeightfield: unknown;
  sceneSettings?: Partial<VisualSceneSettings>;
  items: Array<Partial<VisualCanvasItem>>;
}): VisualCanvasState {
  const widthIn = Math.max(1, input.widthIn);
  const heightIn = Math.max(1, input.heightIn);
  const depthIn = Math.max(1, input.depthIn);
  const dims = { widthIn, heightIn, depthIn } satisfies CanvasDimensions;

  return {
    version: 4,
    widthIn,
    heightIn,
    depthIn,
    substrateHeightfield: normalizeSubstrateHeightfield(input.substrateHeightfield, heightIn),
    sceneSettings: normalizeSceneSettings(input.sceneSettings),
    items: normalizeItems(input.items, dims),
  };
}

const initialCanvasState: VisualCanvasState = {
  version: 4,
  widthIn: 24,
  heightIn: 14,
  depthIn: 12,
  substrateHeightfield: createFlatSubstrateHeightfield({ tankHeightIn: 14 }),
  sceneSettings: {
    qualityTier: "auto",
    postprocessingEnabled: true,
    guidesVisible: true,
    audioEnabled: false,
    cameraPreset: "step",
  },
  items: [],
};

const initialState = {
  buildId: null as string | null,
  shareSlug: null as string | null,
  name: "Visual Build",
  description: "",
  isPublic: false,
  tankId: null as string | null,
  canvasState: initialCanvasState,
  selectedItemId: null as string | null,
  selectedProductByCategory: {} as Record<string, string | undefined>,
  compatibilityEnabled: true,
  flags: {
    lowTechNoCo2: false,
    hasShrimp: false,
  },
};

function currentDims(state: { canvasState: VisualCanvasState }): CanvasDimensions {
  return {
    widthIn: state.canvasState.widthIn,
    heightIn: state.canvasState.heightIn,
    depthIn: state.canvasState.depthIn,
  };
}

export const useVisualBuilderStore = create<VisualBuilderState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setBuildIdentity: (next) => set({ buildId: next.buildId, shareSlug: next.shareSlug }),
      setName: (value) => set({ name: value.slice(0, 300) }),
      setDescription: (value) => set({ description: value.slice(0, 5000) }),
      setPublic: (value) => set({ isPublic: value }),

      setTank: (tankId, dims) =>
        set((state) => ({
          tankId,
          canvasState: normalizeCanvasState({
            widthIn: Math.max(1, dims.widthIn),
            heightIn: Math.max(1, dims.heightIn),
            depthIn: Math.max(1, dims.depthIn),
            substrateHeightfield: state.canvasState.substrateHeightfield,
            sceneSettings: state.canvasState.sceneSettings,
            items: state.canvasState.items,
          }),
        })),

      setSubstrateHeightfield: (next) =>
        set((state) => ({
          canvasState: normalizeCanvasState({
            widthIn: state.canvasState.widthIn,
            heightIn: state.canvasState.heightIn,
            depthIn: state.canvasState.depthIn,
            substrateHeightfield: next,
            sceneSettings: state.canvasState.sceneSettings,
            items: state.canvasState.items,
          }),
        })),

      setSceneSettings: (patch) =>
        set((state) => ({
          canvasState: normalizeCanvasState({
            widthIn: state.canvasState.widthIn,
            heightIn: state.canvasState.heightIn,
            depthIn: state.canvasState.depthIn,
            substrateHeightfield: state.canvasState.substrateHeightfield,
            sceneSettings: {
              ...state.canvasState.sceneSettings,
              ...patch,
            },
            items: state.canvasState.items,
          }),
        })),

      setCompatibilityEnabled: (value) => set({ compatibilityEnabled: value }),
      setLowTechNoCo2: (value) =>
        set((state) => ({
          flags: { ...state.flags, lowTechNoCo2: value },
          ...(value
            ? {
                selectedProductByCategory: {
                  ...state.selectedProductByCategory,
                  co2: undefined,
                },
              }
            : {}),
        })),
      setHasShrimp: (value) => set((state) => ({ flags: { ...state.flags, hasShrimp: value } })),

      setSelectedProduct: (categorySlug, productId) =>
        set((state) => ({
          selectedProductByCategory: {
            ...state.selectedProductByCategory,
            [categorySlug]: productId ?? undefined,
          },
        })),

      addCanvasItemFromAsset: (asset, pos) =>
        set((state) => {
          const dims = currentDims(state);
          const x = clamp01(pos?.x ?? 0.5);
          const y = clamp01(pos?.y ?? 0.56);
          const z = clampDepthAxis(pos?.z ?? defaultDepthForCategory(asset.categorySlug));
          const scale = clampScale(pos?.scale ?? asset.defaultScale);
          const rotation = clampRotation(pos?.rotation ?? 0);
          const anchorType = pos?.anchorType ?? defaultAnchorForCategory(asset.categorySlug);
          const depthZone = pos?.depthZone ?? depthZoneFromZ(z);

          const nextItems = normalizeItems(
            [
              ...state.canvasState.items,
              {
                id: nanoid(10),
                assetId: asset.id,
                assetType: asset.type,
                categorySlug: asset.categorySlug,
                sku: asset.sku,
                variant: asset.slug,
                x,
                y,
                z,
                scale,
                rotation,
                layer: state.canvasState.items.length,
                anchorType,
                depthZone,
                constraints: defaultConstraintsForCategory(asset.categorySlug),
                transform:
                  pos?.transform ??
                  buildTransformFromNormalized({
                    x,
                    y,
                    z,
                    scale,
                    rotation,
                    dims,
                  }),
              },
            ],
            dims,
          );

          return {
            canvasState: {
              ...state.canvasState,
              items: nextItems,
            },
            selectedItemId: nextItems[nextItems.length - 1]?.id ?? null,
          };
        }),

      updateCanvasItem: (itemId, patch) =>
        set((state) => {
          const dims = currentDims(state);
          const nextItems = normalizeItems(
            state.canvasState.items.map((item) => {
              if (item.id !== itemId) return item;

              const fromTransform = normalizedFromTransform(patch.transform, dims);
              const x = patch.x != null ? clamp01(patch.x) : fromTransform?.x ?? item.x;
              const y = patch.y != null ? clamp01(patch.y) : fromTransform?.y ?? item.y;
              const z = patch.z != null ? clampDepthAxis(patch.z) : fromTransform?.z ?? item.z;
              const scale =
                patch.scale != null ? clampScale(patch.scale) : fromTransform?.scale ?? item.scale;
              const rotation =
                patch.rotation != null
                  ? clampRotation(patch.rotation)
                  : fromTransform?.rotation ?? item.rotation;
              const categorySlug =
                typeof patch.categorySlug === "string" && patch.categorySlug.trim().length > 0
                  ? patch.categorySlug
                  : item.categorySlug;

              return {
                ...item,
                assetId:
                  typeof patch.assetId === "string" && patch.assetId.trim().length > 0
                    ? patch.assetId
                    : item.assetId,
                assetType: isAssetType(patch.assetType) ? patch.assetType : item.assetType,
                categorySlug,
                sku: typeof patch.sku === "string" || patch.sku === null ? patch.sku : item.sku,
                variant:
                  typeof patch.variant === "string" || patch.variant === null
                    ? patch.variant
                    : item.variant,
                x,
                y,
                z,
                scale,
                rotation,
                layer:
                  patch.layer != null && Number.isFinite(patch.layer)
                    ? Math.max(0, Math.floor(patch.layer))
                    : item.layer,
                anchorType: isAnchorType(patch.anchorType) ? patch.anchorType : item.anchorType,
                depthZone: isDepthZone(patch.depthZone)
                  ? patch.depthZone
                  : patch.depthZone === null
                    ? null
                    : item.depthZone,
                constraints: patch.constraints
                  ? normalizeConstraints(patch.constraints, categorySlug)
                  : item.constraints,
                transform: patch.transform
                  ? normalizeTransform(patch.transform, {
                      x,
                      y,
                      z,
                      scale,
                      rotation,
                      dims,
                    })
                  : buildTransformFromNormalized({
                      x,
                      y,
                      z,
                      scale,
                      rotation,
                      dims,
                    }),
              };
            }),
            dims,
          );
          return {
            canvasState: {
              ...state.canvasState,
              items: nextItems,
            },
          };
        }),

      removeCanvasItem: (itemId) =>
        set((state) => {
          const dims = currentDims(state);
          const nextItems = normalizeItems(
            state.canvasState.items.filter((item) => item.id !== itemId),
            dims,
          );
          return {
            canvasState: {
              ...state.canvasState,
              items: nextItems,
            },
            selectedItemId: state.selectedItemId === itemId ? null : state.selectedItemId,
          };
        }),

      duplicateCanvasItem: (itemId) =>
        set((state) => {
          const source = state.canvasState.items.find((item) => item.id === itemId);
          if (!source) return state;

          const dims = currentDims(state);
          const nextX = clamp01(source.x + 0.02);
          const nextY = clamp01(source.y + 0.02);

          const nextItems = normalizeItems(
            [
              ...state.canvasState.items,
              {
                ...source,
                id: nanoid(10),
                x: nextX,
                y: nextY,
                layer: state.canvasState.items.length,
                transform: buildTransformFromNormalized({
                  x: nextX,
                  y: nextY,
                  z: source.z,
                  scale: source.scale,
                  rotation: source.rotation,
                  dims,
                }),
              },
            ],
            dims,
          );

          return {
            canvasState: {
              ...state.canvasState,
              items: nextItems,
            },
            selectedItemId: nextItems[nextItems.length - 1]?.id ?? null,
          };
        }),

      moveCanvasItemLayer: (itemId, direction) =>
        set((state) => {
          const items = [...state.canvasState.items].sort((a, b) => a.layer - b.layer);
          const index = items.findIndex((item) => item.id === itemId);
          if (index < 0) return state;

          if (direction === "up" && index < items.length - 1) {
            const tmp = items[index + 1]!;
            items[index + 1] = items[index]!;
            items[index] = tmp;
          }
          if (direction === "down" && index > 0) {
            const tmp = items[index - 1]!;
            items[index - 1] = items[index]!;
            items[index] = tmp;
          }
          if (direction === "top") {
            const [item] = items.splice(index, 1);
            items.push(item!);
          }
          if (direction === "bottom") {
            const [item] = items.splice(index, 1);
            items.unshift(item!);
          }

          const nextItems = normalizeItems(items, currentDims(state));
          return {
            canvasState: {
              ...state.canvasState,
              items: nextItems,
            },
          };
        }),

      setSelectedItem: (itemId) => set({ selectedItemId: itemId }),

      clearCanvas: () =>
        set((state) => ({
          canvasState: {
            ...state.canvasState,
            items: [],
          },
          selectedItemId: null,
        })),

      hydrateFromBuild: (payload) => {
        set((state) => {
          const selectedProductByCategory: Record<string, string | undefined> = {};
          for (const line of payload.lineItems) {
            if (line.product?.id) selectedProductByCategory[line.categorySlug] = line.product.id;
          }

          return {
            ...state,
            buildId: payload.buildId,
            shareSlug: payload.shareSlug,
            name: payload.name,
            description: payload.description ?? "",
            isPublic: payload.isPublic,
            tankId: payload.tankId,
            canvasState: normalizeCanvasState({
              widthIn: payload.canvasState.widthIn,
              heightIn: payload.canvasState.heightIn,
              depthIn: payload.canvasState.depthIn,
              substrateHeightfield:
                payload.canvasState.substrateHeightfield ?? payload.canvasState.substrateProfile,
              sceneSettings: payload.canvasState.sceneSettings,
              items: payload.canvasState.items,
            }),
            selectedProductByCategory,
            flags: {
              lowTechNoCo2: Boolean(payload.flags.lowTechNoCo2),
              hasShrimp: Boolean(payload.flags.hasShrimp),
            },
            selectedItemId: null,
          };
        });
      },

      resetAll: () => set({ ...initialState }),

      toBuildPayload: ({ bomLineItems }) => {
        const s = get();
        return {
          buildId: s.buildId,
          shareSlug: s.shareSlug,
          name: s.name.trim() || "Visual Build",
          description: s.description.trim(),
          isPublic: s.isPublic,
          tankId: s.tankId,
          canvasState: normalizeCanvasState({
            widthIn: s.canvasState.widthIn,
            heightIn: s.canvasState.heightIn,
            depthIn: s.canvasState.depthIn,
            substrateHeightfield: s.canvasState.substrateHeightfield,
            sceneSettings: s.canvasState.sceneSettings,
            items: s.canvasState.items,
          }),
          lineItems: bomLineItems,
          flags: {
            lowTechNoCo2: s.flags.lowTechNoCo2,
            hasShrimp: s.flags.hasShrimp,
          },
        };
      },
    }),
    {
      name: "ptl-visual-builder-v1",
      version: 4,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: unknown) => {
        const source = persistedState as Partial<VisualBuilderState> | undefined;
        if (!source || typeof source !== "object") {
          return {
            ...initialState,
            canvasState: normalizeCanvasState({
              widthIn: initialState.canvasState.widthIn,
              heightIn: initialState.canvasState.heightIn,
              depthIn: initialState.canvasState.depthIn,
              substrateHeightfield: initialState.canvasState.substrateHeightfield,
              sceneSettings: initialState.canvasState.sceneSettings,
              items: initialState.canvasState.items,
            }),
          };
        }

        const candidateCanvas =
          (source.canvasState as
            | Partial<VisualCanvasState>
            | {
                widthIn?: number;
                heightIn?: number;
                depthIn?: number;
                substrateHeightfield?: unknown;
                substrateProfile?: Partial<VisualSubstrateProfile>;
                sceneSettings?: Partial<VisualSceneSettings>;
                items?: Array<Partial<VisualCanvasItem>>;
              }
            | undefined) ?? {};

        const widthIn =
          typeof candidateCanvas.widthIn === "number" && Number.isFinite(candidateCanvas.widthIn)
            ? Math.max(1, candidateCanvas.widthIn)
            : initialCanvasState.widthIn;
        const heightIn =
          typeof candidateCanvas.heightIn === "number" && Number.isFinite(candidateCanvas.heightIn)
            ? Math.max(1, candidateCanvas.heightIn)
            : initialCanvasState.heightIn;
        const depthIn =
          typeof candidateCanvas.depthIn === "number" && Number.isFinite(candidateCanvas.depthIn)
            ? Math.max(1, candidateCanvas.depthIn)
            : initialCanvasState.depthIn;

        const items = Array.isArray(candidateCanvas.items)
          ? candidateCanvas.items
          : initialCanvasState.items;

        const substrateHeightfield = migratePersistedSubstrateHeightfield(
          candidateCanvas,
          heightIn,
        );

        return {
          ...initialState,
          ...source,
          canvasState: normalizeCanvasState({
            widthIn,
            heightIn,
            depthIn,
            items,
            substrateHeightfield,
            sceneSettings: candidateCanvas.sceneSettings,
          }),
        } as VisualBuilderState;
      },
      partialize: (state) => ({
        buildId: state.buildId,
        shareSlug: state.shareSlug,
        name: state.name,
        description: state.description,
        isPublic: state.isPublic,
        tankId: state.tankId,
        canvasState: state.canvasState,
        selectedProductByCategory: state.selectedProductByCategory,
        compatibilityEnabled: state.compatibilityEnabled,
        flags: state.flags,
      }),
    },
  ),
);
