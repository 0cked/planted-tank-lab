export type SceneQualityTier = "high" | "medium" | "low";

export type ScenePostprocessingPipeline = "off" | "bloom" | "full";

export const BLOOM_LUMINANCE_THRESHOLD = 0.8;
export const BLOOM_LUMINANCE_SMOOTHING = 0.42;
export const BLOOM_INTENSITY = 0.3;

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
