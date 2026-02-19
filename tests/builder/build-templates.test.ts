import { describe, expect, it } from "vitest";

import {
  getVisualBuildTemplateCards,
  resolveVisualBuildTemplate,
} from "@/components/builder/visual/build-templates";
import type { VisualAsset, VisualTank } from "@/components/builder/visual/types";

function makeAsset(params: {
  id: string;
  type: VisualAsset["type"];
  slug: string;
  name?: string;
  categorySlug: string;
  categoryName?: string;
  sourceMode?: VisualAsset["sourceMode"];
  tags?: string[];
}): VisualAsset {
  return {
    id: params.id,
    type: params.type,
    sourceMode:
      params.sourceMode ?? (params.categorySlug === "hardscape" ? "design_archetype" : "catalog_plant"),
    name: params.name ?? params.slug,
    slug: params.slug,
    categorySlug: params.categorySlug,
    categoryName: params.categoryName ?? params.categorySlug,
    imageUrl: null,
    widthIn: 4,
    heightIn: 4,
    depthIn: 4,
    defaultScale: 1,
    sku: null,
    priceCents: null,
    offerId: null,
    goUrl: null,
    purchaseUrl: null,
    tags: params.tags,
  };
}

const HARDSCAPE_ASSETS = [
  "spider-wood-branch",
  "manzanita-branch",
  "lava-rock-cluster",
  "seiryu-accent-stone",
  "seiryu-boulder-large",
  "dragon-stone-ridge",
  "dragon-stone-accent",
  "spider-wood-twig-set",
].map((slug) =>
  makeAsset({
    id: `hardscape-${slug}`,
    type: "design",
    slug,
    categorySlug: "hardscape",
    categoryName: "Hardscape",
    sourceMode: "design_archetype",
  }),
);

const PLANT_ASSETS = [
  "anubias-nana",
  "anubias-barteri",
  "java-fern",
  "java-moss",
  "anubias-petite",
  "rotala-rotundifolia",
  "rotala-hra",
  "ludwigia-repens",
  "hygrophila-polysperma",
  "monte-carlo",
  "staurogyne-repens",
  "dwarf-hairgrass-mini",
  "bacopa-caroliniana",
  "alternanthera-reineckii-mini",
  "hydrocotyle-tripartita-japan",
  "christmas-moss",
  "marsilea-hirsuta",
].map((slug) =>
  makeAsset({
    id: `plant-${slug}`,
    type: "plant",
    slug,
    categorySlug: "plants",
    categoryName: "Plants",
    sourceMode: "catalog_plant",
  }),
);

const PRODUCT_ASSETS: VisualAsset[] = [
  makeAsset({
    id: "product-substrate-1",
    type: "product",
    slug: "active-aquasoil",
    name: "Active Aquasoil",
    categorySlug: "substrate",
    categoryName: "Substrate",
    sourceMode: "catalog_product",
  }),
  makeAsset({
    id: "product-substrate-2",
    type: "product",
    slug: "shrimp-sand",
    name: "Shrimp Sand",
    categorySlug: "substrate",
    categoryName: "Substrate",
    sourceMode: "catalog_product",
  }),
  makeAsset({
    id: "product-light-1",
    type: "product",
    slug: "wrgb-led-light",
    name: "WRGB LED Light",
    categorySlug: "light",
    categoryName: "Light",
    sourceMode: "catalog_product",
  }),
  makeAsset({
    id: "product-filter-1",
    type: "product",
    slug: "canister-filter",
    name: "Canister Filter",
    categorySlug: "filter",
    categoryName: "Filter",
    sourceMode: "catalog_product",
  }),
  makeAsset({
    id: "product-co2-1",
    type: "product",
    slug: "co2-regulator-kit",
    name: "CO2 Regulator Kit",
    categorySlug: "co2",
    categoryName: "CO2",
    sourceMode: "catalog_product",
  }),
];

const ASSETS: VisualAsset[] = [...HARDSCAPE_ASSETS, ...PLANT_ASSETS, ...PRODUCT_ASSETS];

const TANKS: VisualTank[] = [
  {
    id: "tank-nano",
    name: "Nano 5",
    slug: "nano-5",
    widthIn: 16,
    heightIn: 10,
    depthIn: 10,
    imageUrl: null,
    priceCents: 4999,
    offerId: null,
    goUrl: null,
  },
  {
    id: "tank-standard",
    name: "Standard 24",
    slug: "standard-24",
    widthIn: 24,
    heightIn: 14,
    depthIn: 12,
    imageUrl: null,
    priceCents: 9999,
    offerId: null,
    goUrl: null,
  },
  {
    id: "tank-nature",
    name: "Nature 36",
    slug: "nature-36",
    widthIn: 36,
    heightIn: 16,
    depthIn: 18,
    imageUrl: null,
    priceCents: 15999,
    offerId: null,
    goUrl: null,
  },
];

describe("visual build templates", () => {
  it("resolves every template card into a usable build state", () => {
    for (const card of getVisualBuildTemplateCards()) {
      const resolved = resolveVisualBuildTemplate({
        templateId: card.id,
        assets: ASSETS,
        tanks: TANKS,
      });
      expect(resolved).not.toBeNull();
      expect((resolved?.items.length ?? 0) > 0).toBe(true);
    }
  });

  it("keeps dutch style as plant-only and marks low-tech template without CO2", () => {
    const dutch = resolveVisualBuildTemplate({
      templateId: "dutch-style",
      assets: ASSETS,
      tanks: TANKS,
    });

    const lowTech = resolveVisualBuildTemplate({
      templateId: "low-tech-beginner",
      assets: ASSETS,
      tanks: TANKS,
    });

    expect(dutch).not.toBeNull();
    expect(dutch?.items.every((item) => item.categorySlug === "plants")).toBe(true);

    expect(lowTech).not.toBeNull();
    expect(lowTech?.flags.lowTechNoCo2).toBe(true);
    expect(lowTech?.selectedProductByCategory.co2).toBeUndefined();
  });

  it("selects the smallest tank for the nano template and enables shrimp flag", () => {
    const nano = resolveVisualBuildTemplate({
      templateId: "nano-tank",
      assets: ASSETS,
      tanks: TANKS,
    });

    expect(nano).not.toBeNull();
    expect(nano?.tank.id).toBe("tank-nano");
    expect(nano?.flags.hasShrimp).toBe(true);
    expect(nano?.flags.lowTechNoCo2).toBe(true);
  });
});
