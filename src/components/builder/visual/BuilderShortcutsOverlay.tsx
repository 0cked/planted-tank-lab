type BuilderShortcutsOverlayProps = {
  open: boolean;
  onClose: () => void;
};

type ShortcutRow = {
  keys: string;
  description: string;
};

const SHORTCUT_ROWS: ShortcutRow[] = [
  { keys: "Delete / Backspace", description: "Remove selected item" },
  { keys: "D", description: "Duplicate selected item (offset by 1 inch)" },
  { keys: "R", description: "Rotate selected item by 45°" },
  { keys: "Escape", description: "Deselect active item" },
  { keys: "1-5", description: "Jump to workflow step" },
  { keys: "B", description: "Toggle substrate brush mode" },
  { keys: "Cmd/Ctrl + Z", description: "Undo last substrate stroke" },
  { keys: "Cmd/Ctrl + Shift + Z", description: "Redo substrate stroke" },
  { keys: "?", description: "Open this shortcuts panel" },
];

export function BuilderShortcutsOverlay(props: BuilderShortcutsOverlayProps) {
  if (!props.open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4"
      role="presentation"
      onClick={props.onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Builder keyboard shortcuts"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-white/20 bg-slate-950/95 p-4 shadow-2xl backdrop-blur"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Builder shortcuts</h2>
            <p className="text-xs text-slate-300">Use these while your focus is in the builder.</p>
          </div>

          <button
            onClick={props.onClose}
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-slate-900/85 px-4 py-2 text-xs font-semibold text-slate-100"
          >
            Close
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {SHORTCUT_ROWS.map((row) => (
            <li
              key={row.keys}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2"
            >
              <span className="text-xs text-slate-200">{row.description}</span>
              <kbd className="rounded-md border border-white/20 bg-slate-950 px-2 py-1 text-[11px] font-semibold text-cyan-100">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
