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
