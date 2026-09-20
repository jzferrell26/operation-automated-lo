import { join } from "node:path";

import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";

/**
 * PRD-006d D3. The synthetic suite now saves a campaign, so the synthetic server writes its
 * filesystem store somewhere.
 *
 * Left alone it lands at `apps/web/.oalo/local-campaign-store.json`, because `next start` runs from
 * the application directory (`apps/web/src/server/local-campaign-store.ts:83`). That path is
 * ignored by git and not by Prettier, so `pnpm format:check` fails on a file no person wrote.
 * Pointing it into `test-results/`, which both ignore, keeps a run's leavings out of the source
 * tree entirely.
 */
const localCampaignStore = join(import.meta.dirname, "test-results", "local-campaign-store.json");

/**
 * PRD-006c D9. The review browser run's own base address.
 *
 * The guided setup cannot be exercised over plain http: the runtime composition requires every
 * allowed origin to be `https:`, the mutation gate compares the request's origin and host to them,
 * and the session cookie is `__Host-` prefixed and therefore `Secure`. `pnpm test:db` starts
 * `next start` on 3100 and a dependency-free TLS terminator on 3443 in front of it, so the browser
 * gets a genuinely secure context without weakening any of the three rules.
 */
const reviewBaseURL = "https://127.0.0.1:3443";
const REVIEW_TEST_DIR = "./tests/browser/review";

/**
 * True only inside `pnpm test:db`, which starts and stops the review server itself. The
 * synthetic-mode run in the `verify` job never sets it, so that run's `webServer` is unchanged.
 */
const reviewRun = process.env["OALO_REVIEW_BROWSER_RUN"] === "true";

/**
 * PRD-006d D8, the platform rule. Text rasterises differently on every platform, so a screen
 * baseline only means something on the platform that drew it. The committed baselines under
 * `tests/visual/screens/` are drawn by the `ubuntu-24.04` runner
 * (`.github/workflows/screen-baselines.yml`) and compared wherever `CI` is set, which is that same
 * runner. Every other run skips the comparison rather than failing on rasterisation, unless
 * `OALO_COMPARE_SCREEN_BASELINES=true` asks for it.
 *
 * `OALO_SCREEN_SNAPSHOT_DIR` points both projects' pictures at a directory outside the
 * repository, which is how the D9 sign-off captures a real set of every screen on any machine
 * without touching a baseline. `OALO_UPDATE_SCREEN_BASELINES` (`all`, `changed`, `missing`, or
 * `true` for missing) selects the write mode for both projects; the review runner passes the same
 * value on its command line, so the two agree.
 */
const captureDirectory = process.env["OALO_SCREEN_SNAPSHOT_DIR"]?.replaceAll("\\", "/");
const compareBaselines =
  Boolean(process.env["CI"]) || process.env["OALO_COMPARE_SCREEN_BASELINES"] === "true";
const baselineWriteMode = ((): "all" | "changed" | "missing" | undefined => {
  const mode = process.env["OALO_UPDATE_SCREEN_BASELINES"];
  if (mode === "true") return "missing";
  if (mode === "all" || mode === "changed" || mode === "missing") return mode;
  return undefined;
})();

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "./test-results/browser",
  fullyParallel: false,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: "list",
  retries: process.env["CI"] ? 2 : 0,
  workers: 1,
  timeout: 30_000,
  /**
   * PRD-006d D8. Visual regression baselines live beside the browser suite, not beside the
   * byte-level rendering goldens in `tests/visual/rendering/`, and `tests/visual/screens/README.md`
   * says why the two are different things.
   */
  snapshotPathTemplate:
    captureDirectory === undefined
      ? "tests/visual/screens/{projectName}/{arg}{ext}"
      : `${captureDirectory}/{projectName}/{arg}{ext}`,
  ignoreSnapshots: captureDirectory === undefined && !compareBaselines,
  ...(baselineWriteMode === undefined ? {} : { updateSnapshots: baselineWriteMode }),
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      /**
       * One pixel in a thousand. Tight enough that a spacing token, a colour role, or a type step
       * moving is a failure, loose enough to survive sub-pixel text rasterisation on the same
       * platform. Animations are frozen so a screenshot never catches a transition mid-flight.
       */
      maxDiffPixelRatio: 0.001,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL,
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  ...(reviewRun
    ? {}
    : {
        webServer: {
          command:
            "pnpm --filter @oalo/web... build && pnpm --filter @oalo/web exec next start --hostname 127.0.0.1 --port 3100",
          env: { OALO_LOCAL_CAMPAIGN_STORE: localCampaignStore },
          reuseExistingServer: false,
          timeout: 180_000,
          url: `${baseURL}/overview`,
        },
      }),
  projects: [
    {
      name: "chromium",
      // The review specs need a signed-in session against a real database, which the synthetic
      // server has none of. They belong to the `review` project and only ever run from the
      // database gate.
      testIgnore: "review/**",
      use: { ...devices["Desktop Chrome"] },
    },
    // The review project exists only inside the database gate, so `pnpm test:browser` in the
    // verify job is exactly the run it was before this feature: one project, the synthetic one.
    ...(reviewRun
      ? [
          {
            name: "review",
            testDir: REVIEW_TEST_DIR,
            // The certificate is self-signed and generated per run into a temporary directory.
            // The browser is pointed at the loopback interface by the gate that made the
            // certificate, so there is no authority for it to check.
            use: { ...devices["Desktop Chrome"], baseURL: reviewBaseURL, ignoreHTTPSErrors: true },
            // Sign-up, seven steps of deliberate typing, and two sign-ins do not fit in 30 seconds.
            timeout: 360_000,
          },
        ]
      : []),
  ],
});
