import type { DatabasePool } from "../src/index.js";

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
