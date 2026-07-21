import { createHash } from "node:crypto";

import { z } from "zod";

import { deepFreeze, type DeepReadonly } from "../model/synthetic-ui.js";

const syntheticSafetySchema = z
  .object({
    dataMode: z.literal("synthetic"),
    source: z.literal("local-synthetic-fixture"),
    writesEnabled: z.literal(false),
  })
  .strict();

const campaignContentSchema = z
  .object({
    body: z.string().min(1),
    headline: z.string().min(1),
    legalDisclosure: z.string().min(1),
  })
  .strict();

export const campaignInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    campaignId: z.string().startsWith("synthetic-campaign-"),
    locationId: z.string().startsWith("synthetic-location-"),
    templateId: z.string().startsWith("synthetic-template-"),
    content: campaignContentSchema,
    assetRefs: z.array(z.string().startsWith("synthetic-asset-")),
    safety: syntheticSafetySchema,
  })
  .strict();

export const approvalProjectionSchema = z
  .object({
    schemaVersion: z.literal(1),
    approvalId: z.string().startsWith("synthetic-approval-"),
    campaignId: z.string().startsWith("synthetic-campaign-"),
    locationId: z.string().startsWith("synthetic-location-"),
    status: z.literal("pending_human_review"),
    decisionRecorded: z.literal(false),
    projectedAt: z.string().datetime({ offset: true }),
    sourceInputSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    reviewScope: z
      .object({
        assetRefs: z.array(z.string().startsWith("synthetic-asset-")),
        content: campaignContentSchema,
        templateId: z.string().startsWith("synthetic-template-"),
      })
      .strict(),
    safety: syntheticSafetySchema,
  })
  .strict();

const artifactSchema = z
  .object({
    artifactId: z.string().startsWith("synthetic-artifact-"),
    kind: z.enum(["campaign_brief", "approval_preview"]),
    mediaType: z.literal("application/json"),
    generated: z.literal(false),
  })
  .strict();

export const artifactManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    manifestId: z.string().startsWith("synthetic-manifest-"),
    campaignId: z.string().startsWith("synthetic-campaign-"),
    approvalId: z.string().startsWith("synthetic-approval-"),
    approvalSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    artifacts: z.array(artifactSchema).length(2),
    safety: syntheticSafetySchema,
  })
  .strict();

export type CampaignInput = z.infer<typeof campaignInputSchema>;
export type ApprovalProjection = z.infer<typeof approvalProjectionSchema>;
export type ArtifactManifest = z.infer<typeof artifactManifestSchema>;

const jsonValueSchema = z.json();
type JsonValue = z.infer<typeof jsonValueSchema>;

function serializeScalar(value: boolean | null | number | string): string {
  const serialized = JSON.stringify(typeof value === "string" ? value.normalize("NFC") : value);
  if (serialized === undefined) {
    throw new Error("A validated JSON scalar could not be serialized.");
  }

  return serialized;
}

function canonicalJson(value: JsonValue): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return serializeScalar(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${serializeScalar(key)}:${canonicalJson(jsonValueSchema.parse(item))}`)
    .join(",")}}`;
}

function canonicalBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${canonicalJson(jsonValueSchema.parse(value))}\n`);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalBytes(value)).digest("hex");
}

export const localSyntheticCampaignInput: DeepReadonly<CampaignInput> = deepFreeze(
  campaignInputSchema.parse({
    schemaVersion: 1,
    campaignId: "synthetic-campaign-ui-foundation-001",
    locationId: "synthetic-location-prairie-home",
    templateId: "synthetic-template-single-property-001",
    content: {
      headline: "A clear path to financing your next home",
      body: "A local synthetic campaign input for deterministic approval evidence.",
      legalDisclosure:
        "Synthetic fixture only. Terms, eligibility, and availability are illustrative.",
    },
    assetRefs: ["synthetic-asset-property-placeholder-001"],
    safety: {
      dataMode: "synthetic",
      source: "local-synthetic-fixture",
      writesEnabled: false,
    },
  }),
);

export function projectApproval(input: unknown): DeepReadonly<ApprovalProjection> {
  const campaign = campaignInputSchema.parse(input);

  return deepFreeze(
    approvalProjectionSchema.parse({
      schemaVersion: 1,
      approvalId: "synthetic-approval-ui-foundation-001",
      campaignId: campaign.campaignId,
      locationId: campaign.locationId,
      status: "pending_human_review",
      decisionRecorded: false,
      projectedAt: "2026-07-21T14:30:00.000Z",
      sourceInputSha256: sha256(campaign),
      reviewScope: {
        assetRefs: campaign.assetRefs,
        content: campaign.content,
        templateId: campaign.templateId,
      },
      safety: campaign.safety,
    }),
  );
}

export function canonicalApprovalBytes(input: unknown): Uint8Array {
  return canonicalBytes(approvalProjectionSchema.parse(input));
}

export function canonicalApprovalSha256(input: unknown): string {
  return createHash("sha256").update(canonicalApprovalBytes(input)).digest("hex");
}

export function projectArtifactManifest(
  campaignInput: unknown,
  approvalInput: unknown,
): DeepReadonly<ArtifactManifest> {
  const campaign = campaignInputSchema.parse(campaignInput);
  const approval = approvalProjectionSchema.parse(approvalInput);

  if (approval.campaignId !== campaign.campaignId) {
    throw new Error("Approval and artifact campaign identifiers must match.");
  }

  return deepFreeze(
    artifactManifestSchema.parse({
      schemaVersion: 1,
      manifestId: "synthetic-manifest-ui-foundation-001",
      campaignId: campaign.campaignId,
      approvalId: approval.approvalId,
      approvalSha256: canonicalApprovalSha256(approval),
      artifacts: [
        {
          artifactId: "synthetic-artifact-campaign-brief-001",
          kind: "campaign_brief",
          mediaType: "application/json",
          generated: false,
        },
        {
          artifactId: "synthetic-artifact-approval-preview-001",
          kind: "approval_preview",
          mediaType: "application/json",
          generated: false,
        },
      ],
      safety: campaign.safety,
    }),
  );
}

export type LocalApprovalEvidence = Readonly<{
  campaignInput: DeepReadonly<CampaignInput>;
  approval: DeepReadonly<ApprovalProjection>;
  artifactManifest: DeepReadonly<ArtifactManifest>;
  canonicalApprovalBytes: Uint8Array;
  sha256: string;
}>;

/**
 * Produces deterministic evidence from a frozen local fixture. The zero-argument boundary prevents
 * dashboard state, provider clients, approval actions, and generation adapters from entering it.
 */
export function buildLocalApprovalEvidence(): LocalApprovalEvidence {
  const approval = projectApproval(localSyntheticCampaignInput);
  const artifactManifest = projectArtifactManifest(localSyntheticCampaignInput, approval);
  const bytes = canonicalApprovalBytes(approval);

  return Object.freeze({
    campaignInput: localSyntheticCampaignInput,
    approval,
    artifactManifest,
    canonicalApprovalBytes: bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
