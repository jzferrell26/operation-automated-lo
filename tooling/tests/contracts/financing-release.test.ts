import { describe, expect, it } from "vitest";
import {
  FinancingReleasePrepareRequestSchema,
  FinancingReleaseInquiryRequestSchema,
} from "@oalo/contracts";

describe("strict public financing commands", () => {
  it("rejects private permissions and caller authority", () => {
    expect(
      FinancingReleasePrepareRequestSchema.safeParse({
        requestId: "00000000-0000-4000-8000-000000000001",
        campaignRef: "campaign_sample001",
        campaignVersionRef: "campaignversion_sample001",
        propertyVersionRef: "property_sample001",
        partnerVersionRef: "partner_sample001",
        lenderIdentityVersionRef: "lender_sample001",
        presetVersionRef: "preset_sample001",
        disclosureVersionRef: "disclosure_sample001",
        templateVersionRef: "template_sample001",
        routingProfileVersionRef: "routing_sample001",
        consentVersionRef: "consent_sample001",
        expectedEvidenceHash: "a".repeat(64),
        actorRef: "actor_forged001",
      }).success,
    ).toBe(false);
  });
  it("normalizes only minimal consented inquiry fields", () => {
    const input = {
      requestId: "00000000-0000-4000-8000-000000000001",
      firstName: "  Synthetic  ",
      email: " PERSON@EXAMPLE.INVALID ",
      honeypot: "",
      consent: true,
      intent: "financing-review",
    };
    expect(FinancingReleaseInquiryRequestSchema.parse(input)).toMatchObject({
      firstName: "Synthetic",
      email: "person@example.invalid",
    });
    expect(
      FinancingReleaseInquiryRequestSchema.safeParse({ ...input, mortgageBalance: 20 }).success,
    ).toBe(false);
    expect(
      FinancingReleaseInquiryRequestSchema.safeParse({ ...input, consent: false }).success,
    ).toBe(false);
  });
});

describe("minimal anonymous input safety", () => {
  const inquiry = {
    requestId: "00000000-0000-4000-8000-000000000001",
    firstName: "Synthetic",
    email: "person@example.invalid",
    honeypot: "",
    consent: true,
    intent: "property-information",
  };
  it.each([
    "locationRef",
    "actorRef",
    "publicationId",
    "campaignRef",
    "highlevelLocationRef",
    "retentionDays",
    "phone",
    "smsConsent",
  ])("rejects caller-supplied %s", (key) => {
    expect(
      FinancingReleaseInquiryRequestSchema.safeParse({ ...inquiry, [key]: "forged" }).success,
    ).toBe(false);
  });
  it.each(["", "\u202eForged", "Line\nBreak", "\u0000", "\u0080"])(
    "rejects unsafe name %j",
    (firstName) => {
      expect(
        FinancingReleaseInquiryRequestSchema.safeParse({ ...inquiry, firstName }).success,
      ).toBe(false);
    },
  );
  it("rejects honeypot, missing consent and financial inquiry fields", () => {
    expect(
      FinancingReleaseInquiryRequestSchema.safeParse({ ...inquiry, honeypot: "bot" }).success,
    ).toBe(false);
    expect(
      FinancingReleaseInquiryRequestSchema.safeParse({ ...inquiry, consent: undefined }).success,
    ).toBe(false);
    expect(
      FinancingReleaseInquiryRequestSchema.safeParse({ ...inquiry, incomeMinor: 100 }).success,
    ).toBe(false);
  });
});
