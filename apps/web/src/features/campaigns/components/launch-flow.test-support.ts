import { rulesetRuleCodes } from "@oalo/application";

import { RULE_PLAIN_NAMES } from "../../../copy/launch-messages.js";
import type { LaunchAdCard, LaunchBand } from "../launch-model.js";
import type { LaunchReviewData, LaunchReviewFinding } from "./launch-review.js";

/**
 * Test support for "Launch an ad": a small library and a saved Brand built from the repository's
 * own sample identity (`apps/web/src/features/brand/model/synthetic-brand-profile.ts`).
 */

export const TEST_BAND: LaunchBand = Object.freeze({
  name: "Alex Morgan",
  title: "Loan officer",
  company: "Prairie Home Lending",
  nmls: "0000000",
  companyNmls: "0000000",
  colorPresetId: "forest",
  disclosureLine: "Equal Housing Opportunity.",
});

function card(
  id: string,
  topic: LaunchAdCard["topic"],
  name: string,
  headline: string,
  approvedOn: string,
): LaunchAdCard {
  return Object.freeze({
    id,
    version: 1,
    topic,
    name,
    headline,
    primaryText: `${headline} Send me a message.`,
    headlineMaxLength: 60,
    primaryTextMaxLength: 300,
    callToAction: "LEARN_MORE",
    alt: `${name}, a house drawn in simple shapes`,
    art: Object.freeze({
      tall: `/api/ads-library/samples/${id}/1/tall`,
      square: `/api/ads-library/samples/${id}/1/square`,
    }),
    approvedOn,
    sample: true,
  });
}

export const TEST_CARDS: readonly LaunchAdCard[] = Object.freeze([
  card(
    "sample-first-home",
    "first-time-buyers",
    "Sample: First home, start here",
    "Thinking about your first home? Start here.",
    "2026-09-28",
  ),
  card(
    "sample-first-home-checklist",
    "first-time-buyers",
    "Sample: Your first home checklist",
    "Your first home checklist starts with one call.",
    "2026-09-12",
  ),
  card(
    "sample-loan-review",
    "refinance",
    "Sample: Is your home loan still a fit?",
    "Wondering if your home loan still fits?",
    "2026-09-20",
  ),
  card(
    "sample-va-home-loans",
    "va-loans",
    "Sample: Home loans for veterans",
    "Served our country? Let's talk home loans.",
    "2026-09-18",
  ),
]);

/**
 * A saved version as step 3 reads it. The checks are counted from the ruleset registry, as the
 * server counts them (`apps/web/src/server/launch-an-ad.ts`, `checksOf`), so a fixture cannot carry
 * a count typed by hand.
 */
export function reviewFixture(
  overrides: Partial<LaunchReviewData> = {},
  failing: readonly LaunchReviewFinding[] = [],
): LaunchReviewData {
  const registered = rulesetRuleCodes("ruleset_libraryAd001") ?? [];
  const failed = new Set(failing.map((finding) => finding.ruleCode));
  return {
    campaignRef: "campaign_0123456789abcdef",
    campaignVersionRef: "campaignversion_0123456789abcdef",
    versionNo: 1,
    manifestHash: "a".repeat(64),
    preflightResultHash: "b".repeat(64),
    rowVersion: 1,
    state: failing.length > 0 ? "preflight_failed" : "awaiting_approval",
    detailHref: "/marketing/campaigns/campaign_0123456789abcdef",
    canApprove: true,
    decision: undefined,
    ad: {
      id: "sample-first-home",
      version: 2,
      name: "Sample: First home, start here",
      topic: "first-time-buyers",
      alt: "A house drawn in simple shapes under a large mark",
      art: {
        tall: "/api/ads-library/samples/sample-first-home/2/tall",
        square: "/api/ads-library/samples/sample-first-home/2/square",
      },
      sample: true,
      callToAction: "LEARN_MORE",
      defaults: {
        headline: "Thinking about your first home? Start here.",
        primaryText: "Send me a message and let's talk about your plans.",
      },
    },
    retiredOn: null,
    adRefusal: undefined,
    newerVersion: undefined,
    canMakeNewVersion: true,
    words: {
      headline: "Buying your first home in Austin? Start with a plan.",
      primaryText: "Send me a message and let's talk about your plans.",
    },
    advertiser: TEST_BAND,
    budget: { dailyDollars: 25, totalDollars: 350 },
    endsOn: "2026-10-20",
    places: { states: ["TX"], cities: ["Austin, TX"] },
    checks: {
      run: registered.length,
      passed: registered.length - registered.filter((code) => failed.has(code)).length,
      blocking: failing.length > 0,
      rules: registered.map((code) => ({
        code,
        name: RULE_PLAIN_NAMES[code],
        passed: !failed.has(code),
      })),
      findings: failing,
    },
    ...overrides,
  };
}
