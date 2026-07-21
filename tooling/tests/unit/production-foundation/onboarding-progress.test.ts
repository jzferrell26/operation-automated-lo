import { describe, expect, it } from "vitest";

import {
  ONBOARDING_CHECKLIST,
  ONBOARDING_PROGRESS_STEP_IDS,
  OnboardingProgressConflictError,
  OnboardingProgressRecordSchema,
  ServerOnboardingProgressRepository,
  onboardingProgressRecordKey,
  type OnboardingProgressRecord,
  type OnboardingProgressRecordStorePort,
  type OnboardingProgressScope,
  type OnboardingProgressStepId,
  type OnboardingRecoveryKind,
} from "@oalo/application";

const scope: OnboardingProgressScope = {
  principalRef: "principal_01LoanOfficer",
  locationRef: "location_01TenantAlpha",
};

function digest(sequence: number): string {
  return `sha256:${sequence.toString(16).padStart(64, "0")}`;
}

function verification(stepId: OnboardingProgressStepId, sequence: number) {
  return {
    verificationRef: `verification_${String(sequence).padStart(2, "0")}_${stepId}`,
    stepId,
    verifierVersion: `verifier-${sequence}`,
    verifiedAt: `2026-07-21T20:${String(sequence).padStart(2, "0")}:00.000Z`,
    evidenceSummary: `${stepId} passed its current server verifier`,
    evidenceDigest: digest(sequence),
    providerRefs: [`provider_${String(sequence).padStart(2, "0")}`],
  };
}

class DeterministicProgressRecordStore implements OnboardingProgressRecordStorePort {
  public readonly records = new Map<string, OnboardingProgressRecord>();
  public readonly writes: OnboardingProgressRecord[] = [];
  public failedWritesRemaining = 0;
  public alwaysConflict = false;

  public async read(recordKey: string): Promise<unknown | undefined> {
    const current = this.records.get(recordKey);
    return current === undefined ? undefined : structuredClone(current);
  }

  public async compareAndSet(input: {
    readonly recordKey: string;
    readonly expectedRevision: number | undefined;
    readonly record: OnboardingProgressRecord;
  }): Promise<boolean> {
    if (this.alwaysConflict) return false;
    if (this.failedWritesRemaining > 0) {
      this.failedWritesRemaining -= 1;
      return false;
    }
    const current = this.records.get(input.recordKey);
    if (current?.revision !== input.expectedRevision) return false;
    const saved = structuredClone(input.record);
    this.records.set(input.recordKey, saved);
    this.writes.push(saved);
    return true;
  }
}

async function saveFirstSection(
  repository: ServerOnboardingProgressRepository,
  activeScope: OnboardingProgressScope = scope,
): Promise<OnboardingProgressRecord> {
  return repository.saveVerifiedSection({
    scope: activeScope,
    verification: verification("install_permissions", 1),
  });
}

describe("server-owned onboarding progress", () => {
  it("B013 saves every verified section immediately and resumes on a second device", async () => {
    const store = new DeterministicProgressRecordStore();
    const firstDevice = new ServerOnboardingProgressRepository(store);

    expect(await firstDevice.load(scope)).toBeUndefined();
    expect(ONBOARDING_PROGRESS_STEP_IDS).toEqual([
      ...ONBOARDING_CHECKLIST.get_connected,
      ...ONBOARDING_CHECKLIST.launch_readiness,
    ]);

    for (const [index, stepId] of ONBOARDING_PROGRESS_STEP_IDS.entries()) {
      const saved = await firstDevice.saveVerifiedSection({
        scope,
        verification: verification(stepId, index + 1),
      });
      expect(store.writes).toHaveLength(index + 1);
      expect(saved.revision).toBe(index + 1);

      const reloaded = await new ServerOnboardingProgressRepository(store).load(scope);
      expect(reloaded?.verifiedSections.map((section) => section.stepId)).toEqual(
        ONBOARDING_PROGRESS_STEP_IDS.slice(0, index + 1),
      );
    }

    const secondDevice = new ServerOnboardingProgressRepository(store);
    const resumed = await secondDevice.load(scope);
    expect(resumed?.verifiedSections).toHaveLength(ONBOARDING_PROGRESS_STEP_IDS.length);
    expect(resumed?.verifiedSections[0]?.verifiedByPrincipalRef).toBe(scope.principalRef);
    expect(Object.isFrozen(resumed)).toBe(true);
    expect(Object.isFrozen(resumed?.verifiedSections)).toBe(true);
    expect(() => resumed?.verifiedSections.push(resumed.verifiedSections[0]!)).toThrow();
  });

  it("H004 keeps progress location scoped, principal agnostic, and independent of theme", async () => {
    const store = new DeterministicProgressRecordStore();
    const repository = new ServerOnboardingProgressRepository(store);
    await saveFirstSection(repository);
    const writesAfterSave = store.writes.length;

    const sameLocationDifferentTrustedPrincipal = {
      principalRef: "principal_02AuthorizedAdmin",
      locationRef: scope.locationRef,
    };
    expect(onboardingProgressRecordKey(scope)).toBe(
      onboardingProgressRecordKey(sameLocationDifferentTrustedPrincipal),
    );
    expect(onboardingProgressRecordKey(scope)).not.toContain(scope.principalRef);

    let activeTheme: "light" | "dark" = "light";
    const lightSnapshot = await repository.load(sameLocationDifferentTrustedPrincipal);
    activeTheme = "dark";
    const darkSnapshot = await new ServerOnboardingProgressRepository(store).load(
      sameLocationDifferentTrustedPrincipal,
    );
    expect(activeTheme).toBe("dark");
    expect(darkSnapshot).toEqual(lightSnapshot);
    expect(store.writes).toHaveLength(writesAfterSave);

    await expect(repository.load({ ...scope, theme: "dark" })).rejects.toThrow("Unrecognized key");
    await expect(
      repository.load({ ...scope, locationRef: "location_02TenantBeta" }),
    ).resolves.toBeUndefined();
  });

  it("B013 makes retries idempotent and replaces only a reverified section", async () => {
    const store = new DeterministicProgressRecordStore();
    const repository = new ServerOnboardingProgressRepository(store);
    const first = await saveFirstSection(repository);

    const duplicate = await repository.saveVerifiedSection({
      scope,
      verification: verification("install_permissions", 1),
    });
    expect(duplicate).toEqual(first);
    expect(store.writes).toHaveLength(1);

    const replacement = await repository.saveVerifiedSection({
      scope,
      verification: verification("install_permissions", 2),
    });
    expect(replacement.revision).toBe(2);
    expect(replacement.verifiedSections).toHaveLength(1);
    expect(replacement.verifiedSections[0]?.verificationRef).toContain("verification_02");
    expect(store.writes).toHaveLength(2);
  });

  it("A041 resumes the same checklist after every supported recovery event", async () => {
    const store = new DeterministicProgressRecordStore();
    await saveFirstSection(new ServerOnboardingProgressRepository(store));
    const recoveryKinds: readonly OnboardingRecoveryKind[] = [
      "reconnect",
      "reinstall",
      "scope_upgrade",
      "token_recovery",
    ];

    for (const [index, kind] of recoveryKinds.entries()) {
      const repositoryAfterRecovery = new ServerOnboardingProgressRepository(store);
      const resumed = await repositoryAfterRecovery.resumeAfterRecovery({
        scope,
        recovery: {
          recoveryRef: `recovery_${String(index + 1).padStart(2, "0")}_${kind}`,
          kind,
          recoveredAt: `2026-07-21T21:0${index}:00.000Z`,
        },
      });
      expect(resumed.verifiedSections.map((section) => section.stepId)).toEqual([
        "install_permissions",
      ]);
      expect(resumed.recoveryEvents.at(-1)).toMatchObject({
        kind,
        resumedByPrincipalRef: scope.principalRef,
      });
    }

    const writesBeforeDuplicate = store.writes.length;
    const duplicate = await new ServerOnboardingProgressRepository(store).resumeAfterRecovery({
      scope,
      recovery: {
        recoveryRef: "recovery_04_token_recovery",
        kind: "token_recovery",
        recoveredAt: "2026-07-21T21:03:00.000Z",
      },
    });
    expect(duplicate.recoveryEvents).toHaveLength(4);
    expect(store.writes).toHaveLength(writesBeforeDuplicate);

    const emptyLocation = {
      principalRef: "principal_03RecoveryAdmin",
      locationRef: "location_03RecoveredEmpty",
    };
    const emptyResume = await new ServerOnboardingProgressRepository(store).resumeAfterRecovery({
      scope: emptyLocation,
      recovery: {
        recoveryRef: "recovery_05_reinstall",
        kind: "reinstall",
        recoveredAt: "2026-07-21T22:00:00.000Z",
      },
    });
    expect(emptyResume.verifiedSections).toEqual([]);
    expect(emptyResume.revision).toBe(1);
  });

  it("retries compare-and-set races and fails closed after bounded conflicts", async () => {
    const retryingStore = new DeterministicProgressRecordStore();
    retryingStore.failedWritesRemaining = 1;
    const saved = await saveFirstSection(new ServerOnboardingProgressRepository(retryingStore));
    expect(saved.revision).toBe(1);
    expect(retryingStore.writes).toHaveLength(1);

    const conflictingStore = new DeterministicProgressRecordStore();
    conflictingStore.alwaysConflict = true;
    await expect(
      saveFirstSection(new ServerOnboardingProgressRepository(conflictingStore)),
    ).rejects.toBeInstanceOf(OnboardingProgressConflictError);
    expect(conflictingStore.writes).toEqual([]);
  });

  it("validates persisted tenant ownership and uniqueness at the store boundary", async () => {
    const validRecord = OnboardingProgressRecordSchema.parse({
      locationRef: scope.locationRef,
      revision: 1,
      verifiedSections: [
        {
          ...verification("install_permissions", 1),
          verifiedByPrincipalRef: scope.principalRef,
        },
      ],
      recoveryEvents: [
        {
          recoveryRef: "recovery_01_reconnect",
          kind: "reconnect",
          recoveredAt: "2026-07-21T21:00:00.000Z",
          resumedByPrincipalRef: scope.principalRef,
        },
      ],
      updatedAt: "2026-07-21T21:00:00.000Z",
    });

    expect(() =>
      OnboardingProgressRecordSchema.parse({
        ...validRecord,
        verifiedSections: [validRecord.verifiedSections[0], validRecord.verifiedSections[0]],
      }),
    ).toThrow("Verified onboarding sections must be unique");
    expect(() =>
      OnboardingProgressRecordSchema.parse({
        ...validRecord,
        recoveryEvents: [validRecord.recoveryEvents[0], validRecord.recoveryEvents[0]],
      }),
    ).toThrow("Onboarding recovery references must be unique");

    const store = new DeterministicProgressRecordStore();
    store.records.set(onboardingProgressRecordKey(scope), {
      ...validRecord,
      locationRef: "location_02TenantBeta",
    });
    await expect(new ServerOnboardingProgressRepository(store).load(scope)).rejects.toThrow(
      "Invalid input",
    );
  });
});
