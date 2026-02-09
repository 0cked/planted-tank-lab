import type { CompatibilityRule } from "@/engine/types";

type ConditionLogic = Record<string, unknown> & { type?: unknown };

export type RequiredSpecsByCategory = Record<string, string[]>;

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function push(out: RequiredSpecsByCategory, category: string, keys: Array<string | null>): void {
  const arr = out[category] ?? [];
  for (const k of keys) {
    if (!k) continue;
    arr.push(k);
  }
  if (arr.length > 0) out[category] = arr;
}

export function requiredSpecsForRule(rule: CompatibilityRule): RequiredSpecsByCategory {
  const out: RequiredSpecsByCategory = {};
  if (rule.active === false) return out;
  const logic = rule.conditionLogic as ConditionLogic;
  const type = logic.type;
  if (typeof type !== "string") return out;

  switch (type) {
    case "turnover_range":
      push(out, "tank", [str(logic.tank_volume_key)]);
      push(out, "filter", [str(logic.filter_flow_key)]);
      return out;
    case "plant_light_demand_min_par":
      push(out, "light", [str(logic.light_par_key)]);
      return out;
    case "light_fit_range":
      push(out, "tank", [str(logic.tank_length_key)]);
      push(out, "light", [str(logic.light_min_key), str(logic.light_max_key)]);
      return out;
    case "heater_watts_per_gallon":
      push(out, "tank", [str(logic.tank_volume_key)]);
      push(out, "heater", [str(logic.heater_wattage_key)]);
      return out;
    case "stand_weight_capacity":
      push(out, "tank", [str(logic.tank_weight_key)]);
      push(out, "stand", [str(logic.stand_capacity_key)]);
      return out;
    case "substrate_buffers_ph":
      push(out, "substrate", [str(logic.substrate_key)]);
      return out;
    case "shrimp_copper_check":
      // Fixed keys used in rule eval.
      push(out, "fertilizer", ["copper_content", "shrimp_safe"]);
      return out;
    case "carpet_needs_light_and_co2":
      push(out, "light", ["par_at_substrate"]);
      return out;
    case "planting_density_min_species":
      push(out, "tank", [str(logic.tank_volume_key)]);
      return out;
    case "nano_tank_filter_type_warning":
      push(out, "tank", [str(logic.tank_volume_key)]);
      push(out, "filter", [str(logic.filter_type_key)]);
      return out;
    case "nano_turnover_max":
      push(out, "tank", [str(logic.tank_volume_key)]);
      push(out, "filter", [str(logic.filter_flow_key)]);
      return out;
    case "high_par_without_co2":
      push(out, "light", [str(logic.light_par_key)]);
      return out;
    case "co2_inline_diffuser_with_canister":
      push(out, "filter", [str(logic.filter_type_key)]);
      push(out, "co2", [str(logic.co2_diffuser_type_key)]);
      return out;
    case "active_substrate_hard_water_plants":
      push(out, "substrate", [str(logic.substrate_type_key)]);
      return out;
    case "inert_substrate_root_feeders":
      push(out, "substrate", [str(logic.substrate_type_key)]);
      return out;
    case "hardscape_raises_hardness":
      push(out, "hardscape", [str(logic.hardscape_key)]);
      return out;
    default:
      return out;
  }
}

export function requiredSpecsForCategory(
  rules: CompatibilityRule[],
  categorySlug: string,
): string[] {
  const set = new Set<string>();
  for (const rule of rules) {
    const req = requiredSpecsForRule(rule);
    for (const k of req[categorySlug] ?? []) set.add(k);
  }
  return Array.from(set).sort();
}

export function missingRequiredSpecs(
  specs: Record<string, unknown>,
  requiredKeys: string[],
): string[] {
  const missing: string[] = [];
  for (const k of requiredKeys) {
    const v = specs[k];
    if (v === undefined || v === null) {
      missing.push(k);
      continue;
    }
    if (typeof v === "string" && v.trim() === "") {
      missing.push(k);
    }
  }
  return missing;
}

