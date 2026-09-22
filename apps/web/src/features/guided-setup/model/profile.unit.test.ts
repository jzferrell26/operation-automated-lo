import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_FIELD_PLACEHOLDERS,
  CAMPAIGN_STARTER_TEXT,
  SetupProfileSchema,
  campaignDraftPrefill,
  normalizeProfileInput,
  parseStoredProfile,
  profileFromSession,
} from "./profile.js";

/**
 * PRD-006c D3's prefill rule and D4's profile schema.
 *
 * The rule the demo defaults broke is the one worth a test of its own: a signed-in user must never
 * see a value the product invented and presented as theirs. "123 Main Street, Dallas" reads exactly
 * like an address somebody typed, and by the time it reaches an approver nobody can tell.
 */

describe("setup profile", () => {
  it("refuses a body carrying the tenant boundary's own names", () => {
    expect(
      SetupProfileSchema.safeParse({
        displayName: "Dana Reyes",
        company: "Northgate Lending",
        locationId: "00000000-0000-4000-8000-000000000801",
      }).success,
    ).toBe(false);
    expect(
      SetupProfileSchema.safeParse({
        displayName: "Dana Reyes",
        company: "Northgate Lending",
        userId: "00000000-0000-4000-8000-000000000811",
      }).success,
    ).toBe(false);
  });

  it("bounds every field", () => {
    expect(
      SetupProfileSchema.safeParse({ displayName: "", company: "Northgate Lending" }).success,
    ).toBe(false);
    expect(
      SetupProfileSchema.safeParse({
        displayName: "x".repeat(121),
        company: "Northgate Lending",
      }).success,
    ).toBe(false);
    expect(
      SetupProfileSchema.safeParse({
        displayName: "Dana Reyes",
        company: "Northgate Lending",
        phone: "5".repeat(41),
      }).success,
    ).toBe(false);
  });

  it("drops an empty optional rather than storing a blank string", () => {
    const profile = normalizeProfileInput({
      displayName: "  Dana Reyes  ",
      company: "Northgate Lending",
      nmlsNumber: "   ",
      phone: "",
      realtorName: "Priya Nadeem",
      realtorBrokerage: "",
    });
    expect(profile).toEqual({
      displayName: "Dana Reyes",
      company: "Northgate Lending",
      realtorName: "Priya Nadeem",
    });
  });

  it("treats a stored value it cannot read as no profile at all", () => {
    expect(parseStoredProfile({ displayName: 7 })).toBeUndefined();
    expect(parseStoredProfile(undefined)).toBeUndefined();
  });

  it("seeds the first step from what the user typed at sign-up", () => {
    expect(
      profileFromSession(undefined, {
        displayName: "Dana Reyes",
        workspaceName: "Northgate Lending",
      }),
    ).toEqual({ displayName: "Dana Reyes", company: "Northgate Lending" });
  });

  it("prefers a saved profile over the session, so an edit is not undone on the next render", () => {
    expect(
      profileFromSession(
        { displayName: "Dana R Reyes", company: "Northgate Lending Group" },
        { displayName: "Dana Reyes", workspaceName: "Northgate Lending" },
      ),
    ).toEqual({ displayName: "Dana R Reyes", company: "Northgate Lending Group" });
  });

  it("leaves the user's own fields empty and carries only starter wording", () => {
    const prefill = campaignDraftPrefill(undefined);
    expect(prefill.realtorDisplayName).toBe("");
    expect(prefill.region).toBe("");
    expect(prefill.headline).toBe(CAMPAIGN_STARTER_TEXT.headline);
    expect(prefill.body).toBe(CAMPAIGN_STARTER_TEXT.body);
    expect(prefill.disclosureText).toBe(CAMPAIGN_STARTER_TEXT.disclosureText);
  });

  it("never reproduces a demo default the create screen used to ship with", () => {
    const values = Object.values(campaignDraftPrefill(undefined));
    for (const banned of [
      "123 Main Street, Dallas",
      "Jordan Smith",
      "Tour this home this weekend",
      "Dallas-Fort Worth",
      "Beautiful home prepared for an upcoming open house.",
    ]) {
      expect(values, banned).not.toContain(banned);
    }
    expect(Object.values(CAMPAIGN_FIELD_PLACEHOLDERS)).not.toContain("123 Main Street, Dallas");
  });

  it("uses the Realtor the user named once there is a profile", () => {
    const prefill = campaignDraftPrefill({
      displayName: "Dana Reyes",
      company: "Northgate Lending",
      realtorName: "Priya Nadeem",
    });
    expect(prefill.realtorDisplayName).toBe("Priya Nadeem");
  });
});
