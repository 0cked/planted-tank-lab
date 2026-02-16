type BuildSaveState = {
  type: "idle" | "ok" | "error";
  message: string;
};

type BuildMetadataPanelProps = {
  name: string;
  description: string;
  buildId: string | null;
  shareSlug: string | null;
  buildLink: string | null;
  saveState: BuildSaveState;
  saving: boolean;
  isSharedSnapshot?: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSaveDraft: () => void;
  onDuplicate: () => void;
  onRemix?: () => void;
  onShare: () => void;
  onExport: () => void;
  onReset: () => void;
};

function saveStateClasses(saveState: BuildSaveState): string {
  if (saveState.type === "ok") {
    return "border-emerald-200/80 bg-emerald-100/90 text-emerald-900";
  }

  if (saveState.type === "error") {
    return "border-red-200/80 bg-red-100/95 text-red-900";
  }

  return "border-white/20 bg-slate-900/70 text-slate-200";
}

export function BuildMetadataPanel(props: BuildMetadataPanelProps) {
  return (
    <header className="rounded-3xl border border-white/15 bg-slate-900/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-[220px] flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/70">
            Guided Visual Builder
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
            Game-like 3D aquascaping planner
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">
            Cinematic viewport first. Planner outputs preserved: BOM, compatibility checks, save/share, and
            deterministic scene reconstruction.
          </p>
        </div>

        <div className="min-w-[240px] flex-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            Build name
          </label>
          <input
            value={props.name}
            onChange={(event) => props.onNameChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none"
            placeholder="Visual Build"
          />
        </div>

        <div className="min-w-[240px] flex-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            Description
          </label>
          <input
            value={props.description}
            onChange={(event) => props.onDescriptionChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none"
            placeholder="Low-tech jungle with cinematic hardscape composition"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={props.onSaveDraft}
          disabled={props.saving}
          className="rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-wait disabled:opacity-60"
        >
          Save draft
        </button>
        {props.onRemix ? (
          <button
            onClick={props.onRemix}
            className="rounded-full border border-cyan-300/70 bg-cyan-400/20 px-4 py-2 text-sm font-semibold text-cyan-100"
          >
            Remix
          </button>
        ) : null}
        <button
          onClick={props.onDuplicate}
          className="rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-100"
        >
          Duplicate
        </button>
        <button
          onClick={props.onShare}
          disabled={props.saving}
          className="rounded-full border border-emerald-300/70 bg-emerald-400/25 px-4 py-2 text-sm font-semibold text-emerald-100 disabled:cursor-wait disabled:opacity-60"
        >
          Share
        </button>
        <button
          onClick={props.onExport}
          className="rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-100"
        >
          Export PNG
        </button>
        <button
          onClick={props.onReset}
          className="rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-100"
        >
          Reset
        </button>

        {props.buildLink ? (
          <a
            className="rounded-full border border-white/20 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-slate-200"
            href={props.buildLink}
            target="_blank"
            rel="noreferrer"
          >
            Open public link
          </a>
        ) : null}

        {props.saveState.message ? (
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${saveStateClasses(props.saveState)}`}>
            {props.saveState.message}
          </span>
        ) : null}
      </div>

      {props.isSharedSnapshot ? (
        <p className="mt-2 text-xs text-cyan-100/90">
          You&apos;re viewing a shared build. Click Remix to start an independent draft before saving.
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
        <span>
          Build ID: <span className="font-mono text-slate-100">{props.buildId ?? "draft"}</span>
        </span>
        <span>
          Share: <span className="font-mono text-slate-100">{props.shareSlug ?? "not published"}</span>
        </span>
      </div>
    </header>
  );
}
