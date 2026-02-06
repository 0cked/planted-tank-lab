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

  const volume = asNumber(tank.specs[tankVolumeKey]);
  const flow = asNumber(filter.specs[filterFlowKey]);
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

  const par = asNumber(light.specs[parKey]);
  if (par == null) return [];

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

  const substrateKey = String(logic.substrate_key ?? "");
  const plantPhMinThreshold = asNumber(logic.plant_ph_min_threshold) ?? null;
  if (!substrateKey || plantPhMinThreshold == null) return [];

  const buffers = asBoolean(substrate.specs[substrateKey]);
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

  const volume = asNumber(tank.specs[tankVolumeKey]);
  const watts = asNumber(heater.specs[heaterWattageKey]);
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

  if (copper == null) return [];
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

  const par = asNumber(light.specs["par_at_substrate"]);
  // If no PAR is available, skip. (We can't confidently warn.)
  if (par == null) return [];

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

  const hardscapeKey = String(logic.hardscape_key ?? "");
  const plantSoftKey = String(logic.plant_soft_water_key ?? "");
  if (!hardscapeKey || !plantSoftKey) return [];

  const raises = asBoolean(hardscape.specs[hardscapeKey]);
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
