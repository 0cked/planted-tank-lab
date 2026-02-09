import type {
  BuildSnapshot,
  CompatibilityRule,
  Evaluation,
  PlantSnapshot,
  Severity,
} from "./types";

type ConditionLogic = Record<string, unknown> & { type?: unknown };

const severityOrder: Record<Severity, number> = {
  error: 0,
  warning: 1,
  recommendation: 2,
  completeness: 3,
};

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  return null;
}

function formatNumber(n: number, decimals: number): string {
  return n.toFixed(decimals).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function renderTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    const v = vars[key];
    if (v === undefined) return match;
    return typeof v === "number" ? String(v) : v;
  });
}

function plantExtraBoolean(plant: PlantSnapshot, key: string): boolean | null {
  const extra = plant.extra ?? {};
  return asBoolean(extra[key]);
}

function missingDataEval(rule: CompatibilityRule, missing: string[]): Evaluation[] {
  const uniq = Array.from(new Set(missing)).filter((k) => Boolean(k));
  if (uniq.length === 0) return [];
  uniq.sort((a, b) => a.localeCompare(b));

  const shown = uniq.slice(0, 3).join(", ");
  const more = uniq.length > 3 ? ` +${uniq.length - 3} more` : "";

  return [
    {
      kind: "insufficient_data",
      ruleCode: rule.code,
      severity: "completeness",
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion:
        "Try another option, or turn off Compatibility if you want to pick anyway.",
      message: `We can't verify this yet (missing: ${shown}${more}).`,
    },
  ];
}

function evaluateTurnoverRange(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const tank = snapshot.productsByCategory["tank"];
  const filter = snapshot.productsByCategory["filter"];
  if (!tank || !filter) return [];

  const tankVolumeKey = String(logic.tank_volume_key ?? "");
  const filterFlowKey = String(logic.filter_flow_key ?? "");
  const minTurnover = asNumber(logic.min_turnover) ?? null;
  const maxTurnover = asNumber(logic.max_turnover) ?? null;
  if (!tankVolumeKey || !filterFlowKey || minTurnover == null || maxTurnover == null)
    return [];

  const missing: string[] = [];
  const volume = asNumber(tank.specs[tankVolumeKey]);
  const flow = asNumber(filter.specs[filterFlowKey]);
  if (volume == null || volume <= 0) missing.push(`tank.${tankVolumeKey}`);
  if (flow == null) missing.push(`filter.${filterFlowKey}`);
  if (missing.length > 0) return missingDataEval(rule, missing);
  if (volume == null || flow == null || volume <= 0) return [];

  const turnover = flow / volume;
  if (turnover >= minTurnover && turnover <= maxTurnover) return [];

  return [
    {
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: renderTemplate(rule.messageTemplate, {
        turnover: Number(formatNumber(turnover, 1)),
      }),
    },
  ];
}

function evaluatePlantLightDemandMinPar(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const light = snapshot.productsByCategory["light"];
  if (!light) return [];

  const parKey = String(logic.light_par_key ?? "");
  const minParForHigh = asNumber(logic.min_par_for_high) ?? null;
  if (!parKey || minParForHigh == null) return [];

  // Only evaluate once the rule can actually apply (a high-light plant is present).
  const hasHigh = snapshot.plants.some((p) => p.lightDemand === "high");
  if (!hasHigh) return [];

  const par = asNumber(light.specs[parKey]);
  if (par == null) return missingDataEval(rule, [`light.${parKey}`]);

  const evals: Evaluation[] = [];
  for (const plant of snapshot.plants) {
    if (plant.lightDemand !== "high") continue;
    if (par >= minParForHigh) continue;

    evals.push({
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: renderTemplate(rule.messageTemplate, {
        plant_name: plant.commonName,
        par: Number(formatNumber(par, 0)),
      }),
    });
  }
  return evals;
}

function evaluateCo2RequiredPlants(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const requiredValue = String(logic.required_value ?? "required");
  const co2 = snapshot.productsByCategory["co2"];
  if (co2) return [];

  // Only warn/block once the user explicitly decided "no CO2".
  // If CO2 just hasn't been picked yet, don't treat that as a mismatch.
  if (snapshot.flags.lowTechNoCo2 !== true) return [];

  const evals: Evaluation[] = [];
  for (const plant of snapshot.plants) {
    if (plant.co2Demand !== requiredValue) continue;
    evals.push({
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: renderTemplate(rule.messageTemplate, {
        plant_name: plant.commonName,
      }),
    });
  }
  return evals;
}

function evaluateLightFitRange(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const tank = snapshot.productsByCategory["tank"];
  const light = snapshot.productsByCategory["light"];
  if (!tank || !light) return [];

  const tankLengthKey = String(logic.tank_length_key ?? "");
  const minKey = String(logic.light_min_key ?? "");
  const maxKey = String(logic.light_max_key ?? "");
  if (!tankLengthKey || !minKey || !maxKey) return [];

  const tankLen = asNumber(tank.specs[tankLengthKey]);
  const minLen = asNumber(light.specs[minKey]);
  const maxLen = asNumber(light.specs[maxKey]);
  const missing: string[] = [];
  if (tankLen == null) missing.push(`tank.${tankLengthKey}`);
  if (minLen == null) missing.push(`light.${minKey}`);
  if (maxLen == null) missing.push(`light.${maxKey}`);
  if (missing.length > 0) return missingDataEval(rule, missing);
  if (tankLen == null || minLen == null || maxLen == null) return [];

  if (tankLen >= minLen && tankLen <= maxLen) return [];

  return [
    {
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: renderTemplate(rule.messageTemplate, {
        light_range: `${formatNumber(minLen, 0)}–${formatNumber(maxLen, 0)}\"`,
        tank_length: formatNumber(tankLen, 0),
      }),
    },
  ];
}

function evaluateSubstrateBuffersPh(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const substrate = snapshot.productsByCategory["substrate"];
  if (!substrate) return [];
  if (snapshot.plants.length === 0) return [];

  const substrateKey = String(logic.substrate_key ?? "");
  const plantPhMinThreshold = asNumber(logic.plant_ph_min_threshold) ?? null;
  if (!substrateKey || plantPhMinThreshold == null) return [];

  const buffers = asBoolean(substrate.specs[substrateKey]);
  if (buffers == null) return missingDataEval(rule, [`substrate.${substrateKey}`]);
  if (buffers !== true) return [];

  const evals: Evaluation[] = [];
  for (const plant of snapshot.plants) {
    const plantPhMin = plant.phMin ?? null;
    if (plantPhMin == null) continue;
    if (plantPhMin <= plantPhMinThreshold) continue;

    evals.push({
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: renderTemplate(rule.messageTemplate, {
        substrate_name: substrate.name,
        plant_name: plant.commonName,
      }),
    });
  }
  return evals;
}

function evaluateHeaterWattsPerGallon(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const tank = snapshot.productsByCategory["tank"];
  const heater = snapshot.productsByCategory["heater"];
  if (!tank || !heater) return [];

  const tankVolumeKey = String(logic.tank_volume_key ?? "");
  const heaterWattageKey = String(logic.heater_wattage_key ?? "");
  const minWpg = asNumber(logic.min_wpg) ?? null;
  const maxWpg = asNumber(logic.max_wpg) ?? null;
  if (!tankVolumeKey || !heaterWattageKey || minWpg == null || maxWpg == null)
    return [];

  const missing: string[] = [];
  const volume = asNumber(tank.specs[tankVolumeKey]);
  const watts = asNumber(heater.specs[heaterWattageKey]);
  if (volume == null || volume <= 0) missing.push(`tank.${tankVolumeKey}`);
  if (watts == null) missing.push(`heater.${heaterWattageKey}`);
  if (missing.length > 0) return missingDataEval(rule, missing);
  if (volume == null || watts == null || volume <= 0) return [];

  const wpg = watts / volume;
  if (wpg >= minWpg && wpg <= maxWpg) return [];

  return [
    {
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: renderTemplate(rule.messageTemplate, {
        wpg: Number(formatNumber(wpg, 1)),
      }),
    },
  ];
}

function evaluateShrimpCopperCheck(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const requiresShrimpFlag = asBoolean(logic.requires_shrimp_flag);
  if (requiresShrimpFlag !== false && !snapshot.flags.hasShrimp) return [];
  const fert = snapshot.productsByCategory["fertilizer"];
  if (!fert) return [];

  const copper = asNumber(fert.specs["copper_content"]);
  const shrimpSafe = asBoolean(fert.specs["shrimp_safe"]);

  if (copper == null) return missingDataEval(rule, ["fertilizer.copper_content"]);
  if (copper <= 0) return [];
  if (shrimpSafe === true) return [];

  return [
    {
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: rule.messageTemplate,
    },
  ];
}

function evaluateCarpetNeedsLightAndCo2(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const carpetValue = String(logic.carpet_value ?? "carpet");
  const minPar = asNumber(logic.min_par) ?? null;

  const light = snapshot.productsByCategory["light"];
  const co2 = snapshot.productsByCategory["co2"];
  if (!light) return [];

  const hasCarpet = snapshot.plants.some((p) => p.placement === carpetValue);
  if (!hasCarpet) return [];

  const par = asNumber(light.specs["par_at_substrate"]);
  if (par == null) return missingDataEval(rule, ["light.par_at_substrate"]);

  const hasCo2 = Boolean(co2);
  const evals: Evaluation[] = [];

  for (const plant of snapshot.plants) {
    if (plant.placement !== carpetValue) continue;
    const needs = (minPar != null && par < minPar) || !hasCo2;
    if (!needs) continue;

    evals.push({
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: renderTemplate(rule.messageTemplate, { plant_name: plant.commonName }),
    });
  }

  return evals;
}

function evaluateStandWeightCapacity(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const tank = snapshot.productsByCategory["tank"];
  const stand = snapshot.productsByCategory["stand"];
  if (!tank || !stand) return [];

  const tankWeightKey = String(logic.tank_weight_key ?? "");
  const standCapacityKey = String(logic.stand_capacity_key ?? "");
  if (!tankWeightKey || !standCapacityKey) return [];

  const weight = asNumber(tank.specs[tankWeightKey]);
  const capacity = asNumber(stand.specs[standCapacityKey]);
  const missing: string[] = [];
  if (weight == null) missing.push(`tank.${tankWeightKey}`);
  if (capacity == null) missing.push(`stand.${standCapacityKey}`);
  if (missing.length > 0) return missingDataEval(rule, missing);
  if (weight == null || capacity == null) return [];

  if (weight <= capacity) return [];

  return [
    {
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: renderTemplate(rule.messageTemplate, {
        weight: Number(formatNumber(weight, 0)),
        capacity: Number(formatNumber(capacity, 0)),
      }),
    },
  ];
}

function evaluateHardscapeRaisesHardness(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const hardscape = snapshot.productsByCategory["hardscape"];
  if (!hardscape) return [];
  if (snapshot.plants.length === 0) return [];

  const hardscapeKey = String(logic.hardscape_key ?? "");
  const plantSoftKey = String(logic.plant_soft_water_key ?? "");
  if (!hardscapeKey || !plantSoftKey) return [];

  const raises = asBoolean(hardscape.specs[hardscapeKey]);
  if (raises == null) return missingDataEval(rule, [`hardscape.${hardscapeKey}`]);
  if (raises !== true) return [];

  const evals: Evaluation[] = [];
  for (const plant of snapshot.plants) {
    const prefersSoft = plantExtraBoolean(plant, plantSoftKey);
    if (prefersSoft !== true) continue;

    evals.push({
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: renderTemplate(rule.messageTemplate, {
        plant_name: plant.commonName,
      }),
    });
  }

  return evals;
}

function evaluatePlantingDensityMinSpecies(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const tank = snapshot.productsByCategory["tank"];
  if (!tank) return [];

  const tankVolumeKey = String(logic.tank_volume_key ?? "");
  const minTankVolume = asNumber(logic.min_tank_volume_gal) ?? null;
  const minSpeciesCount = asNumber(logic.min_species_count) ?? null;
  if (!tankVolumeKey || minTankVolume == null || minSpeciesCount == null) return [];

  const volume = asNumber(tank.specs[tankVolumeKey]);
  if (volume == null) return missingDataEval(rule, [`tank.${tankVolumeKey}`]);

  const plantCount = snapshot.plants.length;
  if (volume <= minTankVolume) return [];
  if (plantCount >= minSpeciesCount) return [];

  return [
    {
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: renderTemplate(rule.messageTemplate, {
        plant_count: plantCount,
        tank_volume: Number(formatNumber(volume, 0)),
      }),
    },
  ];
}

function evaluateCo2InlineDiffuserWithCanister(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const co2 = snapshot.productsByCategory["co2"];
  const filter = snapshot.productsByCategory["filter"];
  if (!co2 || !filter) return [];

  const filterTypeKey = String(logic.filter_type_key ?? "");
  const filterTypeValue = String(logic.filter_type_value ?? "");
  const diffuserTypeKey = String(logic.co2_diffuser_type_key ?? "");
  const diffuserTypeValue = String(logic.co2_diffuser_type_value ?? "");
  if (!filterTypeKey || !filterTypeValue || !diffuserTypeKey || !diffuserTypeValue) return [];

  const filterType = String(filter.specs[filterTypeKey] ?? "");
  const diffuserType = String(co2.specs[diffuserTypeKey] ?? "");
  if (filterType !== filterTypeValue) return [];
  if (diffuserType !== diffuserTypeValue) return [];

  return [
    {
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: rule.messageTemplate,
    },
  ];
}

function evaluateNanoTankFilterTypeWarning(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const tank = snapshot.productsByCategory["tank"];
  const filter = snapshot.productsByCategory["filter"];
  if (!tank || !filter) return [];

  const tankVolumeKey = String(logic.tank_volume_key ?? "");
  const maxTankVolume = asNumber(logic.max_tank_volume_gal) ?? null;
  const filterTypeKey = String(logic.filter_type_key ?? "");
  const filterTypeValue = String(logic.filter_type_value ?? "");
  if (!tankVolumeKey || maxTankVolume == null || !filterTypeKey || !filterTypeValue) return [];

  const volume = asNumber(tank.specs[tankVolumeKey]);
  if (volume == null) return missingDataEval(rule, [`tank.${tankVolumeKey}`]);
  if (volume > maxTankVolume) return [];

  const filterType = String(filter.specs[filterTypeKey] ?? "");
  if (!filterType) return missingDataEval(rule, [`filter.${filterTypeKey}`]);
  if (filterType !== filterTypeValue) return [];

  return [
    {
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: rule.messageTemplate,
    },
  ];
}

function formatTempRange(p: PlantSnapshot): string | null {
  const min = p.tempMinF ?? null;
  const max = p.tempMaxF ?? null;
  if (min == null || max == null) return null;
  return `${formatNumber(min, 0)}–${formatNumber(max, 0)}`;
}

function evaluatePlantTemperatureOverlap(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  _logic: ConditionLogic,
): Evaluation[] {
  void _logic;
  const plants = snapshot.plants;
  if (plants.length < 2) return [];

  // Use the snapshot fields directly (key indirection is for forward-compat).
  const getMin = (p: PlantSnapshot): number | null => p.tempMinF ?? null;
  const getMax = (p: PlantSnapshot): number | null => p.tempMaxF ?? null;

  for (let i = 0; i < plants.length; i += 1) {
    for (let j = i + 1; j < plants.length; j += 1) {
      const a = plants[i]!;
      const b = plants[j]!;
      const amin = getMin(a);
      const amax = getMax(a);
      const bmin = getMin(b);
      const bmax = getMax(b);
      if (amin == null || amax == null || bmin == null || bmax == null) continue;

      const mismatch = amax < bmin || bmax < amin;
      if (!mismatch) continue;

      const rangeA = formatTempRange(a) ?? "—";
      const rangeB = formatTempRange(b) ?? "—";

      return [
        {
          ruleCode: rule.code,
          severity: rule.severity,
          categoriesInvolved: rule.categoriesInvolved,
          fixSuggestion: rule.fixSuggestion ?? null,
          message: renderTemplate(rule.messageTemplate, {
            plant_a: a.commonName,
            plant_b: b.commonName,
            range_a: rangeA,
            range_b: rangeB,
          }),
        },
      ];
    }
  }

  return [];
}

function evaluateActiveSubstrateHardWaterPlants(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const substrate = snapshot.productsByCategory["substrate"];
  if (!substrate) return [];

  const substrateTypeKey = String(logic.substrate_type_key ?? "");
  const activeValue = String(logic.active_value ?? "");
  const plantHardKey = String(logic.plant_hard_water_key ?? "");
  if (!substrateTypeKey || !activeValue || !plantHardKey) return [];

  const substrateType = String(substrate.specs[substrateTypeKey] ?? "");
  if (!substrateType) return missingDataEval(rule, [`substrate.${substrateTypeKey}`]);
  if (substrateType !== activeValue) return [];

  const evals: Evaluation[] = [];
  for (const plant of snapshot.plants) {
    const prefersHard = plantExtraBoolean(plant, plantHardKey);
    if (prefersHard !== true) continue;

    evals.push({
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: renderTemplate(rule.messageTemplate, { plant_name: plant.commonName }),
    });
  }
  return evals;
}

function evaluateMissingCategory(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const categorySlug = String(logic.category_slug ?? "");
  if (!categorySlug) return [];

  const requiresPlants = asBoolean(logic.requires_plants) ?? false;
  if (requiresPlants && snapshot.plants.length === 0) return [];

  if (snapshot.productsByCategory[categorySlug]) return [];

  return [
    {
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: rule.messageTemplate,
    },
  ];
}

function evaluateInertSubstrateRootFeeders(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const substrate = snapshot.productsByCategory["substrate"];
  if (!substrate) return [];

  const substrateTypeKey = String(logic.substrate_type_key ?? "");
  const inertValue = String(logic.inert_value ?? "");
  const plantRootKey = String(logic.plant_root_feeder_key ?? "");
  if (!substrateTypeKey || !inertValue || !plantRootKey) return [];

  const substrateType = String(substrate.specs[substrateTypeKey] ?? "");
  if (!substrateType) return missingDataEval(rule, [`substrate.${substrateTypeKey}`]);
  if (substrateType !== inertValue) return [];

  const evals: Evaluation[] = [];
  for (const plant of snapshot.plants) {
    const rootFeeder = plantExtraBoolean(plant, plantRootKey);
    if (rootFeeder !== true) continue;
    evals.push({
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: renderTemplate(rule.messageTemplate, { plant_name: plant.commonName }),
    });
  }
  return evals;
}

function evaluateNanoTurnoverMax(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const tank = snapshot.productsByCategory["tank"];
  const filter = snapshot.productsByCategory["filter"];
  if (!tank || !filter) return [];

  const tankVolumeKey = String(logic.tank_volume_key ?? "");
  const filterFlowKey = String(logic.filter_flow_key ?? "");
  const maxTankVolume = asNumber(logic.max_tank_volume_gal) ?? null;
  const maxTurnover = asNumber(logic.max_turnover) ?? null;
  if (!tankVolumeKey || !filterFlowKey || maxTankVolume == null || maxTurnover == null) return [];

  const missing: string[] = [];
  const volume = asNumber(tank.specs[tankVolumeKey]);
  const flow = asNumber(filter.specs[filterFlowKey]);
  if (volume == null || volume <= 0) missing.push(`tank.${tankVolumeKey}`);
  if (flow == null) missing.push(`filter.${filterFlowKey}`);
  if (missing.length > 0) return missingDataEval(rule, missing);
  if (volume == null || flow == null || volume <= 0) return [];
  if (volume > maxTankVolume) return [];

  const turnover = flow / volume;
  if (turnover <= maxTurnover) return [];

  return [
    {
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: renderTemplate(rule.messageTemplate, {
        turnover: Number(formatNumber(turnover, 1)),
      }),
    },
  ];
}

function evaluateHighParWithoutCo2(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const light = snapshot.productsByCategory["light"];
  const co2 = snapshot.productsByCategory["co2"];
  if (!light) return [];
  if (co2) return [];

  const parKey = String(logic.light_par_key ?? "");
  const minPar = asNumber(logic.min_par) ?? null;
  if (!parKey || minPar == null) return [];

  const par = asNumber(light.specs[parKey]);
  if (par == null) return missingDataEval(rule, [`light.${parKey}`]);
  if (par < minPar) return [];

  return [
    {
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: renderTemplate(rule.messageTemplate, { par: Number(formatNumber(par, 0)) }),
    },
  ];
}

function evaluateMixedLightDemand(
  rule: CompatibilityRule,
  snapshot: BuildSnapshot,
  logic: ConditionLogic,
): Evaluation[] {
  const lowValue = String(logic.requires_low ?? "low");
  const highValue = String(logic.requires_high ?? "high");
  if (!lowValue || !highValue) return [];

  let hasLow = false;
  let hasHigh = false;
  for (const plant of snapshot.plants) {
    if (plant.lightDemand === lowValue) hasLow = true;
    if (plant.lightDemand === highValue) hasHigh = true;
  }

  if (!hasLow || !hasHigh) return [];

  return [
    {
      ruleCode: rule.code,
      severity: rule.severity,
      categoriesInvolved: rule.categoriesInvolved,
      fixSuggestion: rule.fixSuggestion ?? null,
      message: rule.messageTemplate,
    },
  ];
}

export function evaluateBuild(
  rules: CompatibilityRule[],
  snapshot: BuildSnapshot,
): Evaluation[] {
  const out: Evaluation[] = [];

  for (const rule of rules) {
    if (rule.active === false) continue;
    const logic = rule.conditionLogic as ConditionLogic;
    const type = logic.type;
    if (typeof type !== "string") continue;

    switch (type) {
      case "turnover_range":
        out.push(...evaluateTurnoverRange(rule, snapshot, logic));
        break;
      case "plant_light_demand_min_par":
        out.push(...evaluatePlantLightDemandMinPar(rule, snapshot, logic));
        break;
      case "co2_required_plants":
        out.push(...evaluateCo2RequiredPlants(rule, snapshot, logic));
        break;
      case "light_fit_range":
        out.push(...evaluateLightFitRange(rule, snapshot, logic));
        break;
      case "substrate_buffers_ph":
        out.push(...evaluateSubstrateBuffersPh(rule, snapshot, logic));
        break;
      case "heater_watts_per_gallon":
        out.push(...evaluateHeaterWattsPerGallon(rule, snapshot, logic));
        break;
      case "shrimp_copper_check":
        out.push(...evaluateShrimpCopperCheck(rule, snapshot, logic));
        break;
      case "carpet_needs_light_and_co2":
        out.push(...evaluateCarpetNeedsLightAndCo2(rule, snapshot, logic));
        break;
      case "stand_weight_capacity":
        out.push(...evaluateStandWeightCapacity(rule, snapshot, logic));
        break;
      case "hardscape_raises_hardness":
        out.push(...evaluateHardscapeRaisesHardness(rule, snapshot, logic));
        break;
      case "planting_density_min_species":
        out.push(...evaluatePlantingDensityMinSpecies(rule, snapshot, logic));
        break;
      case "co2_inline_diffuser_with_canister":
        out.push(...evaluateCo2InlineDiffuserWithCanister(rule, snapshot, logic));
        break;
      case "nano_tank_filter_type_warning":
        out.push(...evaluateNanoTankFilterTypeWarning(rule, snapshot, logic));
        break;
      case "plant_temperature_overlap":
        out.push(...evaluatePlantTemperatureOverlap(rule, snapshot, logic));
        break;
      case "active_substrate_hard_water_plants":
        out.push(...evaluateActiveSubstrateHardWaterPlants(rule, snapshot, logic));
        break;
      case "missing_category":
        out.push(...evaluateMissingCategory(rule, snapshot, logic));
        break;
      case "inert_substrate_root_feeders":
        out.push(...evaluateInertSubstrateRootFeeders(rule, snapshot, logic));
        break;
      case "nano_turnover_max":
        out.push(...evaluateNanoTurnoverMax(rule, snapshot, logic));
        break;
      case "high_par_without_co2":
        out.push(...evaluateHighParWithoutCo2(rule, snapshot, logic));
        break;
      case "mixed_light_demand":
        out.push(...evaluateMixedLightDemand(rule, snapshot, logic));
        break;
      default:
        // Forward-compatible: ignore unknown rule types.
        break;
    }
  }

  out.sort((a, b) => {
    const ao = severityOrder[a.severity] ?? 99;
    const bo = severityOrder[b.severity] ?? 99;
    if (ao !== bo) return ao - bo;
    return a.ruleCode.localeCompare(b.ruleCode);
  });

  return out;
}
