import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { captureServerException } from "@/server/observability/sentry";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/router";
import { logEvent, safeErrorFields } from "@/server/log";

function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Extremely defensive fallback.
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  const requestId = req.headers.get("x-request-id")?.slice(0, 200) ?? newRequestId();
  const forceLog = req.headers.get("x-ptl-log") === "1";
  const startedAt = Date.now();

  const res = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
    onError: ({ error, path, type }) => {
      const code = (error as unknown as { code?: unknown }).code ?? null;

      logEvent("error", {
        msg: "trpc_error",
        requestId,
        route: pathname,
        trpc: { type, path: path ?? null, code },
        error: {
          ...safeErrorFields(error),
          stack: process.env.NODE_ENV === "production" ? undefined : safeErrorFields(error).stack,
        },
      });

      // Avoid noise for expected client errors; keep Sentry focused on regressions.
      if (code === "INTERNAL_SERVER_ERROR") {
        captureServerException(error, {
          requestId,
          route: pathname,
          tags: {
            trpc_type: type,
            trpc_path: path ?? null,
          },
          extra: { trpc: { code } },
        });
      }
    },
  });

  if (forceLog || process.env.NODE_ENV !== "production") {
    logEvent("info", {
      msg: "trpc_request",
      requestId,
      route: pathname,
      method: req.method,
      status: res.status,
      durationMs: Date.now() - startedAt,
    });
  }

  const headers = new Headers(res.headers);
  headers.set("x-request-id", requestId);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export { handler as GET, handler as POST };
