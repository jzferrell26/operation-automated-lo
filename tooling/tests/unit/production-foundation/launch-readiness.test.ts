import { describe, expect, it, vi } from "vitest";

import {
  LaunchReadinessError,
  ONBOARDING_CHECKLIST,
  authorizeOnboardingRoleAssignment,
  evaluatePermissionReadiness,
  recomputeLaunchReadiness,
  recordOnboardingEvent,
  safeReadinessDiagnostics,
  validateChecklistCardinality,
  type LaunchReadinessPorts,
} from "@oalo/application";
import type {
  LaunchReadinessResult,
  OnboardingEvent,
  ReadinessDependency,
  ReadinessEvidence,
} from "@oalo/contracts";

const now = new Date("2026-07-21T20:00:00.000Z");
const sha = (value: string): string => value.length.toString(16).padStart(64, "0");

function completeEvidence(dependency: ReadinessDependency): ReadinessEvidence {
  return {
    dependency,
    status: "complete",
    observed: true,
    verifierVersion: "verifier-1",
    verifiedAt: now.toISOString(),
    evidenceSummary: `${dependency} verified from current server evidence`,
    providerIds: dependency === "installation" ? ["provider-install-1"] : [],
  };
}

function blockedEvidence(dependency: ReadinessDependency): ReadinessEvidence {
  return {
    dependency,
    status: "blocked",
    observed: true,
    verifierVersion: "verifier-1",
    verifiedAt: now.toISOString(),
    evidenceSummary: `${dependency} requires customer action`,
    providerIds: [],
    block: {
      code: "mapping_stale",
      explanation: "The configured mapping is no longer available.",
      responsibleParty: "customer",
      remediation: "Select and verify a current mapping.",
      retryAction: "retry_mapping_verifier",
      correlationRef: "correlation_01Mapping",
    },
  };
}

function prior(state: LaunchReadinessResult["state"]): LaunchReadinessResult {
  return {
    readinessRef: "readiness_01Prior",
    locationRef: "location_01TenantAlpha",
    state,
    verifierVersion: "verifier-0",
    evaluatedAt: new Date("2026-07-20T20:00:00.000Z").toISOString(),
    evidence: [completeEvidence("installation")],
    evidenceSummary: "Prior readiness result.",
    nextAction: state === "launch_ready" ? "create_open_house_boost" : "resolve_readiness_blockers",
    fingerprint: sha(`prior-${state}`),
  };
}

function readinessPorts(
  evidence: Readonly<Record<ReadinessDependency, ReadinessEvidence>>,
  current?: LaunchReadinessResult,
) {
  const history: LaunchReadinessResult[] = [];
  const byFingerprint = new Map<string, LaunchReadinessResult>();
  let sequence = 0;
  const ports: LaunchReadinessPorts = {
    verifier: {
      verify: async ({ dependency }) => evidence[dependency],
    },
    repository: {
      current: async () => current,
      findByFingerprint: async ({ fingerprint }) => byFingerprint.get(fingerprint),
      setCurrentAndAppendHistory: async (result) => {
        history.push(result);
        byFingerprint.set(result.fingerprint, result);
      },
    },
    hash: { sha256: sha },
    identity: { next: (prefix) => `${prefix}_${String(++sequence).padStart(8, "0")}` },
    clock: { now: () => now },
  };
  return { ports, history };
}

const completeSet: Record<ReadinessDependency, ReadinessEvidence> = {
  installation: completeEvidence("installation"),
  permissions: completeEvidence("permissions"),
  brand_compliance: completeEvidence("brand_compliance"),
  ghl_routing: completeEvidence("ghl_routing"),
  meta_connection: completeEvidence("meta_connection"),
  team_roles: completeEvidence("team_roles"),
  synthetic_lead: completeEvidence("synthetic_lead"),
};

describe("launch readiness", () => {
  it("enforces no more than five visible items in either checklist phase", () => {
    expect(ONBOARDING_CHECKLIST.get_connected).toHaveLength(5);
    expect(ONBOARDING_CHECKLIST.launch_readiness).toHaveLength(4);
    expect(validateChecklistCardinality()).toBe(true);
    expect(() =>
      validateChecklistCardinality({
        get_connected: ["1", "2", "3", "4", "5", "6"],
        launch_readiness: [],
      }),
    ).toThrow(LaunchReadinessError);
    expect(() =>
      validateChecklistCardinality({
        get_connected: [],
        launch_readiness: ["1", "2", "3", "4", "5", "6"],
      }),
    ).toThrow(LaunchReadinessError);
  });

  it("issues Launch Ready only from current observed policy-driven evidence", async () => {
    const fixture = readinessPorts(completeSet);
    const result = await recomputeLaunchReadiness(
      "location_01TenantAlpha",
      {
        requiredDependencies: [
          "installation",
          "permissions",
          "brand_compliance",
          "ghl_routing",
          "meta_connection",
          "team_roles",
          "synthetic_lead",
        ],
        verifierVersion: "verifier-1",
      },
      fixture.ports,
    );

    expect(result.state).toBe("launch_ready");
    expect(result.nextAction).toBe("create_open_house_boost");
    expect(fixture.history).toHaveLength(1);
  });

  it("is idempotent for the same evidence fingerprint", async () => {
    const fixture = readinessPorts(completeSet);
    const policy = {
      requiredDependencies: ["installation", "permissions"] as const,
      verifierVersion: "verifier-1",
    };
    const first = await recomputeLaunchReadiness("location_01TenantAlpha", policy, fixture.ports);
    const second = await recomputeLaunchReadiness("location_01TenantAlpha", policy, fixture.ports);

    expect(second).toEqual(first);
    expect(fixture.history).toHaveLength(1);
  });

  it.each(["launch_ready", "attention_required"] as const)(
    "moves prior %s state to attention_required when a dependency becomes blocked",
    async (priorState) => {
      const evidence = { ...completeSet, ghl_routing: blockedEvidence("ghl_routing") };
      const fixture = readinessPorts(evidence, prior(priorState));
      const result = await recomputeLaunchReadiness(
        "location_01TenantAlpha",
        { requiredDependencies: ["installation", "ghl_routing"], verifierVersion: "verifier-1" },
        fixture.ports,
      );
      expect(result).toMatchObject({
        state: "attention_required",
        nextAction: "resolve_readiness_blockers",
      });
    },
  );

  it("keeps an incomplete location not_ready before its first certification", async () => {
    const evidence = { ...completeSet, permissions: blockedEvidence("permissions") };
    const fixture = readinessPorts(evidence, prior("not_ready"));
    const result = await recomputeLaunchReadiness(
      "location_01TenantAlpha",
      { requiredDependencies: ["installation", "permissions"], verifierVersion: "verifier-1" },
      fixture.ports,
    );
    expect(result.state).toBe("not_ready");
  });

  it("rejects empty, duplicate, and mismatched verifier dependencies", async () => {
    const fixture = readinessPorts(completeSet);
    await expect(
      recomputeLaunchReadiness(
        "location_01TenantAlpha",
        { requiredDependencies: [], verifierVersion: "verifier-1" },
        fixture.ports,
      ),
    ).rejects.toThrow("at least one");
    await expect(
      recomputeLaunchReadiness(
        "location_01TenantAlpha",
        { requiredDependencies: ["installation", "installation"], verifierVersion: "verifier-1" },
        fixture.ports,
      ),
    ).rejects.toThrow("must be unique");
    const wrong = readinessPorts({ ...completeSet, installation: completeEvidence("permissions") });
    await expect(
      recomputeLaunchReadiness(
        "location_01TenantAlpha",
        { requiredDependencies: ["installation"], verifierVersion: "verifier-1" },
        wrong.ports,
      ),
    ).rejects.toThrow("unexpected dependency");
  });

  it("blocks missing core capabilities and prevents read-only ads access from satisfying publish", () => {
    expect(
      evaluatePermissionReadiness({
        requiredCoreCapabilities: ["contacts.read", "opportunities.write"],
        grantedCapabilities: ["contacts.read"],
        adsPublisherActivated: false,
        adsWriteGranted: false,
      }),
    ).toMatchObject({ code: "missing_core_permission", reconnectAction: "reconnect_highlevel" });
    expect(
      evaluatePermissionReadiness({
        requiredCoreCapabilities: ["contacts.read"],
        grantedCapabilities: ["contacts.read", "adPublishing.readOnly"],
        adsPublisherActivated: true,
        adsWriteGranted: false,
      }),
    ).toMatchObject({ code: "missing_ads_write_permission" });
    expect(
      evaluatePermissionReadiness({
        requiredCoreCapabilities: ["contacts.read"],
        grantedCapabilities: ["contacts.read", "adPublishing.write"],
        adsPublisherActivated: true,
        adsWriteGranted: true,
      }),
    ).toEqual({ status: "complete" });
  });

  it("allows fixed customer-role assignment but forbids onboarding authority elevation", () => {
    expect(
      authorizeOnboardingRoleAssignment({
        actorRole: "location_admin",
        requestedRole: "campaign_creator",
        actorRef: "actor_01Admin",
        subjectRef: "actor_01Admin",
      }),
    ).toEqual({ allowed: true, concentratedDuties: true });
    expect(
      authorizeOnboardingRoleAssignment({
        actorRole: "location_admin",
        requestedRole: "viewer",
        actorRef: "actor_01Admin",
        subjectRef: "actor_02Viewer",
      }),
    ).toEqual({ allowed: true, concentratedDuties: false });
    expect(() =>
      authorizeOnboardingRoleAssignment({
        actorRole: "viewer",
        requestedRole: "campaign_creator",
        actorRef: "actor_02Viewer",
        subjectRef: "actor_02Viewer",
      }),
    ).toThrow("only a location administrator");
    for (const requestedRole of ["location_admin", "platform_support"] as const) {
      expect(() =>
        authorizeOnboardingRoleAssignment({
          actorRole: "location_admin",
          requestedRole,
          actorRef: "actor_01Admin",
          subjectRef: "actor_01Admin",
        }),
      ).toThrow("cannot grant");
    }
  });

  it("produces tenant-safe diagnostics and PII-free onboarding events", async () => {
    const fixture = readinessPorts(
      { ...completeSet, meta_connection: blockedEvidence("meta_connection") },
      prior("launch_ready"),
    );
    const result = await recomputeLaunchReadiness(
      "location_01TenantAlpha",
      { requiredDependencies: ["installation", "meta_connection"], verifierVersion: "verifier-1" },
      fixture.ports,
    );
    const diagnostics = safeReadinessDiagnostics(result);
    expect(diagnostics.blockers).toEqual([
      {
        dependency: "meta_connection",
        code: "mapping_stale",
        correlationRef: "correlation_01Mapping",
        retryAction: "retry_mapping_verifier",
      },
    ]);
    expect(JSON.stringify(diagnostics)).not.toMatch(/token|secret|webhook|lead data/iu);

    const events: OnboardingEvent[] = [];
    const event: OnboardingEvent = {
      eventRef: "event_01Blocked",
      locationRef: "location_01TenantAlpha",
      actorRef: "actor_01Admin",
      event: "blocked",
      itemCode: "meta_connection",
      blockerCode: "mapping_stale",
      correlationRef: "correlation_01Mapping",
      occurredAt: now.toISOString(),
    };
    await recordOnboardingEvent(event, { append: async (value) => void events.push(value) });
    expect(events).toEqual([event]);
  });

  it("rejects invalid event payloads before persistence", async () => {
    const append = vi.fn();
    await expect(
      recordOnboardingEvent(
        {
          eventRef: "event_01Bad",
          locationRef: "location_01TenantAlpha",
          actorRef: "actor_01Admin",
          event: "viewed",
          correlationRef: "bad",
          occurredAt: now.toISOString(),
        },
        { append },
      ),
    ).rejects.toThrow();
    expect(append).not.toHaveBeenCalled();
  });
});
