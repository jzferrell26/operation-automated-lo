import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  REVIEW_FRAMES,
  expectAxeClean,
  expectNoHorizontalOverflow,
  expectTargetsAreLargeEnough,
  expectTypographyOnBrief,
  settleForScreenshot,
} from "../helpers/design-quality.js";
import {
  expectNoExternalRequests,
  freshEmail,
  guardLocalOrigin,
  signUpFreshAccount,
} from "./helpers/guided-setup-journey.js";
import { chooseThemeFromTheHeader, REVIEW_THEMES } from "./helpers/review-session.js";

/**
 * PRD-009b, the review-project half: the page a real sign-up lands on, photographed by nobody and
 * measured here.
 *
 * Every earlier design review and screenshot baseline looked at seeded or demo data. The page this
 * file reads is the one the product owner saw on 2026-10-01, a brand-new account on `/overview`
 * (PRD-009, Problem), so the account is created here, the way a person creates one, and nothing is
 * seeded.
 *
 * **One account, reused.** Sign-up is rate limited (ten an hour per address, 009G D1), so the
 * account is made once in `beforeAll` and every case reads the same Home. The cases are `serial` and
 * only read, so none of them changes what the next one sees. The review run's samples flag is on
 * (009C-AC-004, `review-browser-run.mjs`), so the library holds the labelled sample ads and Home
 * offers all five topics; the empty-library sentence is photographed from a server started without
 * the flag (009G-AC-001) and asserted at component level (`overview-screen.integration.test.tsx`).
 *
 * Covers 009B-AC-002 (browser), 009B-AC-003, 009B-AC-008 (browser), 009B-AC-011, and the frames and
 * themes of 009B-AC-013. Needs a browser run: `pnpm test:db` starts the server and the TLS terminator
 * the `__Host-` session cookie requires.
 */

const TOPICS = [
  ["First-time buyers", "first-time-buyers"],
  ["Refinance", "refinance"],
  ["VA loans", "va-loans"],
  ["Pre-approval", "pre-approval"],
  ["Down payment help", "down-payment-help"],
] as const;

let context: BrowserContext;
let page: Page;
let guard: Awaited<ReturnType<typeof guardLocalOrigin>>;

test.describe.serial("Home for a brand-new account", () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000);
    context = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await context.newPage();
    guard = await guardLocalOrigin(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signUpFreshAccount(page, freshEmail());
  });

  test.afterAll(async () => {
    expectNoExternalRequests(guard);
    await context?.close();
  });

  /**
   * 009B-AC-011, the first render. `signUpFreshAccount` waits for `/overview` and nothing more, so
   * what is read here is the first thing a new account sees. A dialog, a floating panel, a "Finish
   * setup" chip, or a highlighted element is the walkthrough this PRD retired.
   */
  test("the first render has no dialog, no floating panel, and no walkthrough control (009B-AC-011)", async () => {
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "One property. One partner. A stronger first impression.",
      }),
    ).toBeVisible();

    await expect(page.locator("[role='dialog']")).toHaveCount(0);
    await expect(page.locator("[data-guided-setup-highlight], [data-tour]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /finish setup|show me around/iu })).toHaveCount(
      0,
    );
    await expect(page.getByText(/show me around again/iu)).toHaveCount(0);

    // Nothing is fixed over the page apart from the top bar itself.
    const floating = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter((element) => getComputedStyle(element).position === "fixed")
        .map((element) => element.tagName.toLowerCase()),
    );
    expect(floating).toEqual([]);
  });

  test("POST /api/setup/progress answers 404, because the route is gone (009B-AC-011)", async () => {
    const response = await page.request.post("/api/setup/progress", {
      data: {
        progress: { status: "in_progress", currentStep: 1, completedSteps: [], restartedCount: 0 },
      },
    });

    expect(response.status()).toBe(404);
  });

  test("the start card is the question, the topics, the one primary, and the three steps (009B-AC-002)", async () => {
    const start = page.getByRole("region", { name: "Launch an ad" });

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(start.getByText("What do you want to promote?")).toBeVisible();
    const topics = start.getByRole("list", { name: "What do you want to promote?" });
    await expect(topics.getByRole("link")).toHaveText(TOPICS.map(([label]) => label));
    for (const [label, topic] of TOPICS) {
      await expect(topics.getByRole("link", { name: label, exact: true })).toHaveAttribute(
        "href",
        `/marketing/campaigns/new?topic=${topic}`,
      );
    }
    await expect(start.getByRole("link", { name: "Choose an ad", exact: true })).toHaveAttribute(
      "href",
      "/marketing/campaigns/new",
    );
    await expect(
      start.getByRole("list", { name: "What happens next" }).getByRole("listitem"),
    ).toHaveText(["1Choose an ad", "2Set it up", "3Review and launch"]);
    // One primary button per screen: the page has no button drawn as the primary action but this link.
    await expect(page.locator("main [data-home-primary]")).toHaveCount(1);
  });

  test("a topic opens step 1 filtered, and Choose an ad opens it with every ad (009B-AC-002)", async () => {
    await page.getByRole("link", { name: "Refinance", exact: true }).click();
    await page.waitForURL("**/marketing/campaigns/new?topic=refinance");

    await page.goto("/overview");
    await page.getByRole("link", { name: "Choose an ad", exact: true }).click();
    await page.waitForURL(/\/marketing\/campaigns\/new$/u);
    await page.goto("/overview");
  });

  /**
   * 009B-AC-003. Walked with the keyboard, because focus order is what a keyboard makes of the DOM
   * order, and the stylesheet draws the topics above the primary button.
   *
   * A brand-new account has an unconfirmed email, and PRD-006a (006A-AC-021) puts its notice above
   * the page's own content in every workspace screen, so its "Send it again" button is the first
   * control inside `main`. The criterion is read as the first of Home's own controls: nothing but
   * that notice may stand between the top bar and "Choose an ad".
   */
  test("Choose an ad is the first of Home's controls, then the topic buttons (009B-AC-003)", async () => {
    await page.goto("/overview");
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    const walked: string[] = [];
    for (let press = 0; press < 40; press += 1) {
      await page.keyboard.press("Tab");
      walked.push(
        await page.evaluate(() => {
          const focused = document.activeElement as HTMLElement | null;
          return (focused?.getAttribute("aria-label") ?? focused?.textContent ?? "").trim();
        }),
      );
      if (walked.includes("Down payment help")) break;
    }

    expect(walked[0], "the skip link is first").toBe("Skip to content");
    const primary = walked.indexOf("Create a property campaign");
    expect(primary, "The implemented property flow is reached first (UX-001)").toBeGreaterThan(0);
    // What sits between the top bar and the primary button is the verification notice, at most.
    const topBarEnd = walked.findIndex((name) => name.startsWith("Your account: "));
    expect(topBarEnd).toBeGreaterThan(0);
    const between = walked.slice(topBarEnd + 1, primary);
    expect(between.filter((name) => !/send it again|resend/iu.test(name))).toEqual([]);
    expect(walked.slice(primary, primary + 8)).toEqual([
      "Create a property campaign",
      "View your campaigns",
      "Choose an ad",
      ...TOPICS.map(([label]) => label),
    ]);
  });

  for (const frame of REVIEW_FRAMES.filter((candidate) => candidate.width >= 1100)) {
    test(`at ${frame.name} the checklist sits beside the start card, and the lists sit under it, side by side (009B-AC-003)`, async () => {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await page.goto("/overview");

      const [start, setup, running, approval] = await Promise.all(
        ["Launch an ad", "Get set up", "Running now", "Needs your approval"].map((name) =>
          page.getByRole("region", { name }).boundingBox(),
        ),
      );
      expect(start && setup && running && approval).toBeTruthy();
      if (!start || !setup || !running || !approval) return;
      expect(setup.x, "the checklist is in the right-hand column").toBeGreaterThan(
        start.x + start.width - 1,
      );
      expect(Math.abs(setup.y - start.y), "the two share a top edge").toBeLessThan(2);
      expect(running.y, "Running now is under the start card").toBeGreaterThan(
        start.y + start.height,
      );
      expect(approval.x, "the two lists share a row").toBeGreaterThan(
        running.x + running.width - 1,
      );
      expect(Math.abs(approval.y - running.y), "the two lists share a top edge").toBeLessThan(2);
    });
  }

  for (const frame of REVIEW_FRAMES.filter((candidate) => candidate.width < 1100)) {
    test(`at ${frame.name} the cards stack: start, checklist, running, approval (009B-AC-003)`, async () => {
      await page.setViewportSize({ width: frame.width, height: frame.height });
      await page.goto("/overview");

      const boxes = await Promise.all(
        ["Launch an ad", "Get set up", "Running now", "Needs your approval"].map((name) =>
          page.getByRole("region", { name }).boundingBox(),
        ),
      );
      for (const box of boxes) expect(box).not.toBeNull();
      const present = boxes.filter((box) => box !== null);
      for (let index = 1; index < present.length; index += 1) {
        const previous = present[index - 1];
        const next = present[index];
        expect(
          next?.y ?? 0,
          `card ${String(index + 1)} starts below card ${String(index)}`,
        ).toBeGreaterThan((previous?.y ?? 0) + (previous?.height ?? 0) - 1);
      }
    });
  }

  /**
   * 009B-AC-008, in the browser. The page says what is not connected once, in the "Get set up" card,
   * and the card's own two item states are the only other place the words appear.
   */
  test("says a connection is missing once, inside the Get set up card (009B-AC-008)", async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/overview");

    const missing =
      /not connected|aren't connected|isn't connected|not live yet|connect (?:HighLevel|Meta|your account)/iu;
    const outside = await page.evaluate((source) => {
      const pattern = new RegExp(source, "iu");
      const main = document.querySelector("main");
      if (main === null) return ["there is no main landmark"];
      const found: string[] = [];
      for (const element of main.querySelectorAll("p, span, li, h2, h3, a, small, div")) {
        if (element.closest("[data-home='setup']") !== null) continue;
        if (element.children.length > 0) continue;
        const text = (element.textContent ?? "").replace(/\s+/gu, " ").trim();
        if (pattern.test(text)) found.push(text);
      }
      return found;
    }, missing.source);
    expect(outside).toEqual([]);

    const setup = page.getByRole("region", { name: "Get set up" });
    await expect(setup.getByText("Not connected yet")).toHaveCount(2);
    await expect(page.getByText("Not connected yet")).toHaveCount(2);
    await expect(page.locator("main .oalo-metric")).toHaveCount(0);
  });

  test("the checklist links go where D2 says (009B-AC-007)", async () => {
    const setup = page.getByRole("region", { name: "Get set up" });

    await expect(
      setup.getByRole("link", { name: "See what's needed for HighLevel" }),
    ).toHaveAttribute("href", "/settings/connections");
    await expect(setup.getByRole("link", { name: "See what's needed for Meta" })).toHaveAttribute(
      "href",
      "/settings/connections",
    );
    await expect(setup.getByRole("link", { name: "Add your brand details" })).toHaveAttribute(
      "href",
      "/brand",
    );
  });

  test("an account with nothing running shows the two honest empty states (009B-AC-009, 010)", async () => {
    await expect(page.getByText("No ads running")).toBeVisible();
    await expect(page.getByText("Nothing to approve")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Running now" }).getByRole("link", { name: "Launch an ad" }),
    ).toHaveAttribute("href", "/marketing/campaigns/new");
  });

  /**
   * 009B-AC-013, the machine-checkable half of the design review at every frame in both themes. The
   * pictures themselves are 009G's (Wave 4); this holds the page axe-clean, inside its frame, with
   * every control at the 44px target, and on the type steps, before anything is photographed.
   */
  for (const theme of REVIEW_THEMES) {
    test(`Home meets the machine checks at every frame in ${theme} (009B-AC-013)`, async () => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/overview");
      await chooseThemeFromTheHeader(page, theme);
      for (const frame of REVIEW_FRAMES) {
        await page.setViewportSize({ width: frame.width, height: frame.height });
        await settleForScreenshot(page);

        await expectAxeClean(page);
        await expectNoHorizontalOverflow(page);
        await expectTargetsAreLargeEnough(page);
        await expectTypographyOnBrief(page);
      }
    });
  }
});
