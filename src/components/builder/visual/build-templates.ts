import { depthZoneFromZ, buildSubstratePreset } from "@/components/builder/visual/scene-utils";
import type {
  SubstrateHeightfield,
  VisualAsset,
  VisualCanvasItem,
  VisualTank,
} from "@/components/builder/visual/types";
import {
  SUBSTRATE_HEIGHTFIELD_RESOLUTION,
  createFlatSubstrateHeightfield,
} from "@/lib/visual/substrate";

type TemplatePlacementSpec = {
  categorySlug: "plants" | "hardscape";
  slugCandidates: readonly string[];
  keywordFallbacks?: readonly string[];
  x: number;
  z: number;
  y?: number;
  scale?: number;
  rotation?: number;
};

type TemplateTankPreference =
  | {
      kind: "closest";
      widthIn: number;
      heightIn: number;
      depthIn: number;
    }
  | {
      kind: "smallest";
    };

type TemplateProductPreference = {
  categorySlug: string;
  keywordFallbacks: readonly string[];
};

type TemplateDefinition = {
  id: string;
  name: string;
  description: string;
  highlights: readonly string[];
  tankPreference: TemplateTankPreference;
  substrateKind: "flat" | "island" | "slope" | "iwagumi-mound" | "dutch-terrace";
  flags: {
    lowTechNoCo2: boolean;
    hasShrimp: boolean;
  };
  placements: readonly TemplatePlacementSpec[];
  productPreferences: readonly TemplateProductPreference[];
};

const TEMPLATE_DEFINITIONS = [
  {
    id: "low-tech-beginner",
    name: "Low-tech beginner",
    description: "Anubias + java fern with a forgiving hardscape and gentle terrain.",
    highlights: ["Easy plants", "Low maintenance", "No CO2 required"],
    tankPreference: {
      kind: "closest",
      widthIn: 24,
      heightIn: 14,
      depthIn: 12,
    },
    substrateKind: "flat",
    flags: {
      lowTechNoCo2: true,
      hasShrimp: false,
    },
    placements: [
      {
        categorySlug: "hardscape",
        slugCandidates: ["spider-wood-branch", "manzanita-branch"],
        x: 0.45,
        z: 0.6,
        scale: 0.9,
        rotation: -18,
      },
      {
        categorySlug: "hardscape",
        slugCandidates: ["lava-rock-cluster", "seiryu-accent-stone"],
        x: 0.61,
        z: 0.53,
        scale: 0.78,
        rotation: 22,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["anubias-nana", "anubias-barteri"],
        keywordFallbacks: ["anubias"],
        x: 0.33,
        z: 0.45,
        scale: 0.92,
        rotation: 10,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["java-fern", "java-fern-narrow-leaf", "java-fern-windelov"],
        keywordFallbacks: ["java fern"],
        x: 0.48,
        z: 0.58,
        scale: 1.04,
        rotation: -6,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["java-moss", "christmas-moss", "weeping-moss"],
        keywordFallbacks: ["moss"],
        x: 0.57,
        z: 0.56,
        scale: 0.86,
        rotation: 14,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["anubias-petite", "anubias-nana"],
        keywordFallbacks: ["anubias"],
        x: 0.66,
        z: 0.43,
        scale: 0.82,
        rotation: -12,
      },
    ],
    productPreferences: [
      {
        categorySlug: "substrate",
        keywordFallbacks: ["sand", "gravel", "stratum", "soil"],
      },
      {
        categorySlug: "light",
        keywordFallbacks: ["led", "light"],
      },
      {
        categorySlug: "filter",
        keywordFallbacks: ["sponge", "hang", "filter"],
      },
    ],
  },
  {
    id: "nature-aquarium",
    name: "Nature Aquarium",
    description: "Stem-plant energy around a layered stone-and-wood composition.",
    highlights: ["Amano-inspired", "Sloped substrate", "Depth-focused layout"],
    tankPreference: {
      kind: "closest",
      widthIn: 36,
      heightIn: 16,
      depthIn: 18,
    },
    substrateKind: "slope",
    flags: {
      lowTechNoCo2: false,
      hasShrimp: false,
    },
    placements: [
      {
        categorySlug: "hardscape",
        slugCandidates: ["seiryu-boulder-large", "dragon-stone-ridge"],
        x: 0.34,
        z: 0.62,
        scale: 1.03,
        rotation: -9,
      },
      {
        categorySlug: "hardscape",
        slugCandidates: ["seiryu-accent-stone", "dragon-stone-accent"],
        x: 0.49,
        z: 0.55,
        scale: 0.9,
        rotation: 18,
      },
      {
        categorySlug: "hardscape",
        slugCandidates: ["spider-wood-twig-set", "manzanita-branch"],
        x: 0.64,
        z: 0.65,
        scale: 0.84,
        rotation: -24,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["rotala-rotundifolia", "rotala-hra"],
        keywordFallbacks: ["rotala"],
        x: 0.2,
        z: 0.81,
        scale: 1.1,
        rotation: 6,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["ludwigia-repens", "ludwigia-super-red"],
        keywordFallbacks: ["ludwigia"],
        x: 0.35,
        z: 0.82,
        scale: 1.08,
        rotation: -8,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["hygrophila-polysperma", "hygrophila-pinnatifida"],
        keywordFallbacks: ["hygrophila"],
        x: 0.53,
        z: 0.79,
        scale: 1.14,
        rotation: 12,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["rotala-hra", "rotala-rotundifolia"],
        keywordFallbacks: ["rotala"],
        x: 0.71,
        z: 0.78,
        scale: 1.08,
        rotation: -4,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["monte-carlo", "marsilea-hirsuta"],
        keywordFallbacks: ["carlo", "carpet"],
        x: 0.44,
        z: 0.33,
        scale: 0.9,
        rotation: 2,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["staurogyne-repens", "hydrocotyle-tripartita-japan"],
        keywordFallbacks: ["staurogyne", "hydrocotyle"],
        x: 0.61,
        z: 0.38,
        scale: 0.88,
        rotation: 18,
      },
    ],
    productPreferences: [
      {
        categorySlug: "substrate",
        keywordFallbacks: ["aquasoil", "soil", "stratum"],
      },
      {
        categorySlug: "light",
        keywordFallbacks: ["led", "wrgb", "light"],
      },
      {
        categorySlug: "filter",
        keywordFallbacks: ["canister", "filter"],
      },
      {
        categorySlug: "co2",
        keywordFallbacks: ["co2", "regulator", "diffuser"],
      },
    ],
  },
  {
    id: "iwagumi",
    name: "Iwagumi",
    description: "Carpet-forward composition with dragon stone anchor and clean negative space.",
    highlights: ["Stone-first", "Carpet plants", "Mound focal point"],
    tankPreference: {
      kind: "closest",
      widthIn: 36,
      heightIn: 16,
      depthIn: 18,
    },
    substrateKind: "iwagumi-mound",
    flags: {
      lowTechNoCo2: false,
      hasShrimp: false,
    },
    placements: [
      {
        categorySlug: "hardscape",
        slugCandidates: ["dragon-stone-ridge", "seiryu-boulder-large"],
        x: 0.49,
        z: 0.58,
        scale: 1.04,
        rotation: 0,
      },
      {
        categorySlug: "hardscape",
        slugCandidates: ["dragon-stone-accent", "seiryu-accent-stone"],
        x: 0.35,
        z: 0.54,
        scale: 0.84,
        rotation: -15,
      },
      {
        categorySlug: "hardscape",
        slugCandidates: ["dragon-stone-accent", "seiryu-accent-stone"],
        x: 0.64,
        z: 0.55,
        scale: 0.82,
        rotation: 20,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["monte-carlo", "dwarf-hairgrass-mini"],
        keywordFallbacks: ["monte", "hairgrass", "carpet"],
        x: 0.3,
        z: 0.31,
        scale: 0.82,
        rotation: -4,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["monte-carlo", "dwarf-hairgrass"],
        keywordFallbacks: ["monte", "hairgrass", "carpet"],
        x: 0.46,
        z: 0.29,
        scale: 0.87,
        rotation: 3,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["monte-carlo", "dwarf-hairgrass-mini"],
        keywordFallbacks: ["monte", "hairgrass", "carpet"],
        x: 0.61,
        z: 0.3,
        scale: 0.81,
        rotation: -2,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["dwarf-hairgrass-mini", "dwarf-hairgrass"],
        keywordFallbacks: ["hairgrass", "carpet"],
        x: 0.51,
        z: 0.41,
        scale: 0.9,
        rotation: 8,
      },
    ],
    productPreferences: [
      {
        categorySlug: "substrate",
        keywordFallbacks: ["aquasoil", "soil", "stratum", "sand"],
      },
      {
        categorySlug: "light",
        keywordFallbacks: ["led", "wrgb", "light"],
      },
      {
        categorySlug: "filter",
        keywordFallbacks: ["canister", "filter"],
      },
      {
        categorySlug: "co2",
        keywordFallbacks: ["co2", "regulator", "diffuser"],
      },
    ],
  },
  {
    id: "dutch-style",
    name: "Dutch style",
    description: "Terraced substrate with layered stem-plant streets and no hardscape.",
    highlights: ["Stem-plant heavy", "No hardscape", "Structured rows"],
    tankPreference: {
      kind: "closest",
      widthIn: 48,
      heightIn: 21,
      depthIn: 18,
    },
    substrateKind: "dutch-terrace",
    flags: {
      lowTechNoCo2: false,
      hasShrimp: false,
    },
    placements: [
      {
        categorySlug: "plants",
        slugCandidates: ["rotala-rotundifolia", "rotala-hra"],
        keywordFallbacks: ["rotala"],
        x: 0.14,
        z: 0.82,
        scale: 1.14,
        rotation: 4,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["ludwigia-repens", "ludwigia-super-red"],
        keywordFallbacks: ["ludwigia"],
        x: 0.3,
        z: 0.78,
        scale: 1.12,
        rotation: -6,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["hygrophila-polysperma", "hygrophila-pinnatifida"],
        keywordFallbacks: ["hygrophila"],
        x: 0.45,
        z: 0.8,
        scale: 1.18,
        rotation: 8,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["bacopa-caroliniana", "rotala-rotundifolia"],
        keywordFallbacks: ["bacopa", "rotala"],
        x: 0.6,
        z: 0.77,
        scale: 1.1,
        rotation: -10,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["alternanthera-reineckii-mini", "ludwigia-super-red"],
        keywordFallbacks: ["alternanthera", "red"],
        x: 0.75,
        z: 0.79,
        scale: 1.08,
        rotation: 6,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["rotala-hra", "rotala-rotundifolia"],
        keywordFallbacks: ["rotala"],
        x: 0.22,
        z: 0.61,
        scale: 0.98,
        rotation: -4,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["staurogyne-repens", "hydrocotyle-tripartita-japan"],
        keywordFallbacks: ["staurogyne", "hydrocotyle"],
        x: 0.5,
        z: 0.52,
        scale: 0.88,
        rotation: 12,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["hydrocotyle-tripartita-japan", "staurogyne-repens"],
        keywordFallbacks: ["hydrocotyle", "foreground"],
        x: 0.7,
        z: 0.57,
        scale: 0.86,
        rotation: -9,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["monte-carlo", "marsilea-hirsuta"],
        keywordFallbacks: ["monte", "carpet"],
        x: 0.42,
        z: 0.34,
        scale: 0.84,
        rotation: 4,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["monte-carlo", "marsilea-hirsuta"],
        keywordFallbacks: ["monte", "carpet"],
        x: 0.58,
        z: 0.36,
        scale: 0.84,
        rotation: -6,
      },
    ],
    productPreferences: [
      {
        categorySlug: "substrate",
        keywordFallbacks: ["aquasoil", "soil", "stratum"],
      },
      {
        categorySlug: "light",
        keywordFallbacks: ["led", "wrgb", "light"],
      },
      {
        categorySlug: "filter",
        keywordFallbacks: ["canister", "filter"],
      },
      {
        categorySlug: "co2",
        keywordFallbacks: ["co2", "regulator", "diffuser"],
      },
    ],
  },
  {
    id: "nano-tank",
    name: "Nano tank",
    description: "Compact shrimp-friendly setup with moss and petite epiphytes.",
    highlights: ["Small footprint", "Shrimp-safe", "Moss-focused"],
    tankPreference: {
      kind: "smallest",
    },
    substrateKind: "island",
    flags: {
      lowTechNoCo2: true,
      hasShrimp: true,
    },
    placements: [
      {
        categorySlug: "hardscape",
        slugCandidates: ["lava-rock-cluster", "seiryu-accent-stone"],
        x: 0.43,
        z: 0.57,
        scale: 0.72,
        rotation: -10,
      },
      {
        categorySlug: "hardscape",
        slugCandidates: ["spider-wood-twig-set", "manzanita-branch"],
        x: 0.58,
        z: 0.55,
        scale: 0.66,
        rotation: 16,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["java-moss", "christmas-moss", "weeping-moss"],
        keywordFallbacks: ["moss"],
        x: 0.57,
        z: 0.55,
        scale: 0.76,
        rotation: 8,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["anubias-petite", "anubias-nana"],
        keywordFallbacks: ["anubias"],
        x: 0.35,
        z: 0.45,
        scale: 0.74,
        rotation: -12,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["christmas-moss", "java-moss"],
        keywordFallbacks: ["moss"],
        x: 0.46,
        z: 0.41,
        scale: 0.7,
        rotation: 12,
      },
      {
        categorySlug: "plants",
        slugCandidates: ["staurogyne-repens", "marsilea-hirsuta"],
        keywordFallbacks: ["foreground", "repens"],
        x: 0.63,
        z: 0.35,
        scale: 0.72,
        rotation: -4,
      },
    ],
    productPreferences: [
      {
        categorySlug: "substrate",
        keywordFallbacks: ["shrimp", "nano", "sand", "stratum", "soil"],
      },
      {
        categorySlug: "light",
        keywordFallbacks: ["nano", "clip", "led", "light"],
      },
      {
        categorySlug: "filter",
        keywordFallbacks: ["sponge", "nano", "filter"],
      },
    ],
  },
] as const satisfies readonly TemplateDefinition[];

const TEMPLATE_BY_ID = new Map(TEMPLATE_DEFINITIONS.map((template) => [template.id, template] as const));

export type VisualBuildTemplateId = (typeof TEMPLATE_DEFINITIONS)[number]["id"];

export type VisualBuildTemplateCard = {
  id: VisualBuildTemplateId;
  name: string;
  description: string;
  highlights: readonly string[];
};

export type VisualBuildTemplateCatalogCard = VisualBuildTemplateCard & {
  available: boolean;
  unavailableReason?: string;
};

export type ResolvedVisualBuildTemplate = {
  id: VisualBuildTemplateId;
  name: string;
  tank: VisualTank;
  substrateHeightfield: SubstrateHeightfield;
  selectedProductByCategory: Record<string, string | undefined>;
  flags: {
    lowTechNoCo2: boolean;
    hasShrimp: boolean;
  };
  items: Array<Partial<VisualCanvasItem>>;
};

export function getVisualBuildTemplateCards(): VisualBuildTemplateCard[] {
  return TEMPLATE_DEFINITIONS.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    highlights: [...template.highlights],
  }));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function substrateDepthClamp(depthIn: number, tankHeightIn: number): number {
  const minDepth = 0.2;
  const maxDepth = Math.max(minDepth, tankHeightIn * 0.62);
  if (!Number.isFinite(depthIn)) return minDepth;
  if (depthIn < minDepth) return minDepth;
  if (depthIn > maxDepth) return maxDepth;
  return depthIn;
}

function gaussian2d(x: number, z: number, centerX: number, centerZ: number, radiusX: number, radiusZ: number): number {
  const xDelta = x - centerX;
  const zDelta = z - centerZ;
  return Math.exp(-((xDelta * xDelta) / (2 * radiusX * radiusX) + (zDelta * zDelta) / (2 * radiusZ * radiusZ)));
}

function createIwagumiMoundHeightfield(tankHeightIn: number): SubstrateHeightfield {
  const next = createFlatSubstrateHeightfield({
    tankHeightIn,
    depthIn: 1.2,
  });
  const maxIndex = SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1;

  for (let z = 0; z < SUBSTRATE_HEIGHTFIELD_RESOLUTION; z += 1) {
    const zNorm = z / maxIndex;
    for (let x = 0; x < SUBSTRATE_HEIGHTFIELD_RESOLUTION; x += 1) {
      const xNorm = x / maxIndex;
      const mound = gaussian2d(xNorm, zNorm, 0.52, 0.58, 0.15, 0.2);
      const shoulder = gaussian2d(xNorm, zNorm, 0.46, 0.66, 0.24, 0.18);
      const backRise = zNorm * 0.35;
      const sideLift = Math.abs(xNorm - 0.5) * 0.18;
      const depthIn = 1 + mound * 1.7 + shoulder * 0.75 + backRise + sideLift;

      next[z * SUBSTRATE_HEIGHTFIELD_RESOLUTION + x] = substrateDepthClamp(depthIn, tankHeightIn);
    }
  }

  return next;
}

function createDutchTerraceHeightfield(tankHeightIn: number): SubstrateHeightfield {
  const next = createFlatSubstrateHeightfield({
    tankHeightIn,
    depthIn: 1.3,
  });
  const maxIndex = SUBSTRATE_HEIGHTFIELD_RESOLUTION - 1;

  for (let z = 0; z < SUBSTRATE_HEIGHTFIELD_RESOLUTION; z += 1) {
    const zNorm = z / maxIndex;
    let terraceDepth = 1.2;

    if (zNorm >= 0.74) {
      terraceDepth = 3.2;
    } else if (zNorm >= 0.52) {
      terraceDepth = 2.5;
    } else if (zNorm >= 0.31) {
      terraceDepth = 1.9;
    }

    for (let x = 0; x < SUBSTRATE_HEIGHTFIELD_RESOLUTION; x += 1) {
      const xNorm = x / maxIndex;
      const sideRise = Math.abs(xNorm - 0.5) * 0.28;
      const ripple = Math.sin((xNorm * Math.PI * 5) + zNorm * Math.PI) * 0.08;
      const depthIn = terraceDepth + sideRise + Math.max(0, ripple);
      next[z * SUBSTRATE_HEIGHTFIELD_RESOLUTION + x] = substrateDepthClamp(depthIn, tankHeightIn);
    }
  }

  return next;
}

function substrateForTemplate(template: TemplateDefinition, tankHeightIn: number): SubstrateHeightfield {
  if (template.substrateKind === "flat") {
    return buildSubstratePreset({
      preset: "flat",
      tankHeightIn,
    });
  }

  if (template.substrateKind === "island") {
    return buildSubstratePreset({
      preset: "island",
      tankHeightIn,
    });
  }

  if (template.substrateKind === "slope") {
    return buildSubstratePreset({
      preset: "slope",
      tankHeightIn,
    });
  }

  if (template.substrateKind === "iwagumi-mound") {
    return createIwagumiMoundHeightfield(tankHeightIn);
  }

  return createDutchTerraceHeightfield(tankHeightIn);
}

function scoreTankAgainstTarget(tank: VisualTank, target: { widthIn: number; heightIn: number; depthIn: number }): number {
  const widthScore = Math.abs(tank.widthIn - target.widthIn) * 2;
  const depthScore = Math.abs(tank.depthIn - target.depthIn) * 2;
  const heightScore = Math.abs(tank.heightIn - target.heightIn);
  return widthScore + depthScore + heightScore;
}

function pickTank(tanks: VisualTank[], preference: TemplateTankPreference): VisualTank | null {
  if (tanks.length === 0) return null;

  if (preference.kind === "smallest") {
    return tanks.reduce((smallest, current) => {
      const currentVolume = current.widthIn * current.heightIn * current.depthIn;
      const smallestVolume = smallest.widthIn * smallest.heightIn * smallest.depthIn;
      return currentVolume < smallestVolume ? current : smallest;
    });
  }

  return tanks.reduce((closest, current) => {
    if (!closest) return current;

    const closestScore = scoreTankAgainstTarget(closest, preference);
    const currentScore = scoreTankAgainstTarget(current, preference);
    return currentScore < closestScore ? current : closest;
  }, tanks[0] ?? null);
}

function prioritizedAssetPool(assets: VisualAsset[], categorySlug: "plants" | "hardscape"): VisualAsset[] {
  const pool = assets.filter((asset) => asset.categorySlug === categorySlug);
  if (categorySlug !== "hardscape") return pool;

  return [...pool].sort((left, right) => {
    const leftScore = left.sourceMode === "design_archetype" ? 0 : 1;
    const rightScore = right.sourceMode === "design_archetype" ? 0 : 1;
    return leftScore - rightScore;
  });
}

function matchesAnyKeyword(asset: VisualAsset, keywords: readonly string[]): boolean {
  if (keywords.length === 0) return false;

  const haystack = `${asset.slug} ${asset.name} ${(asset.tags ?? []).join(" ")}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function pickPlacementAsset(assets: VisualAsset[], placement: TemplatePlacementSpec): VisualAsset | null {
  const pool = prioritizedAssetPool(assets, placement.categorySlug);
  if (pool.length === 0) return null;

  for (const slug of placement.slugCandidates) {
    const exact = pool.find((asset) => asset.slug === slug);
    if (exact) return exact;
  }

  const fallbackMatch = pool.find((asset) =>
    matchesAnyKeyword(asset, placement.keywordFallbacks ?? []),
  );
  if (fallbackMatch) return fallbackMatch;

  return pool[0] ?? null;
}

function buildTemplateItems(template: TemplateDefinition, assets: VisualAsset[]): Array<Partial<VisualCanvasItem>> {
  return template.placements.reduce<Array<Partial<VisualCanvasItem>>>((items, placement, index) => {
    const asset = pickPlacementAsset(assets, placement);
    if (!asset) return items;

    const x = clamp01(placement.x);
    const z = clamp01(placement.z);

    items.push({
      assetId: asset.id,
      assetType: asset.type,
      categorySlug: asset.categorySlug,
      sku: asset.sku,
      variant: asset.slug,
      x,
      y: clamp01(placement.y ?? 0),
      z,
      scale: placement.scale ?? asset.defaultScale,
      rotation: placement.rotation ?? 0,
      layer: index,
      anchorType: "substrate",
      depthZone: depthZoneFromZ(z),
    });

    return items;
  }, []);
}

function buildTemplateProductSelections(template: TemplateDefinition, assets: VisualAsset[]): Record<string, string | undefined> {
  const selected: Record<string, string | undefined> = {};

  for (const preference of template.productPreferences) {
    const pool = assets.filter((asset) => asset.type === "product" && asset.categorySlug === preference.categorySlug);
    if (pool.length === 0) continue;

    const match = pool.find((asset) => matchesAnyKeyword(asset, preference.keywordFallbacks));
    selected[preference.categorySlug] = (match ?? pool[0])?.id;
  }

  if (template.flags.lowTechNoCo2) {
    selected.co2 = undefined;
  }

  return selected;
}

function hasCoverageForRequiredCategories(template: TemplateDefinition, items: Array<Partial<VisualCanvasItem>>): boolean {
  const requiredCategories = new Set(template.placements.map((placement) => placement.categorySlug));
  if (requiredCategories.size === 0) return items.length > 0;

  const populatedCategories = new Set(
    items
      .map((item) => item.categorySlug)
      .filter((categorySlug): categorySlug is "plants" | "hardscape" =>
        categorySlug === "plants" || categorySlug === "hardscape"
      ),
  );

  for (const requiredCategory of requiredCategories) {
    if (!populatedCategories.has(requiredCategory)) return false;
  }

  return true;
}

export function resolveVisualBuildTemplate(params: {
  templateId: VisualBuildTemplateId;
  assets: VisualAsset[];
  tanks: VisualTank[];
}): ResolvedVisualBuildTemplate | null {
  const template = TEMPLATE_BY_ID.get(params.templateId);
  if (!template) return null;

  const tank = pickTank(params.tanks, template.tankPreference);
  if (!tank) return null;

  const items = buildTemplateItems(template, params.assets);
  if (!hasCoverageForRequiredCategories(template, items)) {
    return null;
  }

  return {
    id: template.id,
    name: template.name,
    tank,
    substrateHeightfield: substrateForTemplate(template, tank.heightIn),
    selectedProductByCategory: buildTemplateProductSelections(template, params.assets),
    flags: {
      lowTechNoCo2: template.flags.lowTechNoCo2,
      hasShrimp: template.flags.hasShrimp,
    },
    items,
  };
}
