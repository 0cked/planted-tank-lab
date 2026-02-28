import { useState, type ReactNode } from "react";

type BuilderViewportLayoutProps = {
  scene: ReactNode;
  iconRail: ReactNode;
  floatingPanel: ReactNode | null;
  floatingRight: ReactNode | null;
  bottomToolbar?: ReactNode | null;
};

export function BuilderViewportLayout(props: BuilderViewportLayoutProps) {
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--ptl-bg)]">
      {/* 3D scene fills the entire viewport */}
      <div className="absolute inset-0">{props.scene}</div>

      {/* Left icon rail */}
      <nav className="pointer-events-auto absolute left-2 top-2 bottom-2 z-10 flex w-12 flex-col items-center gap-1.5 rounded-2xl border border-[var(--ptl-border)] bg-white/72 px-1 py-2 shadow-2xl backdrop-blur-xl md:left-3 md:top-3 md:bottom-3 md:w-14 md:px-1.5 md:py-2.5">
        {props.iconRail}
      </nav>

      {/* Floating contextual panel (appears next to icon rail) */}
      {props.floatingPanel ? (
        <aside className="pointer-events-auto absolute bottom-2 left-[60px] right-2 z-10 max-h-[min(58dvh,520px)] overflow-auto rounded-2xl border border-[var(--ptl-border)] bg-white/66 p-3 shadow-2xl backdrop-blur-xl md:left-[82px] md:right-auto md:top-3 md:bottom-3 md:w-[260px] md:max-h-none md:bg-white/60">
          {props.floatingPanel}
        </aside>
      ) : null}

      {props.floatingRight ? (
        <button
          type="button"
          onClick={() => setMobileRightOpen((open) => !open)}
          className="pointer-events-auto absolute right-2 top-2 z-10 inline-flex min-h-11 touch-manipulation items-center justify-center rounded-xl border border-[var(--ptl-border)] bg-white/78 px-3 text-[11px] font-semibold text-[var(--ptl-ink)] shadow-xl backdrop-blur-xl md:hidden"
        >
          {mobileRightOpen ? "Hide tools" : "Item tools"}
        </button>
      ) : null}

      {/* Floating right info panel */}
      {props.floatingRight ? (
        <aside
          className={`pointer-events-auto absolute right-2 z-10 w-[min(84vw,260px)] max-h-[min(48dvh,430px)] overflow-auto rounded-2xl border border-[var(--ptl-border)] bg-white/78 p-3 shadow-2xl backdrop-blur-xl md:right-3 md:top-3 md:w-auto md:max-h-[calc(100dvh-24px)] md:bg-white/60 ${
            mobileRightOpen ? "top-14" : "hidden md:block"
          }`}
        >
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
