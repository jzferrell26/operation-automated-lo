import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "./test-results/browser",
  fullyParallel: false,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: "list",
  retries: process.env["CI"] ? 2 : 0,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "pnpm --filter @oalo/web... build && pnpm --filter @oalo/web exec next start --hostname 127.0.0.1 --port 3100",
    reuseExistingServer: false,
    timeout: 180_000,
    url: `${baseURL}/overview`,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
