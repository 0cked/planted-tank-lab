"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export function LoginPanel(props: { allowGoogle: boolean; allowEmail: boolean; allowDev: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const hasAnyProvider = props.allowEmail || props.allowGoogle || props.allowDev;

  return (
    <div className="ptl-surface-strong p-7 sm:p-10">
      <h1 className="ptl-page-title">Sign in</h1>
      <p className="mt-3 ptl-lede text-neutral-700">
        {hasAnyProvider
          ? "Sign in or create an account to save builds and sync across devices."
          : "Sign in is temporarily unavailable right now. You can still build and share without an account."}
      </p>
      {props.allowEmail ? (
        <div className="mt-4 text-xs text-neutral-700">
          New here? No problem — we’ll create your account automatically when you use a magic link.
        </div>
      ) : null}

      {!hasAnyProvider ? (
        <div className="mt-8 rounded-3xl border bg-white/70 p-5 text-sm text-neutral-700" style={{ borderColor: "var(--ptl-border)" }}>
          <div className="font-semibold text-neutral-900">No problem</div>
          <div className="mt-2 text-neutral-700">
            Accounts are optional. Build a setup, then use the Share button to get a link you can bookmark.
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/builder" className="ptl-btn-primary">
              Open the builder
            </Link>
            <Link href="/plants" className="ptl-btn-secondary">
              Browse plants
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-8 space-y-3">
        {props.allowEmail ? (
          <form
            className="rounded-2xl border bg-white/70 p-4"
            style={{ borderColor: "var(--ptl-border)" }}
            onSubmit={(e) => {
              e.preventDefault();
              setEmailStatus(null);
              const trimmed = email.trim();
              if (!trimmed) {
                setEmailStatus("Enter your email address.");
                return;
              }
              setEmailStatus("Sending a magic link...");
              void signIn("email", { email: trimmed, callbackUrl: "/builder" });
            }}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Email magic link
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
              <button type="submit" className="ptl-btn-primary whitespace-nowrap">
                Email me a link
              </button>
            </div>
            {emailStatus ? <div className="mt-2 text-xs text-neutral-700">{emailStatus}</div> : null}
          </form>
        ) : null}

        {props.allowGoogle ? (
          <button
            type="button"
            className="w-full rounded-2xl border bg-white/70 px-4 py-3 text-left text-sm font-semibold text-neutral-900 transition hover:bg-white/85"
            style={{ borderColor: "var(--ptl-border)" }}
            onClick={() => void signIn("google", { callbackUrl: "/builder" })}
          >
            Continue with Google
          </button>
        ) : null}

        {props.allowDev ? (
          <form
            className="rounded-2xl border bg-white/70 p-4"
            style={{ borderColor: "var(--ptl-border)" }}
            onSubmit={(e) => {
              e.preventDefault();
              setStatus(null);
              const trimmed = email.trim();
              if (!trimmed) {
                setStatus("Enter an email for dev login.");
                return;
              }
              void signIn("credentials", { email: trimmed, callbackUrl: "/builder" });
            }}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Dev login
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
              <button type="submit" className="ptl-btn-primary whitespace-nowrap">
                Continue
              </button>
            </div>
            {status ? <div className="mt-2 text-xs text-red-700">{status}</div> : null}
            <div className="mt-2 text-xs text-neutral-600">
              Enabled only when `AUTH_DEV_LOGIN=true` and not in production.
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
