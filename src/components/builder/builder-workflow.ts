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

// Core builder steps are a curated subset of categories. The order comes from
// the DB `categories.display_order` (admin-controlled), but the grouping is a UX rule.
const CORE_STEP_SLUGS = ["tank", "light", "filter", "co2", "substrate"] as const;
const CORE_STEP_SET = new Set<string>(CORE_STEP_SLUGS);

function labelForCategory(c: CategoryLike): string {
  if (c.slug === "co2") return "CO2";
  return c.name;
}

export function buildWorkflow(params: {
  categories: CategoryLike[];
}): { core: BuilderWorkflowStep[]; extras: BuilderWorkflowStep[] } {
  const core: BuilderWorkflowStep[] = [];
  const extras: BuilderWorkflowStep[] = [];

  for (const c of params.categories) {
    if (c.slug === "plants") continue;
    const step: BuilderWorkflowStep = {
      kind: "product",
      id: c.slug,
      categorySlug: c.slug,
      label: labelForCategory(c),
      required: c.builderRequired,
    };
    if (CORE_STEP_SET.has(c.slug)) core.push(step);
    else extras.push(step);
  }

  // Plants are a first-class step even though they're not a product picker.
  core.push({
    kind: "plants",
    id: "plants",
    label: "Plants",
    required: false,
  });

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
