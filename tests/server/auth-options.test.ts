import { describe, expect, it, vi } from "vitest";

describe("NextAuth options", () => {
  it("enables the Google provider when env vars are present", async () => {
    const prev = {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    };

    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";

    vi.resetModules();
    const mod = await import("@/server/auth");

    const hasGoogle = mod.authOptions.providers?.some((p) => {
      const id = (p as { id?: unknown }).id;
      return id === "google";
    });

    expect(hasGoogle).toBe(true);

    process.env.GOOGLE_CLIENT_ID = prev.GOOGLE_CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = prev.GOOGLE_CLIENT_SECRET;
  });
});

