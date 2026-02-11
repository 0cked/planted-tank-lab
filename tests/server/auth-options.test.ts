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

  it("enables the Email provider when Resend env vars are present", async () => {
    const prev = {
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM,
      EMAIL_SERVER: process.env.EMAIL_SERVER,
    };

    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "PlantedTankLab <no-reply@plantedtanklab.com>";
    delete process.env.EMAIL_SERVER;

    vi.resetModules();
    const mod = await import("@/server/auth");

    const hasEmail = mod.authOptions.providers?.some((p) => {
      const id = (p as { id?: unknown }).id;
      return id === "email";
    });

    expect(hasEmail).toBe(true);

    process.env.RESEND_API_KEY = prev.RESEND_API_KEY;
    process.env.EMAIL_FROM = prev.EMAIL_FROM;
    process.env.EMAIL_SERVER = prev.EMAIL_SERVER;
  });
});
