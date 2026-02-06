"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

import { trpc } from "@/components/TRPCProvider";

export function ReportBuildDialog(props: { shareSlug: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const report = trpc.builds.report.useMutation();

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="ptl-btn-secondary">
          Report
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Report build</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-neutral-700">
            If something looks incorrect, spammy, or unsafe, tell us what you saw.
          </Dialog.Description>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional: what should we review?"
            className="mt-4 h-28 w-full resize-none rounded-2xl border bg-white/70 p-3 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
            style={{ borderColor: "var(--ptl-border)" }}
          />

          {status ? <div className="mt-3 text-sm text-neutral-700">{status}</div> : null}

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="ptl-btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="ptl-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={report.isPending}
              onClick={async () => {
                setStatus(null);
                try {
                  await report.mutateAsync({
                    shareSlug: props.shareSlug,
                    reason: reason.trim() ? reason.trim() : undefined,
                  });
                  setStatus("Thanks. We’ll review it.");
                  setReason("");
                  setTimeout(() => setOpen(false), 800);
                } catch {
                  setStatus("Could not submit report. Try again in a moment.");
                }
              }}
            >
              {report.isPending ? "Sending..." : "Send report"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

