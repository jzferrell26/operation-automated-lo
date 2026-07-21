import { z } from "zod";

import {
  deepFreeze,
  runtimeSafetySchema,
  type DeepReadonly,
} from "../../ui-foundation/model/synthetic-ui.js";

const canonicalFieldSchema = z
  .object({
    id: z.string().startsWith("synthetic-profile-field-"),
    label: z.string().min(1),
    value: z.string().min(1),
    source: z.string().min(1),
  })
  .strict();

const requiredFieldSchema = z.discriminatedUnion("state", [
  z
    .object({
      id: z.string().startsWith("synthetic-required-field-"),
      label: z.string().min(1),
      state: z.literal("confirmed"),
      evidence: z.string().min(1),
    })
    .strict(),
  z
    .object({
      id: z.string().startsWith("synthetic-required-field-"),
      label: z.string().min(1),
      state: z.literal("missing"),
      reason: z.string().min(1),
      nextAction: z.string().min(1),
    })
    .strict(),
]);

const aiSuggestionSchema = z
  .object({
    id: z.string().startsWith("synthetic-ai-suggestion-"),
    field: z.enum(["voice", "phrasing_pattern", "signature_language", "banned_language"]),
    label: z.string().min(1),
    proposedValue: z.string().min(1),
    sourceSampleIds: z.array(z.string().startsWith("synthetic-approved-sample-")).min(1),
    confidenceLabel: z.string().min(1),
    state: z.literal("needs_confirmation"),
  })
  .strict();

const syntheticBrandProfileSchema = z
  .object({
    safety: runtimeSafetySchema,
    activeLocation: z
      .object({
        id: z.string().startsWith("synthetic-location-"),
        displayName: z.string().min(1),
      })
      .strict(),
    canonicalProfile: z
      .object({
        id: z.string().startsWith("synthetic-brand-profile-"),
        version: z.string().startsWith("brand-v"),
        current: z.literal(true),
        source: z.string().min(1),
        fields: z.array(canonicalFieldSchema).min(5),
        requiredFields: z.array(requiredFieldSchema).min(5),
      })
      .strict(),
    aiAssistance: z
      .object({
        approvedSamples: z
          .array(
            z
              .object({
                id: z.string().startsWith("synthetic-approved-sample-"),
                displayName: z.string().min(1),
                permission: z.literal("approved_for_profile_assistance"),
              })
              .strict(),
          )
          .min(2),
        suggestions: z.array(aiSuggestionSchema).min(2),
        protectedFieldGroups: z.array(z.string().min(1)).min(5),
      })
      .strict(),
  })
  .strict();

const rawSyntheticBrandProfile: unknown = {
  safety: {
    dataMode: "synthetic",
    writesEnabled: false,
    disclosure:
      "Synthetic brand workspace. Model requests, provider requests, profile writes, and approvals are disabled.",
  },
  activeLocation: {
    id: "synthetic-location-prairie-home",
    displayName: "Prairie Home Lending",
  },
  canonicalProfile: {
    id: "synthetic-brand-profile-prairie-home",
    version: "brand-v3",
    current: true,
    source: "Confirmed synthetic profile version",
    fields: [
      {
        id: "synthetic-profile-field-public-name",
        label: "Public loan officer name",
        value: "Alex Morgan",
        source: "Human-confirmed identity field",
      },
      {
        id: "synthetic-profile-field-company",
        label: "Company",
        value: "Prairie Home Lending",
        source: "Human-confirmed company field",
      },
      {
        id: "synthetic-profile-field-nmls",
        label: "NMLS display",
        value: "NMLS 0000000, synthetic",
        source: "Human-confirmed license field",
      },
      {
        id: "synthetic-profile-field-disclosure",
        label: "Professional disclosure",
        value: "Synthetic lender-approved disclosure version 4",
        source: "Compliance-confirmed disclosure field",
      },
      {
        id: "synthetic-profile-field-scheduling",
        label: "Scheduling link",
        value: "Application-owned synthetic scheduling route",
        source: "Human-confirmed approved link",
      },
      {
        id: "synthetic-profile-field-brand",
        label: "Brand package",
        value: "Cobalt and prairie-neutral approved package",
        source: "Human-confirmed brand asset set",
      },
    ],
    requiredFields: [
      {
        id: "synthetic-required-field-public-identity",
        label: "Public identity and company",
        state: "confirmed",
        evidence: "Canonical profile version brand-v3",
      },
      {
        id: "synthetic-required-field-nmls",
        label: "NMLS display values",
        state: "confirmed",
        evidence: "Human-confirmed synthetic license record",
      },
      {
        id: "synthetic-required-field-disclosure",
        label: "Open House Boost disclosure",
        state: "confirmed",
        evidence: "Synthetic lender policy version 4",
      },
      {
        id: "synthetic-required-field-equal-housing",
        label: "Equal Housing asset",
        state: "missing",
        reason: "No approved synthetic Equal Housing asset is attached to brand-v3.",
        nextAction: "Ask the Compliance Approver to attach the approved asset.",
      },
      {
        id: "synthetic-required-field-florida-license",
        label: "Florida license display",
        state: "missing",
        reason: "The selected Florida blueprint requires a state display value.",
        nextAction: "Ask the license owner to confirm the state display value.",
      },
      {
        id: "synthetic-required-field-approved-links",
        label: "Privacy, terms, and scheduling links",
        state: "confirmed",
        evidence: "Allowlisted application-owned synthetic routes",
      },
    ],
  },
  aiAssistance: {
    approvedSamples: [
      {
        id: "synthetic-approved-sample-newsletter",
        displayName: "Approved spring newsletter",
        permission: "approved_for_profile_assistance",
      },
      {
        id: "synthetic-approved-sample-open-house",
        displayName: "Approved open-house invitation",
        permission: "approved_for_profile_assistance",
      },
    ],
    suggestions: [
      {
        id: "synthetic-ai-suggestion-voice",
        field: "voice",
        label: "Voice",
        proposedValue: "Clear, neighborly, and practical without urgency language.",
        sourceSampleIds: [
          "synthetic-approved-sample-newsletter",
          "synthetic-approved-sample-open-house",
        ],
        confidenceLabel: "Needs human confirmation",
        state: "needs_confirmation",
      },
      {
        id: "synthetic-ai-suggestion-signature",
        field: "signature_language",
        label: "Signature language",
        proposedValue: "Let us make the next step easy to understand.",
        sourceSampleIds: ["synthetic-approved-sample-newsletter"],
        confidenceLabel: "Needs human confirmation",
        state: "needs_confirmation",
      },
      {
        id: "synthetic-ai-suggestion-banned",
        field: "banned_language",
        label: "Banned language",
        proposedValue: "Avoid guaranteed, instant approval, and lowest rate.",
        sourceSampleIds: ["synthetic-approved-sample-open-house"],
        confidenceLabel: "Needs human confirmation",
        state: "needs_confirmation",
      },
    ],
    protectedFieldGroups: [
      "Identity and company",
      "NMLS and licenses",
      "Lender and disclosures",
      "Rates and proof points",
      "Consent and partner permission",
      "Routing and provider assets",
    ],
  },
};

export type SyntheticBrandProfile = z.infer<typeof syntheticBrandProfileSchema>;

let cachedProfile: DeepReadonly<SyntheticBrandProfile> | undefined;

export function loadSyntheticBrandProfile(): DeepReadonly<SyntheticBrandProfile> {
  cachedProfile ??= deepFreeze(syntheticBrandProfileSchema.parse(rawSyntheticBrandProfile));
  return cachedProfile;
}
