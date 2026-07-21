import { createHash } from "node:crypto";

import {
  ApprovalDecisionSchema,
  ApprovalLinkClaimsSchema,
  ApprovalSnapshotSchema,
  CampaignEventSchema,
  CampaignVersionInputSchema,
  CampaignVersionSchema,
  GenerationRecordSchema,
  PreflightResultSchema,
  PreflightRulesSchema,
  type ApprovalDecision,
  type ApprovalLinkClaims,
  type CampaignEvent,
  type CampaignState,
  type CampaignVersion,
  type GenerationRecord,
  type PreflightResult,
} from "@oalo/contracts";
import {
  assertCampaignTransition,
  evaluateCampaignPreflight,
  validateApprovalLink,
} from "@oalo/domain";

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
    .join(",")}}`;
}

function hash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export interface CampaignVersionTransaction {
  getLatestVersionNo(locationRef: string, campaignRef: string): Promise<number>;
  append(version: CampaignVersion): Promise<void>;
}

export interface CampaignVersionRepository {
  run<T>(work: (transaction: CampaignVersionTransaction) => Promise<T>): Promise<T>;
}

export async function createCampaignVersion(
  input: Readonly<{ version: unknown; createdAt: Date }>,
  repository: CampaignVersionRepository,
): Promise<Readonly<CampaignVersion>> {
  const versionInput = CampaignVersionInputSchema.parse(input.version);
  return repository.run(async (transaction) => {
    const version = CampaignVersionSchema.parse({
      ...versionInput,
      versionNo:
        (await transaction.getLatestVersionNo(versionInput.locationRef, versionInput.campaignRef)) +
        1,
      manifestHash: hash(versionInput.manifest),
      createdAt: input.createdAt.toISOString(),
    });
    await transaction.append(version);
    return deepFreeze(version);
  });
}

export function runCampaignPreflight(
  untrustedVersion: unknown,
  untrustedRules: unknown,
): Readonly<PreflightResult> {
  const version = CampaignVersionSchema.parse(untrustedVersion);
  const rules = PreflightRulesSchema.parse(untrustedRules);
  if (hash(version.manifest) !== version.manifestHash) {
    throw new Error("Campaign manifest hash does not match its immutable content");
  }
  if (rules.rulesetVersionRef !== version.inputVersions.rulesetVersionRef) {
    throw new Error("Preflight ruleset does not match the campaign input versions");
  }
  const findings = evaluateCampaignPreflight(version.manifest, rules);
  const resultBody = {
    schemaVersion: 1 as const,
    campaignRef: version.campaignRef,
    campaignVersionRef: version.campaignVersionRef,
    manifestHash: version.manifestHash,
    inputVersions: version.inputVersions,
    rulesetVersionRef: rules.rulesetVersionRef,
    findings,
    blocking: findings.some((item) => item.severity === "blocking"),
    evaluatedAt: rules.evaluatedAt,
  };
  return deepFreeze(PreflightResultSchema.parse({ ...resultBody, resultHash: hash(resultBody) }));
}

export interface ApprovalAuthorityPort {
  assertMayApprove(
    input: Readonly<{
      locationRef: string;
      campaignRef: string;
      actorRef: string;
      actorRole: ApprovalDecision["actorRole"];
    }>,
  ): Promise<void>;
}

export async function createApprovalDecision(
  input: Readonly<{
    approvalRef: string;
    campaignVersion: unknown;
    preflight: unknown;
    actorRef: string;
    actorRole: ApprovalDecision["actorRole"];
    decidedAt: Date;
    ipAuditHash: string;
    decision: ApprovalDecision["decision"];
  }>,
  authority: ApprovalAuthorityPort,
): Promise<Readonly<ApprovalDecision>> {
  const version = CampaignVersionSchema.parse(input.campaignVersion);
  const preflight = PreflightResultSchema.parse(input.preflight);
  if (hash(version.manifest) !== version.manifestHash) {
    throw new Error("Campaign manifest hash does not match its immutable content");
  }
  if (
    preflight.blocking ||
    preflight.campaignVersionRef !== version.campaignVersionRef ||
    preflight.manifestHash !== version.manifestHash
  ) {
    throw new Error("A current passing preflight is required before approval");
  }
  await authority.assertMayApprove({
    locationRef: version.locationRef,
    campaignRef: version.campaignRef,
    actorRef: input.actorRef,
    actorRole: input.actorRole,
  });
  const snapshot = ApprovalSnapshotSchema.parse({
    pageVersionRef: version.manifest.artifacts.pageVersionRef,
    pdfVersionRef: version.manifest.artifacts.pdfVersionRef,
    creativeVersionRef: version.manifest.artifacts.creativeVersionRef,
    copyVersionRef: version.manifest.artifacts.copyVersionRef,
    disclosureVersionRef: version.manifest.artifacts.disclosureVersionRef,
    targetingHash: hash(version.manifest.meta.targeting),
    budgetHash: hash({
      dailyBudgetMinor: version.manifest.meta.dailyBudgetMinor,
      totalBudgetMinor: version.manifest.meta.totalBudgetMinor,
    }),
    datesHash: hash({
      openHouseStartsAt: version.manifest.property.openHouseStartsAt,
      openHouseEndsAt: version.manifest.property.openHouseEndsAt,
    }),
    formVersionRef: version.manifest.artifacts.formVersionRef,
    destinationVersionRef: version.manifest.artifacts.destinationVersionRef,
  });
  return deepFreeze(
    ApprovalDecisionSchema.parse({
      schemaVersion: 1,
      approvalRef: input.approvalRef,
      locationRef: version.locationRef,
      campaignRef: version.campaignRef,
      campaignVersionRef: version.campaignVersionRef,
      manifestHash: version.manifestHash,
      preflightResultHash: preflight.resultHash,
      actorRef: input.actorRef,
      actorRole: input.actorRole,
      decidedAt: input.decidedAt.toISOString(),
      ipAuditHash: input.ipAuditHash,
      decision: input.decision,
      snapshot,
    }),
  );
}

export interface CampaignEventPort {
  currentState(locationRef: string, campaignRef: string): Promise<CampaignState>;
  append(event: CampaignEvent): Promise<void>;
}

export async function appendCampaignTransition(
  untrustedEvent: unknown,
  port: CampaignEventPort,
): Promise<Readonly<CampaignEvent>> {
  const event = CampaignEventSchema.parse(untrustedEvent);
  const current = await port.currentState(event.locationRef, event.campaignRef);
  if (current !== event.fromState) throw new Error("Campaign state changed before event append");
  assertCampaignTransition(event.fromState, event.toState);
  await port.append(event);
  return deepFreeze(event);
}

export function recordGeneration(untrustedRecord: unknown): Readonly<GenerationRecord> {
  return deepFreeze(GenerationRecordSchema.parse(untrustedRecord));
}

export interface ApprovalLinkPort {
  redeemOnce(linkRef: string, redeemedAt: Date): Promise<boolean>;
}

export async function redeemApprovalLink(
  untrustedClaims: unknown,
  expected: Readonly<{ locationRef: string; campaignVersionRef: string; now: Date }>,
  port: ApprovalLinkPort,
): Promise<Readonly<ApprovalLinkClaims>> {
  const claims = ApprovalLinkClaimsSchema.parse(untrustedClaims);
  validateApprovalLink(claims, expected);
  if (!(await port.redeemOnce(claims.linkRef, expected.now))) {
    throw new Error("Approval link was already redeemed");
  }
  return deepFreeze({ ...claims, redeemedAt: expected.now.toISOString() });
}

export async function completeRegeneration(
  input: Readonly<{
    generation: unknown;
    newVersion: unknown;
    createdAt: Date;
  }>,
  repository: CampaignVersionRepository,
): Promise<
  | Readonly<{ kind: "rejected"; generation: GenerationRecord }>
  | Readonly<{ kind: "usable"; generation: GenerationRecord; version: CampaignVersion }>
> {
  const generation = recordGeneration(input.generation);
  if (generation.result === "rejected") {
    return deepFreeze({ kind: "rejected" as const, generation });
  }
  const versionInput = CampaignVersionInputSchema.parse(input.newVersion);
  if (generation.campaignVersionRef !== versionInput.campaignVersionRef) {
    throw new Error("Generation output must bind to the new immutable campaign version");
  }
  const version = await createCampaignVersion(
    { version: versionInput, createdAt: input.createdAt },
    repository,
  );
  return deepFreeze({ kind: "usable" as const, generation, version });
}

export function retryCampaignOperation<
  T extends Readonly<{
    campaignRef: string;
    campaignVersionRef: string;
    operationRef: string;
  }>,
>(operation: T): T {
  return operation;
}

export async function duplicateCampaign(
  input: Readonly<{
    sourceVersion: unknown;
    sourceState: CampaignState;
    newCampaignRef: string;
    newCampaignVersionRef: string;
    currentInputVersions: CampaignVersion["inputVersions"];
    currentDependenciesValid: boolean;
    actorRef: string;
    createdAt: Date;
  }>,
  repository: CampaignVersionRepository,
): Promise<Readonly<CampaignVersion>> {
  const source = CampaignVersionSchema.parse(input.sourceVersion);
  if (
    !(["approved", "completed"] as const).includes(input.sourceState as "approved" | "completed")
  ) {
    throw new Error("Only approved or completed campaigns can be duplicated");
  }
  if (!input.currentDependenciesValid) {
    throw new Error(
      "Current profiles, permissions, mappings, assets, and policies must revalidate",
    );
  }
  return createCampaignVersion(
    {
      version: {
        schemaVersion: 1,
        locationRef: source.locationRef,
        campaignRef: input.newCampaignRef,
        campaignVersionRef: input.newCampaignVersionRef,
        sourceCampaignRef: source.campaignRef,
        inputVersions: input.currentInputVersions,
        manifest: source.manifest,
        createdBy: input.actorRef,
      },
      createdAt: input.createdAt,
    },
    repository,
  );
}
