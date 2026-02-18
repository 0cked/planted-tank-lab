import type { CompatibilityRule, Severity } from "@/engine/types";

import type {
  VisualAsset,
  VisualCanvasItem,
  VisualLineItem,
  VisualRetailerLink,
  VisualTank,
} from "@/components/builder/visual/types";
import type { BuilderSceneStep } from "@/components/builder/visual/VisualBuilderScene";

export type BomLine = {
  key: string;
  categorySlug: string;
  categoryName: string;
  quantity: number;
  notes?: string;
  saveEligible?: boolean;
  retailerLinks?: VisualRetailerLink[];
  asset: VisualAsset | VisualTank;
  type: "product" | "plant" | "tank" | "design";
};

export type BuilderStepId = BuilderSceneStep;

export type StepMeta = {
  id: BuilderStepId;
  title: string;
  summary: string;
};

export const STEP_ORDER: BuilderStepId[] = [
  "tank",
  "substrate",
  "hardscape",
  "plants",
  "equipment",
  "review",
];

export const STEP_META: Record<BuilderStepId, StepMeta> = {
  tank: {
    id: "tank",
    title: "Choose tank",
    summary: "Pick dimensions and framing first. It drives scene scale and compatibility.",
  },
  substrate: {
    id: "substrate",
    title: "Sculpt substrate",
    summary: "Shape terrain with presets and brush controls. This is your composition foundation.",
  },
  hardscape: {
    id: "hardscape",
    title: "Place hardscape",
    summary: "Set structural rhythm with rock/wood massing before planting.",
  },
  plants: {
    id: "plants",
    title: "Plant zones",
    summary: "Build foreground, midground, and background depth with cluster placement.",
  },
  equipment: {
    id: "equipment",
    title: "Add equipment",
    summary: "Place practical gear while keeping visual hierarchy focused on the aquascape.",
  },
  review: {
    id: "review",
    title: "Review and publish",
    summary: "Finalize BOM, compatibility checks, and share/export output.",
  },
};

export const CANVAS_CATEGORIES = new Set(["hardscape", "plants"]);

export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

export function categoryLabel(slug: string): string {
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function severityClasses(severity: Severity): string {
  switch (severity) {
    case "error":
      return "border-red-300 bg-red-50/95 text-red-800";
    case "warning":
      return "border-amber-300 bg-amber-50/95 text-amber-800";
    case "recommendation":
      return "border-sky-300 bg-sky-50/95 text-sky-800";
    case "completeness":
      return "border-neutral-300 bg-neutral-100/95 text-neutral-700";
  }
}

function lineUnitPriceOrNull(asset: VisualAsset | VisualTank): number | null {
  if ("estimatedUnitPriceCents" in asset && asset.estimatedUnitPriceCents != null) {
    return asset.priceCents ?? asset.estimatedUnitPriceCents;
  }
  return asset.priceCents ?? null;
}

export function lineUnitPrice(asset: VisualAsset | VisualTank): number {
  return lineUnitPriceOrNull(asset) ?? 0;
}

function normalizeRetailerLabel(label: string): string {
  const match = label.trim().match(/^(?:buy|shop)\s+(?:from|at)\s+(.+)$/i);
  if (match?.[1]) {
    return match[1].trim();
  }

  return label.trim();
}

function toAbsoluteUrl(url: string, baseUrl?: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (!baseUrl) {
    return url;
  }

  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

function inferRetailerFromUrl(url: string, baseUrl?: string): string | null {
  try {
    const parsed = new URL(url, baseUrl ?? "https://plantedtanklab.com");
    const hostname = parsed.hostname.replace(/^www\./i, "");
    if (!hostname) return null;

    if (hostname === "plantedtanklab.com" && parsed.pathname.startsWith("/go/")) {
      return "Planted Tank Lab";
    }

    return hostname;
  } catch {
    return null;
  }
}

function lineRetailerLinks(line: BomLine): VisualRetailerLink[] {
  if (line.retailerLinks?.length) {
    return line.retailerLinks;
  }

  if ("retailerLinks" in line.asset && Array.isArray(line.asset.retailerLinks)) {
    return line.asset.retailerLinks;
  }

  return [];
}

function resolveBomAffiliateLink(line: BomLine, baseUrl?: string): string | null {
  const retailerLinks = lineRetailerLinks(line);
  const rawUrl = line.asset.goUrl ?? line.asset.purchaseUrl ?? retailerLinks[0]?.url ?? null;
  if (!rawUrl) {
    return null;
  }

  return toAbsoluteUrl(rawUrl, baseUrl);
}

function resolveBomRetailer(line: BomLine, affiliateLink: string | null, baseUrl?: string): string {
  const retailerLinks = lineRetailerLinks(line);
  const label = retailerLinks[0]?.label;
  if (label) {
    return normalizeRetailerLabel(label);
  }

  if (affiliateLink) {
    return inferRetailerFromUrl(affiliateLink, baseUrl) ?? "No retailer listed";
  }

  return "No retailer listed";
}

export function formatBomShoppingList(params: {
  lines: BomLine[];
  totalCents: number;
  baseUrl?: string;
  generatedAt?: Date;
}): string {
  const generatedDate = params.generatedAt ?? new Date();
  const generatedLabel = generatedDate.toISOString().slice(0, 10);

  const linesSection =
    params.lines.length === 0
      ? "No items selected yet."
      : params.lines
          .map((line, index) => {
            const bestPriceCents = lineUnitPriceOrNull(line.asset);
            const bestPriceLabel = formatMoney(bestPriceCents);
            const affiliateLink = resolveBomAffiliateLink(line, params.baseUrl);
            const retailer = resolveBomRetailer(line, affiliateLink, params.baseUrl);
            const lineTotal = formatMoney((bestPriceCents ?? 0) * line.quantity);

            return [
              `${index + 1}. ${line.asset.name}`,
              `   Category: ${line.categoryName}`,
              `   Quantity: ${line.quantity}`,
              `   Best price: ${bestPriceLabel}`,
              `   Retailer: ${retailer}`,
              `   Affiliate link: ${affiliateLink ?? "No affiliate link available"}`,
              `   Line total: ${lineTotal}`,
            ].join("\n");
          })
          .join("\n\n");

  return [
    "Planted Tank Lab Shopping List",
    `Generated: ${generatedLabel}`,
    "",
    linesSection,
    "",
    `Total estimated cost: ${formatMoney(params.totalCents)}`,
  ].join("\n");
}

export function stepAllowsAsset(
  step: BuilderStepId,
  asset: VisualAsset,
  equipmentCategory: string,
): boolean {
  if (step === "substrate") return asset.type === "product" && asset.categorySlug === "substrate";
  if (step === "hardscape") return asset.categorySlug === "hardscape";
  if (step === "plants") return asset.categorySlug === "plants";

  if (step === "equipment") {
    return (
      asset.type === "product" &&
      !CANVAS_CATEGORIES.has(asset.categorySlug) &&
      asset.categorySlug !== "substrate" &&
      asset.categorySlug !== "tank" &&
      asset.categorySlug === equipmentCategory
    );
  }

  return false;
}

export function clampRotationDeg(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < -180) return -180;
  if (value > 180) return 180;
  return value;
}

export function buildBomLines(params: {
  tank: VisualTank | null;
  assetsById: Map<string, VisualAsset>;
  selectedProductByCategory: Record<string, string | undefined>;
  canvasItems: VisualCanvasItem[];
  categoriesBySlug: Map<string, string>;
  substrateBagCount: number;
  substrateNote?: string;
}): BomLine[] {
  const lines: BomLine[] = [];

  if (params.tank) {
    lines.push({
      key: `tank:${params.tank.id}`,
      categorySlug: "tank",
      categoryName: "Tank",
      quantity: 1,
      asset: params.tank,
      type: "tank",
    });
  }

  for (const [categorySlug, productId] of Object.entries(params.selectedProductByCategory)) {
    if (!productId || CANVAS_CATEGORIES.has(categorySlug)) continue;

    const asset = params.assetsById.get(productId);
    if (!asset || asset.type !== "product") continue;

    const quantity = categorySlug === "substrate" ? params.substrateBagCount : 1;
    const notes = categorySlug === "substrate" ? params.substrateNote : undefined;

    lines.push({
      key: `product:${asset.id}:${categorySlug}`,
      categorySlug,
      categoryName: params.categoriesBySlug.get(categorySlug) ?? categoryLabel(categorySlug),
      quantity: Math.max(1, quantity),
      notes,
      saveEligible: true,
      retailerLinks: asset.retailerLinks ?? [],
      asset,
      type: "product",
    });
  }

  const counts = new Map<string, number>();
  for (const item of params.canvasItems) {
    const asset = params.assetsById.get(item.assetId);
    if (!asset) continue;

    const key = `${asset.type}:${asset.id}:${item.categorySlug}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (const [key, quantity] of counts.entries()) {
    const [, assetId, categorySlug] = key.split(":");
    if (!assetId || !categorySlug) continue;

    const asset = params.assetsById.get(assetId);
    if (!asset) continue;

    lines.push({
      key,
      categorySlug,
      categoryName: params.categoriesBySlug.get(categorySlug) ?? categoryLabel(categorySlug),
      quantity,
      saveEligible: asset.type !== "design",
      retailerLinks: asset.retailerLinks ?? [],
      asset,
      type: asset.type,
    });
  }

  return lines.sort((a, b) => {
    if (a.categorySlug !== b.categorySlug) return a.categorySlug.localeCompare(b.categorySlug);
    return a.asset.name.localeCompare(b.asset.name);
  });
}

export function toLineItemsForSave(lines: BomLine[]): VisualLineItem[] {
  return lines
    .filter((line) => line.saveEligible !== false)
    .map((line) => {
      if (line.type === "tank") {
        return {
          categorySlug: "tank",
          productId: line.asset.id,
          quantity: line.quantity,
          notes: line.notes,
          selectedOfferId: line.asset.offerId ?? undefined,
        };
      }

      if (line.type === "product") {
        return {
          categorySlug: line.categorySlug,
          productId: line.asset.id,
          quantity: line.quantity,
          notes: line.notes,
          selectedOfferId: line.asset.offerId ?? undefined,
        };
      }

      return {
        categorySlug: "plants",
        plantId: line.asset.id,
        quantity: line.quantity,
        notes: line.notes,
      };
    });
}

export async function exportCanvasPng(canvas: HTMLCanvasElement, fileName?: string): Promise<void> {
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (!nextBlob) {
        reject(new Error("Unable to capture scene PNG."));
        return;
      }
      resolve(nextBlob);
    }, "image/png");
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName ?? `plantedtanklab-build-${Date.now()}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

export function toCompatibilityRule(
  row: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    severity: string;
    categoriesInvolved: string[];
    conditionLogic?: unknown;
    messageTemplate: string;
    fixSuggestion: string | null;
    active: boolean;
    version: number;
  },
): CompatibilityRule {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? "",
    severity: row.severity as Severity,
    categoriesInvolved: row.categoriesInvolved,
    conditionLogic:
      typeof row.conditionLogic === "object" &&
      row.conditionLogic &&
      !Array.isArray(row.conditionLogic)
        ? (row.conditionLogic as Record<string, unknown>)
        : {},
    messageTemplate: row.messageTemplate,
    fixSuggestion: row.fixSuggestion,
    active: row.active,
    version: row.version,
  };
}
