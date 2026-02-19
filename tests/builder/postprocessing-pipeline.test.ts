import { describe, expect, it } from "vitest";

import { resolveScenePostprocessingPipeline } from "@/components/builder/visual/postprocessing";

describe("scene postprocessing pipeline", () => {
  it("disables postprocessing when globally toggled off", () => {
    expect(
      resolveScenePostprocessingPipeline({
        enabled: false,
        qualityTier: "high",
      }),
    ).toBe("off");
  });

  it("disables postprocessing on low quality", () => {
    expect(
      resolveScenePostprocessingPipeline({
        enabled: true,
        qualityTier: "low",
      }),
    ).toBe("off");
  });

  it("uses bloom-only on medium quality", () => {
    expect(
      resolveScenePostprocessingPipeline({
        enabled: true,
        qualityTier: "medium",
      }),
    ).toBe("bloom");
  });

  it("uses the full postprocessing stack on high quality", () => {
    expect(
      resolveScenePostprocessingPipeline({
        enabled: true,
        qualityTier: "high",
      }),
    ).toBe("full");
  });
});
