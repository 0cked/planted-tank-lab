import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { BuildFlags, PlantSnapshot, ProductSnapshot } from "@/engine/types";
import { migratePersistedBuilderState } from "@/stores/builder-store-migrate";

export type BuilderState = {
  buildId: string | null;
  shareSlug: string | null;

  // Keyed by category slug ("tank", "light", ...).
  productsByCategory: Record<string, ProductSnapshot | undefined>;
  plants: PlantSnapshot[];

  // Optional per-product override (user picked a specific retailer offer).
  selectedOfferIdByProductId: Record<string, string | undefined>;

  flags: BuildFlags;

  // UI/UX toggles (persisted).
  compatibilityEnabled: boolean;
  lowTechNoCo2: boolean;
  curatedOnly: boolean;

  setProduct: (categorySlug: string, product: ProductSnapshot | null) => void;
  addPlant: (plant: PlantSnapshot) => void;
  removePlantById: (plantId: string) => void;
  clearPlants: () => void;

  setSelectedOfferId: (productId: string, offerId: string | null) => void;

  setHasShrimp: (hasShrimp: boolean) => void;
  setCompatibilityEnabled: (enabled: boolean) => void;
  setLowTechNoCo2: (enabled: boolean) => void;
  setCuratedOnly: (enabled: boolean) => void;

  hydrate: (data: {
    buildId: string | null;
    shareSlug: string | null;
    productsByCategory: Record<string, ProductSnapshot | undefined>;
    plants: PlantSnapshot[];
    selectedOfferIdByProductId?: Record<string, string | undefined>;
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
  selectedOfferIdByProductId: {} as Record<string, string | undefined>,
  flags: initialFlags,
  compatibilityEnabled: true,
  lowTechNoCo2: false,
  curatedOnly: true,
};


export const useBuilderStore = create<BuilderState>()(
  persist(
    (set) => ({
      ...initialState,

      setProduct: (categorySlug, product) => {
        set((s) => {
          const next = { ...s.productsByCategory };
          const nextSelectedOffers = { ...s.selectedOfferIdByProductId };
          const prev = s.productsByCategory[categorySlug];
          if (prev?.id) delete nextSelectedOffers[prev.id];
          if (!product) delete next[categorySlug];
          else next[categorySlug] = product;
          return { productsByCategory: next, selectedOfferIdByProductId: nextSelectedOffers };
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

      setSelectedOfferId: (productId, offerId) =>
        set((s) => {
          const next = { ...s.selectedOfferIdByProductId };
          if (!offerId) delete next[productId];
          else next[productId] = offerId;
          return { selectedOfferIdByProductId: next };
        }),

      setHasShrimp: (hasShrimp) => set((s) => ({ flags: { ...s.flags, hasShrimp } })),
      setCompatibilityEnabled: (enabled) => set({ compatibilityEnabled: enabled }),
      setLowTechNoCo2: (enabled) =>
        set((s) => {
          const nextProducts = { ...s.productsByCategory };
          if (enabled) delete nextProducts["co2"];
          return { lowTechNoCo2: enabled, productsByCategory: nextProducts };
        }),
      setCuratedOnly: (enabled) => set({ curatedOnly: enabled }),

      hydrate: (data) => {
        set((s) => {
          const incoming = data.flags ?? {};
          const incomingLowTech =
            typeof incoming.lowTechNoCo2 === "boolean" ? incoming.lowTechNoCo2 : null;
          // Keep low-tech as a dedicated store toggle; don't merge it into `flags`.
          const rest: Partial<BuildFlags> = { ...incoming };
          delete rest.lowTechNoCo2;

          return {
            buildId: data.buildId,
            shareSlug: data.shareSlug,
            productsByCategory: data.productsByCategory,
            plants: data.plants,
            selectedOfferIdByProductId: data.selectedOfferIdByProductId ?? {},
            flags: { ...s.flags, ...rest },
            ...(incomingLowTech === null ? {} : { lowTechNoCo2: incomingLowTech }),
          };
        });
      },

      reset: () => set({ ...initialState }),
    }),
    {
      name: "ptl-builder-v1",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => ({
        ...initialState,
        ...(migratePersistedBuilderState(persistedState, version) as Partial<typeof initialState>),
      }),
      partialize: (s) => ({
        buildId: s.buildId,
        shareSlug: s.shareSlug,
        productsByCategory: s.productsByCategory,
        plants: s.plants,
        selectedOfferIdByProductId: s.selectedOfferIdByProductId,
        flags: s.flags,
        compatibilityEnabled: s.compatibilityEnabled,
        lowTechNoCo2: s.lowTechNoCo2,
        curatedOnly: s.curatedOnly,
      }),
    },
  ),
);
