import {
  CampaignEventSchema,
  type ApprovalDecision,
  type CampaignEvent,
  type CampaignState,
  type CampaignVersion,
  type PreflightResult,
} from "@oalo/contracts";

import {
  CAMPAIGN_APPROVAL_ROLES,
  approvalActorRoleForPrincipal,
  createSessionApprovalAuthority,
  freezeAuthenticatedPrincipal,
  CampaignResourceNotAccessibleError,
  type AuthenticatedPrincipal,
} from "./campaign-command-context.js";
import {
  appendCampaignTransition,
  canonicalCampaignHash,
  createApprovalDecision,
  type CampaignEventPort,
} from "./campaign-foundation.js";

export class CampaignApprovalStaleError extends Error {
  public constructor() {
    super("The campaign evidence changed after review.");
    this.name = "CampaignApprovalStaleError";
  }
}

export class CampaignApprovalNotReadyError extends Error {
  public constructor() {
    super("A current passing preflight is required before approval.");
    this.name = "CampaignApprovalNotReadyError";
  }
}

/**
 * PRD-009c D4. Where a library ad stands in the catalog, as the approval command needs it: the
 * status of the exact `(id, version)`, the ad's highest version and its status, and the two art
 * digests the catalog records for that version.
 */
export interface LibraryAdCatalogStanding {
  readonly status: "active" | "retired" | "replaced";
  readonly highestVersion: number;
  readonly highestStatus: "active" | "retired" | "replaced";
  readonly tallSha256: string;
  readonly squareSha256: string;
}

/**
 * PRD-009c D4. The catalog as the approval command reads it. It is a required parameter of
 * `executeHumanCampaignApproval`, never optional, so no caller can approve a library-ad version
 * without the catalog's say (the PRD-009 run rule: a new parameter is never made optional to spare
 * a caller). Resolving an `(id, version)` that is not in the loaded catalog answers `undefined`.
 */
export interface LibraryAdCatalogPort {
  standingOf(
    ad: Readonly<{ id: string; version: number }>,
  ): Promise<LibraryAdCatalogStanding | undefined>;
}

export type LibraryAdRefusalReason = "missing" | "retired" | "replaced" | "art_changed";

const LIBRARY_AD_REFUSAL_MESSAGES: Readonly<Record<LibraryAdRefusalReason, string>> = {
  missing: "This ad isn't in the library, so this version can't be approved.",
  retired: "This ad was taken out of the library, so this version can't be approved.",
  replaced: "A newer version of this ad is in the library, so this version can't be approved.",
  art_changed: "This ad's pictures changed in the library, so this version can't be approved.",
};

export class CampaignLibraryAdRefusedError extends Error {
  public readonly reason: LibraryAdRefusalReason;

  public constructor(reason: LibraryAdRefusalReason) {
    super(LIBRARY_AD_REFUSAL_MESSAGES[reason]);
    this.name = "CampaignLibraryAdRefusedError";
    this.reason = reason;
  }
}

function assertLibraryAdCatalogPort(catalog: unknown): asserts catalog is LibraryAdCatalogPort {
  if (
    typeof catalog !== "object" ||
    catalog === null ||
    typeof (catalog as { standingOf?: unknown }).standingOf !== "function"
  ) {
    throw new TypeError("executeHumanCampaignApproval requires a library-ad catalog port.");
  }
}

/**
 * PRD-009c D4, 009C-AC-008. A library-ad version is approvable only while its ad is in the catalog,
 * active, at its highest version, and still has the art digests the version recorded. A version of
 * an ad that was retired gets the retired refusal even when a newer version was retired, and an
 * older version gets the newer-version refusal. An open house version has no library ad, so the
 * catalog is not consulted for it.
 */
async function assertLibraryAdApprovable(
  manifest: CampaignVersion["manifest"],
  catalog: LibraryAdCatalogPort,
): Promise<void> {
  if (manifest.blueprintId !== "library-ad") return;
  const standing = await catalog.standingOf({
    id: manifest.libraryAd.id,
    version: manifest.libraryAd.version,
  });
  if (standing === undefined) throw new CampaignLibraryAdRefusedError("missing");
  if (standing.status === "retired" || standing.highestStatus === "retired") {
    throw new CampaignLibraryAdRefusedError("retired");
  }
  if (standing.status !== "active" || standing.highestVersion !== manifest.libraryAd.version) {
    throw new CampaignLibraryAdRefusedError("replaced");
  }
  const [tall, square] = manifest.images;
  if (
    tall.contentSha256 !== standing.tallSha256 ||
    square.contentSha256 !== standing.squareSha256
  ) {
    throw new CampaignLibraryAdRefusedError("art_changed");
  }
}

export interface CampaignApprovalEvidence {
  readonly version: CampaignVersion;
  readonly preflight: PreflightResult;
  readonly state: CampaignState;
  readonly rowVersion: number;
  readonly existingApproval?: ApprovalDecision;
}

export interface HumanCampaignApprovalInput {
  readonly campaignRef: string;
  readonly decision: ApprovalDecision["decision"];
  readonly decidedAt: Date;
  readonly ipAuditHash: string;
  readonly correlationRef: string;
  /**
   * PRD-009e D2, 009E-AC-004. The decider's own session display name, which the route reads from
   * the session and never from the request body, so nobody can put a name in another person's
   * mouth. `undefined` says the session yielded nothing but the fallback, and then nothing is
   * recorded and a screen shows the role instead. The key is required: a caller states which it
   * has, and none can forget to.
   */
  readonly approverDisplayName: string | undefined;
  readonly expectedCampaignVersionRef?: string;
  readonly expectedManifestHash?: string;
  readonly expectedPreflightResultHash?: string;
  readonly expectedRowVersion?: number;
}

export interface CampaignApprovalCommitInput {
  readonly decision: ApprovalDecision;
  readonly event: CampaignEvent | undefined;
  readonly expectedRowVersion: number;
  readonly fromState: CampaignState;
  readonly toState: CampaignState;
  readonly commandKey: string;
  readonly inputHash: string;
  readonly correlationId: string;
}

export interface CampaignApprovalCommitResult {
  readonly decision: ApprovalDecision;
  readonly state: CampaignState;
  readonly rowVersion: number;
  readonly duplicate: boolean;
}

export interface CampaignApprovalTransaction {
  loadCurrentEvidence(campaignRef: string): Promise<CampaignApprovalEvidence | undefined>;
  commitApproval(input: CampaignApprovalCommitInput): Promise<CampaignApprovalCommitResult>;
  recordDeniedAttempt(input: {
    campaignRef: string;
    correlationId: string;
    inputHash: string;
    beforeHash: string;
  }): Promise<void>;
}

export interface CampaignApprovalRepository {
  run<T>(work: (transaction: CampaignApprovalTransaction) => Promise<T>): Promise<T>;
}

export type HumanCampaignApprovalResult =
  | Readonly<{
      kind: "committed";
      decision: ApprovalDecision;
      state: CampaignState;
      rowVersion: number;
      duplicate: boolean;
    }>
  | Readonly<{ kind: "denied" }>;

function digestRef(prefix: string, value: unknown): string {
  return `${prefix}_${canonicalCampaignHash(value).slice(0, 24)}`;
}

function evidenceHash(
  evidence: Readonly<{
    state: CampaignState;
    rowVersion: number;
    campaignVersionRef: string;
  }>,
): string {
  return canonicalCampaignHash(evidence);
}

function hintsMatch(
  input: HumanCampaignApprovalInput,
  evidence: CampaignApprovalEvidence,
): boolean {
  if (!evidenceHintsMatchIgnoringRowVersion(input, evidence)) {
    return false;
  }
  if (input.expectedRowVersion !== undefined && input.expectedRowVersion !== evidence.rowVersion) {
    return false;
  }
  return true;
}

/**
 * Same comparison as {@link hintsMatch}, but deliberately excludes `expectedRowVersion`. A
 * successful commit always advances the row version, so an identical retry that still carries
 * the pre-approval version must not be treated as stale on that field alone (D5).
 */
function evidenceHintsMatchIgnoringRowVersion(
  input: HumanCampaignApprovalInput,
  evidence: CampaignApprovalEvidence,
): boolean {
  if (
    input.expectedCampaignVersionRef !== undefined &&
    input.expectedCampaignVersionRef !== evidence.version.campaignVersionRef
  ) {
    return false;
  }
  if (
    input.expectedManifestHash !== undefined &&
    input.expectedManifestHash !== evidence.version.manifestHash
  ) {
    return false;
  }
  if (
    input.expectedPreflightResultHash !== undefined &&
    input.expectedPreflightResultHash !== evidence.preflight.resultHash
  ) {
    return false;
  }
  return true;
}

function matchesExistingApproval(
  input: HumanCampaignApprovalInput,
  frozen: Readonly<AuthenticatedPrincipal>,
  evidence: CampaignApprovalEvidence,
): evidence is CampaignApprovalEvidence & { existingApproval: ApprovalDecision } {
  const existing = evidence.existingApproval;
  return (
    existing !== undefined &&
    existing.campaignVersionRef === evidence.version.campaignVersionRef &&
    existing.actorRef === frozen.actorRef &&
    existing.decision === input.decision &&
    evidenceHintsMatchIgnoringRowVersion(input, evidence)
  );
}

async function recordTransition(event: CampaignEvent): Promise<CampaignEvent> {
  let current = event.fromState;
  const port: CampaignEventPort = {
    async currentState() {
      return current;
    },
    async append(next) {
      current = next.toState;
    },
  };
  return appendCampaignTransition(event, port);
}

export async function executeHumanCampaignApproval(
  input: HumanCampaignApprovalInput,
  principal: Readonly<AuthenticatedPrincipal>,
  repository: CampaignApprovalRepository,
  catalog: LibraryAdCatalogPort,
): Promise<HumanCampaignApprovalResult> {
  assertLibraryAdCatalogPort(catalog);
  const frozen = freezeAuthenticatedPrincipal(principal);
  return repository.run(async (transaction) => {
    const evidence = await transaction.loadCurrentEvidence(input.campaignRef);
    if (evidence === undefined || evidence.version.locationRef !== frozen.locationRef) {
      throw new CampaignResourceNotAccessibleError();
    }

    const inputHash = canonicalCampaignHash({
      campaignRef: input.campaignRef,
      decision: input.decision,
      expectedCampaignVersionRef: input.expectedCampaignVersionRef ?? null,
      expectedManifestHash: input.expectedManifestHash ?? null,
      expectedPreflightResultHash: input.expectedPreflightResultHash ?? null,
      expectedRowVersion: input.expectedRowVersion ?? null,
    });

    // PRD-008a 008A-AC-020. The role is consulted before anything else about the campaign,
    // including the idempotent retry below: somebody whose approving role was revoked after they
    // decided gets the role refusal rather than their own decision read back, and a principal who
    // may not approve learns nothing about staleness or state either. Every such attempt is
    // recorded as denied, exactly as before.
    if (
      !(CAMPAIGN_APPROVAL_ROLES as readonly AuthenticatedPrincipal["role"][]).includes(frozen.role)
    ) {
      await transaction.recordDeniedAttempt({
        campaignRef: evidence.version.campaignRef,
        correlationId: input.correlationRef,
        inputHash,
        beforeHash: evidenceHash({
          state: evidence.state,
          rowVersion: evidence.rowVersion,
          campaignVersionRef: evidence.version.campaignVersionRef,
        }),
      });
      return Object.freeze({ kind: "denied" as const });
    }

    // PRD-009c D4. After the role check, before anything else: a version whose library ad is
    // missing, retired, replaced, or whose art changed is refused for every caller alike.
    await assertLibraryAdApprovable(evidence.version.manifest, catalog);

    if (matchesExistingApproval(input, frozen, evidence)) {
      return Object.freeze({
        kind: "committed" as const,
        decision: evidence.existingApproval,
        state: evidence.state,
        rowVersion: evidence.rowVersion,
        duplicate: true,
      });
    }
    if (!hintsMatch(input, evidence)) {
      throw new CampaignApprovalStaleError();
    }
    if (evidence.state === "approved") {
      throw new CampaignApprovalStaleError();
    }
    if (evidence.state !== "awaiting_approval") {
      throw new CampaignApprovalNotReadyError();
    }

    const commandKey = canonicalCampaignHash({
      campaignRef: evidence.version.campaignRef,
      campaignVersionRef: evidence.version.campaignVersionRef,
      actorRef: frozen.actorRef,
      decision: input.decision,
    });
    const actorRole = approvalActorRoleForPrincipal(frozen);

    let decision: ApprovalDecision;
    try {
      decision = await createApprovalDecision(
        {
          approvalRef: digestRef("approval", {
            campaignVersionRef: evidence.version.campaignVersionRef,
            actorRef: frozen.actorRef,
            decision: input.decision,
          }),
          campaignVersion: evidence.version,
          preflight: evidence.preflight,
          actorRef: frozen.actorRef,
          actorKind: "human",
          actorRole,
          decidedAt: input.decidedAt,
          ipAuditHash: input.ipAuditHash,
          decision: input.decision,
          approverDisplayName: input.approverDisplayName,
        },
        createSessionApprovalAuthority(frozen),
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("passing preflight")) {
        throw new CampaignApprovalNotReadyError();
      }
      throw error;
    }

    const toState: CampaignState =
      decision.decision === "approved" ? "approved" : "awaiting_approval";
    const event =
      toState === "approved"
        ? await recordTransition(
            CampaignEventSchema.parse({
              schemaVersion: 1,
              eventRef: digestRef("event", {
                campaignVersionRef: evidence.version.campaignVersionRef,
                actorRef: frozen.actorRef,
                decision: decision.decision,
              }),
              locationRef: evidence.version.locationRef,
              campaignRef: evidence.version.campaignRef,
              campaignVersionRef: evidence.version.campaignVersionRef,
              fromState: evidence.state,
              toState,
              actorRef: frozen.actorRef,
              occurredAt: input.decidedAt.toISOString(),
              correlationRef: input.correlationRef,
            }),
          )
        : undefined;

    const committed = await transaction.commitApproval({
      decision,
      event,
      expectedRowVersion: evidence.rowVersion,
      fromState: evidence.state,
      toState,
      commandKey,
      inputHash,
      correlationId: input.correlationRef,
    });
    return Object.freeze({
      kind: "committed" as const,
      decision: committed.decision,
      state: committed.state,
      rowVersion: committed.rowVersion,
      duplicate: committed.duplicate,
    });
  });
}
