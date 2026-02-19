import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { BuilderSceneStep } from "@/components/builder/visual/VisualBuilderScene";

type CameraDiagnosticEvent = {
  type: "unexpected_pose_delta_detected";
  step: BuilderSceneStep;
  positionDelta: number;
  targetDelta: number;
};

type CameraIntentType = "reframe" | "reset";

type CameraDiagnosticsState = {
  unexpectedPoseDeltas: number;
  lastStep: BuilderSceneStep | null;
  intentCount: number;
  lastIntent: CameraIntentType | null;
  lastIntentStep: BuilderSceneStep | null;
  interactionStarts: number;
  freeStepTransitions: number;
  restoreChecks: number;
  lastPoseDelta: {
    step: BuilderSceneStep;
    positionDelta: number;
    targetDelta: number;
  } | null;
};

type CameraScenarioStatus = {
  s01: "pass-ready" | "fail-risk" | "pending";
  s02: "pass-ready" | "fail-risk" | "pending";
  s03: "pass-ready" | "pending";
};

type CameraEvidenceSummary = {
  step: BuilderSceneStep;
  mode: "step" | "free";
  s01: CameraScenarioStatus["s01"];
  s02: CameraScenarioStatus["s02"];
  s03: CameraScenarioStatus["s03"];
  unexpectedPoseDeltas: number;
  intentCount: number;
  lastIntent: string;
  lastPoseDelta: string;
};

type UseCameraEvidenceParams = {
  currentStep: BuilderSceneStep;
  cameraMode: "step" | "free";
};

const INITIAL_DIAGNOSTICS_STATE: CameraDiagnosticsState = {
  unexpectedPoseDeltas: 0,
  lastStep: null,
  intentCount: 0,
  lastIntent: null,
  lastIntentStep: null,
  interactionStarts: 0,
  freeStepTransitions: 0,
  restoreChecks: 0,
  lastPoseDelta: null,
};

export function useCameraEvidence(params: UseCameraEvidenceParams) {
  const isDevelopment = process.env.NODE_ENV === "development";

  const [cameraDiagnostics, setCameraDiagnostics] =
    useState<CameraDiagnosticsState>(INITIAL_DIAGNOSTICS_STATE);
  const [cameraEvidenceCopyStatus, setCameraEvidenceCopyStatus] =
    useState<"idle" | "copied" | "error">("idle");
  const [showExpandedCameraEvidence, setShowExpandedCameraEvidence] = useState(false);

  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cameraScenarioStatus = useMemo<CameraScenarioStatus>(() => {
    if (!isDevelopment) {
      return {
        s01: "pending",
        s02: "pending",
        s03: "pending",
      };
    }

    return {
      s01:
        cameraDiagnostics.interactionStarts >= 1 && cameraDiagnostics.unexpectedPoseDeltas === 0
          ? "pass-ready"
          : cameraDiagnostics.unexpectedPoseDeltas > 0
            ? "fail-risk"
            : "pending",
      s02:
        cameraDiagnostics.freeStepTransitions >= 2 && cameraDiagnostics.unexpectedPoseDeltas === 0
          ? "pass-ready"
          : cameraDiagnostics.unexpectedPoseDeltas > 0
            ? "fail-risk"
            : "pending",
      s03: cameraDiagnostics.restoreChecks > 0 ? "pass-ready" : "pending",
    };
  }, [cameraDiagnostics, isDevelopment]);

  const cameraEvidenceCapturedAtIso = new Date().toISOString();

  const cameraEvidenceCapturedAtLabel = useMemo(
    () =>
      new Date(cameraEvidenceCapturedAtIso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      }),
    [cameraEvidenceCapturedAtIso],
  );

  const cameraEvidenceSnapshot = useMemo(
    () =>
      JSON.stringify(
        {
          schema: "ptl.camera-gate-evidence",
          schemaVersion: 1,
          capturedAt: cameraEvidenceCapturedAtIso,
          step: params.currentStep,
          cameraMode: params.cameraMode,
          scenarioStatus: {
            s01: cameraScenarioStatus.s01,
            s02: cameraScenarioStatus.s02,
            s03: cameraScenarioStatus.s03,
          },
          counters: {
            interactionStarts: cameraDiagnostics.interactionStarts,
            freeStepTransitions: cameraDiagnostics.freeStepTransitions,
            restoreChecks: cameraDiagnostics.restoreChecks,
            intentCount: cameraDiagnostics.intentCount,
            unexpectedPoseDeltas: cameraDiagnostics.unexpectedPoseDeltas,
          },
          lastIntent: cameraDiagnostics.lastIntent
            ? {
                type: cameraDiagnostics.lastIntent,
                step: cameraDiagnostics.lastIntentStep,
              }
            : null,
          lastPoseDelta: cameraDiagnostics.lastPoseDelta
            ? {
                step: cameraDiagnostics.lastPoseDelta.step,
                positionDelta: cameraDiagnostics.lastPoseDelta.positionDelta,
                targetDelta: cameraDiagnostics.lastPoseDelta.targetDelta,
              }
            : null,
        },
        null,
        2,
      ),
    [
      cameraDiagnostics,
      cameraEvidenceCapturedAtIso,
      cameraScenarioStatus,
      params.cameraMode,
      params.currentStep,
    ],
  );

  const cameraEvidenceSummary = useMemo<CameraEvidenceSummary>(
    () => ({
      step: params.currentStep,
      mode: params.cameraMode,
      s01: cameraScenarioStatus.s01,
      s02: cameraScenarioStatus.s02,
      s03: cameraScenarioStatus.s03,
      unexpectedPoseDeltas: cameraDiagnostics.unexpectedPoseDeltas,
      intentCount: cameraDiagnostics.intentCount,
      lastIntent: cameraDiagnostics.lastIntent
        ? `${cameraDiagnostics.lastIntent} (${cameraDiagnostics.lastIntentStep ?? "unknown"})`
        : "none",
      lastPoseDelta: cameraDiagnostics.lastPoseDelta
        ? `${cameraDiagnostics.lastPoseDelta.step} · pos ${cameraDiagnostics.lastPoseDelta.positionDelta.toFixed(2)} · target ${cameraDiagnostics.lastPoseDelta.targetDelta.toFixed(2)}`
        : "none",
    }),
    [cameraDiagnostics, cameraScenarioStatus, params.cameraMode, params.currentStep],
  );

  const recordStepTransition = useCallback(
    (nextStep: BuilderSceneStep) => {
      if (!isDevelopment) return;
      if (nextStep === params.currentStep) return;
      if (params.cameraMode !== "free") return;

      setCameraDiagnostics((previous) => ({
        ...previous,
        freeStepTransitions: previous.freeStepTransitions + 1,
      }));
    },
    [isDevelopment, params.cameraMode, params.currentStep],
  );

  const recordIntent = useCallback(
    (intent: CameraIntentType) => {
      if (!isDevelopment) return;
      setCameraDiagnostics((previous) => ({
        ...previous,
        intentCount: previous.intentCount + 1,
        lastIntent: intent,
        lastIntentStep: params.currentStep,
      }));
    },
    [isDevelopment, params.currentStep],
  );

  const recordInteractionStart = useCallback(() => {
    if (!isDevelopment) return;
    setCameraDiagnostics((previous) => ({
      ...previous,
      interactionStarts: previous.interactionStarts + 1,
    }));
  }, [isDevelopment]);

  const recordUnexpectedPoseDelta = useCallback(
    (event: CameraDiagnosticEvent) => {
      if (!isDevelopment) return;
      if (event.type !== "unexpected_pose_delta_detected") return;

      setCameraDiagnostics((previous) => ({
        ...previous,
        unexpectedPoseDeltas: previous.unexpectedPoseDeltas + 1,
        lastStep: event.step,
        lastPoseDelta: {
          step: event.step,
          positionDelta: event.positionDelta,
          targetDelta: event.targetDelta,
        },
      }));
    },
    [isDevelopment],
  );

  const markRestoreCheckVerified = useCallback(() => {
    if (!isDevelopment) return;

    setCameraDiagnostics((previous) => ({
      ...previous,
      restoreChecks: previous.restoreChecks + 1,
    }));
  }, [isDevelopment]);

  const resetCameraChecks = useCallback(() => {
    if (!isDevelopment) return;

    setCameraDiagnostics((previous) => ({
      ...previous,
      unexpectedPoseDeltas: 0,
      lastStep: null,
      interactionStarts: 0,
      freeStepTransitions: 0,
      restoreChecks: 0,
      lastPoseDelta: null,
    }));
  }, [isDevelopment]);

  const copyCameraEvidenceSnapshot = useCallback(async () => {
    if (!isDevelopment || typeof navigator === "undefined" || !navigator.clipboard) {
      setCameraEvidenceCopyStatus("error");
      return;
    }

    try {
      await navigator.clipboard.writeText(cameraEvidenceSnapshot);
      setCameraEvidenceCopyStatus("copied");
    } catch {
      setCameraEvidenceCopyStatus("error");
    }
  }, [cameraEvidenceSnapshot, isDevelopment]);

  useEffect(() => {
    if (cameraEvidenceCopyStatus === "idle") {
      return;
    }

    if (copyResetTimerRef.current) {
      clearTimeout(copyResetTimerRef.current);
    }

    copyResetTimerRef.current = setTimeout(() => {
      setCameraEvidenceCopyStatus("idle");
      copyResetTimerRef.current = null;
    }, 2200);

    return () => {
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
        copyResetTimerRef.current = null;
      }
    };
  }, [cameraEvidenceCopyStatus]);

  return {
    isDevelopment,
    cameraDiagnostics,
    cameraScenarioStatus,
    cameraEvidenceCapturedAtLabel,
    cameraEvidenceSnapshot,
    cameraEvidenceSummary,
    cameraEvidenceCopyStatus,
    showExpandedCameraEvidence,
    setShowExpandedCameraEvidence,
    copyCameraEvidenceSnapshot,
    recordStepTransition,
    recordIntent,
    recordInteractionStart,
    recordUnexpectedPoseDelta,
    markRestoreCheckVerified,
    resetCameraChecks,
  };
}

export type {
  CameraDiagnosticEvent,
  CameraDiagnosticsState,
  CameraEvidenceSummary,
  CameraIntentType,
  CameraScenarioStatus,
};
