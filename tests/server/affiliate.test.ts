import { describe, expect, it } from "vitest";

import { isHostAllowed, isLikelyBotUserAgent } from "@/server/services/affiliate";

describe("affiliate helpers", () => {
  it("isHostAllowed matches exact host and subdomains with dot boundary", () => {
    expect(
      isHostAllowed({
        hostname: "www.amazon.com",
        allowedHosts: ["amazon.com"],
      }),
    ).toBe(true);

    expect(
      isHostAllowed({
        hostname: "amazon.com",
        allowedHosts: ["amazon.com"],
      }),
    ).toBe(true);

    expect(
      isHostAllowed({
        hostname: "evilamazon.com",
        allowedHosts: ["amazon.com"],
      }),
    ).toBe(false);

    expect(
      isHostAllowed({
        hostname: "amazon.com.evil.com",
        allowedHosts: ["amazon.com"],
      }),
    ).toBe(false);
  });

  it("isLikelyBotUserAgent treats empty UA as bot and common crawlers as bot", () => {
    expect(isLikelyBotUserAgent("")).toBe(true);
    expect(isLikelyBotUserAgent(null)).toBe(true);
    expect(isLikelyBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isLikelyBotUserAgent("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")).toBe(false);
  });
});

