import {
  ApplicationRoleSchema,
  LaunchReadinessResultSchema,
  OnboardingEventSchema,
  ReadinessEvidenceSchema,
  type ApplicationRole,
  type LaunchReadinessResult,
  type OnboardingEvent,
  type ReadinessDependency,
  type ReadinessEvidence,
} from "@oalo/contracts";

export const ONBOARDING_CHECKLIST = Object.freeze({
  get_connected: Object.freeze([
    "install_permissions",
    "brand_compliance",
    "ghl_routing",
    "meta_connection",
    "team_responsibilities",
  ]),
  launch_readiness: Object.freeze([
    "dependency_recheck",
    "synthetic_lead",
    "results_review",
    "launch_ready",
  ]),
});

export class LaunchReadinessError extends Error {
  public constructor(reason: string) {
    super(`Launch readiness rejected: ${reason}`);
    this.name = "LaunchReadinessError";
  }
}

export interface LaunchReadinessPolicy {
  readonly requiredDependencies: readonly ReadinessDependency[];
  readonly verifierVersion: string;
}

export interface LaunchReadinessVerifierPort {
  verify(input: {
    readonly locationRef: string;
    readonly dependency: ReadinessDependency;
  }): Promise<ReadinessEvidence>;
}

export interface LaunchReadinessRepositoryPort {
  current(locationRef: string): Promise<LaunchReadinessResult | undefined>;
  findByFingerprint(input: {
    readonly locationRef: string;
    readonly fingerprint: string;
  }): Promise<LaunchReadinessResult | undefined>;
  setCurrentAndAppendHistory(result: LaunchReadinessResult): Promise<void>;
}

export interface LaunchReadinessHashPort {
  sha256(value: string): string;
}

export interface LaunchReadinessIdentityPort {
  next(prefix: "readiness" | "event"): string;
}

export interface LaunchReadinessClockPort {
  now(): Date;
}

export interface OnboardingEventPort {
  append(event: OnboardingEvent): Promise<void>;
}

export interface LaunchReadinessPorts {
  readonly verifier: LaunchReadinessVerifierPort;
  readonly repository: LaunchReadinessRepositoryPort;
  readonly hash: LaunchReadinessHashPort;
  readonly identity: LaunchReadinessIdentityPort;
  readonly clock: LaunchReadinessClockPort;
}

function canonicalEvidence(evidence: readonly ReadinessEvidence[]): string {
  return JSON.stringify(
    evidence
      .map((item) => ({
        dependency: item.dependency,
        status: item.status,
        observed: item.observed,
        verifierVersion: item.verifierVersion,
        verifiedAt: item.verifiedAt,
        evidenceSummary: item.evidenceSummary,
        providerIds: [...item.providerIds].toSorted(),
        block: item.block,
      }))
      .toSorted((left, right) => left.dependency.localeCompare(right.dependency)),
  );
}

export function validateChecklistCardinality(
  checklist: {
    readonly get_connected: readonly string[];
    readonly launch_readiness: readonly string[];
  } = ONBOARDING_CHECKLIST,
): true {
  if (checklist.get_connected.length > 5 || checklist.launch_readiness.length > 5) {
    throw new LaunchReadinessError("a visible phase may contain no more than five items");
  }
  return true;
}

export async function recomputeLaunchReadiness(
  locationRef: string,
  policy: LaunchReadinessPolicy,
  ports: LaunchReadinessPorts,
): Promise<LaunchReadinessResult> {
  if (policy.requiredDependencies.length === 0) {
    throw new LaunchReadinessError("at least one policy-driven dependency is required");
  }
  const uniqueDependencies = [...new Set(policy.requiredDependencies)];
  if (uniqueDependencies.length !== policy.requiredDependencies.length) {
    throw new LaunchReadinessError("readiness dependencies must be unique");
  }
  const prior = await ports.repository.current(locationRef);
  const evidence = await Promise.all(
    uniqueDependencies.map(async (dependency) =>
      ReadinessEvidenceSchema.parse(await ports.verifier.verify({ locationRef, dependency })),
    ),
  );
  if (evidence.some((item) => !uniqueDependencies.includes(item.dependency))) {
    throw new LaunchReadinessError("verifier returned an unexpected dependency");
  }
  const allComplete = evidence.every((item) => item.status === "complete" && item.observed);
  const state = allComplete
    ? "launch_ready"
    : prior?.state === "launch_ready" || prior?.state === "attention_required"
      ? "attention_required"
      : "not_ready";
  const nextAction = allComplete ? "create_open_house_boost" : "resolve_readiness_blockers";
  const evidenceSummary = allComplete
    ? "Every current policy-driven dependency was observed and verified."
    : "One or more current policy-driven dependencies require attention.";
  const evaluatedAt = ports.clock.now().toISOString();
  const fingerprint = ports.hash.sha256(
    JSON.stringify({
      locationRef,
      verifierVersion: policy.verifierVersion,
      state,
      evidence: canonicalEvidence(evidence),
    }),
  );
  const existing = await ports.repository.findByFingerprint({ locationRef, fingerprint });
  if (existing !== undefined) return LaunchReadinessResultSchema.parse(existing);

  const result = LaunchReadinessResultSchema.parse({
    readinessRef: ports.identity.next("readiness"),
    locationRef,
    state,
    verifierVersion: policy.verifierVersion,
    evaluatedAt,
    evidence,
    evidenceSummary,
    nextAction,
    fingerprint,
  });
  await ports.repository.setCurrentAndAppendHistory(result);
  return result;
}

export function evaluatePermissionReadiness(input: {
  readonly requiredCoreCapabilities: readonly string[];
  readonly grantedCapabilities: readonly string[];
  readonly adsPublisherActivated: boolean;
  readonly adsWriteGranted: boolean;
}):
  | { readonly status: "complete" }
  | {
      readonly status: "blocked";
      readonly code: "missing_core_permission" | "missing_ads_write_permission";
      readonly reconnectAction: "reconnect_highlevel";
    } {
  const granted = new Set(input.grantedCapabilities);
  if (input.requiredCoreCapabilities.some((capability) => !granted.has(capability))) {
    return {
      status: "blocked",
      code: "missing_core_permission",
      reconnectAction: "reconnect_highlevel",
    };
  }
  if (input.adsPublisherActivated && !input.adsWriteGranted) {
    return {
      status: "blocked",
      code: "missing_ads_write_permission",
      reconnectAction: "reconnect_highlevel",
    };
  }
  return { status: "complete" };
}

export function authorizeOnboardingRoleAssignment(input: {
  readonly actorRole: ApplicationRole;
  readonly requestedRole: ApplicationRole;
  readonly actorRef: string;
  readonly subjectRef: string;
}): { readonly allowed: true; readonly concentratedDuties: boolean } {
  const actorRole = ApplicationRoleSchema.parse(input.actorRole);
  const requestedRole = ApplicationRoleSchema.parse(input.requestedRole);
  if (actorRole !== "location_admin") {
    throw new LaunchReadinessError("only a location administrator can assign customer roles");
  }
  if (requestedRole === "location_admin" || requestedRole === "platform_support") {
    throw new LaunchReadinessError(
      "onboarding cannot grant installation or platform support authority",
    );
  }
  return { allowed: true, concentratedDuties: input.actorRef === input.subjectRef };
}

export function safeReadinessDiagnostics(result: LaunchReadinessResult): {
  readonly locationRef: string;
  readonly state: LaunchReadinessResult["state"];
  readonly evaluatedAt: string;
  readonly blockers: readonly {
    readonly dependency: ReadinessDependency;
    readonly code: string;
    readonly correlationRef: string;
    readonly retryAction: string;
  }[];
} {
  const parsed = LaunchReadinessResultSchema.parse(result);
  return Object.freeze({
    locationRef: parsed.locationRef,
    state: parsed.state,
    evaluatedAt: parsed.evaluatedAt,
    blockers: parsed.evidence.flatMap((item) =>
      item.block === undefined
        ? []
        : [
            {
              dependency: item.dependency,
              code: item.block.code,
              correlationRef: item.block.correlationRef,
              retryAction: item.block.retryAction,
            },
          ],
    ),
  });
}

export async function recordOnboardingEvent(
  unsafeEvent: OnboardingEvent,
  events: OnboardingEventPort,
): Promise<void> {
  await events.append(OnboardingEventSchema.parse(unsafeEvent));
}
