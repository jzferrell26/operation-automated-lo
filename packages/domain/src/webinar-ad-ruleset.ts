import { evaluateLibraryAdRules, type LibraryAdRuleInput } from "./library-ad-ruleset.js";
import { libraryAdPlacesProblem } from "./library-ad-places.js";

import { type WebinarAdRuleCode } from "./webinar-ad-rule-codes.js";
export {
  WEBINAR_AD_RULESET_REF,
  WEBINAR_AD_RULE_CODES,
  type WebinarAdRuleCode,
} from "./webinar-ad-rule-codes.js";

export interface WebinarAdRuleContext {
  readonly templateSourceHash: string;
  readonly destinationHash: string;
  readonly tallSha256: string;
  readonly squareSha256: string;
  readonly rendererVersion: string;
  readonly partnerNames: readonly string[];
}
export interface WebinarAdRuleInput extends LibraryAdRuleInput {
  readonly blueprintId: "webinar-ad";
  readonly template: { readonly sourceHash: string; readonly rightsBasis: "platform-original" };
  readonly destinationHash: string;
  readonly destination: { readonly expiresAt: string; readonly eventStartsAt: string | null };
  readonly images: readonly {
    readonly contentSha256: string;
    readonly rendererVersion: string;
    readonly width: number;
    readonly height: number;
    readonly byteLength: number;
  }[];
  readonly meta: {
    readonly enabled: false;
    readonly targeting: {
      readonly regions: readonly string[];
      readonly cities: readonly string[];
      readonly zipCodes: readonly string[];
      readonly customAudienceRefs: readonly string[];
      readonly protectedDimensions: readonly string[];
    };
    readonly dailyBudgetMinor: number;
    readonly totalBudgetMinor: number;
  };
}
export interface WebinarAdFinding {
  readonly severity: "blocking" | "warning";
  readonly ruleCode: string;
  readonly description: string;
  readonly affected: string;
  readonly remediation: string;
}

/** Compares frozen, server-verified evidence. It never probes mutable publication or source state. */
export function evaluateWebinarAdRules(
  manifest: WebinarAdRuleInput,
  context: WebinarAdRuleContext,
  evaluatedAt: string,
): readonly WebinarAdFinding[] {
  const findings: WebinarAdFinding[] = [];
  const add = (
    ruleCode: WebinarAdRuleCode,
    affected: string,
    description: string,
    remediation: string,
  ) => findings.push({ severity: "blocking", ruleCode, affected, description, remediation });
  if (manifest.template.sourceHash !== context.templateSourceHash) {
    add(
      "WEBINAR_SOURCE_CHANGED",
      "template",
      "The selected creative changed after this version was prepared.",
      "Choose the current template and save a new version.",
    );
  }
  const [tall, square] = manifest.images;
  if (
    manifest.images.length !== 2 ||
    tall?.contentSha256 !== context.tallSha256 ||
    square?.contentSha256 !== context.squareSha256 ||
    tall?.width !== 1080 ||
    tall.height !== 1350 ||
    square?.width !== 1080 ||
    square.height !== 1080 ||
    manifest.images.some(
      (image) =>
        image.rendererVersion !== context.rendererVersion ||
        image.byteLength <= 0 ||
        image.byteLength > 2 * 1024 * 1024,
    )
  ) {
    add(
      "WEBINAR_RASTER_CHANGED",
      "images",
      "The finished pictures do not match this saved version.",
      "Save a new version with verified finished pictures.",
    );
  }
  if (manifest.destinationHash !== context.destinationHash) {
    add(
      "WEBINAR_DESTINATION_CHANGED",
      "destination",
      "The published webinar changed after this version was prepared.",
      "Select the published webinar and save a new version.",
    );
  }
  const now = Date.parse(evaluatedAt);
  const expiry = Date.parse(manifest.destination.expiresAt);
  const event =
    manifest.destination.eventStartsAt === null
      ? Infinity
      : Date.parse(manifest.destination.eventStartsAt);
  if (expiry <= now || event <= now) {
    add(
      "WEBINAR_DESTINATION_EXPIRED",
      "destination",
      "The published webinar has expired or started.",
      "Choose an available future webinar publication.",
    );
  }
  const end = Date.parse(manifest.schedule.endsAt);
  if (manifest.schedule.startsAt !== null || end <= now || end > expiry || end > event) {
    add(
      "WEBINAR_SCHEDULE_INVALID",
      "schedule",
      "The ad stop time is outside the available webinar window.",
      "Save a future stop time before publication expiry and the live webinar start.",
    );
  }
  if (!manifest.content.disclosureText.trim())
    add(
      "DISCLOSURE_REQUIRED",
      "content.disclosureText",
      "The disclosure line is missing.",
      "Add your disclosure line in Brand.",
    );
  if (!manifest.content.consentText.trim())
    add(
      "CONSENT_REQUIRED",
      "content.consentText",
      "The lead form wording is missing.",
      "Add your lead form wording in Brand.",
    );
  if (
    libraryAdPlacesProblem({
      states: manifest.meta.targeting.regions,
      cities: manifest.meta.targeting.cities,
    }) !== undefined ||
    manifest.meta.targeting.zipCodes.length ||
    manifest.meta.targeting.customAudienceRefs.length ||
    manifest.meta.targeting.protectedDimensions.length
  ) {
    add(
      "TARGETING_NOT_ALLOWED",
      "meta.targeting",
      "Choose usable cities or states.",
      "Choose at least one permitted city or state.",
    );
  }
  if (
    manifest.meta.dailyBudgetMinor < 500 ||
    manifest.meta.dailyBudgetMinor > 100000 ||
    manifest.meta.totalBudgetMinor < 500 ||
    manifest.meta.totalBudgetMinor > 500000
  ) {
    add(
      "BUDGET_OUT_OF_BOUNDS",
      "meta",
      "The budget is outside the allowed limits.",
      "Choose $5 to $1,000 daily and $5 to $5,000 total.",
    );
  }
  // Reuse established claim/co-brand rules. Webinar expiry uses the exact instant above,
  // so the older library rule's calendar-day check is intentionally excluded.
  findings.push(
    ...evaluateLibraryAdRules(
      manifest,
      {
        headlineMaxLength: 60,
        primaryTextMaxLength: 300,
        partnerNames: context.partnerNames,
        retiredOn: null,
      },
      evaluatedAt,
    ).filter((item) => item.ruleCode !== "RUN_DATES_INVALID"),
  );
  if (!/^\d{4,12}$/u.test(manifest.advertiser.companyNmls)) {
    add(
      "NMLS_NUMBER_REQUIRED",
      "advertiser.companyNmls",
      "Your company NMLS number is missing or invalid.",
      "Add the company NMLS number in Brand.",
    );
  }
  if (!manifest.advertiser.name.trim() || !manifest.advertiser.company.trim()) {
    add(
      "NMLS_NUMBER_REQUIRED",
      "advertiser",
      "Your saved lender identity is incomplete.",
      "Add your name and company in Brand.",
    );
  }
  return Object.freeze(findings);
}
