import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";

import {
  leakedReviewStrings,
  userLanguageForbiddenStrings,
} from "../../../apps/web/src/app/(authenticated)/review-surface-sweep.js";
import {
  SHARED_REPORT_UNAVAILABLE_BODY,
  SHARED_REPORT_UNAVAILABLE_TITLE,
} from "../../../apps/web/src/copy/shared-report-messages.js";
import {
  expectNoExternalRequests,
  guardLocalOrigin,
  seededCredentials,
  signInExisting,
} from "./helpers/guided-setup-journey.js";
import { readableSurfaceOf } from "./helpers/readable-surface.js";

/**
 * PRD-008c 008C-AC-006, the half that reads a running review deployment.
 *
 * `apps/web/src/app/(authenticated)/homeowners/homeowners-review-surface.integration.test.tsx`
 * sweeps the homeowner screens with a report, a share link, every dialog, and the shared report
 * page, because a component test can hand them any state it likes. What it cannot show is what the
 * deployed review server puts on those screens, and that is where the two administrator sentences
 * used to reach a loan officer (008C-AC-001): the words came from the server, not from a component.
 *
 * This spec signs the gate's seeded creator in, opens each homeowner screen the way a person does,
 * and reads it through the same vocabulary the component sweep uses (`userLanguageForbiddenStrings`).
 * It does not create an account: the product allows ten sign-ups an hour per address and the
 * review run's other specs have left very little of that budget (`design-quality.spec.ts` counts
 * it), so the two people the gate seeds are what a spec that only needs to be signed in uses.
 *
 * The review deployment does not enable homeowner reports (`OALO_HOMEOWNER_REPORTS` is not in the
 * environment `review-browser-run.mjs` builds), so the screens show the state a loan officer meets
 * before their workspace is enabled: the card that says reports need connecting, and the server's
 * own sentence in the alert. That is the state worth reading here, because it is entirely server
 * wording over a screen with no data behind it.
 */

async function expectReadsInTheContractsVocabulary(scope: Locator, path: string) {
  const surface = await scope.evaluate(readableSurfaceOf);
  expect(surface.length, `${path} rendered something to read`).toBeGreaterThan(80);
  expect(leakedReviewStrings(surface, userLanguageForbiddenStrings()), path).toEqual([]);
}

let context: BrowserContext;
let page: Page;
let guard: Awaited<ReturnType<typeof guardLocalOrigin>>;

test.describe.serial("the homeowner report screens on the review deployment", () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    const { creatorEmail, password } = seededCredentials();
    context = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await context.newPage();
    guard = await guardLocalOrigin(page);
    await signInExisting(page, creatorEmail, password);
  });

  test.afterAll(async () => {
    expectNoExternalRequests(guard);
    await context?.close();
  });

  for (const [screen, path] of [
    ["management", "/homeowners"],
    ["create", "/homeowners/new"],
    ["report detail", `/homeowners/home_${"0".repeat(32)}`],
  ] as const) {
    test(`the ${screen} screen reads in the contract's vocabulary`, async () => {
      test.setTimeout(60_000);
      await page.goto(path, { waitUntil: "networkidle" });
      const main = page.getByRole("main");
      await expect(main).toBeVisible();
      await expect(main.getByRole("heading").first()).toBeVisible();

      await expectReadsInTheContractsVocabulary(main, path);
    });
  }

  test("a shared report link nobody has made reads in the contract's vocabulary", async () => {
    test.setTimeout(60_000);
    const path = `/home-report/${"0".repeat(64)}`;
    const response = await page.goto(path, { waitUntil: "networkidle" });
    // Next.js may already have streamed a parent boundary with status 200; the document that
    // replaces it is the not-found page either way.
    expect([200, 404]).toContain(response?.status());

    // The product's own page, not the framework's default 404 this link used to get (thirty-odd
    // characters that told a homeowner nothing). Next delivers a not-found page's body through the
    // client payload, so wait for the heading rather than read the document the moment it loads.
    await expect(
      page.getByRole("heading", { name: SHARED_REPORT_UNAVAILABLE_TITLE, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(SHARED_REPORT_UNAVAILABLE_BODY)).toBeVisible();

    await expectReadsInTheContractsVocabulary(page.locator("body"), path);
  });
});
