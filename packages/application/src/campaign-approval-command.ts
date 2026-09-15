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
  if (input.expectedRowVersion !== undefined && input.expectedRowVersion !== evidence.rowVersion) {
    return false;
  }
  return true;
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
): Promise<HumanCampaignApprovalResult> {
  const frozen = freezeAuthenticatedPrincipal(principal);
  return repository.run(async (transaction) => {
    const evidence = await transaction.loadCurrentEvidence(input.campaignRef);
    if (evidence === undefined || evidence.version.locationRef !== frozen.locationRef) {
      throw new CampaignResourceNotAccessibleError();
    }
    if (!hintsMatch(input, evidence)) {
      throw new CampaignApprovalStaleError();
    }
    const existing = evidence.existingApproval;
    if (
      existing !== undefined &&
      existing.campaignVersionRef === evidence.version.campaignVersionRef &&
      existing.actorRef === frozen.actorRef &&
      existing.decision === input.decision
    ) {
      return Object.freeze({
        kind: "committed" as const,
        decision: existing,
        state: evidence.state,
        rowVersion: evidence.rowVersion,
        duplicate: true,
      });
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
    const inputHash = canonicalCampaignHash({
      campaignRef: input.campaignRef,
      decision: input.decision,
      expectedCampaignVersionRef: input.expectedCampaignVersionRef ?? null,
      expectedManifestHash: input.expectedManifestHash ?? null,
      expectedPreflightResultHash: input.expectedPreflightResultHash ?? null,
      expectedRowVersion: input.expectedRowVersion ?? null,
    });
    const beforeHash = evidenceHash({
      state: evidence.state,
      rowVersion: evidence.rowVersion,
      campaignVersionRef: evidence.version.campaignVersionRef,
    });

    if (
      !(CAMPAIGN_APPROVAL_ROLES as readonly AuthenticatedPrincipal["role"][]).includes(frozen.role)
    ) {
      await transaction.recordDeniedAttempt({
        campaignRef: evidence.version.campaignRef,
        correlationId: input.correlationRef,
        inputHash,
        beforeHash,
      });
      return Object.freeze({ kind: "denied" as const });
    }
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
