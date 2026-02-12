import { nanoid } from "nanoid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  VisualAsset,
  VisualBuildPayload,
  VisualCanvasItem,
  VisualCanvasState,
  VisualLineItem,
} from "@/components/builder/visual/types";

type VisualBuilderFlags = {
  lowTechNoCo2: boolean;
  hasShrimp: boolean;
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

  setCompatibilityEnabled: (value: boolean) => void;
  setLowTechNoCo2: (value: boolean) => void;
  setHasShrimp: (value: boolean) => void;

  setSelectedProduct: (categorySlug: string, productId: string | null) => void;

  addCanvasItemFromAsset: (asset: VisualAsset, pos?: { x: number; y: number }) => void;
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
    canvasState: VisualCanvasState;
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

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
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

function normalizeItems(items: VisualCanvasItem[]): VisualCanvasItem[] {
  return items
    .map((item, index) => ({
      ...item,
      id: item.id || nanoid(10),
      x: clamp01(item.x),
      y: clamp01(item.y),
      scale: clampScale(item.scale),
      rotation: clampRotation(item.rotation),
      layer: Number.isFinite(item.layer) ? Math.max(0, Math.floor(item.layer)) : index,
    }))
    .sort((a, b) => a.layer - b.layer)
    .map((item, index) => ({ ...item, layer: index }));
}

const initialCanvasState: VisualCanvasState = {
  version: 1,
  widthIn: 24,
  heightIn: 14,
  depthIn: 12,
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
          canvasState: {
            ...state.canvasState,
            widthIn: Math.max(1, dims.widthIn),
            heightIn: Math.max(1, dims.heightIn),
            depthIn: Math.max(1, dims.depthIn),
          },
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
          const nextItems = normalizeItems([
            ...state.canvasState.items,
            {
              id: nanoid(10),
              assetId: asset.id,
              assetType: asset.type,
              categorySlug: asset.categorySlug,
              x: clamp01(pos?.x ?? 0.5),
              y: clamp01(pos?.y ?? 0.56),
              scale: clampScale(asset.defaultScale),
              rotation: 0,
              layer: state.canvasState.items.length,
            },
          ]);

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
          const nextItems = normalizeItems(
            state.canvasState.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    ...patch,
                    x: patch.x != null ? clamp01(patch.x) : item.x,
                    y: patch.y != null ? clamp01(patch.y) : item.y,
                    scale: patch.scale != null ? clampScale(patch.scale) : item.scale,
                    rotation:
                      patch.rotation != null ? clampRotation(patch.rotation) : item.rotation,
                  }
                : item,
            ),
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
          const nextItems = normalizeItems(state.canvasState.items.filter((item) => item.id !== itemId));
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

          const nextItems = normalizeItems([
            ...state.canvasState.items,
            {
              ...source,
              id: nanoid(10),
              x: clamp01(source.x + 0.02),
              y: clamp01(source.y + 0.02),
              layer: state.canvasState.items.length,
            },
          ]);

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

          const nextItems = normalizeItems(items);
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
            canvasState: {
              version: 1,
              widthIn: Math.max(1, payload.canvasState.widthIn),
              heightIn: Math.max(1, payload.canvasState.heightIn),
              depthIn: Math.max(1, payload.canvasState.depthIn),
              items: normalizeItems(payload.canvasState.items),
            },
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
          canvasState: {
            ...s.canvasState,
            items: normalizeItems(s.canvasState.items),
          },
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
      version: 1,
      storage: createJSONStorage(() => localStorage),
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
