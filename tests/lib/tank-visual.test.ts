import { describe, expect, it } from "vitest";

import {
  buildTankIllustrationUrl,
  getTankVisualDimensions,
  tankModelFromSlug,
} from "@/lib/tank-visual";

describe("tank visual helpers", () => {
  it("extracts tank dimensions from specs", () => {
    const dims = getTankVisualDimensions({
      length_in: 23.62,
      width_in: 14.17,
      height_in: 14.17,
    });

    expect(dims).toEqual({
      lengthIn: 23.62,
      widthIn: 14.17,
      heightIn: 14.17,
    });
  });

  it("builds deterministic illustration URL", () => {
    const url = buildTankIllustrationUrl({
      lengthIn: 47.24,
      widthIn: 23.62,
      heightIn: 17.72,
      label: "120M",
    });

    expect(url).toBe(
      "/api/tank-illustration?l=47.24&w=23.62&h=17.72&label=120M",
    );
  });

  it("parses UNS model from slug", () => {
    expect(tankModelFromSlug("uns-60u")).toBe("60U");
    expect(tankModelFromSlug("uns-120ss")).toBe("120SS");
    expect(tankModelFromSlug("  ")).toBeNull();
  });
});

