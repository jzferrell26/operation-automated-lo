import { createHash } from "node:crypto";

import {
  CAMPAIGN_APPROVAL_ROLES,
  executeHumanCampaignApproval,
  type AuthenticatedPrincipal,
} from "@oalo/application";
import { z } from "zod";

import {
  resolveAuthenticatedPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse, jsonCommandError } from "./campaign-command-http.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

const OpaqueReferenceSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

const CampaignApprovalRequestSchema = z
  .object({
    campaignRef: OpaqueReferenceSchema,
    decision: z.enum(["approved", "rejected"]),
    expectedCampaignVersionRef: OpaqueReferenceSchema.optional(),
    expectedManifestHash: Sha256Schema.optional(),
    expectedPreflightResultHash: Sha256Schema.optional(),
    expectedRowVersion: z.number().int().positive().optional(),
  })
  .strict();

const CORRELATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,299}$/u;

function ipAuditHashFor(principal: Readonly<AuthenticatedPrincipal>): string {
  return createHash("sha256").update(`${principal.sessionId}:approval`).digest("hex");
}

function correlationRefFor(request: Request, campaignRef: string): string {
  const header = request.headers.get("x-correlation-id");
  if (header !== null && CORRELATION_PATTERN.test(header)) return header;
  return `correlation_approve_${campaignRef.slice(-24)}`;
}

export function principalMayApprove(principal: Readonly<AuthenticatedPrincipal>): boolean {
  return (CAMPAIGN_APPROVAL_ROLES as readonly string[]).includes(principal.role);
}

export async function handleCampaignApproval(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
): Promise<Response> {
  try {
    const principal = await resolveAuthenticatedPrincipal(request, environment, ports);
    const parsed = CampaignApprovalRequestSchema.parse(await request.json());
    const adapter = createCampaignPersistenceAdapter(principal, environment);
    const result = await executeHumanCampaignApproval(
      {
        campaignRef: parsed.campaignRef,
        decision: parsed.decision,
        decidedAt: new Date(),
        ipAuditHash: ipAuditHashFor(principal),
        correlationRef: correlationRefFor(request, parsed.campaignRef),
        ...(parsed.expectedCampaignVersionRef === undefined
          ? {}
          : { expectedCampaignVersionRef: parsed.expectedCampaignVersionRef }),
        ...(parsed.expectedManifestHash === undefined
          ? {}
          : { expectedManifestHash: parsed.expectedManifestHash }),
        ...(parsed.expectedPreflightResultHash === undefined
          ? {}
          : { expectedPreflightResultHash: parsed.expectedPreflightResultHash }),
        ...(parsed.expectedRowVersion === undefined
          ? {}
          : { expectedRowVersion: parsed.expectedRowVersion }),
      },
      principal,
      adapter.approvalRepository,
    );
    if (result.kind === "denied") {
      return jsonCommandError(403, "FORBIDDEN");
    }
    return Response.json(
      {
        state: result.state,
        rowVersion: result.rowVersion,
        duplicate: result.duplicate,
        decision: result.decision.decision,
        approvalRef: result.decision.approvalRef,
        campaignVersionRef: result.decision.campaignVersionRef,
        manifestHash: result.decision.manifestHash,
        preflightResultHash: result.decision.preflightResultHash,
      },
      { status: 200 },
    );
  } catch (error) {
    return (
      campaignCommandAuthErrorResponse(error) ?? jsonCommandError(400, "CAMPAIGN_APPROVAL_FAILED")
    );
  }
}
