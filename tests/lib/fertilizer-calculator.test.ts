import { describe, expect, it } from "vitest";

import {
  calculateFertilizerDosing,
  convertFertilizerVolume,
  formatFertilizerSchedule,
} from "@/lib/fertilizer-calculator";

describe("fertilizer calculator", () => {
  it("converts between gallons and liters", () => {
    expect(convertFertilizerVolume(40, "gal", "l")).toBeCloseTo(151.416, 3);
    expect(convertFertilizerVolume(151.416, "l", "gal")).toBeCloseTo(40, 3);
  });

  it("matches known 40 gallon EI dry dosing targets", () => {
    const result = calculateFertilizerDosing({
      volume: 40,
      volumeUnit: "gal",
      method: "ei",
    });

    const kno3 = result.doses.find((dose) => dose.key === "kno3");
    const kh2po4 = result.doses.find((dose) => dose.key === "kh2po4");
    const k2so4 = result.doses.find((dose) => dose.key === "k2so4");
    const traces = result.doses.find((dose) => dose.key === "csm-b");

    expect(kno3?.teaspoonsPerDose).toBeCloseTo(0.5, 6);
    expect(kh2po4?.teaspoonsPerDose).toBeCloseTo(0.125, 6);
    expect(k2so4?.teaspoonsPerDose).toBeCloseTo(0.25, 6);
    expect(traces?.teaspoonsPerDose).toBeCloseTo(0.125, 6);

    expect(kno3?.teaspoonsPerWeek).toBeCloseTo(1.5, 6);
    expect(kh2po4?.teaspoonsPerWeek).toBeCloseTo(0.375, 6);
    expect(k2so4?.teaspoonsPerWeek).toBeCloseTo(0.75, 6);
    expect(traces?.teaspoonsPerWeek).toBeCloseTo(0.375, 6);

    expect(result.schedule).toHaveLength(7);
    expect(result.schedule[0]?.focus).toContain("Macro");
    expect(result.schedule[1]?.focus).toContain("Trace");
    expect(result.schedule[6]?.doses).toHaveLength(0);
  });

  it("creates a daily all-in PPS-Pro schedule", () => {
    const result = calculateFertilizerDosing({
      volume: 40,
      volumeUnit: "gal",
      method: "pps-pro",
    });

    const kno3 = result.doses.find((dose) => dose.key === "kno3");
    const kh2po4 = result.doses.find((dose) => dose.key === "kh2po4");

    expect(kno3?.gramsPerDose).toBeCloseTo(0.2352, 4);
    expect(kh2po4?.gramsPerDose).toBeCloseTo(0.0212, 4);
    expect(result.schedule.every((entry) => entry.doses.length === 4)).toBe(true);
  });

  it("formats a copy-ready weekly schedule", () => {
    const result = calculateFertilizerDosing({
      volume: 40,
      volumeUnit: "gal",
      method: "ei",
    });

    const scheduleText = formatFertilizerSchedule(result);

    expect(scheduleText).toContain("Estimative Index (EI)");
    expect(scheduleText).toContain("Weekly totals:");
    expect(scheduleText).toContain("Monday");
    expect(scheduleText).toContain("Sunday");
  });
});
