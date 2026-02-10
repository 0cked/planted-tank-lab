import { appRouter } from "@/server/trpc/router";
import { createTRPCContext } from "@/server/trpc/context";
import { headers } from "next/headers";

async function baseUrl(): Promise<string> {
  // Mark server callers as dynamic so we don't pre-render DB-backed pages at build time.
  // This keeps container builds free of production secrets (DATABASE_URL) and aligns with
  // our SSR-first approach for data-heavy views.
  const h = await headers();
  const host =
    h.get("x-forwarded-host")?.trim() ||
    h.get("host")?.trim() ||
    null;
  const proto = h.get("x-forwarded-proto")?.trim() || "http";
  if (host) return `${proto}://${host}`;
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").trim();
}

export async function getServerCaller() {
  return appRouter.createCaller(
    await createTRPCContext({ req: new Request(await baseUrl()) }),
  );
}
