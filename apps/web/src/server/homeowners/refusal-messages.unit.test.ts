import { HomeownerStoreError } from "@oalo/db";
import { describe, expect, it } from "vitest";
import { findVocabularyHits } from "../../copy/forbidden-vocabulary.js";
import { HomeownerError } from "./errors.js";
import { homeError } from "./http.js";
import { HomeEnvironmentSchema, reportOrigin } from "./runtime.js";

/**
 * PRD-008c 008C-AC-004, the server half.
 *
 * `homeError` answers every refusal with a machine code in `error` and a sentence in `message`, and
 * the screen reads only the sentence. The code stays in the body on purpose, because it is how
 * support finds one request and PRD-008c does not change a response's shape. What these cases pin is
 * the other direction: no sentence is ever the code, repeats the code, or carries a word the
 * user-language contract bans, so a screen that did show `message` could not show a code by
 * accident.
 *
 * The client half, which drives the real screens with these exact responses, is
 * `apps/web/src/features/homeowners/refusal-messages.integration.test.tsx`.
 */

/** The shape a code takes when a screen has leaked it: SCREAMING_SNAKE, or the words run together. */
const MACHINE_CODE = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/u;

async function refusal(error: unknown): Promise<{ status: number; code: string; message: string }> {
  const response = homeError(error);
  const body = (await response.json()) as { error?: unknown; message?: unknown };
  expect(typeof body.message, "a refusal always carries a sentence").toBe("string");
  expect(typeof body.error, "a refusal always names its code").toBe("string");
  return { status: response.status, code: String(body.error), message: String(body.message) };
}

describe("a refusal from the homeowner report server", () => {
  /** Every code `homeError` maps itself, plus one it has never heard of. */
  const STORE_CODES = [
    "LOOKUP_LIMIT",
    "PROPERTY_LIMIT",
    "LOOKUP_STILL_ACTIVE",
    "LOOKUP_ALREADY_ATTEMPTED",
    "DELIVERY_STILL_ACTIVE",
    "LOOKUP_PENDING",
    "IDEMPOTENCY_CONFLICT",
    "PROPERTY_CONFLICT",
    "NOT_FOUND",
    "A_CODE_NOBODY_MAPPED_YET",
  ] as const;

  it.each(STORE_CODES)("says %s in words and never in the code's own", async (code) => {
    const { code: sent, message } = await refusal(new HomeownerStoreError(code));

    expect(sent).toBe(code);
    expect(message).not.toContain(code);
    expect(message).not.toMatch(MACHINE_CODE);
    expect(findVocabularyHits(message), message).toEqual([]);
    expect(message.trim().length).toBeGreaterThan(20);
  });

  it("answers the conflict a repeated request raises with a sentence about the request", async () => {
    const { status, message } = await refusal(new HomeownerStoreError("IDEMPOTENCY_CONFLICT"));

    expect(status).toBe(409);
    expect(message).toBe(
      "This saved request was already used with different details. Start a new report request.",
    );
  });

  /**
   * The two ways the report web address can be wrong, taken from the real function rather than
   * copied, so the sentence a loan officer reads is the one the server sends. Both refusals are
   * about a setting only whoever runs the product can change, so neither may tell the reader to set
   * anything (PRD-008c, 008C-AC-003) and both must say who can help.
   */
  it.each([
    ["missing", {}],
    ["not secure", { OALO_APP_URL: "http://reports.example.test" }],
    ["carries a path", { OALO_APP_URL: "https://reports.example.test/app" }],
  ] as const)(
    "explains a report web address that is %s without asking the reader to set it",
    async (_case, environment) => {
      let thrown: unknown;
      try {
        reportOrigin(HomeEnvironmentSchema.parse(environment));
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(HomeownerError);

      const { status, code, message } = await refusal(thrown);

      expect(status).toBe(503);
      expect(code).toBe("REPORT_URL_NOT_CONFIGURED");
      expect(message).not.toMatch(MACHINE_CODE);
      expect(findVocabularyHits(message), message).toEqual([]);
      expect(message).toContain("Contact support");
      expect(message).not.toMatch(/\bset the\b/iu);
    },
  );

  it("sends the generic sentence for anything it did not expect, with no detail of the failure", async () => {
    const { status, code, message } = await refusal(
      new Error("connect ECONNREFUSED 10.0.0.5:5432"),
    );

    expect(status).toBe(503);
    expect(code).toBe("REPORTS_UNAVAILABLE");
    expect(message).not.toMatch(/ECONNREFUSED|10\.0\.0\.5|5432/u);
    expect(findVocabularyHits(message), message).toEqual([]);
  });
});
