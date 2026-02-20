import { describe, expect, it } from "vitest";

import {
  glossaryLetter,
  glossaryLetterId,
  glossaryTermId,
  GLOSSARY_ALPHABET,
  PLANTED_TANK_GLOSSARY,
} from "@/lib/guides/glossary";

describe("glossary guide content", () => {
  it("includes a full glossary set with required core terms", () => {
    expect(PLANTED_TANK_GLOSSARY.length).toBeGreaterThanOrEqual(40);
    expect(PLANTED_TANK_GLOSSARY.length).toBeLessThanOrEqual(50);

    const terms = new Set(PLANTED_TANK_GLOSSARY.map((entry) => entry.term.toLowerCase()));
    expect(terms.has("par")).toBe(true);
    expect(terms.has("photoperiod")).toBe(true);
    expect(terms.has("kh (carbonate hardness)")).toBe(true);
    expect(terms.has("gh (general hardness)")).toBe(true);
    expect(terms.has("tds (total dissolved solids)")).toBe(true);
    expect(terms.has("ei dosing")).toBe(true);
    expect(terms.has("dry start method")).toBe(true);
    expect(terms.has("carpet plant")).toBe(true);
    expect(terms.has("rhizome")).toBe(true);
    expect(terms.has("runner")).toBe(true);
    expect(terms.has("emersed growth")).toBe(true);
    expect(terms.has("submersed growth")).toBe(true);
    expect(terms.has("bba (black beard algae)")).toBe(true);
    expect(terms.has("gsa (green spot algae)")).toBe(true);
    expect(terms.has("gda (green dust algae)")).toBe(true);
    expect(terms.has("staghorn algae")).toBe(true);
  });

  it("provides deterministic anchors and alphabetical grouping support", () => {
    expect(glossaryTermId("BBA (Black Beard Algae)")).toBe("term-bba-black-beard-algae");
    expect(glossaryTermId("  KH (Carbonate Hardness) ")).toBe("term-kh-carbonate-hardness");
    expect(glossaryLetter("CO2 drop checker")).toBe("C");
    expect(glossaryLetter("  rhizome")).toBe("R");
    expect(glossaryLetterId("A")).toBe("letter-a");
    expect(glossaryLetterId("Z")).toBe("letter-z");
    expect(GLOSSARY_ALPHABET).toHaveLength(26);
  });

  it("contains internal links to tools and guides for contextual terms", () => {
    const linkedTerms = PLANTED_TANK_GLOSSARY.flatMap((entry) =>
      (entry.links ?? []).map((link) => ({ term: entry.term, href: link.href })),
    );

    expect(linkedTerms.length).toBeGreaterThan(10);
    for (const linkedTerm of linkedTerms) {
      expect(linkedTerm.href.startsWith("/")).toBe(true);
    }

    const linkedPaths = new Set(linkedTerms.map((item) => item.href));
    expect(linkedPaths.has("/tools/lighting-calculator")).toBe(true);
    expect(linkedPaths.has("/tools/co2-calculator")).toBe(true);
    expect(linkedPaths.has("/tools/fertilizer-calculator")).toBe(true);
    expect(linkedPaths.has("/tools/stocking-calculator")).toBe(true);
    expect(linkedPaths.has("/guides/plant-placement")).toBe(true);
    expect(linkedPaths.has("/guides/aquascaping-styles#iwagumi")).toBe(true);
  });
});
