import type { ReactNode } from "react";

type BuilderViewportLayoutProps = {
  leftSidebar: ReactNode;
  rightSidebar: ReactNode;
  scene: ReactNode;
  toolbar: ReactNode;
};

export function BuilderViewportLayout(props: BuilderViewportLayoutProps) {
  return (
    <>
      <section className="relative mt-4 min-h-[74dvh] overflow-hidden rounded-3xl border border-white/15 bg-[#060d16] shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0">{props.scene}</div>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_62%_8%,rgba(255,255,255,0.22),rgba(255,255,255,0)_40%),radial-gradient(circle_at_20%_100%,rgba(74,115,145,0.26),rgba(74,115,145,0)_48%)]" />
        <div className="pointer-events-none absolute left-0 top-0 h-[22%] w-full bg-gradient-to-b from-slate-950/28 to-transparent" />

        <aside className="pointer-events-auto absolute left-4 top-4 hidden h-[calc(100%-7rem)] w-[292px] overflow-auto rounded-2xl border border-white/15 bg-slate-900/58 p-3 shadow-2xl backdrop-blur-md lg:block">
          {props.leftSidebar}
        </aside>

        <aside className="pointer-events-auto absolute right-4 top-4 hidden h-[calc(100%-7rem)] w-[368px] overflow-auto rounded-2xl border border-white/15 bg-slate-900/58 p-3 shadow-2xl backdrop-blur-md lg:block">
          {props.rightSidebar}
        </aside>

        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
          <div className="pointer-events-auto rounded-2xl border border-white/15 bg-slate-900/75 p-2 shadow-2xl backdrop-blur-md">
            {props.toolbar}
          </div>
        </div>
      </section>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:hidden">
        <section className="rounded-2xl border border-white/15 bg-slate-900/65 p-2.5">{props.toolbar}</section>
        <section className="rounded-2xl border border-white/15 bg-slate-900/65 p-3">{props.leftSidebar}</section>
        <section className="rounded-2xl border border-white/15 bg-slate-900/65 p-3">{props.rightSidebar}</section>
      </div>
    </>
  );
}
