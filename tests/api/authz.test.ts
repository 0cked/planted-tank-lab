import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { appRouter } from "@/server/trpc/router";

async function expectTrpcErrorCode<T>(p: Promise<T>, code: string): Promise<void> {
  try {
    await p;
    throw new Error("Expected tRPC call to throw.");
  } catch (err) {
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe(code);
  }
}

describe("tRPC authorization helpers", () => {
  it("adminProcedure rejects signed-out and non-admin callers", async () => {
    const anonCaller = appRouter.createCaller({
      db,
      req: new Request("http://localhost"),
      session: null,
    });

    await expectTrpcErrorCode(anonCaller.builds.list({ limit: 1 }), "UNAUTHORIZED");

    const userCaller = appRouter.createCaller({
      db,
      req: new Request("http://localhost"),
      session: { user: { id: crypto.randomUUID(), email: "x@example.com", role: "user" } },
    });

    await expectTrpcErrorCode(userCaller.builds.list({ limit: 1 }), "FORBIDDEN");

    const adminCaller = appRouter.createCaller({
      db,
      req: new Request("http://localhost"),
      session: { user: { id: crypto.randomUUID(), email: "admin@example.com", role: "admin" } },
    });

    const rows = await adminCaller.builds.list({ limit: 1 });
    expect(Array.isArray(rows)).toBe(true);
  });
});

