import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    // Tests hit the Supabase transaction pooler, which has low connection limits.
    // Keep Vitest concurrency low to avoid flaky "Max client connections reached" failures.
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    maxConcurrency: 1,
  },
});
