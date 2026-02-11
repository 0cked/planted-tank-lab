import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginPanel } from "./LoginPanel";

export const metadata: Metadata = {
  title: "Sign in | PlantedTankLab",
  description: "Sign in or create an account to save builds and sync across devices.",
};

function allowGoogle(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function allowEmail(): boolean {
  return Boolean(
    process.env.EMAIL_FROM && (process.env.EMAIL_SERVER || process.env.RESEND_API_KEY),
  );
}

function allowDev(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.AUTH_DEV_LOGIN === "true";
}

export default function LoginPage() {
  const allowG = allowGoogle();
  const allowE = allowEmail();
  const allowD = allowDev();
  const hasAuth = allowG || allowE || allowD;
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <Suspense
          fallback={<div className="ptl-surface-strong p-7 sm:p-10 text-sm text-neutral-700">Loading…</div>}
        >
          <LoginPanel allowGoogle={allowG} allowEmail={allowE} allowDev={allowD} />
        </Suspense>
        <div className="ptl-surface p-7 sm:p-10">
          <div className="text-sm font-semibold">{hasAuth ? "Why sign in" : "No account needed"}</div>
          {hasAuth ? (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-neutral-700">
              <li>Save builds to your profile</li>
              <li>Sync your in-progress build across devices</li>
              <li>Keep share links up to date as you refine</li>
            </ul>
          ) : (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-neutral-700">
              <li>Build a setup and share a link</li>
              <li>Bookmark the share link to come back later</li>
              <li>Browse plants and gear without signing in</li>
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
