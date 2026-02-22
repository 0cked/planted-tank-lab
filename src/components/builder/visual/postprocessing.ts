export type SceneQualityTier = "high" | "medium" | "low";

export type ScenePostprocessingPipeline = "off" | "bloom" | "full";

export const BLOOM_LUMINANCE_THRESHOLD = 0.88;
export const BLOOM_LUMINANCE_SMOOTHING = 0.26;
export const BLOOM_INTENSITY = 0.18;

export function resolveScenePostprocessingPipeline(params: {
  enabled: boolean;
  qualityTier: SceneQualityTier;
}): ScenePostprocessingPipeline {
  if (!params.enabled || params.qualityTier === "low") {
    return "off";
  }

  if (params.qualityTier === "medium") {
    return "bloom";
  }

  return "full";
}
