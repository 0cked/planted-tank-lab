import { evaluateBuild } from "@/engine/evaluate";
import type {
  BuildSnapshot,
  CompatibilityRule,
  Evaluation,
  PlantSnapshot,
  ProductSnapshot,
  Severity,
} from "@/engine/types";

import type { VisualAsset, VisualCanvasItem, VisualTank } from "@/components/builder/visual/types";

type CompatibilityInput = {
  tank: VisualTank | null;
  assetsById: Map<string, VisualAsset>;
  canvasItems: VisualCanvasItem[];
  selectedProductByCategory: Record<string, string | undefined>;
  rules: CompatibilityRule[];
  lowTechNoCo2: boolean;
  hasShrimp: boolean;
  compatibilityEnabled: boolean;
};

type CompatibilityOutput = {
  snapshot: BuildSnapshot;
  evaluations: Evaluation[];
  hardscapeVolumeRatio: number | null;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toProductSnapshot(
  categorySlug: string,
  id: string,
  name: string,
  slug: string,
  specs: Record<string, unknown> | null | undefined,
): ProductSnapshot {
  return {
    id,
    name,
    slug,
    categorySlug,
    specs: specs ?? {},
  };
}

function severityRank(severity: Severity): number {
  switch (severity) {
    case "error":
      return 0;
    case "warning":
      return 1;
    case "recommendation":
      return 2;
    case "completeness":
      return 3;
  }
}

function calculateHardscapeRatio(params: {
  tank: VisualTank | null;
  assetsById: Map<string, VisualAsset>;
  canvasItems: VisualCanvasItem[];
}): number | null {
  if (!params.tank) return null;

  const tankSpecs = params.tank.specs ?? {};
  const gallons = asNumber(tankSpecs.volume_gal);
  const tankVolumeCubicIn =
    gallons != null && gallons > 0
      ? gallons * 231
      : params.tank.widthIn * params.tank.depthIn * params.tank.heightIn * 0.85;

  if (!Number.isFinite(tankVolumeCubicIn) || tankVolumeCubicIn <= 0) return null;

  // Approximation: hardscape shapes are irregular and do not fully occupy bounding boxes.
  // 0.55 coefficient keeps ratio warnings practical for real layouts.
  const hardscapeVolumeCubicIn = params.canvasItems
    .filter((item) => item.assetType === "product" && item.categorySlug === "hardscape")
    .reduce((sum, item) => {
      const asset = params.assetsById.get(item.assetId);
      if (!asset) return sum;
      const base = asset.widthIn * asset.heightIn * asset.depthIn;
      const scaled = base * item.scale * item.scale * item.scale;
      return sum + scaled * 0.55;
    }, 0);

  if (!Number.isFinite(hardscapeVolumeCubicIn) || hardscapeVolumeCubicIn <= 0) {
    return 0;
  }

  return hardscapeVolumeCubicIn / tankVolumeCubicIn;
}

export function evaluateVisualCompatibility(input: CompatibilityInput): CompatibilityOutput {
  const productsByCategory: Record<string, ProductSnapshot | undefined> = {};
  const plants: PlantSnapshot[] = [];

  if (input.tank) {
    productsByCategory.tank = toProductSnapshot(
      "tank",
      input.tank.id,
      input.tank.name,
      input.tank.slug,
      input.tank.specs,
    );
  }

  for (const [categorySlug, productId] of Object.entries(input.selectedProductByCategory)) {
    if (!productId) continue;
    const asset = input.assetsById.get(productId);
    if (!asset || asset.type !== "product") continue;
    productsByCategory[categorySlug] = toProductSnapshot(
      categorySlug,
      asset.id,
      asset.name,
      asset.slug,
      asset.specs,
    );
  }

  // For compatibility checks that involve hardscape properties, use the most frequent hardscape asset.
  const hardscapeCounts = new Map<string, number>();
  for (const item of input.canvasItems) {
    if (item.assetType !== "product" || item.categorySlug !== "hardscape") continue;
    hardscapeCounts.set(item.assetId, (hardscapeCounts.get(item.assetId) ?? 0) + 1);
  }
  let dominantHardscapeId: string | null = null;
  let dominantHardscapeCount = 0;
  for (const [assetId, count] of hardscapeCounts) {
    if (count > dominantHardscapeCount) {
      dominantHardscapeId = assetId;
      dominantHardscapeCount = count;
    }
  }
  if (dominantHardscapeId) {
    const hardscape = input.assetsById.get(dominantHardscapeId);
    if (hardscape && hardscape.type === "product") {
      productsByCategory.hardscape = toProductSnapshot(
        "hardscape",
        hardscape.id,
        hardscape.name,
        hardscape.slug,
        hardscape.specs,
      );
    }
  }

  const seenPlants = new Set<string>();
  for (const item of input.canvasItems) {
    if (item.assetType !== "plant") continue;
    const asset = input.assetsById.get(item.assetId);
    if (!asset || asset.type !== "plant" || !asset.plantProfile) continue;
    if (seenPlants.has(asset.id)) continue;
    seenPlants.add(asset.id);

    plants.push({
      id: asset.id,
      commonName: asset.name,
      slug: asset.slug,
      difficulty: asset.plantProfile.difficulty,
      lightDemand: asset.plantProfile.lightDemand,
      co2Demand: asset.plantProfile.co2Demand,
      growthRate: asset.plantProfile.growthRate,
      placement: asset.plantProfile.placement,
      tempMinF: asset.plantProfile.tempMinF,
      tempMaxF: asset.plantProfile.tempMaxF,
      phMin: asset.plantProfile.phMin,
      phMax: asset.plantProfile.phMax,
      ghMin: asset.plantProfile.ghMin,
      ghMax: asset.plantProfile.ghMax,
      khMin: asset.plantProfile.khMin,
      khMax: asset.plantProfile.khMax,
      maxHeightIn: asset.plantProfile.maxHeightIn,
      extra: {},
    });
  }

  const snapshot: BuildSnapshot = {
    productsByCategory,
    plants,
    flags: {
      hasShrimp: input.hasShrimp,
      lowTechNoCo2: input.lowTechNoCo2,
    },
  };

  if (!input.compatibilityEnabled) {
    return {
      snapshot,
      evaluations: [],
      hardscapeVolumeRatio: null,
    };
  }

  const evaluations = input.rules.length > 0 ? evaluateBuild(input.rules, snapshot) : [];

  const hardscapeVolumeRatio = calculateHardscapeRatio({
    tank: input.tank,
    assetsById: input.assetsById,
    canvasItems: input.canvasItems,
  });

  if (hardscapeVolumeRatio != null && hardscapeVolumeRatio > 0.35) {
    evaluations.push({
      kind: "rule_triggered",
      ruleCode: "hardscape_visual_volume_cap",
      severity: "warning",
      message:
        "Hardscape appears too dense for this tank volume. Reduce hardscape mass or increase tank size for safer water displacement and maintenance access.",
      fixSuggestion: "Aim to keep hardscape volume under ~35% of tank volume.",
      categoriesInvolved: ["hardscape", "tank"],
    });
  }

  evaluations.sort((a, b) => {
    const diff = severityRank(a.severity) - severityRank(b.severity);
    if (diff !== 0) return diff;
    return a.ruleCode.localeCompare(b.ruleCode);
  });

  return {
    snapshot,
    evaluations,
    hardscapeVolumeRatio,
  };
}
