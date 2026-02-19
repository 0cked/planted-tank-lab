import { describe, expect, it } from "vitest";

import { GLOSSARY_LETTERS, GLOSSARY_TERMS } from "@/lib/guides/glossary";

describe("glossary guide content", () => {
  it("keeps glossary size within the required range", () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(40);
    expect(GLOSSARY_TERMS.length).toBeLessThanOrEqual(50);
  });

  it("includes required planted tank terms", () => {
    const terms = new Set(GLOSSARY_TERMS.map((entry) => entry.term));

    expect(terms.has("PAR (Photosynthetically Active Radiation)")).toBe(true);
    expect(terms.has("Photoperiod")).toBe(true);
    expect(terms.has("KH (Carbonate Hardness)")).toBe(true);
    expect(terms.has("GH (General Hardness)")).toBe(true);
    expect(terms.has("TDS (Total Dissolved Solids)")).toBe(true);
    expect(terms.has("EI Dosing (Estimative Index)")).toBe(true);
    expect(terms.has("Dry Start Method (DSM)")).toBe(true);
    expect(terms.has("Carpet Plant")).toBe(true);
    expect(terms.has("Rhizome")).toBe(true);
    expect(terms.has("Runner")).toBe(true);
    expect(terms.has("Emersed Growth")).toBe(true);
    expect(terms.has("Submersed Growth")).toBe(true);
    expect(terms.has("BBA (Black Beard Algae)")).toBe(true);
    expect(terms.has("GSA (Green Spot Algae)")).toBe(true);
    expect(terms.has("GDA (Green Dust Algae)")).toBe(true);
    expect(terms.has("Staghorn Algae")).toBe(true);
  });

  it("remains alphabetized and maps letters correctly", () => {
    const sortedTerms = [...GLOSSARY_TERMS]
      .map((entry) => entry.term)
      .sort((a, b) => a.localeCompare(b));

    expect(GLOSSARY_TERMS.map((entry) => entry.term)).toEqual(sortedTerms);

    for (const entry of GLOSSARY_TERMS) {
      expect(entry.letter).toBe(entry.term.match(/[A-Za-z]/)?.[0]?.toUpperCase() ?? "#");
      expect(GLOSSARY_LETTERS.includes(entry.letter)).toBe(true);
    }
  });

  it("uses internal links only for glossary references", () => {
    for (const entry of GLOSSARY_TERMS) {
      for (const link of entry.links) {
        expect(link.href.startsWith("/")).toBe(true);
      }
    }
  });
});
