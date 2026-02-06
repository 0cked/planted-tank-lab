export type Severity = "error" | "warning" | "recommendation" | "completeness";

export type CompatibilityRule = {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
  severity: Severity;
  categoriesInvolved: string[];
  conditionLogic: Record<string, unknown>;
  messageTemplate: string;
  fixSuggestion?: string | null;
  active?: boolean;
  version?: number;
};

export type Evaluation = {
  ruleCode: string;
  severity: Severity;
  message: string;
  fixSuggestion?: string | null;
  // Useful for UI grouping and debugging.
  categoriesInvolved: string[];
};

export type ProductSnapshot = {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  specs: Record<string, unknown>;
};

export type PlantSnapshot = {
  id: string;
  commonName: string;
  slug: string;
  difficulty: string;
  lightDemand: string;
  co2Demand: string;
  growthRate?: string | null;
  placement: string;
  tempMinF?: number | null;
  tempMaxF?: number | null;
  phMin?: number | null;
  phMax?: number | null;
  ghMin?: number | null;
  ghMax?: number | null;
  khMin?: number | null;
  khMax?: number | null;
  maxHeightIn?: number | null;
  // Optional extras for future rules (some seeded rule examples refer to keys not yet modeled).
  extra?: Record<string, unknown>;
};

export type BuildFlags = {
  hasShrimp: boolean;
};

export type BuildSnapshot = {
  productsByCategory: Record<string, ProductSnapshot | undefined>;
  plants: PlantSnapshot[];
  flags: BuildFlags;
};

