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

  test("planting_density_min_species triggers when tank is > min volume and plant count is low", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_011",
        name: "Planting density",
        severity: "recommendation",
        categoriesInvolved: ["tank", "plants"],
        conditionLogic: {
          type: "planting_density_min_species",
          tank_volume_key: "volume_gal",
          min_tank_volume_gal: 10,
          min_species_count: 3,
        },
        messageTemplate: "count {plant_count} vol {tank_volume}",
      },
    ];

    const s = snapshot({
      productsByCategory: { tank: product("tank", { volume_gal: 20 }) },
      plants: [
        {
          id: "p1",
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
    expect(evals[0]?.message).toContain("1");
  });

  test("co2_inline_diffuser_with_canister triggers when both types match", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_012",
        name: "Inline diffuser + canister",
        severity: "recommendation",
        categoriesInvolved: ["co2", "filter"],
        conditionLogic: {
          type: "co2_inline_diffuser_with_canister",
          filter_type_key: "type",
          filter_type_value: "canister",
          co2_diffuser_type_key: "diffuser_type",
          co2_diffuser_type_value: "inline",
        },
        messageTemplate: "Nice",
      },
    ];

    const s = snapshot({
      productsByCategory: {
        filter: product("filter", { type: "canister" }),
        co2: product("co2", { diffuser_type: "inline" }),
      },
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
  });

  test("nano_tank_filter_type_warning triggers when nano tank uses canister filter type", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_013",
        name: "Nano + canister",
        severity: "warning",
        categoriesInvolved: ["tank", "filter"],
        conditionLogic: {
          type: "nano_tank_filter_type_warning",
          tank_volume_key: "volume_gal",
          max_tank_volume_gal: 5,
          filter_type_key: "type",
          filter_type_value: "canister",
        },
        messageTemplate: "Overkill",
      },
    ];

    const s = snapshot({
      productsByCategory: {
        tank: product("tank", { volume_gal: 5 }),
        filter: product("filter", { type: "canister" }),
      },
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
  });

  test("plant_temperature_overlap triggers when two plants have non-overlapping temp ranges", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_014",
        name: "Temp overlap",
        severity: "warning",
        categoriesInvolved: ["plants"],
        conditionLogic: { type: "plant_temperature_overlap" },
        messageTemplate: "{plant_a} {range_a} {plant_b} {range_b}",
      },
    ];

    const s = snapshot({
      plants: [
        {
          id: "p1",
          commonName: "Cold Plant",
          slug: "cold",
          difficulty: "easy",
          lightDemand: "low",
          co2Demand: "none",
          placement: "floating",
          tempMinF: 60,
          tempMaxF: 66,
        },
        {
          id: "p2",
          commonName: "Warm Plant",
          slug: "warm",
          difficulty: "easy",
          lightDemand: "low",
          co2Demand: "none",
          placement: "midground",
          tempMinF: 74,
          tempMaxF: 80,
        },
      ],
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
    expect(evals[0]?.message).toContain("Cold Plant");
    expect(evals[0]?.message).toContain("Warm Plant");
  });

  test("active_substrate_hard_water_plants triggers for hard-water plants on active buffering substrate", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_015",
        name: "Active substrate + hard water plants",
        severity: "recommendation",
        categoriesInvolved: ["substrate", "plants"],
        conditionLogic: {
          type: "active_substrate_hard_water_plants",
          substrate_type_key: "type",
          active_value: "active_buffering",
          plant_hard_water_key: "prefers_hard_water",
        },
        messageTemplate: "{plant_name}",
      },
    ];

    const s = snapshot({
      productsByCategory: {
        substrate: product("substrate", { type: "active_buffering" }),
      },
      plants: [
        {
          id: "p1",
          commonName: "Hard Water Plant",
          slug: "hard",
          difficulty: "easy",
          lightDemand: "low",
          co2Demand: "none",
          placement: "midground",
          extra: { prefers_hard_water: true },
        },
      ],
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
  });

  test("missing_category triggers completeness note when category is missing and plants exist", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_016",
        name: "Missing heater",
        severity: "completeness",
        categoriesInvolved: ["heater", "plants"],
        conditionLogic: {
          type: "missing_category",
          category_slug: "heater",
          requires_plants: true,
        },
        messageTemplate: "Missing heater",
      },
    ];

    const s = snapshot({
      plants: [
        {
          id: "p1",
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
    expect(evals[0]?.message).toContain("Missing heater");
  });

  test("inert_substrate_root_feeders triggers when inert substrate is paired with root feeders", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_017",
        name: "Root feeders on inert",
        severity: "recommendation",
        categoriesInvolved: ["substrate", "plants"],
        conditionLogic: {
          type: "inert_substrate_root_feeders",
          substrate_type_key: "type",
          inert_value: "inert",
          plant_root_feeder_key: "root_feeder",
        },
        messageTemplate: "{plant_name}",
      },
    ];

    const s = snapshot({
      productsByCategory: { substrate: product("substrate", { type: "inert" }) },
      plants: [
        {
          id: "p1",
          commonName: "Amazon Sword",
          slug: "amazon-sword",
          difficulty: "easy",
          lightDemand: "medium",
          co2Demand: "none",
          placement: "background",
          extra: { root_feeder: true },
        },
      ],
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
  });

  test("nano_turnover_max triggers when nano turnover exceeds threshold", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_018",
        name: "Nano turnover max",
        severity: "warning",
        categoriesInvolved: ["tank", "filter"],
        conditionLogic: {
          type: "nano_turnover_max",
          tank_volume_key: "volume_gal",
          filter_flow_key: "flow_rate_gph",
          max_tank_volume_gal: 5,
          max_turnover: 20,
        },
        messageTemplate: "{turnover}",
      },
    ];

    const s = snapshot({
      productsByCategory: {
        tank: product("tank", { volume_gal: 5 }),
        filter: product("filter", { flow_rate_gph: 200 }),
      },
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
    expect(evals[0]?.message).toContain("40");
  });

  test("high_par_without_co2 triggers when PAR is high and CO2 is missing", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_019",
        name: "High PAR no CO2",
        severity: "warning",
        categoriesInvolved: ["light", "co2"],
        conditionLogic: {
          type: "high_par_without_co2",
          light_par_key: "par_at_substrate",
          min_par: 100,
        },
        messageTemplate: "{par}",
      },
    ];

    const s = snapshot({
      productsByCategory: { light: product("light", { par_at_substrate: 140 }) },
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
    expect(evals[0]?.message).toContain("140");
  });

  test("mixed_light_demand triggers when low and high light plants are both selected", () => {
    const rules: CompatibilityRule[] = [
      {
        code: "RULE_020",
        name: "Mixed light demand",
        severity: "warning",
        categoriesInvolved: ["plants", "light"],
        conditionLogic: {
          type: "mixed_light_demand",
          requires_low: "low",
          requires_high: "high",
        },
        messageTemplate: "Mixed demands",
      },
    ];

    const s = snapshot({
      plants: [
        {
          id: "p1",
          commonName: "Java Fern",
          slug: "java-fern",
          difficulty: "easy",
          lightDemand: "low",
          co2Demand: "none",
          placement: "epiphyte",
        },
        {
          id: "p2",
          commonName: "Rotala",
          slug: "rotala",
          difficulty: "moderate",
          lightDemand: "high",
          co2Demand: "beneficial",
          placement: "background",
        },
      ],
    });

    const evals = evaluateBuild(rules, s);
    expect(evals).toHaveLength(1);
  });

  test("evaluations are sorted by severity order (error before warning before recommendation)", () => {
    // (Remaining rule-type tests are above; keep this at the end.)
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
