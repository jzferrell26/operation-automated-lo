import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { expect, type Page } from "@playwright/test";

/**
 * PRD-006c D9. The shared machinery for the five review specs.
 *
 * The typing model is the whole point of the timed run. A test that filled fields with
 * `fill()` would measure the server and nothing else, and would report a first-run time no human
 * has ever had. So every value is typed one character at a time at 200 ms, and every screen gets
 * a four-second reading pause before the user acts on it. What the run measures is therefore the
 * product's share of a real first five minutes: the reading, the typing, and the round trips.
 */

export const TYPING_DELAY_MS = 200;
export const READING_PAUSE_MS = 4_000;

export const REVIEW_ORIGIN = process.env["OALO_REVIEW_APP_URL"] ?? "https://127.0.0.1:3443";

export function seededCredentials() {
  const creatorEmail = process.env["OALO_TEST_SEEDED_CREATOR_EMAIL"];
  const approverEmail = process.env["OALO_TEST_SEEDED_APPROVER_EMAIL"];
  const password = process.env["OALO_TEST_SEEDED_PASSWORD"];
  if (creatorEmail === undefined || approverEmail === undefined || password === undefined) {
    throw new Error("The review browser run needs the gate's seeded credentials");
  }
  return { approverEmail, creatorEmail, password } as const;
}

/** A fresh address per run, under the reserved `.invalid` top-level domain, so nothing can reach an inbox. */
export function freshEmail(): string {
  return `review-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}@oalo.invalid`;
}

/** The password the timed run creates its account with. It shares no word with the name typed below. */
export const NEW_ACCOUNT_PASSWORD = "harbour lantern gate phrase";
export const NEW_ACCOUNT_NAME = "Dana Reyes";
export const NEW_ACCOUNT_COMPANY = "Northgate Lending";

export async function readLikeAPerson(page: Page): Promise<void> {
  await page.waitForTimeout(READING_PAUSE_MS);
}

/** Types into a control the way a person does: focus it, then press the keys. */
export async function typeInto(page: Page, selector: string, value: string): Promise<void> {
  await page.locator(selector).first().click();
  await page.keyboard.type(value, { delay: TYPING_DELAY_MS });
}

export async function typeIntoLabel(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label, { exact: false }).first().click();
  await page.keyboard.type(value, { delay: TYPING_DELAY_MS });
}

/**
 * Every request must stay on the review origin. The guard aborts anything else and the assertion
 * afterwards reports what was attempted, so a step that started calling out is a named failure
 * rather than a slow test.
 */
export async function guardLocalOrigin(page: Page): Promise<{ external: string[] }> {
  const external: string[] = [];
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (new URL(url).origin !== new URL(REVIEW_ORIGIN).origin) {
      external.push(url);
      await route.abort();
      return;
    }
    await route.continue();
  });
  return { external };
}

export function expectNoExternalRequests(guard: { external: string[] }): void {
  expect(guard.external, guard.external.join("\n")).toEqual([]);
}

export type StepTiming = Readonly<{ step: string; seconds: number }>;

/** A stopwatch that reports whole-tenths, because a budget in seconds deserves no more precision. */
export class JourneyClock {
  readonly #timings: StepTiming[] = [];
  #startedAt = Date.now();
  #lastMark = Date.now();

  restart(): void {
    this.#startedAt = Date.now();
    this.#lastMark = this.#startedAt;
  }

  mark(step: string): number {
    const now = Date.now();
    const seconds = Math.round(((now - this.#lastMark) / 1000) * 10) / 10;
    this.#lastMark = now;
    this.#timings.push({ step, seconds });
    return seconds;
  }

  get totalSeconds(): number {
    return Math.round(((Date.now() - this.#startedAt) / 1000) * 10) / 10;
  }

  get timings(): readonly StepTiming[] {
    return this.#timings;
  }
}

const EVIDENCE_PATH = join(
  process.cwd(),
  "docs",
  "operations",
  "evidence-packs",
  "guided-setup-timing.md",
);

/**
 * 006C-AC-015. The measured numbers, written only under the regenerate flag the existing browser
 * suite already uses, so an ordinary run never rewrites a committed file.
 */
export function writeTimingEvidence(input: {
  readonly timings: readonly StepTiming[];
  readonly totalSeconds: number;
  readonly budgets: Readonly<Record<string, number>>;
  readonly ceilingSeconds: number;
  readonly commit: string;
}): void {
  const rows = input.timings
    .map((timing) => {
      const budget = input.budgets[timing.step];
      const verdict =
        budget === undefined ? "no budget" : timing.seconds <= budget ? "within" : "over";
      return `| ${timing.step} | ${timing.seconds.toFixed(1)} | ${budget === undefined ? "n/a" : budget.toFixed(0)} | ${verdict} |`;
    })
    .join("\n");

  const body = `# Guided setup timing

Generated by \`tests/browser/review/guided-setup.timed.spec.ts\` under \`OALO_REGENERATE_UI_EVIDENCE=true\`,
inside \`pnpm test:db\`, against the disposable database and a real \`next start\` in review mode.

The numbers are user time under PRD-006c D9's model: every value typed one character at a time at
${String(TYPING_DELAY_MS)} ms, a ${String(READING_PAUSE_MS / 1000)}-second reading pause before acting on each screen, and the real
server round trips. They are not machine time, and they are not a benchmark.

- Date: ${new Date().toISOString().slice(0, 10)}
- Measured against commit: ${input.commit}, plus the working tree this file was written from
- Ceiling: ${String(input.ceilingSeconds)} s, from account creation to the last step's Done
- Measured total: ${input.totalSeconds.toFixed(1)} s

| Step | Measured (s) | Budget (s) | Verdict |
| --- | --- | --- | --- |
${rows}
| **Total** | **${input.totalSeconds.toFixed(1)}** | **${String(input.ceilingSeconds)}** | **${input.totalSeconds <= input.ceilingSeconds ? "within" : "over"}** |
`;

  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
  writeFileSync(EVIDENCE_PATH, body, "utf8");
}

export const shouldWriteEvidence = process.env["OALO_REGENERATE_UI_EVIDENCE"] === "true";

/**
 * The guided setup auto-starts on every authenticated render and takes the user to the current
 * step's own route, so a spec cannot navigate to a screen and work there: the walkthrough would
 * send it back. Every spec therefore walks the setup, which is also the only honest way to test a
 * walkthrough.
 */
export async function signUpFreshAccount(page: Page, email: string): Promise<void> {
  await page.goto("/sign-up");
  await typeIntoLabel(page, "Your name", NEW_ACCOUNT_NAME);
  await typeIntoLabel(page, "Email", email);
  await typeIntoLabel(page, "Password", NEW_ACCOUNT_PASSWORD);
  await typeIntoLabel(page, "Company", NEW_ACCOUNT_COMPANY);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/overview");
}

export async function signInExisting(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/sign-in");
  await typeIntoLabel(page, "Email", email);
  await typeIntoLabel(page, "Password", password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(?:overview|sign-in\/choose)/u);
  if (page.url().includes("/sign-in/choose")) {
    await page.getByRole("button").first().click();
    await page.waitForURL("**/overview");
  }
}

/**
 * Puts a person whose setup has already been walked back at step 1.
 *
 * The seeded creator and approver are the same two people on every run of this gate, and their
 * progress is stored on the server, so the second run finds them wherever the first one left them.
 * That is the product working. "Show me around again" is the control a real person would use, and
 * using it here is what makes a spec about those two people repeatable.
 */
export async function restartGuidedSetup(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Help" }).click();
  await page.getByRole("button", { name: "Show me around again" }).click();
  await expect(
    page.getByRole("dialog", { name: "Let's set up your first Open House Boost" }),
  ).toBeVisible();
}

/** Steps 1 through 3, ending on the create screen with step 4 open. */
export async function walkToTheCreateStep(page: Page, realtorName = "Priya Nadeem"): Promise<void> {
  await page.getByRole("button", { name: "Let's go" }).click();
  await expect(page.getByRole("dialog", { name: "Your details" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("dialog", { name: "Your Realtor partner" })).toBeVisible();
  await typeIntoLabel(page, "Realtor's name", realtorName);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/marketing/campaigns/new");
  await expect(page.getByRole("dialog", { name: "Create the Open House Boost" })).toBeVisible();
}

/** Fills the fields the user owns and saves, leaving the browser on the campaign's own page. */
export async function saveTheCampaign(
  page: Page,
  address = "48 Cedar Street, Austin",
): Promise<string> {
  await typeIntoLabel(page, "Property address", address);
  await typeIntoLabel(page, "State", "TX");
  await typeIntoLabel(page, "Property description", "A three-bedroom home near the park.");
  await page.getByLabel("Open house starts").fill("2026-10-03T13:00");
  await page.getByLabel("Open house ends").fill("2026-10-03T15:00");
  await page.getByLabel("I have permission to market this property.").check();
  await page.getByLabel("I have permission to use the Realtor's materials.").check();
  await typeIntoLabel(page, "Where the ad runs", "Austin metro");
  await page.getByRole("button", { name: "Save and run the checks" }).click();
  // The walkthrough moving to step 5 is the signal that the checks have run and the campaign has
  // its own page. A URL glob is not: `**/marketing/campaigns/**` also matches the create screen
  // this call started on, so waiting on one would return before anything had been saved.
  await expect(page.getByRole("dialog", { name: "Read the result" })).toBeVisible();
  await page.waitForURL(/\/marketing\/campaigns\/(?!new$)[^/]+$/u);
  return page.url();
}
