import { defineConfig } from "@playwright/test";

const remote = process.env.OALO_PREVIEW_BASE_URL;
const baseURL = remote ?? "http://127.0.0.1:3210";
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: [
    "dashboard-preview.spec.ts",
    "product-onboarding.spec.ts",
    "workspace-pages.spec.ts",
    "homeowner-reports.spec.ts",
    "homeowner-avm.spec.ts",
  ],
  outputDir: remote
    ? "test-results/dashboard-preview-live"
    : "test-results/dashboard-preview-local",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  reporter: "list",
  use: {
    baseURL,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "dashboard-preview", use: { browserName: "chromium" } }],
  ...(remote
    ? {}
    : {
        webServer: {
          command: "pnpm --filter @oalo/web exec next start --hostname 127.0.0.1 --port 3210",
          url: `${baseURL}/overview`,
          reuseExistingServer: false,
          timeout: 60000,
          env: {
            OALO_DASHBOARD_PREVIEW: "enabled",
            OALO_ENVIRONMENT: "preview",
            OALO_PROVIDER_MODE: "stub",
            OALO_SYNTHETIC_DATA_ONLY: "true",
            OALO_PRODUCTION_TRAFFIC: "disabled",
            OALO_REVIEW_SURFACE: "",
          },
        },
      }),
});
