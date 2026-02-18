"use client";

import { trpc } from "@/components/TRPCProvider";
import { BuildMetadataPanel } from "@/components/builder/visual/BuildMetadataPanel";
import { BuildStepNavigator } from "@/components/builder/visual/BuildStepNavigator";
import { BuilderWorkspace } from "@/components/builder/visual/BuilderWorkspace";
import { CameraDiagnosticsPanel } from "@/components/builder/visual/CameraDiagnosticsPanel";
import {
  type InitialBuildResponse,
  useVisualBuilderPageController,
} from "@/components/builder/visual/useVisualBuilderPageController";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

function VisualBuilderPageContent(props: { initialBuild?: InitialBuildResponse | null }) {
  const controller = useVisualBuilderPageController(props.initialBuild);

  return (
    <div className="min-h-screen bg-[#040810] pb-8 text-slate-100">
      <div className="mx-auto w-full max-w-[1780px] px-4 pt-5 sm:px-6 lg:px-8">
        <BuildMetadataPanel {...controller.metadataPanelProps} />
        <div className="hidden md:block">
          <BuildStepNavigator {...controller.stepNavigatorProps} />
        </div>
        <BuilderWorkspace {...controller.workspaceProps} />
        <div className="md:hidden">
          <BuildStepNavigator {...controller.stepNavigatorProps} />
        </div>
        {controller.diagnosticsPanelProps ? <CameraDiagnosticsPanel {...controller.diagnosticsPanelProps} /> : null}
      </div>
    </div>
  );
}

export function VisualBuilderPage(props: { initialBuild?: InitialBuildResponse | null }) {
  const utils = trpc.useUtils();

  return (
    <ErrorBoundary
      onRetry={() => {
        void Promise.all([utils.visualBuilder.catalog.invalidate(), utils.rules.listActive.invalidate()]);
      }}
      fallback={({ retry }) => (
        <div className="min-h-screen bg-[#040810] pb-8 text-slate-100">
          <div className="mx-auto flex w-full max-w-[920px] px-4 pt-10 sm:px-6 lg:px-8">
            <section className="w-full rounded-3xl border border-rose-200/45 bg-[#111a28] p-8 shadow-2xl">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Builder</div>
              <h1 className="mt-3 text-2xl font-semibold text-slate-100">Failed to load</h1>
              <p className="mt-2 max-w-[52ch] text-sm text-slate-300">
                We couldn&apos;t load builder data. Check your connection and retry.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-200/80 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-900 transition hover:bg-rose-50"
                >
                  Retry
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    >
      <VisualBuilderPageContent {...props} />
    </ErrorBoundary>
  );
}
