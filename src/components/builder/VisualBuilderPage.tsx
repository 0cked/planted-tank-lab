"use client";

import { trpc } from "@/components/TRPCProvider";
import { BuilderWorkspace } from "@/components/builder/visual/BuilderWorkspace";
import {
  type InitialBuildResponse,
  useVisualBuilderPageController,
} from "@/components/builder/visual/useVisualBuilderPageController";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

function VisualBuilderPageContent(props: {
  initialBuild?: InitialBuildResponse | null;
}) {
  const controller = useVisualBuilderPageController(props.initialBuild);

  return <BuilderWorkspace {...controller.workspaceProps} />;
}

export function VisualBuilderPage(props: {
  initialBuild?: InitialBuildResponse | null;
}) {
  const utils = trpc.useUtils();

  return (
    <ErrorBoundary
      onRetry={() => {
        void Promise.all([
          utils.visualBuilder.catalog.invalidate(),
          utils.rules.listActive.invalidate(),
        ]);
      }}
      fallback={({ retry }) => (
        <div className="flex h-dvh w-full items-center justify-center bg-[#060d16] text-white">
          <div className="w-full max-w-md rounded-2xl border border-rose-200/45 bg-slate-950/88 p-8 text-center shadow-2xl">
            <h1 className="text-lg font-semibold">Failed to load</h1>
            <p className="mt-2 text-sm text-white/60">
              Couldn&apos;t load builder data. Check your connection and retry.
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 rounded-xl border border-rose-200/75 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-900 transition hover:bg-rose-50"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    >
      <VisualBuilderPageContent {...props} />
    </ErrorBoundary>
  );
}
