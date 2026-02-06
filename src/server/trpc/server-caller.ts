import { appRouter } from "@/server/trpc/router";
import { createTRPCContext } from "@/server/trpc/context";

function baseUrl(): string {
  // tRPC context currently only uses Request for future auth/session plumbing.
  // Use a stable URL so code can run in dev/preview/prod without env coupling.
  const url = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return url;
}

export async function getServerCaller() {
  return appRouter.createCaller(
    await createTRPCContext({ req: new Request(baseUrl()) }),
  );
}

