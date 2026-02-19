"use client";

import { useId, useRef } from "react";

import { useFocusTrap } from "@/hooks/useFocusTrap";

type BuilderShortcutsOverlayProps = {
  open: boolean;
  onClose: () => void;
};

type ShortcutRow = {
  keys: string;
  description: string;
};

const SHORTCUT_ROWS: ShortcutRow[] = [
  { keys: "Shift + Click", description: "Add or remove items from selection" },
  { keys: "Cmd/Ctrl + A", description: "Select all placed items" },
  { keys: "Delete / Backspace", description: "Remove selected item(s)" },
  { keys: "D", description: "Duplicate selected item(s) (offset by 1 inch)" },
  { keys: "R", description: "Rotate selected item by 45°" },
  { keys: "Escape", description: "Deselect all" },
  { keys: "1-5", description: "Jump to workflow step" },
  { keys: "Cmd/Ctrl + Z", description: "Undo last substrate stroke" },
  { keys: "Cmd/Ctrl + Shift + Z", description: "Redo substrate stroke" },
  { keys: "?", description: "Open this shortcuts panel" },
];

export function BuilderShortcutsOverlay(props: BuilderShortcutsOverlayProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useFocusTrap({
    containerRef: dialogRef,
    active: props.open,
    onEscape: props.onClose,
  });

  if (!props.open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={props.onClose}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-[var(--ptl-border)] bg-white/90 p-4 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-sm font-semibold text-[var(--ptl-ink)]">
              Builder shortcuts
            </h2>
            <p id={descriptionId} className="text-xs text-[var(--ptl-ink-muted)]">
              Use these while your focus is in the builder.
            </p>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            aria-label="Close keyboard shortcuts panel"
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border border-[var(--ptl-border)] bg-white/80 px-4 py-2 text-xs font-semibold text-[var(--ptl-ink)]"
          >
            Close
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {SHORTCUT_ROWS.map((row) => (
            <li
              key={row.keys}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--ptl-border)] bg-black/[0.03] px-3 py-2"
            >
              <span className="text-xs text-[var(--ptl-ink)]">{row.description}</span>
              <kbd className="rounded-md border border-[var(--ptl-border)] bg-white/80 px-2 py-1 text-[11px] font-semibold text-[var(--ptl-accent)]">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
