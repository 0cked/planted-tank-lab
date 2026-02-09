import { captureServerException, initSentryServer } from "@/server/observability/sentry";

type RequestErrorContext = Readonly<{
  routerKind: "Pages Router" | "App Router";
  routePath: string;
  routeType: "render" | "route" | "action" | "proxy";
  renderSource?:
    | "react-server-components"
    | "react-server-components-payload"
    | "server-rendering";
  revalidateReason: "on-demand" | "stale" | undefined;
}>;

type ErrorRequest = Readonly<{
  path: string;
  method: string;
  headers: NodeJS.Dict<string | string[]>;
}>;

function headerFirst(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function stripSearch(path: string): string {
  return path.split("?")[0] ?? path;
}

export async function register(): Promise<void> {
  // Called once on server startup (and for edge instrumentation when present).
  initSentryServer();
}

export async function onRequestError(
  error: unknown,
  errorRequest: ErrorRequest,
  errorContext: RequestErrorContext,
): Promise<void> {
  const requestId =
    headerFirst(errorRequest.headers["x-request-id"]) ??
    headerFirst(errorRequest.headers["x-vercel-id"]) ??
    null;

  captureServerException(error, {
    requestId,
    route: stripSearch(errorRequest.path),
    tags: {
      next_router: errorContext.routerKind,
      next_route_type: errorContext.routeType,
      next_route_path: errorContext.routePath,
      next_render_source: errorContext.renderSource ?? null,
      next_method: errorRequest.method,
    },
  });
}

