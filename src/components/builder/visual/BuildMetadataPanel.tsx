import {
  BUILD_TAG_OPTIONS,
  buildTagLabel,
  type BuildTagSlug,
} from "@/lib/build-tags";

type BuildSaveState = {
  type: "idle" | "ok" | "error";
  message: string;
};

type BuildMetadataPanelProps = {
  name: string;
  description: string;
  selectedTags: BuildTagSlug[];
  buildId: string | null;
  shareSlug: string | null;
  buildLink: string | null;
  saveState: BuildSaveState;
  saving: boolean;
  isSharedSnapshot?: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTagToggle: (tag: BuildTagSlug) => void;
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

function tagButtonClasses(selected: boolean): string {
  if (selected) {
    return "border-emerald-300/75 bg-emerald-400/20 text-emerald-100";
  }

  return "border-white/20 bg-slate-950/60 text-slate-200 hover:border-white/35 hover:text-slate-100";
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
          <p className="mt-1 max-w-3xl text-sm text-slate-200">
            Cinematic viewport first. Planner outputs preserved: BOM, compatibility checks, save/share, and
            deterministic scene reconstruction.
          </p>
        </div>

        <div className="min-w-[240px] flex-1">
          <label htmlFor="visual-build-name" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
            Build name
          </label>
          <input
            id="visual-build-name"
            value={props.name}
            onChange={(event) => props.onNameChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            placeholder="Visual Build"
          />
        </div>

        <div className="min-w-[240px] flex-1">
          <label htmlFor="visual-build-description" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
            Description
          </label>
          <input
            id="visual-build-description"
            value={props.description}
            onChange={(event) => props.onDescriptionChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            placeholder="Low-tech jungle with cinematic hardscape composition"
          />
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
          Build tags
        </div>
        <div role="toolbar" aria-label="Build tags" className="mt-2 flex flex-wrap gap-2">
          {BUILD_TAG_OPTIONS.map((tag) => {
            const selected = props.selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => props.onTagToggle(tag)}
                aria-label={`Toggle tag ${buildTagLabel(tag)}`}
                aria-pressed={selected}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${tagButtonClasses(selected)}`}
              >
                {buildTagLabel(tag)}
              </button>
            );
          })}
        </div>
      </div>

      <div role="toolbar" aria-label="Build actions" className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={props.onSaveDraft}
          aria-label="Save draft"
          disabled={props.saving}
          className="rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-wait disabled:opacity-60"
        >
          Save draft
        </button>
        {props.onRemix ? (
          <button
            type="button"
            onClick={props.onRemix}
            aria-label="Remix this build"
            className="rounded-full border border-cyan-300/70 bg-cyan-400/20 px-4 py-2 text-sm font-semibold text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Remix
          </button>
        ) : null}
        <button
          type="button"
          onClick={props.onDuplicate}
          aria-label="Duplicate this build"
          className="rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={props.onShare}
          aria-label="Share this build"
          disabled={props.saving}
          className="rounded-full border border-emerald-300/70 bg-emerald-400/25 px-4 py-2 text-sm font-semibold text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-wait disabled:opacity-60"
        >
          Share
        </button>
        <button
          type="button"
          onClick={props.onExport}
          aria-label="Export build as PNG"
          className="rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Export PNG
        </button>
        <button
          type="button"
          onClick={props.onReset}
          aria-label="Reset build"
          className="rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Reset
        </button>

        {props.buildLink ? (
          <a
            className="rounded-full border border-white/20 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-200">
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
