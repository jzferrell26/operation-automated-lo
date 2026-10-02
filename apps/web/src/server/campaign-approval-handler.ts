import { createHash } from "node:crypto";

import {
  CAMPAIGN_APPROVAL_ROLES,
  CampaignLibraryAdRefusedError,
  executeHumanCampaignApproval,
  type AuthenticatedPrincipal,
  type LibraryAdRefusalReason,
} from "@oalo/application";
import { OpaqueReferenceSchema } from "@oalo/contracts";
import { z } from "zod";

import { SESSION_USER_FALLBACK } from "../copy/user-language.js";
import { createLibraryAdCatalogPort } from "../features/ads-library/server/approval-catalog-port.js";
import {
  resolveAuthenticatedPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse, jsonCommandError } from "./campaign-command-http.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { correlationReferenceForRequest, withCorrelationHeaders } from "./correlation-boundary.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

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

/**
 * PRD-009c D4, 009C-AC-008. The command refuses a version whose library ad is missing, retired,
 * replaced, or whose art changed; the route answers each with 409 and its own code, so the page can
 * show the matching notice. Nothing is written for any of them.
 */
const LIBRARY_AD_REFUSAL_CODES: Readonly<Record<LibraryAdRefusalReason, string>> = {
  missing: "LIBRARY_AD_MISSING",
  retired: "LIBRARY_AD_RETIRED",
  replaced: "LIBRARY_AD_REPLACED",
  art_changed: "LIBRARY_AD_ART_CHANGED",
};

/** `platform.app_users.safe_display_name` holds 1 to 200 characters; the snapshot accepts the same. */
const APPROVER_DISPLAY_NAME_MAX = 200;

/**
 * PRD-009e D2, 009E-AC-004. The decider's own display name, read from their own session through
 * the same scoped function that names the signed-in person in the shell (`platform.resolve_session_display`),
 * and from nowhere else: the request body has no field for it and the route's schema is strict, so
 * a request that carries one is refused before this runs. No grant on `platform.app_users` is
 * involved.
 *
 * It answers `undefined`, which records nothing, when the read yields nothing, fails, or yields
 * only the shell's fallback ("You"): an approval is never refused over a name, and a name the
 * person did not give is never invented. The name is whatever the person typed at sign-up and is
 * not verified; `actor_id` and `actor_role` stay the authoritative record.
 */
export async function resolveApproverDisplayName(
  ports: CampaignCommandPorts,
  principal: Readonly<AuthenticatedPrincipal>,
): Promise<string | undefined> {
  let display;
  try {
    display = await ports.sessionDisplay?.resolve({
      locationRef: principal.locationRef,
      actorRef: principal.actorRef,
    });
  } catch {
    return undefined;
  }
  const name = display?.userDisplayName.trim();
  if (name === undefined || name === "" || name === SESSION_USER_FALLBACK) return undefined;
  return [...name].slice(0, APPROVER_DISPLAY_NAME_MAX).join("");
}

function ipAuditHashFor(principal: Readonly<AuthenticatedPrincipal>): string {
  return createHash("sha256").update(`${principal.sessionId}:approval`).digest("hex");
}

export function principalMayApprove(principal: Readonly<AuthenticatedPrincipal>): boolean {
  return (CAMPAIGN_APPROVAL_ROLES as readonly string[]).includes(principal.role);
}

export async function handleCampaignApproval(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
): Promise<Response> {
  const correlation = correlationReferenceForRequest(request, "approve");
  try {
    const principal = await resolveAuthenticatedPrincipal(request, environment, ports);
    const parsed = CampaignApprovalRequestSchema.parse(await request.json());
    const adapter = createCampaignPersistenceAdapter(
      principal,
      environment,
      correlation.correlationRef,
    );
    const result = await executeHumanCampaignApproval(
      {
        campaignRef: parsed.campaignRef,
        decision: parsed.decision,
        decidedAt: new Date(),
        ipAuditHash: ipAuditHashFor(principal),
        correlationRef: correlation.correlationRef,
        approverDisplayName: await resolveApproverDisplayName(ports, principal),
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
      // PRD-009c D4: the required catalog port, composed from the ads library loader under the
      // same raw environment, so a deployment resolves only real ads.
      createLibraryAdCatalogPort(environment),
    );
    if (result.kind === "denied") {
      return withCorrelationHeaders(jsonCommandError(403, "FORBIDDEN"), correlation);
    }
    return withCorrelationHeaders(
      Response.json(
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
      ),
      correlation,
    );
  } catch (error) {
    if (error instanceof CampaignLibraryAdRefusedError) {
      return withCorrelationHeaders(
        jsonCommandError(409, LIBRARY_AD_REFUSAL_CODES[error.reason]),
        correlation,
      );
    }
    const response =
      campaignCommandAuthErrorResponse(error) ?? jsonCommandError(400, "CAMPAIGN_APPROVAL_FAILED");
    return withCorrelationHeaders(response, correlation);
  }
}
