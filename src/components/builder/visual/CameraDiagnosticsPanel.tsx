import type {
  BuilderSceneQualityTier,
  BuilderSceneToolMode,
} from "@/components/builder/visual/VisualBuilderScene";
import type {
  CameraDiagnosticsState,
  CameraEvidenceSummary,
  CameraScenarioStatus,
} from "@/hooks/useCameraEvidence";

type CameraDiagnosticsPanelProps = {
  sceneObjectCount: number;
  hardscapeCount: number;
  plantCount: number;
  qualityTier: BuilderSceneQualityTier;
  substrateContour: {
    frontTopPct: number;
    moundTopPct: number;
  };
  toolMode: BuilderSceneToolMode;
  hoveredItemId: string | null;
  cameraMode: "step" | "free";
  diagnostics: CameraDiagnosticsState;
  scenarioStatus: CameraScenarioStatus;
  evidenceCapturedAtLabel: string;
  evidenceSummary: CameraEvidenceSummary;
  evidenceSnapshot: string;
  showExpandedEvidence: boolean;
  copyStatus: "idle" | "copied" | "error";
  onToggleExpandedEvidence: () => void;
  onCopyEvidenceSnapshot: () => void;
  onMarkRestoreCheckVerified: () => void;
  onResetCameraChecks: () => void;
};

function ScenarioBadge(props: { status: "pass-ready" | "fail-risk" | "pending" }) {
  if (props.status === "pass-ready") {
    return (
      <span className="rounded-full border border-emerald-300/40 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
        Pass-ready
      </span>
    );
  }

  if (props.status === "fail-risk") {
    return (
      <span className="rounded-full border border-rose-300/40 bg-rose-400/20 px-2 py-0.5 text-[10px] font-semibold text-rose-100">
        Fail-risk
      </span>
    );
  }

  return (
    <span className="rounded-full border border-white/25 bg-slate-800/65 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
      Pending
    </span>
  );
}

export function CameraDiagnosticsPanel(props: CameraDiagnosticsPanelProps) {
  return (
    <section className="mt-4 rounded-2xl border border-white/15 bg-slate-900/50 p-3 text-xs text-slate-300">
      <div className="font-semibold text-slate-100">Scene diagnostics</div>
      <div className="mt-1 text-[11px] text-slate-400">
        Free camera preserves your pose across step changes; Step-owned camera auto-frames on step change.
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          Objects: <span className="font-semibold text-slate-100">{props.sceneObjectCount}</span>
        </div>
        <div>
          Hardscape: <span className="font-semibold text-slate-100">{props.hardscapeCount}</span>
        </div>
        <div>
          Plants: <span className="font-semibold text-slate-100">{props.plantCount}</span>
        </div>
        <div>
          Quality: <span className="font-semibold text-slate-100">{props.qualityTier}</span>
        </div>
        <div>
          Substrate front top: <span className="font-semibold text-slate-100">{props.substrateContour.frontTopPct.toFixed(1)}%</span>
        </div>
        <div>
          Substrate mound top: <span className="font-semibold text-slate-100">{props.substrateContour.moundTopPct.toFixed(1)}%</span>
        </div>
        <div>
          Tool mode: <span className="font-semibold text-slate-100">{props.toolMode}</span>
        </div>
        <div>
          Hovered: <span className="font-semibold text-slate-100">{props.hoveredItemId ?? "—"}</span>
        </div>
        <div>
          Camera mode: <span className="font-semibold text-slate-100">{props.cameraMode}</span>
        </div>
        <div>
          Unexpected pose deltas: <span className="font-semibold text-slate-100">{props.diagnostics.unexpectedPoseDeltas}</span>
          {props.diagnostics.lastStep ? (
            <span className="text-slate-400"> ({props.diagnostics.lastStep})</span>
          ) : null}
        </div>
        <div>
          Camera intents: <span className="font-semibold text-slate-100">{props.diagnostics.intentCount}</span>
          {props.diagnostics.lastIntent ? (
            <span className="text-slate-400"> (last: {props.diagnostics.lastIntent})</span>
          ) : null}
        </div>
        <div>
          Free-step transitions: <span className="font-semibold text-slate-100">{props.diagnostics.freeStepTransitions}</span>
        </div>
        <div>
          Interaction starts: <span className="font-semibold text-slate-100">{props.diagnostics.interactionStarts}</span>
        </div>
        <div>
          Restore checks: <span className="font-semibold text-slate-100">{props.diagnostics.restoreChecks}</span>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/15 bg-slate-950/45 p-2.5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
          Camera validation helpers (S01-S03)
        </div>

        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-white/15 bg-slate-900/50 p-2 text-[11px] text-slate-300">
            <div className="font-semibold text-slate-100">Last camera intent</div>
            <div className="mt-1">
              {props.diagnostics.lastIntent
                ? `${props.diagnostics.lastIntent} (${props.diagnostics.lastIntentStep ?? "unknown step"})`
                : "No intent command yet"}
            </div>
          </div>

          <div className="rounded-lg border border-white/15 bg-slate-900/50 p-2 text-[11px] text-slate-300">
            <div className="font-semibold text-slate-100">Last pose-delta event</div>
            <div className="mt-1">
              {props.diagnostics.lastPoseDelta
                ? `${props.diagnostics.lastPoseDelta.step} · pos ${props.diagnostics.lastPoseDelta.positionDelta.toFixed(2)} · target ${props.diagnostics.lastPoseDelta.targetDelta.toFixed(2)}`
                : "None detected"}
            </div>
          </div>
        </div>

        <div className="mb-2 rounded-lg border border-white/10 bg-slate-950/40 p-2 text-[10px] text-slate-300">
          <span className="font-semibold text-slate-100">Badge legend:</span> Pass-ready = evidence complete,
          Fail-risk = unexpected camera behavior detected, Pending = gather more checks.
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-white/15 bg-slate-900/50 p-2">
            <div className="text-[11px] font-semibold text-slate-100">S01 Orbit/Pan/Zoom stability</div>
            <div className="mt-1">
              <ScenarioBadge status={props.scenarioStatus.s01} />
            </div>
          </div>

          <div className="rounded-lg border border-white/15 bg-slate-900/50 p-2">
            <div className="text-[11px] font-semibold text-slate-100">S02 Step transition stability</div>
            <div className="mt-1">
              <ScenarioBadge status={props.scenarioStatus.s02} />
            </div>
          </div>

          <div className="rounded-lg border border-white/15 bg-slate-900/50 p-2">
            <div className="text-[11px] font-semibold text-slate-100">S03 Save/reload persistence</div>
            <div className="mt-1">
              <ScenarioBadge status={props.scenarioStatus.s03} />
            </div>
            <button
              type="button"
              onClick={props.onMarkRestoreCheckVerified}
              className="mt-2 rounded border border-white/20 bg-slate-900/65 px-2 py-1 text-[11px] font-semibold text-slate-200"
            >
              Mark S03 verified
            </button>
          </div>
        </div>

        <div className="mt-2 rounded-lg border border-white/15 bg-slate-900/50 p-2">
          <div className="mb-1 text-[11px] font-semibold text-slate-100">Gate snapshot</div>
          <div className="mb-2 text-[10px] text-slate-400">Captured: {props.evidenceCapturedAtLabel}</div>

          <div className="space-y-1.5">
            <div className="rounded border border-cyan-300/20 bg-slate-950/80 p-2 text-[10px] text-slate-300">
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-100/75">
                Summary
              </div>
              <div className="overflow-x-auto whitespace-nowrap">
                Step <span className="font-semibold text-slate-100">{props.evidenceSummary.step}</span> · Mode{" "}
                <span className="font-semibold text-slate-100">{props.evidenceSummary.mode}</span> · S01{" "}
                <span className="font-semibold text-slate-100">{props.evidenceSummary.s01}</span> · S02{" "}
                <span className="font-semibold text-slate-100">{props.evidenceSummary.s02}</span> · S03{" "}
                <span className="font-semibold text-slate-100">{props.evidenceSummary.s03}</span> · Intents{" "}
                <span className="font-semibold text-slate-100">{props.evidenceSummary.intentCount}</span> · Deltas{" "}
                <span className="font-semibold text-slate-100">{props.evidenceSummary.unexpectedPoseDeltas}</span>
              </div>
            </div>

            <div className="rounded border border-white/10 bg-slate-900/55 p-2 text-[10px] text-slate-300">
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300/85">
                Last events
              </div>

              <div className="text-[10px] leading-tight text-slate-300">
                <span className="mr-1 text-slate-400">Last intent:</span>
                <span
                  className="font-semibold text-slate-100"
                  style={{
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    overflow: "hidden",
                  }}
                >
                  {props.evidenceSummary.lastIntent}
                </span>
              </div>

              <div className="mt-0.5 text-[10px] leading-tight text-slate-300">
                <span className="mr-1 text-slate-400">Last delta:</span>
                <span
                  className="font-semibold text-slate-100"
                  style={{
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    overflow: "hidden",
                  }}
                >
                  {props.evidenceSummary.lastPoseDelta}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <button
              type="button"
              onClick={props.onToggleExpandedEvidence}
              className="rounded border border-white/20 bg-slate-900/65 px-2 py-1 text-[11px] font-semibold text-slate-200"
            >
              {props.showExpandedEvidence ? "Hide JSON" : "Show JSON"}
            </button>
          </div>

          {props.showExpandedEvidence ? (
            <pre className="mt-2 max-h-[40vh] overflow-x-auto overflow-y-auto overscroll-contain rounded bg-slate-950/70 p-2 pr-3 text-[10px] leading-relaxed text-slate-300 sm:max-h-72">
              {props.evidenceSnapshot}
            </pre>
          ) : null}

          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={props.onCopyEvidenceSnapshot}
              className="rounded border border-white/20 bg-slate-900/65 px-2 py-1 text-[11px] font-semibold text-slate-200"
            >
              Copy snapshot JSON
            </button>

            <div className="min-h-[18px] text-right">
              {props.copyStatus === "copied" ? (
                <span className="rounded-full border border-emerald-300/40 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                  Copied
                </span>
              ) : null}
              {props.copyStatus === "error" ? (
                <span className="rounded-full border border-rose-300/40 bg-rose-400/20 px-2 py-0.5 text-[10px] font-semibold text-rose-100">
                  Copy failed
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-2">
          <button
            type="button"
            onClick={props.onResetCameraChecks}
            className="rounded border border-white/20 bg-slate-900/65 px-2 py-1 text-[11px] font-semibold text-slate-200"
          >
            Reset camera checks
          </button>
        </div>
      </div>
    </section>
  );
}
