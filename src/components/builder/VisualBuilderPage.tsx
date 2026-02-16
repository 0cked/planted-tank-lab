"use client";

import { BuildMetadataPanel } from "@/components/builder/visual/BuildMetadataPanel";
import { BuildStepNavigator } from "@/components/builder/visual/BuildStepNavigator";
import { BuilderWorkspace } from "@/components/builder/visual/BuilderWorkspace";
import { CameraDiagnosticsPanel } from "@/components/builder/visual/CameraDiagnosticsPanel";
import {
  type InitialBuildResponse,
  useVisualBuilderPageController,
} from "@/components/builder/visual/useVisualBuilderPageController";

export function VisualBuilderPage(props: { initialBuild?: InitialBuildResponse | null }) {
  const controller = useVisualBuilderPageController(props.initialBuild);

  return (
    <div className="min-h-screen bg-[#040810] pb-8 text-slate-100">
      <div className="mx-auto w-full max-w-[1780px] px-4 pt-5 sm:px-6 lg:px-8">
        <BuildMetadataPanel {...controller.metadataPanelProps} />
        <BuildStepNavigator {...controller.stepNavigatorProps} />
        <BuilderWorkspace {...controller.workspaceProps} />
        {controller.diagnosticsPanelProps ? <CameraDiagnosticsPanel {...controller.diagnosticsPanelProps} /> : null}
      </div>
    </div>
  );
}
