import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { expect, type Page } from "@playwright/test";

/**
 * PRD-006c D9. The shared machinery for the review specs: the typing model, the sign-up and sign-in
 * helpers, the origin guard, and the timing evidence. The file keeps its name because every review
 * spec imports it by that name; the walkthrough it was written for is retired (PRD-009b D4).
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
 * The heading of the measured section in `guided-setup-timing.md`. The file keeps the walkthrough's
 * earlier table under "PRD-006c, retired" (CRR-162 cites it), and this section goes below it:
 * everything from this heading to the end of the file is the part the timed spec owns and rewrites.
 */
export const TIMING_SECTION_HEADING = "## PRD-009, Launch an ad";

export type TimingEvidence = Readonly<{
  readonly timings: readonly StepTiming[];
  readonly totalSeconds: number;
  readonly budgets: Readonly<Record<string, number>>;
  readonly ceilingSeconds: number;
  readonly commit: string;
}>;

/**
 * 009G-AC-008. The measured numbers as the markdown section the evidence file holds, so the block a
 * run prints to its log and the section it writes under the regenerate flag are the same text and
 * cannot disagree.
 */
export function renderTimingSection(input: TimingEvidence): string {
  const rows = input.timings
    .map((timing) => {
      const budget = input.budgets[timing.step];
      const verdict =
        budget === undefined ? "no budget" : timing.seconds <= budget ? "within" : "over";
      return `| ${timing.step} | ${timing.seconds.toFixed(1)} | ${budget === undefined ? "n/a" : budget.toFixed(0)} | ${verdict} |`;
    })
    .join("\n");

  return `${TIMING_SECTION_HEADING}

Generated by \`tests/browser/review/launch-an-ad.timed.spec.ts\` under \`OALO_REGENERATE_UI_EVIDENCE=true\`,
inside \`pnpm test:db\`, against the disposable database and a real \`next start\` in review mode.

The numbers are user time under PRD-006c D9's model: every value typed one character at a time at
${String(TYPING_DELAY_MS)} ms, a ${String(READING_PAUSE_MS / 1000)}-second reading pause before acting on each screen, and the real
server round trips. They are not machine time, and they are not a benchmark. The journey is the one
PRD-009 gives a brand-new loan officer: create an account, add the brand details Home asks for, choose
an ad in "Launch an ad", set it up, and approve the saved version.

- Date: ${new Date().toISOString().slice(0, 10)}
- Measured against commit: ${input.commit}, plus the working tree this file was written from
- Ceiling: ${String(input.ceilingSeconds)} s, from the sign-up page's first paint to an approved version
- Measured total: ${input.totalSeconds.toFixed(1)} s

| Step | Measured (s) | Budget (s) | Verdict |
| --- | --- | --- | --- |
${rows}
| **Total** | **${input.totalSeconds.toFixed(1)}** | **${String(input.ceilingSeconds)}** | **${input.totalSeconds <= input.ceilingSeconds ? "within" : "over"}** |
`;
}

/**
 * 009G-AC-008. The labelled block a run prints so the numbers can be copied from the log of a run
 * that did not regenerate the file, which is every run in continuous integration. The pull request
 * records the total.
 */
export function printTimingBlock(input: TimingEvidence): void {
  const bar = "=".repeat(8);
  console.log(
    [
      `${bar} LAUNCH AN AD TIMING (009G-AC-008): copy into docs/operations/evidence-packs/guided-setup-timing.md ${bar}`,
      renderTimingSection(input),
      `${bar} END LAUNCH AN AD TIMING: total ${input.totalSeconds.toFixed(1)} s against ${String(input.ceilingSeconds)} s ${bar}`,
    ].join("\n"),
  );
}

/**
 * 006C-AC-015 and 009G-AC-008. The measured numbers, written only under the regenerate flag the
 * existing browser suite already uses, so an ordinary run never rewrites a committed file.
 *
 * Only the section below `TIMING_SECTION_HEADING` is replaced. Everything above it, the walkthrough's
 * table under "PRD-006c, retired", is left as it is, and a file that has no such section yet gets it
 * appended.
 */
export function writeTimingEvidence(input: TimingEvidence, path: string = EVIDENCE_PATH): void {
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const at = existing.indexOf(TIMING_SECTION_HEADING);
  const kept = at === -1 ? `${existing.trimEnd()}\n\n` : existing.slice(0, at);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${kept}${renderTimingSection(input)}`, "utf8");
}

export const shouldWriteEvidence = process.env["OALO_REGENERATE_UI_EVIDENCE"] === "true";

/**
 * Signs up the way a person does and lands on Home. A fresh account has nothing connected, no brand,
 * and no campaign, which is the state PRD-009's first-run Home is built for (009G D1).
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
