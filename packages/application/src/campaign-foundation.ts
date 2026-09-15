import { createHash } from "node:crypto";

import {
  ApprovalDecisionSchema,
  ApprovalLinkClaimsSchema,
  ApprovalSnapshotSchema,
  CampaignEventSchema,
  CampaignVersionInputSchema,
  CampaignVersionSchema,
  CollateralProjectionInputSchema,
  CollateralProjectionSchema,
  GenerationRecordSchema,
  PaidAdBrandBoundaryRulesSchema,
  PaidAdBrandPreflightEvidenceSchema,
  PaidAdProjectionInputSchema,
  PaidAdProjectionSchema,
  PreflightResultSchema,
  PreflightRulesSchema,
  ProjectionApprovalDecisionSchema,
  type ApprovalDecision,
  type ApprovalLinkClaims,
  type CampaignEvent,
  type CampaignState,
  type CampaignVersion,
  type CollateralProjection,
  type GenerationRecord,
  type PaidAdProjection,
  type PreflightResult,
  type ProjectionApprovalDecision,
} from "@oalo/contracts";
import {
  assertCampaignTransition,
  evaluateCampaignPreflight,
  evaluatePaidAdBrandBoundary,
  validateApprovalLink,
} from "@oalo/domain";
import { z } from "zod";

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

export function canonicalCampaignHash(value: unknown): string {
  return hash(value);
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export function campaignProjectionHash(value: Readonly<{ approvalSummary: unknown }>): string {
  const parsed = z.record(z.string(), z.unknown()).parse(value);
  const { projectionHash: _projectionHash, approvalSummary, ...projectionBody } = parsed;
  const approvalSummaryBody = z.record(z.string(), z.unknown()).parse(approvalSummary);
  const { projectionHash: _summaryHash, ...summaryWithoutHash } = approvalSummaryBody;
  return hash({ ...projectionBody, approvalSummary: summaryWithoutHash });
}

export interface CampaignProjectionPair {
  readonly collateral: Readonly<CollateralProjection>;
  readonly paidAd: Readonly<PaidAdProjection>;
}

export function createCampaignProjections(
  input: Readonly<{
    campaignVersion: unknown;
    collateral: unknown;
    paidAd: unknown;
  }>,
): Readonly<CampaignProjectionPair> {
  const version = CampaignVersionSchema.parse(input.campaignVersion);
  const collateralInput = CollateralProjectionInputSchema.parse(input.collateral);
  const paidAdInput = PaidAdProjectionInputSchema.parse(input.paidAd);
  for (const projection of [collateralInput, paidAdInput]) {
    if (
      projection.locationRef !== version.locationRef ||
      projection.campaignRef !== version.campaignRef ||
      projection.campaignVersionRef !== version.campaignVersionRef
    ) {
      throw new Error("Campaign projection is outside its immutable campaign version");
    }
  }
  if (collateralInput.projectionRef === paidAdInput.projectionRef) {
    throw new Error("Collateral and paid-ad projections must have separate references");
  }
  if (collateralInput.approvalSummary.previewRef === paidAdInput.approvalSummary.previewRef) {
    throw new Error("Collateral and paid-ad projections must have separate approval previews");
  }
  const collateralProjectionHash = campaignProjectionHash(collateralInput);
  const paidAdProjectionHash = campaignProjectionHash(paidAdInput);
  if (collateralProjectionHash === paidAdProjectionHash) {
    throw new Error("Collateral and paid-ad projections must have separate hashes");
  }
  const collateral = CollateralProjectionSchema.parse({
    ...collateralInput,
    projectionHash: collateralProjectionHash,
    approvalSummary: {
      ...collateralInput.approvalSummary,
      projectionHash: collateralProjectionHash,
    },
  });
  const paidAd = PaidAdProjectionSchema.parse({
    ...paidAdInput,
    projectionHash: paidAdProjectionHash,
    approvalSummary: {
      ...paidAdInput.approvalSummary,
      projectionHash: paidAdProjectionHash,
    },
  });
  return deepFreeze({ collateral, paidAd });
}

export interface PaidAdBrandPreflightResult {
  readonly schemaVersion: 1;
  readonly campaignVersionRef: string;
  readonly collateralProjectionHash: string;
  readonly paidAdProjectionHash: string;
  readonly rulesetVersionRef: string;
  readonly brandBoundaryRulesHash: string;
  readonly findings: readonly Readonly<{
    severity: "blocking" | "warning";
    ruleCode: string;
    description: string;
    affected: string;
    remediation: string;
  }>[];
  readonly blocking: boolean;
  readonly resultHash: string;
}

export function runPaidAdBrandPreflight(
  untrustedProjections: unknown,
  untrustedRules: unknown,
): Readonly<PaidAdBrandPreflightResult> {
  const pair = z
    .object({
      collateral: CollateralProjectionSchema,
      paidAd: PaidAdProjectionSchema,
    })
    .strict()
    .parse(untrustedProjections);
  const rules = PaidAdBrandBoundaryRulesSchema.parse(untrustedRules);
  if (
    campaignProjectionHash(pair.collateral) !== pair.collateral.projectionHash ||
    pair.collateral.approvalSummary.projectionHash !== pair.collateral.projectionHash
  ) {
    throw new Error("Collateral projection hash does not match its immutable content");
  }
  if (
    campaignProjectionHash(pair.paidAd) !== pair.paidAd.projectionHash ||
    pair.paidAd.approvalSummary.projectionHash !== pair.paidAd.projectionHash
  ) {
    throw new Error("Paid-ad projection hash does not match its immutable content");
  }
  if (
    pair.collateral.locationRef !== pair.paidAd.locationRef ||
    pair.collateral.campaignRef !== pair.paidAd.campaignRef ||
    pair.collateral.campaignVersionRef !== pair.paidAd.campaignVersionRef
  ) {
    throw new Error("Paid-ad and collateral projections do not share one campaign version");
  }
  const findings = evaluatePaidAdBrandBoundary({
    collateral: pair.collateral,
    paidAd: pair.paidAd,
    rules,
  });
  const resultBody = {
    schemaVersion: 1 as const,
    campaignVersionRef: pair.paidAd.campaignVersionRef,
    collateralProjectionHash: pair.collateral.projectionHash,
    paidAdProjectionHash: pair.paidAd.projectionHash,
    rulesetVersionRef: rules.rulesetVersionRef,
    brandBoundaryRulesHash: hash(rules),
    findings,
    blocking: findings.some((item) => item.severity === "blocking"),
  };
  return deepFreeze({ ...resultBody, resultHash: hash(resultBody) });
}

export interface PaidAdBrandAttestationAuthority {
  assertAuthorized(
    input: Readonly<{
      campaignVersionRef: string;
      collateralProjectionHash: string;
      paidAdProjectionHash: string;
      rulesetVersionRef: string;
      brandBoundaryRulesHash: string;
      preflightResultHash: string;
    }>,
  ): void | Promise<void>;
}

export async function authorizePaidAdProjectionForRendering(
  untrustedPaidAdProjection: unknown,
  untrustedEvidence: unknown,
  authority: PaidAdBrandAttestationAuthority,
): Promise<Readonly<PaidAdProjection>> {
  const projection = PaidAdProjectionSchema.parse(untrustedPaidAdProjection);
  const evidence = PaidAdBrandPreflightEvidenceSchema.parse(untrustedEvidence);
  if (
    campaignProjectionHash(projection) !== projection.projectionHash ||
    projection.approvalSummary.projectionHash !== projection.projectionHash ||
    evidence.campaignVersionRef !== projection.campaignVersionRef ||
    evidence.paidAdProjectionHash !== projection.projectionHash
  ) {
    throw new Error("Paid-ad rendering requires current non-blocking brand preflight evidence");
  }
  await authority.assertAuthorized({
    campaignVersionRef: evidence.campaignVersionRef,
    collateralProjectionHash: evidence.collateralProjectionHash,
    paidAdProjectionHash: evidence.paidAdProjectionHash,
    rulesetVersionRef: evidence.rulesetVersionRef,
    brandBoundaryRulesHash: evidence.brandBoundaryRulesHash,
    preflightResultHash: evidence.resultHash,
  });
  return deepFreeze(projection);
}

export interface CampaignVersionTransaction {
  getByCampaignVersionRef(
    locationRef: string,
    campaignVersionRef: string,
  ): Promise<CampaignVersion | undefined>;
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
    const manifestHash = hash(versionInput.manifest);
    const existing = await transaction.getByCampaignVersionRef(
      versionInput.locationRef,
      versionInput.campaignVersionRef,
    );
    if (existing) {
      if (
        existing.manifestHash !== manifestHash ||
        existing.campaignRef !== versionInput.campaignRef ||
        existing.locationRef !== versionInput.locationRef
      ) {
        throw new Error(
          "Campaign version reference already exists with different immutable content",
        );
      }
      return deepFreeze(existing);
    }
    const version = CampaignVersionSchema.parse({
      ...versionInput,
      versionNo:
        (await transaction.getLatestVersionNo(versionInput.locationRef, versionInput.campaignRef)) +
        1,
      manifestHash,
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
    actorKind: "human" | "service" | "model";
    actorRole: ApprovalDecision["actorRole"];
    decidedAt: Date;
    ipAuditHash: string;
    decision: ApprovalDecision["decision"];
  }>,
  authority: ApprovalAuthorityPort,
): Promise<Readonly<ApprovalDecision>> {
  const version = CampaignVersionSchema.parse(input.campaignVersion);
  const preflight = PreflightResultSchema.parse(input.preflight);
  if (input.actorKind !== "human") {
    throw new Error("Only a human principal can create an approval decision");
  }
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
    emailPackageVersionRef: version.manifest.artifacts.emailPackageVersionRef,
    smsPackageVersionRef: version.manifest.artifacts.smsPackageVersionRef,
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
      actorKind: input.actorKind,
      actorRole: input.actorRole,
      decidedAt: input.decidedAt.toISOString(),
      ipAuditHash: input.ipAuditHash,
      decision: input.decision,
      snapshot,
    }),
  );
}

export async function createProjectionApprovalDecision(
  input: Readonly<{
    approvalRef: string;
    projection: unknown;
    actorRef: string;
    actorKind: "human" | "service" | "model";
    actorRole: ProjectionApprovalDecision["actorRole"];
    decidedAt: Date;
    ipAuditHash: string;
    decision: ProjectionApprovalDecision["decision"];
  }>,
  authority: ApprovalAuthorityPort,
): Promise<Readonly<ProjectionApprovalDecision>> {
  const isPaidAdProjection =
    typeof input.projection === "object" &&
    input.projection !== null &&
    "advertiserIdentity" in input.projection &&
    "leadForm" in input.projection;
  const parsedProjection = isPaidAdProjection
    ? PaidAdProjectionSchema.parse(input.projection)
    : CollateralProjectionSchema.parse(input.projection);
  if (
    campaignProjectionHash(parsedProjection) !== parsedProjection.projectionHash ||
    parsedProjection.approvalSummary.projectionHash !== parsedProjection.projectionHash
  ) {
    throw new Error("Projection approval requires current immutable content and preview binding");
  }
  const projection = isPaidAdProjection
    ? { ...parsedProjection, scope: "paid_ad" as const }
    : { ...parsedProjection, scope: "collateral" as const };
  if (input.actorKind !== "human") {
    throw new Error("Only a human principal can create an approval decision");
  }
  if (projection.scope === "paid_ad" && input.actorRole === "realtor_approver") {
    throw new Error("Realtor approval is limited to co-branded collateral");
  }
  if (
    !(projection.approvalSummary.requiredApproverRoles as readonly string[]).includes(
      input.actorRole,
    )
  ) {
    throw new Error("Approver role is outside the projection approval summary");
  }
  await authority.assertMayApprove({
    locationRef: projection.locationRef,
    campaignRef: projection.campaignRef,
    actorRef: input.actorRef,
    actorRole: input.actorRole,
  });
  return deepFreeze(
    ProjectionApprovalDecisionSchema.parse({
      schemaVersion: 1,
      approvalRef: input.approvalRef,
      locationRef: projection.locationRef,
      campaignRef: projection.campaignRef,
      campaignVersionRef: projection.campaignVersionRef,
      scope: projection.scope,
      projectionHash: projection.projectionHash,
      previewRef: projection.approvalSummary.previewRef,
      actorRef: input.actorRef,
      actorKind: input.actorKind,
      actorRole: input.actorRole,
      decidedAt: input.decidedAt.toISOString(),
      ipAuditHash: input.ipAuditHash,
      decision: input.decision,
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
