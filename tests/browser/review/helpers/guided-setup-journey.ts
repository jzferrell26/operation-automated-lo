import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { expect, type Page } from "@playwright/test";

import { READY_OPEN_HOUSE, type OpenHouseWindow } from "../../helpers/open-house-draft.js";

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
  /**
   * Step 1's route is `/overview`, so a restart from anywhere else is also a navigation, and the
   * panel is visible before that navigation has landed. A spec that carried on here would be
   * acting on the page the restart is leaving.
   *
   * Measured on 2026-09-20, when one spec walked "Let's go" into a page that was still arriving and
   * its Continue never advanced, and another ran axe during the transition and was told the
   * document has no title. Both were specs that had just started reusing one account across cells,
   * which is what made a restart mid-spec common enough to see. Waiting for the address and for a
   * title the route has set is waiting for the page the restart meant.
   */
  await page.waitForURL("**/overview");
  await expect(page).toHaveTitle(/\S/u);
}

/**
 * How long a step may take to arrive after Continue.
 *
 * Steps 2 and 3 save the profile before they move, because the step after them renders from what
 * they just wrote (`guided-setup-provider.tsx`, `renderProfileStep`), and step 3 also changes
 * route. On a cold connection pool the first of those writes takes longer than Playwright's
 * five-second default, and on 2026-09-20 three specs failed waiting five seconds for a step that
 * did arrive. The wait is on the panel a person is waiting for rather than on the request behind
 * it: a network event can be missed, and a panel that never appears is the failure worth reporting
 * either way.
 *
 * Wave 7m exported it. `guided-setup.timed.spec.ts` was waiting Playwright's bare five seconds for
 * the same panels and failed on 2026-09-20 on a loaded machine with the create screen's submit
 * still reading "Running the checks": the save had not answered yet, so the step it leads to could
 * not be there. One number for "a step is on its way" is what stops that being re-learned per
 * spec.
 */
export const STEP_ARRIVES_TIMEOUT_MS = 30_000;

/** Presses Continue and waits for the step it leads to, by the name the panel carries. */
export async function continueToPanel(page: Page, title: string): Promise<void> {
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("dialog", { name: title })).toBeVisible({
    timeout: STEP_ARRIVES_TIMEOUT_MS,
  });
}

/**
 * Steps 1 through 3, ending on the create screen with step 4 open.
 *
 * The Realtor field is emptied before it is typed into. A person walking the setup a second time
 * finds it holding what they saved the first time, and typing appends, so a spec that reuses one
 * account across cells would build "Priya NadeemPriya Nadeem" and photograph it. Clearing first is
 * what a person does to a prefilled field they want to change, and it makes the value the same on
 * every pass.
 */
export async function walkToTheCreateStep(page: Page, realtorName = "Priya Nadeem"): Promise<void> {
  await page.getByRole("button", { name: "Let's go" }).click();
  await expect(page.getByRole("dialog", { name: "Your details" })).toBeVisible();
  await continueToPanel(page, "Your Realtor partner");
  await page.getByLabel("Realtor's name").fill("");
  await typeIntoLabel(page, "Realtor's name", realtorName);
  await continueToPanel(page, "Create the Open House Boost");
  await page.waitForURL("**/marketing/campaigns/new");
}

/**
 * Types everything the person owns into the create screen, and stops before saving.
 *
 * The two open-house windows come from `tests/browser/helpers/open-house-draft.ts`, where the
 * synthetic suite already keeps them, so "a campaign the checks accept" and "a campaign the checks
 * refuse" mean the same two drafts in both runs. The default window is 2030 rather than a date a
 * few weeks out, for the reason recorded there: a near-term date stops being in the future while
 * the spec is still current.
 */
export async function fillTheCampaign(
  page: Page,
  address: string,
  openHouse: OpenHouseWindow,
): Promise<void> {
  await typeIntoLabel(page, "Property address", address);
  await typeIntoLabel(page, "State", "TX");
  await typeIntoLabel(page, "Property description", "A three-bedroom home near the park.");
  await page.getByLabel("Open house starts").fill(openHouse.startsAt);
  await page.getByLabel("Open house ends").fill(openHouse.endsAt);
  await page.getByLabel("I have permission to market this property.").check();
  await page.getByLabel("I have permission to use the Realtor's materials.").check();
  await typeIntoLabel(page, "Where the ad runs", "Austin metro");
}

/**
 * Walks the step-4 panel along its field sequence until it is pointing at the submit control.
 *
 * `steps/step-model.ts`'s `CAMPAIGN_FIELD_SEQUENCE` ends with "Save and run the checks", and D6
 * hands focus to whatever the panel has just moved on to, so this also leaves that control
 * focused.
 */
export async function pointThePanelAtTheSubmitControl(page: Page): Promise<void> {
  const fieldsAfterTheFirst = 6;
  for (let step = 0; step < fieldsAfterTheFirst; step += 1) {
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await expect(
    page.locator("[data-guided-setup-highlight='true']"),
    "the panel has reached the submit control",
  ).toHaveAccessibleName("Save and run the checks");
}

/**
 * Runs the checks from inside the walkthrough, with the pointer, the way somebody on a phone does.
 *
 * The panel is walked onto the submit control, which is where D6 puts focus, and the control is
 * then tapped. Both halves matter: the focus assertion is D6's promise and the click is D7's.
 *
 * Wave 7p pressed Enter here instead, and said why: on a narrow frame the sheet is docked across
 * the block end, the submit control is the last thing on the create screen, and a page already at
 * its maximum scroll could not lift it any higher, so the press was intercepted by the panel's own
 * footer every time. That was a workaround for a real defect rather than a test of the product: a
 * person on a phone has to be able to tap the control the panel is pointing at. Wave 7r gave the
 * page room at its end under the docked sheet
 * (`apps/web/src/features/guided-setup/model/panel-placement.ts`, `dockedSheetRoom`), so the
 * pointer path is the product's again and this asserts it rather than avoiding it.
 */
export async function runTheChecksFromTheWalkthrough(page: Page): Promise<void> {
  await pointThePanelAtTheSubmitControl(page);
  await expect(
    page.getByRole("button", { name: "Save and run the checks" }),
    "the walkthrough put focus on the control it is pointing at",
  ).toBeFocused();
  await page.getByRole("button", { name: "Save and run the checks" }).click();
  await expect(page.getByRole("dialog", { name: "Read the result" })).toBeVisible({
    timeout: STEP_ARRIVES_TIMEOUT_MS,
  });
  await page.waitForURL(/\/marketing\/campaigns\/(?!new$)[^/]+$/u);
}

/** Fills the fields the user owns and saves, leaving the browser on the campaign's own page. */
export async function saveTheCampaign(
  page: Page,
  address = "48 Cedar Street, Austin",
  openHouse: OpenHouseWindow = READY_OPEN_HOUSE,
): Promise<string> {
  await fillTheCampaign(page, address, openHouse);
  await page.getByRole("button", { name: "Save and run the checks" }).click();
  // The walkthrough moving to step 5 is the signal that the checks have run and the campaign has
  // its own page. A URL glob is not: `**/marketing/campaigns/**` also matches the create screen
  // this call started on, so waiting on one would return before anything had been saved.
  await expect(page.getByRole("dialog", { name: "Read the result" })).toBeVisible();
  await page.waitForURL(/\/marketing\/campaigns\/(?!new$)[^/]+$/u);
  return page.url();
}
