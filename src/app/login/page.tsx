import type { Metadata } from "next";

import { LoginPanel } from "./LoginPanel";

export const metadata: Metadata = {
  title: "Login | PlantedTankLab",
  description: "Sign in to save builds and sync across devices.",
};

function allowGoogle(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function allowDev(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.AUTH_DEV_LOGIN === "true";
}

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <LoginPanel allowGoogle={allowGoogle()} allowDev={allowDev()} />
        <div className="ptl-surface p-7 sm:p-10">
          <div className="text-sm font-semibold">What you get</div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-neutral-700">
            <li>Save builds to your account (coming next)</li>
            <li>Sync across devices</li>
            <li>Share links that stay up to date</li>
          </ul>
          <div className="mt-6 rounded-2xl border bg-white/60 p-4 text-xs text-neutral-600" style={{ borderColor: "var(--ptl-border)" }}>
            Note: account-backed builds will land after auth is live in production.
          </div>
        </div>
      </div>
    </main>
  );
}

