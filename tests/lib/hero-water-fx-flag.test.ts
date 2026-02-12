import { describe, expect, it } from "vitest";

import { isHeroWaterFxV2Enabled, isTruthyFlag } from "@/components/home/water-fx/feature-flag";

describe("hero water fx v2 flag resolution", () => {
  it("treats truthy env values as enabled", () => {
    expect(isTruthyFlag("1")).toBe(true);
    expect(isTruthyFlag("true")).toBe(true);
    expect(isTruthyFlag("yes")).toBe(true);
    expect(isTruthyFlag("on")).toBe(true);
    expect(isTruthyFlag("false")).toBe(false);
    expect(isTruthyFlag(undefined)).toBe(false);
  });

  it("enables preview mode from query param regardless of env", () => {
    expect(
      isHeroWaterFxV2Enabled({
        searchParams: { fx: "water-v2" },
        envFlag: "false",
      }),
    ).toBe(true);
  });

  it("allows explicit query override to disable", () => {
    expect(
      isHeroWaterFxV2Enabled({
        searchParams: { fx: "off" },
        envFlag: "true",
      }),
    ).toBe(false);
  });

  it("falls back to env flag when query preview is absent", () => {
    expect(
      isHeroWaterFxV2Enabled({
        searchParams: {},
        envFlag: "1",
      }),
    ).toBe(true);

    expect(
      isHeroWaterFxV2Enabled({
        searchParams: {},
        envFlag: "0",
      }),
    ).toBe(false);
  });
});

