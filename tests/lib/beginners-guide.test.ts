import { describe, expect, it } from "vitest";

import {
  BEGINNER_FIRST_PLANTS_LINK,
  BEGINNER_GUIDE_ESSENTIAL_EQUIPMENT,
  BEGINNER_GUIDE_FIRST_MONTH_SCHEDULE,
  BEGINNER_GUIDE_NITROGEN_CYCLE,
  BEGINNER_GUIDE_QUICK_LINKS,
  BEGINNER_GUIDE_SECTION_ORDER,
  BEGINNER_GUIDE_SETUP_STEPS,
} from "@/lib/guides/beginners-guide";

describe("beginners guide content", () => {
  it("keeps the required beginner guide section order", () => {
    expect(BEGINNER_GUIDE_SECTION_ORDER).toEqual([
      "what-is-a-planted-tank",
      "essential-equipment",
      "choosing-your-first-plants",
      "setting-up-the-tank",
      "the-nitrogen-cycle",
      "first-month-care-schedule",
    ]);

    expect(BEGINNER_GUIDE_QUICK_LINKS.map((item) => item.id)).toEqual(
      BEGINNER_GUIDE_SECTION_ORDER,
    );
  });

  it("links essential equipment cards to internal product categories", () => {
    expect(BEGINNER_GUIDE_ESSENTIAL_EQUIPMENT).toHaveLength(6);

    for (const equipment of BEGINNER_GUIDE_ESSENTIAL_EQUIPMENT) {
      expect(equipment.href.startsWith("/products/")).toBe(true);
      expect(equipment.label.length).toBeGreaterThan(2);
      expect(equipment.description.length).toBeGreaterThan(20);
    }
  });

  it("provides actionable setup resources and first month schedule links", () => {
    expect(BEGINNER_GUIDE_SETUP_STEPS).toHaveLength(4);
    expect(BEGINNER_GUIDE_FIRST_MONTH_SCHEDULE).toHaveLength(4);

    const resourceHrefs = new Set<string>();

    for (const step of BEGINNER_GUIDE_SETUP_STEPS) {
      expect(step.step).toBeGreaterThan(0);
      for (const resource of step.resources ?? []) {
        resourceHrefs.add(resource.href);
      }
    }

    for (const week of BEGINNER_GUIDE_FIRST_MONTH_SCHEDULE) {
      expect(week.week).toBeGreaterThan(0);
      expect(week.checklist.length).toBeGreaterThanOrEqual(3);
      for (const resource of week.resources) {
        resourceHrefs.add(resource.href);
      }
    }

    expect(resourceHrefs.has("/builder")).toBe(true);
    expect(resourceHrefs.has("/tools/substrate-calculator")).toBe(true);
    expect(resourceHrefs.has("/tools/stocking-calculator")).toBe(true);
    expect(BEGINNER_FIRST_PLANTS_LINK).toContain("difficulty=easy");
  });

  it("covers the three major nitrogen cycle phases", () => {
    expect(BEGINNER_GUIDE_NITROGEN_CYCLE.map((stage) => stage.id)).toEqual([
      "ammonia",
      "nitrite",
      "nitrate",
    ]);
  });
});
