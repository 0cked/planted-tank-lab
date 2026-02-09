"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

type Action = {
  href: string;
  label: string;
  kind?: "primary" | "secondary";
};

export function RouteError(props: {
  title?: string;
  description?: string;
  actions?: Action[];
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const title = props.title ?? "Something went wrong";
  const description =
    props.description ??
    "Try again. If this keeps happening, it's probably a bug on our side.";

  useEffect(() => {
    const dsn = (process.env.NEXT_PUBLIC_SENTRY_DSN ?? "").trim();

    if (dsn) {
      try {
        const route =
          typeof window !== "undefined" ? window.location.pathname : undefined;
        Sentry.withScope((scope) => {
          scope.setTag("error_boundary", "route");
          if (route) scope.setTag("route", route);
          if (props.error?.digest) scope.setTag("digest", props.error.digest);
          Sentry.captureException(props.error);
        });
      } catch {
        // ignore
      }
    } else if (process.env.NODE_ENV !== "production") {
      console.error(props.error);
    }
  }, [props.error]);

  const actions: Action[] =
    props.actions && props.actions.length > 0
      ? props.actions
      : [
          { href: "/", label: "Go home", kind: "secondary" },
          { href: "/builder", label: "Open builder", kind: "primary" },
        ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
          Error
        </div>
        <h1 className="mt-2 ptl-page-title">{title}</h1>
        <p className="mt-3 ptl-lede text-neutral-700">{description}</p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button type="button" className="ptl-btn-primary" onClick={props.reset}>
            Try again
          </button>
          {actions.map((a) => (
            <Link
              key={`${a.href}:${a.label}`}
              href={a.href}
              className={a.kind === "primary" ? "ptl-btn-primary" : "ptl-btn-secondary"}
            >
              {a.label}
            </Link>
          ))}
        </div>

        {props.error?.digest ? (
          <div className="mt-6 text-xs text-neutral-600">
            Error ID: <span className="font-mono">{props.error.digest}</span>
          </div>
        ) : null}
      </div>
    </main>
  );
}
