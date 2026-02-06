"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginPanel(props: { allowGoogle: boolean; allowEmail: boolean; allowDev: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  return (
    <div className="ptl-surface-strong p-7 sm:p-10">
      <h1
        className="text-4xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Sign in
      </h1>
      <p className="mt-3 text-sm text-neutral-700">
        Create an account to save builds, sync across devices, and share links.
      </p>

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
        ) : (
          <div
            className="rounded-2xl border bg-white/55 px-4 py-3 text-sm text-neutral-700"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            Email sign-in is not configured yet.
          </div>
        )}

        {props.allowGoogle ? (
          <button
            type="button"
            className="w-full rounded-2xl border bg-white/70 px-4 py-3 text-left text-sm font-semibold text-neutral-900 transition hover:bg-white/85"
            style={{ borderColor: "var(--ptl-border)" }}
            onClick={() => void signIn("google", { callbackUrl: "/builder" })}
          >
            Continue with Google
          </button>
        ) : (
          <div className="rounded-2xl border bg-white/55 px-4 py-3 text-sm text-neutral-700" style={{ borderColor: "var(--ptl-border)" }}>
            Google sign-in is not configured yet.
          </div>
        )}

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
