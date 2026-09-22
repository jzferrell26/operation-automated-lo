import { z } from "zod";

/**
 * PRD-006c D4 and D3's prefill rule. The `setup_profile.v1` preference value, and the mapping from
 * it to the campaign draft's starting values.
 *
 * Every field is the user's own data: their name, their company, their licence number, their phone,
 * and the name of the Realtor they are running an open house with. It is bounded, validated
 * strictly on write, never logged, and named in the retention, deletion, and export runbooks.
 *
 * The prefill rule is the reason this module exists rather than the provider holding a few strings.
 * The draft builder shipped with demo defaults ("123 Main Street, Dallas", "Jordan Smith"). A
 * signed-in user must never see one: a field the product invented reads as a field the user filled
 * in, and it can reach an approver unchanged. So every field is either derived from the profile or
 * empty with a placeholder, and the three fields that carry starter wording say they are starter
 * wording.
 */

export const SETUP_PROFILE_PREFERENCE_KEY = "setup_profile.v1";

const RequiredName = z.string().trim().min(1).max(120);
const OptionalName = z.string().trim().max(120).optional();
const OptionalShort = z.string().trim().max(40).optional();

export const SetupProfileSchema = z
  .object({
    displayName: RequiredName,
    company: z.string().trim().max(120),
    nmlsNumber: OptionalShort,
    phone: OptionalShort,
    realtorName: OptionalName,
    realtorBrokerage: OptionalName,
  })
  .strict();

export type SetupProfile = z.infer<typeof SetupProfileSchema>;

/** A stored value that no longer parses is treated as absent, so the draft falls back to empty. */
export function parseStoredProfile(value: unknown): SetupProfile | undefined {
  const parsed = SetupProfileSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/**
 * D3. One honest default per field, editable, and labelled as starter wording where it is shown.
 * These are constants in one file on purpose: the open question in the PRD recommends constants
 * now and a template registry later, and moving one file is cheaper than unpicking five call sites.
 */
export const CAMPAIGN_STARTER_TEXT = Object.freeze({
  headline: "Open house this weekend",
  body: "Come and see the home in person. I can answer your financing questions while you are there.",
  callToAction: "Get the open house details",
  disclosureText: "Equal Housing Opportunity. Additional lender disclosures apply.",
  consentText:
    "By submitting, you agree to be contacted about this property and related mortgage services.",
});

/** D3. What a field says when there is nothing true to put in it yet. */
export const CAMPAIGN_FIELD_PLACEHOLDERS = Object.freeze({
  address: "Street, city",
  stateCode: "TX",
  propertyDescription: "A sentence about the home",
  realtorDisplayName: "Your Realtor's name",
  region: "The metro area the ad should run in",
});

export type CampaignDraftPrefill = Readonly<{
  realtorDisplayName: string;
  headline: string;
  body: string;
  callToAction: string;
  disclosureText: string;
  consentText: string;
  region: string;
  dailyBudgetDollars: string;
  totalBudgetDollars: string;
}>;

/**
 * D3. The prefill: the Realtor's name and the ad wording come from the profile and the starter
 * text; the address, the state, the description, the dates, and the two permission boxes are the
 * user's to supply, and stay empty. The budgets carry the product's own floor, which is a number
 * the user can change rather than a claim about their business.
 */
export function campaignDraftPrefill(profile: SetupProfile | undefined): CampaignDraftPrefill {
  return Object.freeze({
    realtorDisplayName: profile?.realtorName ?? "",
    headline: CAMPAIGN_STARTER_TEXT.headline,
    body: CAMPAIGN_STARTER_TEXT.body,
    callToAction: CAMPAIGN_STARTER_TEXT.callToAction,
    disclosureText: CAMPAIGN_STARTER_TEXT.disclosureText,
    consentText: CAMPAIGN_STARTER_TEXT.consentText,
    region: "",
    dailyBudgetDollars: "25",
    totalBudgetDollars: "125",
  });
}

/**
 * D3 step 2: name and company are "prefilled from sign-up". Both values are already in the
 * session, because sign-up puts the person's name on their account and the company they typed on
 * the workspace it created. Reading them from the session rather than asking again is the
 * difference between a step that takes ten seconds and one that takes forty.
 *
 * A person who skipped the optional company field at sign-up sees their workspace's default name
 * and can change it, which is the honest state: the product knows what it was told and nothing
 * more.
 */
export function profileFromSession(
  profile: SetupProfile | undefined,
  session: Readonly<{ displayName: string; workspaceName: string }>,
): SetupProfile {
  return {
    displayName: profile?.displayName ?? session.displayName,
    company: profile?.company ?? session.workspaceName,
    ...(profile?.nmlsNumber === undefined ? {} : { nmlsNumber: profile.nmlsNumber }),
    ...(profile?.phone === undefined ? {} : { phone: profile.phone }),
    ...(profile?.realtorName === undefined ? {} : { realtorName: profile.realtorName }),
    ...(profile?.realtorBrokerage === undefined
      ? {}
      : { realtorBrokerage: profile.realtorBrokerage }),
  };
}

/** Drops the empty optional fields, so a blank box never stores an empty string. */
export function normalizeProfileInput(input: Readonly<Record<string, string>>): SetupProfile {
  const optional = (name: string): Readonly<Record<string, string>> => {
    const value = (input[name] ?? "").trim();
    return value.length === 0 ? {} : { [name]: value };
  };
  return SetupProfileSchema.parse({
    displayName: (input["displayName"] ?? "").trim(),
    company: (input["company"] ?? "").trim(),
    ...optional("nmlsNumber"),
    ...optional("phone"),
    ...optional("realtorName"),
    ...optional("realtorBrokerage"),
  });
}
