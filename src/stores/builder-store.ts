import { create } from "zustand";

import type { BuildFlags, PlantSnapshot, ProductSnapshot } from "@/engine/types";

export type BuilderState = {
  buildId: string | null;
  shareSlug: string | null;

  // Keyed by category slug ("tank", "light", ...).
  productsByCategory: Record<string, ProductSnapshot | undefined>;
  plants: PlantSnapshot[];

  flags: BuildFlags;

  setProduct: (categorySlug: string, product: ProductSnapshot | null) => void;
  addPlant: (plant: PlantSnapshot) => void;
  removePlantById: (plantId: string) => void;
  clearPlants: () => void;

  setHasShrimp: (hasShrimp: boolean) => void;

  hydrate: (data: {
    buildId: string | null;
    shareSlug: string | null;
    productsByCategory: Record<string, ProductSnapshot | undefined>;
    plants: PlantSnapshot[];
    flags?: Partial<BuildFlags>;
  }) => void;

  reset: () => void;
};

const initialFlags: BuildFlags = {
  hasShrimp: false,
};

const initialState = {
  buildId: null as string | null,
  shareSlug: null as string | null,
  productsByCategory: {} as Record<string, ProductSnapshot | undefined>,
  plants: [] as PlantSnapshot[],
  flags: initialFlags,
};

export const useBuilderStore = create<BuilderState>((set) => ({
  ...initialState,

  setProduct: (categorySlug, product) => {
    set((s) => {
      const next = { ...s.productsByCategory };
      if (!product) delete next[categorySlug];
      else next[categorySlug] = product;
      return { productsByCategory: next };
    });
  },

  addPlant: (plant) => {
    set((s) => {
      // Deduplicate by id.
      if (s.plants.some((p) => p.id === plant.id)) return s;
      return { plants: [...s.plants, plant] };
    });
  },

  removePlantById: (plantId) => {
    set((s) => ({ plants: s.plants.filter((p) => p.id !== plantId) }));
  },

  clearPlants: () => set({ plants: [] }),

  setHasShrimp: (hasShrimp) => set((s) => ({ flags: { ...s.flags, hasShrimp } })),

  hydrate: (data) => {
    set((s) => ({
      buildId: data.buildId,
      shareSlug: data.shareSlug,
      productsByCategory: data.productsByCategory,
      plants: data.plants,
      flags: { ...s.flags, ...(data.flags ?? {}) },
    }));
  },

  reset: () => set({ ...initialState }),
}));

