import { z } from "zod";

export const ONBOARDING_PROGRESS_STEP_IDS = Object.freeze([
  "install_permissions",
  "brand_compliance",
  "ghl_routing",
  "meta_connection",
  "team_responsibilities",
  "dependency_recheck",
  "synthetic_lead",
  "results_review",
  "launch_ready",
] as const);

export const OnboardingProgressStepIdSchema = z.enum(ONBOARDING_PROGRESS_STEP_IDS);

const SafeProgressReferenceSchema = z
  .string()
  .min(8)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]+$/u);
const SafeEvidenceDigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/u);
const ProgressTimestampSchema = z.string().datetime({ offset: true });

export const OnboardingProgressScopeSchema = z
  .object({
    principalRef: SafeProgressReferenceSchema,
    locationRef: SafeProgressReferenceSchema,
  })
  .strict();

export const OnboardingSectionVerificationSchema = z
  .object({
    verificationRef: SafeProgressReferenceSchema,
    stepId: OnboardingProgressStepIdSchema,
    verifierVersion: z.string().min(1).max(80),
    verifiedAt: ProgressTimestampSchema,
    evidenceSummary: z.string().min(1).max(500),
    evidenceDigest: SafeEvidenceDigestSchema,
    providerRefs: z.array(SafeProgressReferenceSchema).max(50),
    verifiedByPrincipalRef: SafeProgressReferenceSchema,
  })
  .strict();

export const OnboardingRecoveryKindSchema = z.enum([
  "reconnect",
  "reinstall",
  "scope_upgrade",
  "token_recovery",
]);

export const OnboardingRecoveryEventSchema = z
  .object({
    recoveryRef: SafeProgressReferenceSchema,
    kind: OnboardingRecoveryKindSchema,
    recoveredAt: ProgressTimestampSchema,
    resumedByPrincipalRef: SafeProgressReferenceSchema,
  })
  .strict();

function valuesAreUnique<T>(values: readonly T[]): boolean {
  return new Set(values).size === values.length;
}

export const OnboardingProgressRecordSchema = z
  .object({
    locationRef: SafeProgressReferenceSchema,
    revision: z.number().int().positive(),
    verifiedSections: z
      .array(OnboardingSectionVerificationSchema)
      .max(ONBOARDING_PROGRESS_STEP_IDS.length)
      .refine(
        (sections) => valuesAreUnique(sections.map((section) => section.stepId)),
        "Verified onboarding sections must be unique",
      ),
    recoveryEvents: z
      .array(OnboardingRecoveryEventSchema)
      .max(100)
      .refine(
        (events) => valuesAreUnique(events.map((event) => event.recoveryRef)),
        "Onboarding recovery references must be unique",
      ),
    updatedAt: ProgressTimestampSchema,
  })
  .strict();

const SaveVerifiedOnboardingSectionInputSchema = z
  .object({
    scope: OnboardingProgressScopeSchema,
    verification: OnboardingSectionVerificationSchema.omit({
      verifiedByPrincipalRef: true,
    }),
  })
  .strict();

const ResumeOnboardingProgressInputSchema = z
  .object({
    scope: OnboardingProgressScopeSchema,
    recovery: OnboardingRecoveryEventSchema.omit({
      resumedByPrincipalRef: true,
    }),
  })
  .strict();

export type OnboardingProgressScope = z.infer<typeof OnboardingProgressScopeSchema>;
export type OnboardingProgressStepId = z.infer<typeof OnboardingProgressStepIdSchema>;
export type OnboardingSectionVerification = z.infer<typeof OnboardingSectionVerificationSchema>;
export type OnboardingRecoveryKind = z.infer<typeof OnboardingRecoveryKindSchema>;
export type OnboardingRecoveryEvent = z.infer<typeof OnboardingRecoveryEventSchema>;
export type OnboardingProgressRecord = z.infer<typeof OnboardingProgressRecordSchema>;

export interface OnboardingProgressRecordStorePort {
  read(recordKey: string): Promise<unknown | undefined>;
  compareAndSet(input: {
    readonly recordKey: string;
    readonly expectedRevision: number | undefined;
    readonly record: OnboardingProgressRecord;
  }): Promise<boolean>;
}

export class OnboardingProgressConflictError extends Error {
  public constructor(locationRef: string) {
    super(`Onboarding progress could not be saved for ${locationRef} after concurrent updates`);
    this.name = "OnboardingProgressConflictError";
  }
}

const MAX_COMPARE_AND_SET_ATTEMPTS = 4;

function recordKeyForLocation(locationRef: string): string {
  return `onboarding-progress:${locationRef}`;
}

export function onboardingProgressRecordKey(scopeInput: unknown): string {
  const scope = OnboardingProgressScopeSchema.parse(scopeInput);
  return recordKeyForLocation(scope.locationRef);
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function orderedSections(
  sections: readonly OnboardingSectionVerification[],
): OnboardingSectionVerification[] {
  const byStep = new Map(sections.map((section) => [section.stepId, section]));
  return ONBOARDING_PROGRESS_STEP_IDS.flatMap((stepId) => {
    const section = byStep.get(stepId);
    return section === undefined ? [] : [section];
  });
}

export class ServerOnboardingProgressRepository {
  readonly #store: OnboardingProgressRecordStorePort;

  /**
   * This is a persistence boundary. The caller must build the scope from a validated
   * server session and authorize the principal for the location before calling it.
   */
  public constructor(store: OnboardingProgressRecordStorePort) {
    this.#store = store;
  }

  public async load(scopeInput: unknown): Promise<OnboardingProgressRecord | undefined> {
    const scope = OnboardingProgressScopeSchema.parse(scopeInput);
    const current = await this.#readCurrent(scope.locationRef);
    return current === undefined ? undefined : deepFreeze(current);
  }

  public async saveVerifiedSection(input: unknown): Promise<OnboardingProgressRecord> {
    const parsed = SaveVerifiedOnboardingSectionInputSchema.parse(input);
    return this.#update(parsed.scope, (current) => {
      if (current !== undefined) {
        const existing = current.verifiedSections.find(
          (section) => section.stepId === parsed.verification.stepId,
        );
        if (existing?.verificationRef === parsed.verification.verificationRef) {
          return current;
        }
      }

      const verification = OnboardingSectionVerificationSchema.parse({
        ...parsed.verification,
        verifiedByPrincipalRef: parsed.scope.principalRef,
      });
      const retained =
        current?.verifiedSections.filter((section) => section.stepId !== verification.stepId) ?? [];
      return OnboardingProgressRecordSchema.parse({
        locationRef: parsed.scope.locationRef,
        revision: (current?.revision ?? 0) + 1,
        verifiedSections: orderedSections([...retained, verification]),
        recoveryEvents: current?.recoveryEvents ?? [],
        updatedAt: verification.verifiedAt,
      });
    });
  }

  public async resumeAfterRecovery(input: unknown): Promise<OnboardingProgressRecord> {
    const parsed = ResumeOnboardingProgressInputSchema.parse(input);
    return this.#update(parsed.scope, (current) => {
      if (
        current !== undefined &&
        current.recoveryEvents.some((event) => event.recoveryRef === parsed.recovery.recoveryRef)
      ) {
        return current;
      }

      const recovery = OnboardingRecoveryEventSchema.parse({
        ...parsed.recovery,
        resumedByPrincipalRef: parsed.scope.principalRef,
      });
      return OnboardingProgressRecordSchema.parse({
        locationRef: parsed.scope.locationRef,
        revision: (current?.revision ?? 0) + 1,
        verifiedSections: current?.verifiedSections ?? [],
        recoveryEvents: [...(current?.recoveryEvents ?? []), recovery],
        updatedAt: recovery.recoveredAt,
      });
    });
  }

  async #readCurrent(locationRef: string): Promise<OnboardingProgressRecord | undefined> {
    const stored = await this.#store.read(recordKeyForLocation(locationRef));
    return stored === undefined
      ? undefined
      : OnboardingProgressRecordSchema.extend({ locationRef: z.literal(locationRef) }).parse(
          stored,
        );
  }

  async #update(
    scope: OnboardingProgressScope,
    createNext: (current: OnboardingProgressRecord | undefined) => OnboardingProgressRecord,
  ): Promise<OnboardingProgressRecord> {
    const recordKey = recordKeyForLocation(scope.locationRef);
    for (let attempt = 0; attempt < MAX_COMPARE_AND_SET_ATTEMPTS; attempt += 1) {
      const current = await this.#readCurrent(scope.locationRef);
      const next = createNext(current);
      if (next === current) return deepFreeze(next);

      const saved = await this.#store.compareAndSet({
        recordKey,
        expectedRevision: current?.revision,
        record: next,
      });
      if (saved) return deepFreeze(next);
    }
    throw new OnboardingProgressConflictError(scope.locationRef);
  }
}
