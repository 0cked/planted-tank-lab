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
    <div className="relative h-dvh w-full overflow-hidden bg-[var(--ptl-bg)]">
      {/* 3D scene fills the entire viewport */}
      <div className="absolute inset-0">{props.scene}</div>

      {/* Left icon rail */}
      <nav className="pointer-events-auto absolute left-3 top-3 bottom-3 z-10 flex w-11 flex-col items-center gap-1 rounded-2xl border border-[var(--ptl-border)] bg-white/60 py-2 backdrop-blur-xl">
        {props.iconRail}
      </nav>

      {/* Floating contextual panel (appears next to icon rail) */}
      {props.floatingPanel ? (
        <aside className="pointer-events-auto absolute left-[68px] top-3 bottom-3 z-10 w-[260px] overflow-auto rounded-2xl border border-[var(--ptl-border)] bg-white/60 p-3 shadow-2xl backdrop-blur-xl">
          {props.floatingPanel}
        </aside>
      ) : null}

      {/* Floating right info panel */}
      {props.floatingRight ? (
        <aside className="pointer-events-auto absolute right-3 top-3 z-10 max-h-[calc(100dvh-24px)] overflow-auto rounded-2xl border border-[var(--ptl-border)] bg-white/60 p-3 shadow-2xl backdrop-blur-xl">
          {props.floatingRight}
        </aside>
      ) : null}

      {props.bottomToolbar ? (
        <div className="pointer-events-auto absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
          {props.bottomToolbar}
        </div>
      ) : null}
    </div>
  );
}
