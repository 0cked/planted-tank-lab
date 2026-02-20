import { describe, expect, it } from "vitest";

import {
  depthZoneFromPlacementPreference,
  depthZoneFromZ,
} from "@/components/builder/visual/scene-utils";

describe("depth zone helpers", () => {
  it("maps normalized z to depth zones", () => {
    expect(depthZoneFromZ(0)).toBe("foreground");
    expect(depthZoneFromZ(0.33)).toBe("foreground");
    expect(depthZoneFromZ(0.5)).toBe("midground");
    expect(depthZoneFromZ(0.66)).toBe("midground");
    expect(depthZoneFromZ(0.67)).toBe("background");
    expect(depthZoneFromZ(1)).toBe("background");
  });

  it("maps placement preferences to supported depth zones", () => {
    expect(depthZoneFromPlacementPreference("foreground")).toBe("foreground");
    expect(depthZoneFromPlacementPreference("midground")).toBe("midground");
    expect(depthZoneFromPlacementPreference("background")).toBe("background");
    expect(depthZoneFromPlacementPreference("floating")).toBeNull();
    expect(depthZoneFromPlacementPreference("hardscape")).toBeNull();
    expect(depthZoneFromPlacementPreference("any")).toBeNull();
    expect(depthZoneFromPlacementPreference(null)).toBeNull();
  });
});
