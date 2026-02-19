import {
  STEP_META,
  STEP_ORDER,
  type BuilderStepId,
} from "@/components/builder/visual/builder-page-utils";

type BuildStepNavigatorProps = {
  currentStep: BuilderStepId;
  currentStepIndex: number;
  previousStep: BuilderStepId | null;
  nextStep: BuilderStepId | null;
  canContinueCurrentStep: boolean;
  stepCompletion: Record<BuilderStepId, boolean>;
  canNavigateToStep: (step: BuilderStepId) => boolean;
  onStepChange: (step: BuilderStepId) => void;
  onContinue: () => void;
};

export function BuildStepNavigator(props: BuildStepNavigatorProps) {
  return (
    <section aria-label="Builder workflow steps" className="mt-4 rounded-3xl border border-white/15 bg-slate-900/60 p-3">
      <div role="toolbar" aria-label="Workflow step picker" className="flex flex-wrap items-center gap-2">
        {STEP_ORDER.map((stepId, index) => {
          const meta = STEP_META[stepId];
          const isActive = props.currentStep === stepId;
          const isDone = props.stepCompletion[stepId];
          const isBlocked = !props.canNavigateToStep(stepId);

          return (
            <button
              key={stepId}
              type="button"
              onClick={() => {
                if (isBlocked) return;
                props.onStepChange(stepId);
              }}
              aria-label={`Go to step ${index + 1}: ${meta.title}`}
              aria-current={isActive ? "step" : undefined}
              disabled={isBlocked}
              className={`inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                isActive
                  ? "border-cyan-200 bg-cyan-200/20 text-cyan-100"
                  : isDone
                    ? "border-emerald-200/70 bg-emerald-300/15 text-emerald-100"
                    : "border-white/20 bg-slate-950/70 text-slate-200"
              } ${isBlocked ? "cursor-not-allowed opacity-45" : ""}`}
            >
              {index + 1}. {meta.title}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/15 bg-slate-950/55 p-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            Step {props.currentStepIndex + 1} of {STEP_ORDER.length}
          </div>
          <div className="text-sm font-semibold text-slate-100">{STEP_META[props.currentStep].title}</div>
          <div className="text-xs text-slate-200">{STEP_META[props.currentStep].summary}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!props.previousStep) return;
              props.onStepChange(props.previousStep);
            }}
            aria-label="Go to previous workflow step"
            disabled={!props.previousStep}
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>

          {props.currentStep === "equipment" && !props.stepCompletion.equipment ? (
            <button
              type="button"
              onClick={() => props.onStepChange("review")}
              aria-label="Skip equipment step and continue to review"
              className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Skip for now
            </button>
          ) : null}

          <button
            type="button"
            onClick={props.onContinue}
            aria-label={props.currentStep === "review" ? "Ready to publish" : "Continue to next step"}
            disabled={!props.nextStep || !props.canContinueCurrentStep}
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border border-cyan-200/70 bg-cyan-200/20 px-4 py-2 text-xs font-semibold text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {props.currentStep === "review" ? "Ready to publish" : "Continue"}
          </button>
        </div>
      </div>
    </section>
  );
}
