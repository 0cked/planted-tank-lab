import type { ReactNode } from "react";

type BuilderViewportLayoutProps = {
  scene: ReactNode;
  iconRail: ReactNode;
  floatingPanel: ReactNode | null;
  floatingRight: ReactNode | null;
  bottomToolbar?: ReactNode | null;
};

export function BuilderViewportLayout(props: BuilderViewportLayoutProps) {
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#020504] text-white/90 font-sans antialiased selection:bg-cyan-500/30">
      {/* 3D scene fills the entire viewport */}
      <div className="absolute inset-0">{props.scene}</div>

      {/* Premium dark icon rail */}
      <nav className="pointer-events-auto absolute left-4 top-4 bottom-4 z-10 flex w-[72px] flex-col items-center gap-2.5 rounded-[28px] border border-white/10 bg-black/40 px-2 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition duration-300 hover:bg-black/50">
        {props.iconRail}
      </nav>

      {/* Floating contextual panel */}
      {props.floatingPanel ? (
        <aside className="pointer-events-auto absolute left-[104px] top-4 bottom-4 z-10 w-[340px] overflow-hidden rounded-[28px] border border-white/5 bg-black/40 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-3xl transition-all duration-300 flex flex-col">
          {/* Scrollable inner content to prevent layout shifts */}
          <div className="flex-1 overflow-x-hidden overflow-y-auto p-5 custom-scrollbar">
            {props.floatingPanel}
          </div>
        </aside>
      ) : null}

      {/* Floating right info panel */}
      {props.floatingRight ? (
        <aside className="pointer-events-auto absolute right-4 top-4 z-10 max-h-[calc(100dvh-32px)] w-[320px] overflow-hidden rounded-[28px] border border-white/5 bg-black/40 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-3xl transition-all duration-300 flex flex-col">
          <div className="flex-1 overflow-x-hidden overflow-y-auto p-5 custom-scrollbar">
            {props.floatingRight}
          </div>
        </aside>
      ) : null}

      {props.bottomToolbar ? (
        <div className="pointer-events-auto absolute bottom-6 left-1/2 z-10 -translate-x-1/2 transition-transform duration-300 hover:scale-105">
          {props.bottomToolbar}
        </div>
      ) : null}
    </div>
  );
}
