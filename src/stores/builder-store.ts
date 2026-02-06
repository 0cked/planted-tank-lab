import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { BuildFlags, PlantSnapshot, ProductSnapshot } from "@/engine/types";

export type BuilderState = {
  buildId: string | null;
  shareSlug: string | null;

  // Keyed by category slug ("tank", "light", ...).
  productsByCategory: Record<string, ProductSnapshot | undefined>;
  plants: PlantSnapshot[];

  flags: BuildFlags;

  // UI/UX toggles (persisted).
  compatibilityEnabled: boolean;
  lowTechNoCo2: boolean;

  setProduct: (categorySlug: string, product: ProductSnapshot | null) => void;
  addPlant: (plant: PlantSnapshot) => void;
  removePlantById: (plantId: string) => void;
  clearPlants: () => void;

  setHasShrimp: (hasShrimp: boolean) => void;
  setCompatibilityEnabled: (enabled: boolean) => void;
  setLowTechNoCo2: (enabled: boolean) => void;

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
  compatibilityEnabled: true,
  lowTechNoCo2: false,
};

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set) => ({
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
      setCompatibilityEnabled: (enabled) => set({ compatibilityEnabled: enabled }),
      setLowTechNoCo2: (enabled) =>
        set((s) => {
          const nextProducts = { ...s.productsByCategory };
          if (enabled) delete nextProducts["co2"];
          return { lowTechNoCo2: enabled, productsByCategory: nextProducts };
        }),

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
    }),
    {
      name: "ptl-builder-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        buildId: s.buildId,
        shareSlug: s.shareSlug,
        productsByCategory: s.productsByCategory,
        plants: s.plants,
        flags: s.flags,
        compatibilityEnabled: s.compatibilityEnabled,
        lowTechNoCo2: s.lowTechNoCo2,
      }),
    },
  ),
);
