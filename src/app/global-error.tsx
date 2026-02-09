"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const dsn = (process.env.NEXT_PUBLIC_SENTRY_DSN ?? "").trim();

    if (dsn) {
      try {
        const route =
          typeof window !== "undefined" ? window.location.pathname : undefined;
        Sentry.withScope((scope) => {
          scope.setTag("error_boundary", "global");
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

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
        <main style={{ padding: "40px 24px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#525252",
              }}
            >
              Error
            </div>
            <h1 style={{ marginTop: 10, fontSize: 34, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              Something went wrong
            </h1>
            <p style={{ marginTop: 14, fontSize: 16, color: "#404040", maxWidth: 640 }}>
              Try again. If it keeps happening, it is probably a bug on our side.
            </p>

            <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={props.reset}
                style={{
                  borderRadius: 9999,
                  padding: "10px 14px",
                  border: "1px solid #0f766e",
                  background: "#0f766e",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              <Link
                href="/"
                style={{
                  borderRadius: 9999,
                  padding: "10px 14px",
                  border: "1px solid rgba(0,0,0,.12)",
                  background: "rgba(255,255,255,.7)",
                  color: "#111827",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Go home
              </Link>
              <Link
                href="/builder"
                style={{
                  borderRadius: 9999,
                  padding: "10px 14px",
                  border: "1px solid rgba(0,0,0,.12)",
                  background: "rgba(255,255,255,.7)",
                  color: "#111827",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Open builder
              </Link>
            </div>

            {props.error?.digest ? (
              <div style={{ marginTop: 18, fontSize: 12, color: "#525252" }}>
                Error ID:{" "}
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  {props.error.digest}
                </span>
              </div>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
