export function BuilderLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#040810] pb-8 text-slate-100">
      <div className="mx-auto w-full max-w-[1780px] px-4 pt-5 sm:px-6 lg:px-8">
        <div className="mb-4 h-24 rounded-2xl border border-slate-800/80 bg-slate-900/50 animate-pulse" />
        <div className="mb-4 hidden h-16 rounded-2xl border border-slate-800/80 bg-slate-900/50 animate-pulse md:block" />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
          <div className="hidden h-[640px] rounded-2xl border border-slate-800/80 bg-slate-900/50 animate-pulse xl:block" />

          <div className="space-y-3">
            <div className="h-14 rounded-2xl border border-slate-800/80 bg-slate-900/50 animate-pulse" />
            <div className="relative h-[640px] overflow-hidden rounded-3xl border border-slate-700/80 bg-gradient-to-b from-slate-900 via-[#090f1a] to-[#040810]">
              <div className="absolute inset-10 rounded-[2rem] border border-slate-600/70" />
              <div className="absolute inset-x-16 top-1/2 h-px -translate-y-1/2 bg-slate-600/60" />
              <div className="absolute left-1/2 top-16 bottom-16 w-px -translate-x-1/2 bg-slate-600/45" />
              <div className="absolute left-1/2 top-[58%] h-28 w-64 -translate-x-1/2 rounded-[2rem] border border-cyan-300/25 bg-cyan-400/8" />
            </div>
          </div>

          <div className="hidden h-[640px] rounded-2xl border border-slate-800/80 bg-slate-900/50 animate-pulse xl:block" />
        </div>
      </div>
    </div>
  );
}
