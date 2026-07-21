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
import { z } from "zod";

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

const ProviderObjectRefSchema = z
  .string()
  .min(8)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]+$/u);

const OnboardingProviderObjectTypeSchema = z.enum([
  "owner",
  "pipeline",
  "stage",
  "calendar",
  "workflow",
  "tag",
  "custom_field",
  "ad_account",
  "page",
  "instagram_identity",
  "lead_form",
  "pixel",
]);

const OnboardingProviderObjectSchema = z
  .object({
    provider: z.enum(["ghl", "meta"]),
    objectType: OnboardingProviderObjectTypeSchema,
    providerId: ProviderObjectRefSchema,
    locationRef: LaunchReadinessResultSchema.shape.locationRef,
    active: z.boolean(),
  })
  .strict();

const OnboardingConfigurationRequestSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("select_existing"),
      provider: z.enum(["ghl", "meta"]),
      objectType: OnboardingProviderObjectTypeSchema,
      providerId: ProviderObjectRefSchema,
    })
    .strict(),
  z
    .object({
      mode: z.literal("ensure_namespaced"),
      provider: z.literal("ghl"),
      objectType: z.enum(["tag", "custom_field"]),
      namespace: z
        .string()
        .min(8)
        .max(96)
        .regex(/^oalo:[a-z0-9][a-z0-9:-]+$/u),
      idempotencyRef: ProviderObjectRefSchema,
    })
    .strict(),
]);

export type OnboardingProviderObject = z.infer<typeof OnboardingProviderObjectSchema>;
export type OnboardingConfigurationRequest = z.infer<typeof OnboardingConfigurationRequestSchema>;

export interface OnboardingConfigurationPort {
  readBack(input: {
    readonly locationRef: string;
    readonly provider: OnboardingProviderObject["provider"];
    readonly objectType: OnboardingProviderObject["objectType"];
    readonly providerId: string;
  }): Promise<unknown>;
  findReusableNamespaced(input: {
    readonly locationRef: string;
    readonly objectType: "tag" | "custom_field";
    readonly namespace: string;
  }): Promise<unknown | undefined>;
  createNamespaced(input: {
    readonly locationRef: string;
    readonly objectType: "tag" | "custom_field";
    readonly namespace: string;
    readonly idempotencyRef: string;
  }): Promise<unknown>;
}

const ghlObjectTypes = new Set<OnboardingProviderObject["objectType"]>([
  "owner",
  "pipeline",
  "stage",
  "calendar",
  "workflow",
  "tag",
  "custom_field",
]);

function assertProviderObjectType(
  provider: OnboardingProviderObject["provider"],
  objectType: OnboardingProviderObject["objectType"],
): void {
  if ((provider === "ghl") !== ghlObjectTypes.has(objectType)) {
    throw new LaunchReadinessError("provider object type does not belong to the selected provider");
  }
}

async function verifiedReadBack(
  expected: Readonly<{
    locationRef: string;
    provider: OnboardingProviderObject["provider"];
    objectType: OnboardingProviderObject["objectType"];
    providerId: string;
  }>,
  port: OnboardingConfigurationPort,
): Promise<OnboardingProviderObject> {
  const observed = OnboardingProviderObjectSchema.parse(await port.readBack(expected));
  assertProviderObjectType(observed.provider, observed.objectType);
  if (
    !observed.active ||
    observed.locationRef !== expected.locationRef ||
    observed.provider !== expected.provider ||
    observed.objectType !== expected.objectType ||
    observed.providerId !== expected.providerId
  ) {
    throw new LaunchReadinessError(
      "provider read-back did not match the active location selection",
    );
  }
  return observed;
}

export async function configureOnboardingProviderObjects(
  locationRefInput: string,
  untrustedRequests: readonly unknown[],
  port: OnboardingConfigurationPort,
): Promise<readonly OnboardingProviderObject[]> {
  const locationRef = LaunchReadinessResultSchema.shape.locationRef.parse(locationRefInput);
  const requests = z
    .array(OnboardingConfigurationRequestSchema)
    .min(1)
    .max(50)
    .parse(untrustedRequests);
  const verified: OnboardingProviderObject[] = [];
  for (const request of requests) {
    if (request.mode === "select_existing") {
      assertProviderObjectType(request.provider, request.objectType);
      verified.push(
        await verifiedReadBack(
          {
            locationRef,
            provider: request.provider,
            objectType: request.objectType,
            providerId: request.providerId,
          },
          port,
        ),
      );
      continue;
    }

    const reusableInput = {
      locationRef,
      objectType: request.objectType,
      namespace: request.namespace,
    };
    const reusable = await port.findReusableNamespaced(reusableInput);
    const candidate = OnboardingProviderObjectSchema.extend({
      provider: z.literal("ghl"),
      objectType: z.literal(request.objectType),
      locationRef: z.literal(locationRef),
    }).parse(
      reusable ??
        (await port.createNamespaced({
          ...reusableInput,
          idempotencyRef: request.idempotencyRef,
        })),
    );
    verified.push(
      await verifiedReadBack(
        {
          locationRef,
          provider: "ghl",
          objectType: request.objectType,
          providerId: candidate.providerId,
        },
        port,
      ),
    );
  }
  return Object.freeze(verified);
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

export interface OnboardingRoleBinding {
  readonly locationRef: string;
  readonly subjectRef: string;
  readonly role: ApplicationRole;
  readonly assignedByRef: string;
  readonly concentratedDuties: boolean;
}

export class OnboardingRoleBindingLedger {
  readonly #bindings = new Map<string, OnboardingRoleBinding>();

  public assign(input: {
    readonly locationRef: string;
    readonly actorRole: ApplicationRole;
    readonly requestedRole: ApplicationRole;
    readonly actorRef: string;
    readonly subjectRef: string;
  }): Readonly<{ binding: OnboardingRoleBinding; duplicate: boolean }> {
    const locationRef = LaunchReadinessResultSchema.shape.locationRef.parse(input.locationRef);
    const key = `${locationRef}:${input.subjectRef}`;
    const existing = this.#bindings.get(key);
    if (existing !== undefined) {
      if (existing.role !== input.requestedRole) {
        throw new LaunchReadinessError("an existing role binding requires explicit replacement");
      }
      return { binding: existing, duplicate: true };
    }
    const authorization = authorizeOnboardingRoleAssignment(input);
    const binding = Object.freeze({
      locationRef,
      subjectRef: input.subjectRef,
      role: ApplicationRoleSchema.parse(input.requestedRole),
      assignedByRef: input.actorRef,
      concentratedDuties: authorization.concentratedDuties,
    });
    this.#bindings.set(key, binding);
    return { binding, duplicate: false };
  }
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
