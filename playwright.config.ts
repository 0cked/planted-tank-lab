import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:3011",
    trace: "on-first-retry",
  },
  webServer: {
    command: "PORT=3011 pnpm start",
    url: "http://localhost:3011",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
