import { describe, expect, test } from "vitest";

import { migratePersistedBuilderState } from "@/stores/builder-store-migrate";

describe("builder store migration", () => {
  test("adds selectedOfferIdByProductId on upgrade to v2", () => {
    const migrated = migratePersistedBuilderState(
      {
        buildId: null,
        shareSlug: null,
        productsByCategory: {},
        plants: [],
        flags: { hasShrimp: false },
        compatibilityEnabled: true,
        lowTechNoCo2: false,
        curatedOnly: true,
      },
      1,
    );

    expect(migrated.selectedOfferIdByProductId).toEqual({});
  });

  test("clears CO2 selection when lowTechNoCo2 is enabled", () => {
    const migrated = migratePersistedBuilderState(
      {
        productsByCategory: {
          co2: { id: "x", name: "CO2", slug: "co2", categorySlug: "co2", specs: {} },
        },
        lowTechNoCo2: true,
      },
      2,
    );

    expect(migrated.productsByCategory?.co2).toBeUndefined();
  });
});

