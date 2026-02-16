import type {
  SubstrateHeightfield,
  VisualSubstrateProfile,
} from "@/components/builder/visual/types";
import {
  createFlatSubstrateHeightfield,
  legacySubstrateProfileToHeightfield,
  normalizeSubstrateHeightfield,
} from "@/lib/visual/substrate";

export type PersistedVisualCanvasCandidate = {
  heightIn?: number;
  substrateHeightfield?: unknown;
  substrateProfile?: Partial<VisualSubstrateProfile>;
};

export function migratePersistedSubstrateHeightfield(
  candidateCanvas: PersistedVisualCanvasCandidate,
  fallbackHeightIn: number,
): SubstrateHeightfield {
  const heightIn =
    typeof candidateCanvas.heightIn === "number" && Number.isFinite(candidateCanvas.heightIn)
      ? Math.max(1, candidateCanvas.heightIn)
      : Math.max(1, fallbackHeightIn);

  if (candidateCanvas.substrateHeightfield != null) {
    return normalizeSubstrateHeightfield(candidateCanvas.substrateHeightfield, heightIn);
  }

  if (candidateCanvas.substrateProfile) {
    return legacySubstrateProfileToHeightfield({
      profile: candidateCanvas.substrateProfile,
      tankHeightIn: heightIn,
    });
  }

  return createFlatSubstrateHeightfield({ tankHeightIn: heightIn });
}
