"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { trpc } from "@/components/TRPCProvider";

type TargetType = "page" | "product" | "plant" | "offer" | "build" | "other";

function clampUrl(raw: string | null): string {
  if (!raw) return "";
  const v = raw.trim();
  if (!v) return "";
  if (v.length > 1200) return v.slice(0, 1200);
  return v;
}

export function ReportProblemForm() {
  const sp = useSearchParams();

  const initialUrl = useMemo(() => clampUrl(sp.get("url")), [sp]);

  const [targetType, setTargetType] = useState<TargetType>("page");
  const [targetUrl, setTargetUrl] = useState(initialUrl);
  const [contactEmail, setContactEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const submit = trpc.reports.submit.useMutation();

  return (
    <div className="ptl-surface-strong p-7 sm:p-10">
      <h1 className="ptl-page-title">Report a problem</h1>
      <div className="mt-4 ptl-prose">
        <p>
          Spotted incorrect data, a broken link, or something that looks spammy? Send a
          quick note and we’ll review it.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
            What are you reporting?
          </div>
          <select
            className="mt-2 w-full rounded-2xl border bg-white/70 px-3 py-2 text-sm"
            style={{ borderColor: "var(--ptl-border)" }}
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as TargetType)}
          >
            <option value="page">A page / general site issue</option>
            <option value="product">A product</option>
            <option value="plant">A plant</option>
            <option value="offer">A price / offer</option>
            <option value="build">A shared build</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Link (optional)
          </div>
          <input
            className="mt-2 w-full rounded-2xl border bg-white/70 px-3 py-2 text-sm"
            style={{ borderColor: "var(--ptl-border)" }}
            placeholder="https://plantedtanklab.com/..."
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
          />
        </label>
      </div>

      <label className="mt-4 block text-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
          What should we fix?
        </div>
        <textarea
          className="mt-2 h-36 w-full resize-none rounded-2xl border bg-white/70 p-3 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
          style={{ borderColor: "var(--ptl-border)" }}
          placeholder="Tell us what you saw. If it’s a data issue, include a source link (manufacturer page preferred)."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>

      <label className="mt-4 block text-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
          Email (optional)
        </div>
        <input
          className="mt-2 w-full rounded-2xl border bg-white/70 px-3 py-2 text-sm"
          style={{ borderColor: "var(--ptl-border)" }}
          placeholder="you@example.com"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
        <div className="mt-1 text-xs text-neutral-600">
          Only if you want a reply.
        </div>
      </label>

      {status ? <div className="mt-4 text-sm text-neutral-700">{status}</div> : null}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="ptl-btn-secondary"
          onClick={() => {
            setTargetType("page");
            setTargetUrl(initialUrl);
            setContactEmail("");
            setMessage("");
            setStatus(null);
          }}
        >
          Clear
        </button>
        <button
          type="button"
          className="ptl-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submit.isPending}
          onClick={async () => {
            setStatus(null);
            try {
              await submit.mutateAsync({
                targetType,
                targetUrl: targetUrl.trim() ? targetUrl.trim() : undefined,
                message,
                contactEmail: contactEmail.trim() ? contactEmail.trim() : undefined,
              });
              setStatus("Thanks — report received.");
              setMessage("");
              setContactEmail("");
            } catch {
              setStatus("Could not submit right now. Please try again in a moment.");
            }
          }}
        >
          {submit.isPending ? "Sending…" : "Send report"}
        </button>
      </div>
    </div>
  );
}
