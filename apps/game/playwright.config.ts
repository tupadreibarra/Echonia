import { defineConfig } from "@playwright/test";

// One-time setup before this test can run: `npx playwright install chromium`
// from apps/game. This project-local install is separate from any global
// Playwright install on the machine (used for ad hoc dev scripting) — CI or
// a fresh clone needs this step regardless of what's installed globally.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false, // both specs would otherwise create players against the same dev DB concurrently
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @echonia/server run dev",
      url: "http://localhost:4000/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "pnpm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
