import type { BuildFlags, PlantSnapshot, ProductSnapshot } from "@/engine/types";

export type CategoryLike = {
  slug: string;
  name: string;
  builderRequired: boolean;
};

export type BuilderWorkflowStep =
  | {
      kind: "product";
      id: string;
      label: string;
      categorySlug: string;
      required: boolean;
    }
  | {
      kind: "plants";
      id: "plants";
      label: string;
      required: boolean;
    };

export type BuilderWorkflowState = {
  productsByCategory: Record<string, ProductSnapshot | undefined>;
  plants: PlantSnapshot[];
  flags: BuildFlags;
  lowTechNoCo2: boolean;
};

const CORE_ORDER: Array<{ slug: string; label?: string }> = [
  { slug: "tank" },
  { slug: "light" },
  { slug: "filter" },
  { slug: "co2", label: "CO2" },
  { slug: "substrate" },
];

const EXTRAS_ORDER: string[] = [
  "stand",
  "hardscape",
  "fertilizer",
  "heater",
  "test_kit",
  "accessories",
];

function labelForCategory(c: CategoryLike): string {
  if (c.slug === "co2") return "CO2";
  return c.name;
}

export function buildWorkflow(params: {
  categories: CategoryLike[];
}): { core: BuilderWorkflowStep[]; extras: BuilderWorkflowStep[] } {
  const bySlug = new Map(params.categories.map((c) => [c.slug, c]));

  const core: BuilderWorkflowStep[] = [];
  for (const entry of CORE_ORDER) {
    const c = bySlug.get(entry.slug);
    if (!c) continue;
    core.push({
      kind: "product",
      id: c.slug,
      categorySlug: c.slug,
      label: entry.label ?? labelForCategory(c),
      required: c.builderRequired,
    });
  }

  // Plants are a first-class step even though they're not a product picker.
  core.push({
    kind: "plants",
    id: "plants",
    label: "Plants",
    required: false,
  });

  const extras: BuilderWorkflowStep[] = [];
  for (const slug of EXTRAS_ORDER) {
    const c = bySlug.get(slug);
    if (!c) continue;
    extras.push({
      kind: "product",
      id: c.slug,
      categorySlug: c.slug,
      label: labelForCategory(c),
      required: c.builderRequired,
    });
  }

  // Any remaining categories (unknown/new) are treated as extras at the end.
  const seen = new Set<string>([
    ...core.filter((s) => s.kind === "product").map((s) => s.categorySlug),
    ...extras.map((s) => (s.kind === "product" ? s.categorySlug : "")),
    "plants",
  ]);
  for (const c of params.categories) {
    if (c.slug === "plants") continue;
    if (seen.has(c.slug)) continue;
    extras.push({
      kind: "product",
      id: c.slug,
      categorySlug: c.slug,
      label: labelForCategory(c),
      required: c.builderRequired,
    });
  }

  return { core, extras };
}

export function isStepComplete(step: BuilderWorkflowStep, state: BuilderWorkflowState): boolean {
  if (step.kind === "plants") return state.plants.length > 0;
  if (step.categorySlug === "co2" && state.lowTechNoCo2) return true;
  return Boolean(state.productsByCategory[step.categorySlug]);
}

export function nextRecommendedCoreStep(
  coreSteps: BuilderWorkflowStep[],
  state: BuilderWorkflowState,
): BuilderWorkflowStep | null {
  for (const step of coreSteps) {
    if (!isStepComplete(step, state)) return step;
  }
  return null;
}

export function coreProgress(
  coreSteps: BuilderWorkflowStep[],
  state: BuilderWorkflowState,
): { done: number; total: number } {
  const total = coreSteps.length;
  let done = 0;
  for (const s of coreSteps) if (isStepComplete(s, state)) done += 1;
  return { done, total };
}

