import { describe, expect, it } from "vitest";

import {
  comparisonToneClass,
  normalizePlantCompareSlugs,
  rankDemand,
  rankDifficulty,
  rankGrowth,
  resolveRelativeComparisonTone,
  serializePlantCompareSlugs,
  titleWords,
} from "@/lib/plants/compare";

describe("plant comparison helpers", () => {
  it("normalizes comparison slug params and limits to 4 unique values", () => {
    const normalized = normalizePlantCompareSlugs(
      "anubias-nana,java-fern,rotala-rotundifolia,monte-carlo,crypt-wendtii,java-fern",
    );

    expect(normalized).toEqual([
      "anubias-nana",
      "java-fern",
      "rotala-rotundifolia",
      "monte-carlo",
    ]);
    expect(serializePlantCompareSlugs(normalized)).toBe(
      "anubias-nana,java-fern,rotala-rotundifolia,monte-carlo",
    );
  });

  it("ranks difficulty and demand levels with lower values being easier", () => {
    expect(rankDifficulty("easy")).toBeLessThan(rankDifficulty("hard") ?? 0);
    expect(rankDemand("low")).toBeLessThan(rankDemand("required") ?? 0);
    expect(rankGrowth("slow")).toBeLessThan(rankGrowth("fast") ?? 0);
  });

  it("resolves easier vs harder tones and maps style classes", () => {
    const allRanks = [1, 2, 3];

    expect(
      resolveRelativeComparisonTone({
        rank: 1,
        allRanks,
        lowerIsEasier: true,
      }),
    ).toBe("easier");

    expect(
      resolveRelativeComparisonTone({
        rank: 3,
        allRanks,
        lowerIsEasier: true,
      }),
    ).toBe("harder");

    expect(
      resolveRelativeComparisonTone({
        rank: 2,
        allRanks,
        lowerIsEasier: true,
      }),
    ).toBe("neutral");

    expect(comparisonToneClass("easier")).toContain("emerald");
    expect(comparisonToneClass("harder")).toContain("rose");
    expect(comparisonToneClass("neutral")).toContain("neutral");
  });

  it("formats tokenized values into title case labels", () => {
    expect(titleWords("co2_required")).toBe("Co2 Required");
    expect(titleWords(null)).toBe("—");
  });
});
