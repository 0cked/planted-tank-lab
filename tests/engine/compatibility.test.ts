import { describe, expect, test } from "vitest";

import { evaluateBuild } from "../../src/engine/evaluate";
import type { BuildSnapshot, CompatibilityRule, ProductSnapshot } from "../../src/engine/types";

function product(
  categorySlug: string,
  specs: Record<string, unknown>,
  overrides?: Partial<ProductSnapshot>,
): ProductSnapshot {
  return {
    id: `${categorySlug}_1`,
    name: `${categorySlug} product`,
    slug: `${categorySlug}-product`,
    categorySlug,
    specs,
    ...overrides,
  };
}

function snapshot(partial?: Partial<BuildSnapshot>): BuildSnapshot {
  return {
    productsByCategory: {},
    plants: [],
    flags: { hasShrimp: false },
    ...partial,
  };
}

describe("compatibility engine (seeded rule types)", () => {
  test("turnover_range triggers when flow/volume is out of range", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_001",
        name: "Tank Volume vs Filter Flow",
        severity: "warning",
        categoriesInvolved: ["tank", "filter"],
        conditionLogic: {
          type: "turnover_range",
          tank_volume_key: "volume_gal",
          filter_flow_key: "flow_rate_gph",
          min_turnover: 4,
          max_turnover: 15,
        },
        messageTemplate: "Turnover is {turnover}x",
      },
    ];

    const s = snapshot({
      productsByCategory: {
        tank: product("tank", { volume_gal: 10 }),
        filter: product("filter", { flow_rate_gph: 20 }),
      },
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
    expect(evals[0]?.message).toContain("2");
  });

  test("plant_light_demand_min_par triggers per high-light plant when PAR too low", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_002",
        name: "Light vs plant demand",
        severity: "warning",
        categoriesInvolved: ["light", "plants"],
        conditionLogic: {
          type: "plant_light_demand_min_par",
          light_par_key: "par_at_substrate",
          min_par_for_high: 50,
        },
        messageTemplate: "{plant_name} needs more than {par}",
      },
    ];

    const s = snapshot({
      productsByCategory: {
        light: product("light", { par_at_substrate: 30 }),
      },
      plants: [
        {
          id: "p1",
          commonName: "Rotala",
          slug: "rotala",
          difficulty: "moderate",
          lightDemand: "high",
          co2Demand: "beneficial",
          placement: "background",
        },
        {
          id: "p2",
          commonName: "Java Fern",
          slug: "java-fern",
          difficulty: "easy",
          lightDemand: "low",
          co2Demand: "none",
          placement: "epiphyte",
        },
      ],
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
    expect(evals[0]?.message).toContain("Rotala");
    expect(evals[0]?.message).toContain("30");
  });

  test("co2_required_plants triggers when CO2 is missing", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_003",
        name: "CO2 required plants",
        severity: "warning",
        categoriesInvolved: ["plants", "co2"],
        conditionLogic: { type: "co2_required_plants", required_value: "required" },
        messageTemplate: "{plant_name} requires CO2",
      },
    ];

    const s = snapshot({
      plants: [
        {
          id: "p1",
          commonName: "Monte Carlo",
          slug: "monte-carlo",
          difficulty: "moderate",
          lightDemand: "high",
          co2Demand: "required",
          placement: "carpet",
        },
      ],
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
    expect(evals[0]?.message).toContain("Monte Carlo");
  });

  test("light_fit_range triggers error when tank length is outside light range", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_004",
        name: "Light fit",
        severity: "error",
        categoriesInvolved: ["tank", "light"],
        conditionLogic: {
          type: "light_fit_range",
          tank_length_key: "length_in",
          light_min_key: "min_tank_length_in",
          light_max_key: "max_tank_length_in",
        },
        messageTemplate: "range {light_range} tank {tank_length}",
      },
    ];

    const s = snapshot({
      productsByCategory: {
        tank: product("tank", { length_in: 36 }),
        light: product("light", { min_tank_length_in: 24, max_tank_length_in: 30 }),
      },
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
    expect(evals[0]?.severity).toBe("error");
    expect(evals[0]?.message).toContain("36");
  });

  test("substrate_buffers_ph triggers when substrate buffers and plant phMin is high", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_005",
        name: "Substrate pH",
        severity: "recommendation",
        categoriesInvolved: ["substrate", "plants"],
        conditionLogic: {
          type: "substrate_buffers_ph",
          substrate_key: "buffers_ph",
          plant_ph_min_threshold: 7.0,
        },
        messageTemplate: "{substrate_name} vs {plant_name}",
      },
    ];

    const s = snapshot({
      productsByCategory: {
        substrate: product("substrate", { buffers_ph: true }, { name: "Active Soil" }),
      },
      plants: [
        {
          id: "p1",
          commonName: "Alkaline Plant",
          slug: "alkaline-plant",
          difficulty: "easy",
          lightDemand: "low",
          co2Demand: "none",
          placement: "midground",
          phMin: 7.2,
        },
      ],
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
    expect(evals[0]?.message).toContain("Active Soil");
  });

  test("heater_watts_per_gallon triggers when sizing is out of range", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_006",
        name: "Heater sizing",
        severity: "warning",
        categoriesInvolved: ["tank", "heater"],
        conditionLogic: {
          type: "heater_watts_per_gallon",
          tank_volume_key: "volume_gal",
          heater_wattage_key: "wattage",
          min_wpg: 3,
          max_wpg: 7,
        },
        messageTemplate: "wpg {wpg}",
      },
    ];

    const s = snapshot({
      productsByCategory: {
        tank: product("tank", { volume_gal: 10 }),
        heater: product("heater", { wattage: 15 }),
      },
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
    expect(evals[0]?.message).toContain("1.5");
  });

  test("shrimp_copper_check triggers when hasShrimp and fert has copper and not shrimp safe", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_007",
        name: "Shrimp copper",
        severity: "error",
        categoriesInvolved: ["fertilizer"],
        conditionLogic: { type: "shrimp_copper_check", requires_shrimp_flag: true },
        messageTemplate: "Copper is not ok",
      },
    ];

    const s = snapshot({
      flags: { hasShrimp: true },
      productsByCategory: {
        fertilizer: product("fertilizer", { copper_content: 0.1, shrimp_safe: false }),
      },
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
    expect(evals[0]?.severity).toBe("error");
  });

  test("carpet_needs_light_and_co2 triggers when carpet plant and missing CO2 or low PAR", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_008",
        name: "Carpet",
        severity: "recommendation",
        categoriesInvolved: ["plants", "light", "co2"],
        conditionLogic: { type: "carpet_needs_light_and_co2", carpet_value: "carpet", min_par: 80 },
        messageTemplate: "{plant_name} needs CO2",
      },
    ];

    const s = snapshot({
      productsByCategory: {
        light: product("light", { par_at_substrate: 100 }),
      },
      plants: [
        {
          id: "p1",
          commonName: "Monte Carlo",
          slug: "monte-carlo",
          difficulty: "moderate",
          lightDemand: "high",
          co2Demand: "required",
          placement: "carpet",
        },
      ],
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
    expect(evals[0]?.message).toContain("Monte Carlo");
  });

  test("stand_weight_capacity triggers when tank weight exceeds stand capacity", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_009",
        name: "Stand capacity",
        severity: "error",
        categoriesInvolved: ["tank", "stand"],
        conditionLogic: { type: "stand_weight_capacity", tank_weight_key: "filled_weight_lbs", stand_capacity_key: "weight_capacity_lbs" },
        messageTemplate: "{weight} > {capacity}",
      },
    ];

    const s = snapshot({
      productsByCategory: {
        tank: product("tank", { filled_weight_lbs: 200 }),
        stand: product("stand", { weight_capacity_lbs: 150 }),
      },
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
    expect(evals[0]?.message).toContain("200");
  });

  test("hardscape_raises_hardness triggers when hardscape raises hardness and plant prefers soft water (extra key)", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_010",
        name: "Hardscape hardness",
        severity: "recommendation",
        categoriesInvolved: ["hardscape", "plants"],
        conditionLogic: { type: "hardscape_raises_hardness", hardscape_key: "raises_gh", plant_soft_water_key: "prefers_soft_water" },
        messageTemplate: "Soft-water plant {plant_name}",
      },
    ];

    const s = snapshot({
      productsByCategory: {
        hardscape: product("hardscape", { raises_gh: true }),
      },
      plants: [
        {
          id: "p1",
          commonName: "Soft Plant",
          slug: "soft-plant",
          difficulty: "easy",
          lightDemand: "low",
          co2Demand: "none",
          placement: "midground",
          extra: { prefers_soft_water: true },
        },
      ],
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
    expect(evals[0]?.message).toContain("Soft Plant");
  });

  test("evaluations are sorted by severity order (error before warning before recommendation)", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "R_WARN",
        name: "warn",
        severity: "warning",
        categoriesInvolved: ["tank", "filter"],
        conditionLogic: { type: "turnover_range", tank_volume_key: "v", filter_flow_key: "f", min_turnover: 4, max_turnover: 15 },
        messageTemplate: "warn",
      },
      {
        code: "R_ERR",
        name: "err",
        severity: "error",
        categoriesInvolved: ["tank", "light"],
        conditionLogic: { type: "light_fit_range", tank_length_key: "l", light_min_key: "min", light_max_key: "max" },
        messageTemplate: "err",
      },
      {
        code: "R_REC",
        name: "rec",
        severity: "recommendation",
        categoriesInvolved: ["hardscape", "plants"],
        conditionLogic: { type: "hardscape_raises_hardness", hardscape_key: "raises", plant_soft_water_key: "soft" },
        messageTemplate: "rec",
      },
    ];

    const s = snapshot({
      productsByCategory: {
        tank: product("tank", { v: 10, l: 36 }),
        filter: product("filter", { f: 20 }),
        light: product("light", { min: 24, max: 30 }),
        hardscape: product("hardscape", { raises: true }),
      },
      plants: [
        {
          id: "p1",
          commonName: "P",
          slug: "p",
          difficulty: "easy",
          lightDemand: "low",
          co2Demand: "none",
          placement: "midground",
          extra: { soft: true },
        },
      ],
    });

    const evals = evaluateBuild(rules, s);
    expect(evals.map((e) => e.ruleCode)).toEqual(["R_ERR", "R_WARN", "R_REC"]);
  });
});

