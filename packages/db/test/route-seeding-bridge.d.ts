import type { DatabasePool, DatabaseConnection } from "../src/index.js";

export declare function withMigrationOwnerTransaction<Result>(
  pool: DatabasePool,
  work: (connection: DatabaseConnection) => Promise<Result>,
): Promise<Result>;

/**
 * Types for `route-seeding-bridge.js`, which re-exports the review-seeding surface of the
 * integration harness. The harness itself is plain ESM because it runs under `node --test`; this
 * declaration exists only so the TypeScript consumers in `apps/web/src/server/` are type checked.
 *
 * It declares the review-seeding surface and nothing else. What the `node --test` suites use stays
 * untyped on purpose, because nothing type checks those files.
 */

export declare function seedReviewLocation(
  pool: DatabasePool,
  displayName: string,
): Promise<Readonly<{ locationId: string; installationId: string }>>;

export declare function seedReviewActor(
  pool: DatabasePool,
  locationId: string,
  displayName: string,
  bindingRole: string,
): Promise<string>;

export declare function revokeReviewBinding(
  pool: DatabasePool,
  locationId: string,
  actorId: string,
  bindingRole: string,
): Promise<void>;

export declare function grantReviewBinding(
  pool: DatabasePool,
  locationId: string,
  actorId: string,
  bindingRole: string,
): Promise<void>;

export declare function countLocationRows(
  pool: DatabasePool,
  table: string,
  locationId: string,
): Promise<number>;

export declare function issueReviewSession(
  pool: DatabasePool,
  input: Readonly<{
    locationId: string;
    actorId: string;
    bindingRole: string;
    sessionRole: string;
    secretHash: string;
    lifetimeSeconds: number;
    correlationId: string;
  }>,
): Promise<string>;

export declare function revokeReviewSession(
  pool: DatabasePool,
  sessionId: string,
  reason: string,
  correlationId: string,
): Promise<void>;

export declare function readLocationCorrelationIds(
  pool: DatabasePool,
  table: string,
  locationId: string,
): Promise<readonly string[]>;

/** PRD-009b 009B-AC-004. One of the six statuses `platform.marketplace_installations` allows. */
export declare function setReviewInstallationStatus(
  pool: DatabasePool,
  locationId: string,
  status: "pending" | "active" | "missing_scope" | "reconnect_required" | "revoked" | "uninstalled",
): Promise<void>;

export declare function seedReviewLocationWithoutInstallation(
  pool: DatabasePool,
  displayName: string,
): Promise<string>;

/** PRD-006a. The credential-side reads and writes the route-level proofs need. */

export declare function seedReviewCredential(
  pool: DatabasePool,
  input: Readonly<{ userId: string; emailNormalized: string; passwordHash: string }>,
): Promise<void>;

export declare function readReviewCredential(
  pool: DatabasePool,
  userId: string,
): Promise<
  | Readonly<{
      passwordHash: string;
      failedAttemptCount: number;
      locked: boolean;
      lockedUntil: string | undefined;
      emailVerified: boolean;
      rotated: boolean;
    }>
  | undefined
>;

export declare function expireReviewCredentialLock(
  pool: DatabasePool,
  userId: string,
): Promise<void>;

export declare function countCredentialTokens(
  pool: DatabasePool,
  input: Readonly<{ userId: string; purpose: string; liveOnly?: boolean }>,
): Promise<number>;

export declare function newestCredentialTokenLifetimeSeconds(
  pool: DatabasePool,
  input: Readonly<{ userId: string; purpose: string }>,
): Promise<number | undefined>;

export declare function readAuditEventsForCorrelation(
  pool: DatabasePool,
  correlationId: string,
): Promise<
  readonly Readonly<{
    action: string;
    result: string;
    subjectType: string;
    subjectId: string;
  }>[]
>;

export declare function countAuditEventsForActor(
  pool: DatabasePool,
  input: Readonly<{ userId: string; action: string }>,
): Promise<number>;

export declare function readFirstPartySessionsForUser(
  pool: DatabasePool,
  userId: string,
): Promise<
  readonly Readonly<{
    id: string;
    issuedBy: string;
    revocationReason: string | null;
    revoked: boolean;
    lifetimeSeconds: number;
  }>[]
>;

export declare function clearAuthRateLimitsForKey(
  pool: DatabasePool,
  keyHash: string,
): Promise<void>;

export declare function readUserIdForEmail(
  pool: DatabasePool,
  emailNormalized: string,
): Promise<string | undefined>;

export declare function suspendReviewActor(pool: DatabasePool, actorId: string): Promise<void>;

export declare function readDatabaseClockMilliseconds(pool: DatabasePool): Promise<number>;

export declare function readAuthRateLimitRows(
  pool: DatabasePool,
  scope?: string,
): Promise<
  readonly Readonly<{
    scope: string;
    keyHash: string;
    attemptCount: number;
    windowStart: string;
  }>[]
>;

/**
 * PRD-009g, 009G-AC-002. Campaign history for the review run's own accounts: the states of the
 * campaign page and of step 3 that the product refuses to create through its own flow. See
 * `seedReviewAccountCampaigns` in `campaign-integration-support.mjs`.
 */

/** The workspace and person a review account belongs to. */
export interface ReviewAccount {
  readonly locationId: string;
  readonly actorId: string;
  readonly locationRef: string;
  readonly actorRef: string;
}

/** One campaign to store: a version as `createCampaignVersion` takes it, and the rules its check runs under. */
export interface ReviewCampaignSeed {
  /** What the campaign is for, named in a failure and answered back in the summary. */
  readonly label: string;
  /** The instant the version was "saved", as an ISO date and time. */
  readonly createdAt: string;
  readonly version: Readonly<{
    schemaVersion: 1;
    locationRef: string;
    campaignRef: string;
    campaignVersionRef: string;
    inputVersions: import("@oalo/contracts").CampaignInputVersions;
    manifest: import("@oalo/contracts").CampaignManifest;
    createdBy: string;
  }>;
  readonly rules: import("@oalo/contracts").PreflightRules;
}

export interface ReviewCampaignTemplate {
  readonly inputVersions: import("@oalo/contracts").CampaignInputVersions;
  readonly manifest: import("@oalo/contracts").LibraryAdCampaignManifest;
}

export interface SeededReviewCampaign {
  readonly label: string;
  readonly campaignRef: string;
  readonly campaignVersionRef: string;
  readonly versionNo: number;
}

export interface ReviewAccountRepositories {
  readonly versions: import("@oalo/application").CampaignVersionRepository & {
    persistPreflight(
      result: import("@oalo/contracts").PreflightResult,
    ): Promise<import("@oalo/contracts").PreflightResult>;
  };
  readonly reads: {
    getByCampaignRef(
      campaignRef: string,
    ): Promise<import("@oalo/application").CampaignWorkspaceReadRecord | undefined>;
  };
}

/**
 * The refusal that keeps review campaign history inside the review run's disposable database. It is
 * called before a connection is opened, and answers the database name when every rule holds.
 */
export declare function assertReviewRunDatabase(
  connectionString: string,
  environment?: Readonly<Record<string, string | undefined>>,
): string;

export declare function seedReviewAccountCampaigns(
  input: Readonly<{
    connectionString: string;
    /** The address of an account under `@oalo.invalid`. */
    email: string;
    /** A campaign that account saved through the product, which the seeds take their brand from. */
    templateCampaignRef: string;
    build: (
      context: Readonly<{
        account: Pick<ReviewAccount, "locationRef" | "actorRef">;
        template: ReviewCampaignTemplate;
      }>,
    ) => Promise<readonly ReviewCampaignSeed[]> | readonly ReviewCampaignSeed[];
  }>,
  dependencies?: Readonly<{
    environment?: Readonly<Record<string, string | undefined>>;
    openPool?: (connectionString: string) => DatabasePool;
    resolveAccount?: (pool: DatabasePool, emailNormalized: string) => Promise<ReviewAccount>;
    openRepositories?: (pool: DatabasePool, account: ReviewAccount) => ReviewAccountRepositories;
  }>,
): Promise<readonly SeededReviewCampaign[]>;
