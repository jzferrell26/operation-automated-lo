import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_APPROVAL_ROLES,
  CAMPAIGN_MUTATION_ROLES,
  CampaignCommandForbiddenError,
  CampaignPrincipalInvalidError,
  CampaignResourceNotAccessibleError,
  assertCampaignAccessible,
  assertMayExecuteCampaignMutation,
  assertPrincipalOwnsTransaction,
  createCampaignTenantContext,
  approvalActorRoleForPrincipal,
  createSessionApprovalAuthority,
  freezeAuthenticatedPrincipal,
  type AuthenticatedPrincipal,
} from "@oalo/application";
import { createPrincipalBoundTenantContextAuthority } from "@oalo/db";

const basePrincipal: AuthenticatedPrincipal = {
  actorRef: "principal_alphaUser001",
  actorId: "00000000-0000-4000-8000-000000000811",
  locationRef: "location_alphaTenant001",
  locationId: "00000000-0000-4000-8000-000000000801",
  installationRef: "installation_alpha001",
  role: "campaign_creator",
  roleVersion: 3,
  sessionId: "session_alpha001",
  authenticationMode: "embedded",
};

function principal(overrides: Partial<AuthenticatedPrincipal> = {}): AuthenticatedPrincipal {
  return { ...basePrincipal, ...overrides };
}

describe("campaign command context", () => {
  it("freezes a verified principal and names the mutation and approval roles", () => {
    expect(freezeAuthenticatedPrincipal(basePrincipal)).toEqual(basePrincipal);
    expect(CAMPAIGN_MUTATION_ROLES).toEqual(["location_admin", "campaign_creator"]);
    expect(CAMPAIGN_APPROVAL_ROLES).toEqual(["location_admin", "campaign_approver"]);
  });

  it("rejects incomplete or malformed principals", () => {
    expect(() => freezeAuthenticatedPrincipal(principal({ locationId: "not-a-uuid" }))).toThrow(
      CampaignPrincipalInvalidError,
    );
    expect(() => freezeAuthenticatedPrincipal(principal({ actorId: "not-a-uuid" }))).toThrow(
      CampaignPrincipalInvalidError,
    );
    expect(() => freezeAuthenticatedPrincipal(principal({ actorRef: "short" }))).toThrow(
      CampaignPrincipalInvalidError,
    );
    expect(() => freezeAuthenticatedPrincipal(principal({ locationRef: "short" }))).toThrow(
      CampaignPrincipalInvalidError,
    );
    expect(() => freezeAuthenticatedPrincipal(principal({ installationRef: "short" }))).toThrow(
      CampaignPrincipalInvalidError,
    );
    expect(() => freezeAuthenticatedPrincipal(principal({ sessionId: "short" }))).toThrow(
      CampaignPrincipalInvalidError,
    );
    expect(() => freezeAuthenticatedPrincipal(principal({ roleVersion: 0 }))).toThrow(
      CampaignPrincipalInvalidError,
    );
    expect(() => freezeAuthenticatedPrincipal(principal({ roleVersion: 1.5 }))).toThrow(
      CampaignPrincipalInvalidError,
    );
    expect(() =>
      freezeAuthenticatedPrincipal(
        principal({ authenticationMode: "forged" as AuthenticatedPrincipal["authenticationMode"] }),
      ),
    ).toThrow(CampaignPrincipalInvalidError);
    expect(() =>
      freezeAuthenticatedPrincipal(principal({ role: "owner" as AuthenticatedPrincipal["role"] })),
    ).toThrow(CampaignPrincipalInvalidError);
  });

  it("allows location admins and campaign creators to mutate and forbids other roles", () => {
    expect(() =>
      assertMayExecuteCampaignMutation(principal({ role: "location_admin" })),
    ).not.toThrow();
    expect(() =>
      assertMayExecuteCampaignMutation(principal({ role: "campaign_creator" })),
    ).not.toThrow();
    expect(() =>
      assertMayExecuteCampaignMutation(principal({ role: "campaign_approver" })),
    ).toThrow(CampaignCommandForbiddenError);
    expect(() => assertMayExecuteCampaignMutation(principal({ role: "viewer" }))).toThrow(
      CampaignCommandForbiddenError,
    );
    expect(() =>
      assertMayExecuteCampaignMutation(principal({ role: "campaign_publisher" })),
    ).toThrow(CampaignCommandForbiddenError);
    expect(() => assertMayExecuteCampaignMutation(principal({ role: "platform_support" }))).toThrow(
      CampaignCommandForbiddenError,
    );
  });

  it("requires session location and actor UUIDs to match the transaction context", () => {
    const context = createCampaignTenantContext(basePrincipal, "correlation_campaign_001");
    expect(context).toEqual({
      locationId: basePrincipal.locationId,
      actorId: basePrincipal.actorId,
      correlationId: "correlation_campaign_001",
    });
    expect(() => assertPrincipalOwnsTransaction(basePrincipal, context)).not.toThrow();
    expect(() =>
      assertPrincipalOwnsTransaction(basePrincipal, {
        locationId: "11111111-1111-4111-8111-111111111111",
        actorId: basePrincipal.actorId,
      }),
    ).toThrow(CampaignResourceNotAccessibleError);
    expect(() =>
      assertPrincipalOwnsTransaction(basePrincipal, {
        locationId: basePrincipal.locationId,
        actorId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toThrow(CampaignResourceNotAccessibleError);
    expect(() => createCampaignTenantContext(basePrincipal, "bad correlation")).toThrow(
      CampaignPrincipalInvalidError,
    );
  });

  it("hides whether a missing or cross-tenant campaign exists", () => {
    expect(() =>
      assertCampaignAccessible(basePrincipal, { locationRef: basePrincipal.locationRef }),
    ).not.toThrow();
    expect(() => assertCampaignAccessible(basePrincipal, undefined)).toThrow(
      CampaignResourceNotAccessibleError,
    );
    try {
      assertCampaignAccessible(basePrincipal, { locationRef: "location_otherTenant001" });
      throw new Error("expected inaccessible");
    } catch (error) {
      expect(error).toBeInstanceOf(CampaignResourceNotAccessibleError);
      expect((error as Error).message).toBe("The requested campaign resource is not accessible.");
    }
  });

  it("maps session roles onto approval decision roles and rejects forged actor roles", async () => {
    expect(approvalActorRoleForPrincipal(principal({ role: "location_admin" }))).toBe(
      "location_admin",
    );
    expect(
      approvalActorRoleForPrincipal(
        principal({ role: "campaign_approver", actorRef: "principal_approver001" }),
      ),
    ).toBe("approver");
    expect(() => approvalActorRoleForPrincipal(principal({ role: "campaign_creator" }))).toThrow(
      CampaignCommandForbiddenError,
    );
    expect(() => approvalActorRoleForPrincipal(principal({ role: "viewer" }))).toThrow(
      CampaignCommandForbiddenError,
    );

    const approver = createSessionApprovalAuthority(
      principal({ role: "campaign_approver", actorRef: "principal_approver001" }),
    );
    await expect(
      approver.assertMayApprove({
        locationRef: basePrincipal.locationRef,
        campaignRef: "campaign_alpha001",
        actorRef: "principal_approver001",
        actorRole: "location_admin",
      }),
    ).rejects.toBeInstanceOf(CampaignCommandForbiddenError);
  });

  it("lets approvers and location admins reach approval and forbids creators even when they created the campaign", async () => {
    const approver = createSessionApprovalAuthority(
      principal({ role: "campaign_approver", actorRef: "principal_approver001" }),
    );
    await expect(
      approver.assertMayApprove({
        locationRef: basePrincipal.locationRef,
        campaignRef: "campaign_alpha001",
        actorRef: "principal_approver001",
        actorRole: "approver",
      }),
    ).resolves.toBeUndefined();

    const admin = createSessionApprovalAuthority(principal({ role: "location_admin" }));
    await expect(
      admin.assertMayApprove({
        locationRef: basePrincipal.locationRef,
        campaignRef: "campaign_alpha001",
        actorRef: basePrincipal.actorRef,
        actorRole: "location_admin",
      }),
    ).resolves.toBeUndefined();

    const creator = createSessionApprovalAuthority(principal({ role: "campaign_creator" }));
    await expect(
      creator.assertMayApprove({
        locationRef: basePrincipal.locationRef,
        campaignRef: "campaign_alpha001",
        actorRef: basePrincipal.actorRef,
        actorRole: "approver",
      }),
    ).rejects.toBeInstanceOf(CampaignCommandForbiddenError);

    await expect(
      admin.assertMayApprove({
        locationRef: basePrincipal.locationRef,
        campaignRef: "campaign_alpha001",
        actorRef: "principal_otherActor001",
        actorRole: "location_admin",
      }),
    ).rejects.toBeInstanceOf(CampaignCommandForbiddenError);

    await expect(
      admin.assertMayApprove({
        locationRef: "location_otherTenant001",
        campaignRef: "campaign_alpha001",
        actorRef: basePrincipal.actorRef,
        actorRole: "location_admin",
      }),
    ).rejects.toBeInstanceOf(CampaignResourceNotAccessibleError);
  });

  it("binds TenantContextAuthority to the verified principal UUIDs before SQL", async () => {
    const authority = createPrincipalBoundTenantContextAuthority(
      basePrincipal,
      "correlation_campaign_001",
    );
    await expect(authority.resolveTenantDatabaseContext()).resolves.toEqual({
      locationId: basePrincipal.locationId,
      actorId: basePrincipal.actorId,
      correlationId: "correlation_campaign_001",
    });
  });
});
