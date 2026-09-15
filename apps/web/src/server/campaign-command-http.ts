import {
  CampaignApprovalNotReadyError,
  CampaignApprovalStaleError,
  CampaignCommandForbiddenError,
  CampaignPrincipalInvalidError,
  CampaignResourceNotAccessibleError,
} from "@oalo/application";
import { BrowserSessionPolicyError, SessionPolicyError } from "@oalo/auth";
import { ZodError } from "zod";

import { UnauthenticatedPrincipalError } from "./authenticated-principal.js";
import { AuthenticatedWorkspaceUnavailableError } from "./authenticated-workspace-data.js";

export function jsonCommandError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export function campaignCommandAuthErrorResponse(error: unknown): Response | undefined {
  if (
    error instanceof UnauthenticatedPrincipalError ||
    error instanceof SessionPolicyError ||
    error instanceof BrowserSessionPolicyError ||
    error instanceof CampaignPrincipalInvalidError
  ) {
    return jsonCommandError(401, "UNAUTHENTICATED");
  }
  if (error instanceof CampaignCommandForbiddenError) {
    return jsonCommandError(403, "FORBIDDEN");
  }
  if (error instanceof CampaignResourceNotAccessibleError) {
    return jsonCommandError(404, "NOT_FOUND");
  }
  if (error instanceof AuthenticatedWorkspaceUnavailableError) {
    return jsonCommandError(403, "WORKSPACE_UNAVAILABLE");
  }
  if (error instanceof CampaignApprovalStaleError) {
    return jsonCommandError(409, "CAMPAIGN_APPROVAL_CONFLICT");
  }
  if (error instanceof CampaignApprovalNotReadyError) {
    return jsonCommandError(409, "CAMPAIGN_APPROVAL_NOT_READY");
  }
  if (error instanceof ZodError) {
    return Response.json(
      { error: "INVALID_CAMPAIGN_COMMAND", issues: error.issues },
      { status: 400 },
    );
  }
  return undefined;
}
