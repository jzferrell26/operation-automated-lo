import { generateKeyPairSync } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { issueEmbeddedSessionToken } from "@oalo/auth";
import type { ApplicationRole } from "@oalo/contracts";
import { createPostgresPool, type PostgresDatabasePool } from "@oalo/db";

import {
  createStaticIdentityDirectory,
  createStaticRoleBindingPort,
  type BrowserMutationGate,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";

export const LOCAL_SYNTHETIC_ENV = Object.freeze({
  OALO_ENVIRONMENT: "local",
  OALO_PROVIDER_MODE: "stub",
  OALO_SYNTHETIC_DATA_ONLY: "true",
});

export const OPEN_HOUSE_DRAFT_INPUT = Object.freeze({
  address: "123 Main Street, Dallas",
  stateCode: "TX",
  propertyDescription: "A fully synthetic property description used for contract testing.",
  openHouseStartsAt: "2026-10-01T18:00:00.000Z",
  openHouseEndsAt: "2026-10-01T20:00:00.000Z",
  realtorDisplayName: "Jordan Smith",
  headline: "Tour this home this weekend",
  body: "Join us for the open house and explore the property in person.",
  callToAction: "Get open house details",
  disclosureText: "Equal Housing Opportunity. Additional lender disclosures apply.",
  consentText: "By submitting, you agree to be contacted about this property.",
  region: "Dallas-Fort Worth",
  dailyBudgetDollars: 25,
  totalBudgetDollars: 125,
  propertyPermissionConfirmed: true,
  realtorPermissionConfirmed: true,
});

export function openHouseDraftInputWithHeadline(
  headline: string,
): Readonly<Omit<typeof OPEN_HOUSE_DRAFT_INPUT, "headline"> & { headline: string }> {
  return Object.freeze({ ...OPEN_HOUSE_DRAFT_INPUT, headline });
}

/**
 * The `x-correlation-id` regression matrix shared by 005C-AC-007 and 005C-AC-008: a canonical
 * opaque header, a UUID, a vendor trace id, punctuation, an absent header, and headers at 301
 * and 129 characters. Every case must derive a valid `CorrelationReferenceSchema` reference
 * regardless of whether the inbound value itself was accepted as a tracing id.
 */
export const CORRELATION_HEADER_MATRIX: ReadonlyArray<readonly [string, string | undefined]> =
  Object.freeze([
    ["canonical opaque header", "correlation_review123"],
    ["UUID header", "3fa85f64-5717-4562-b3fc-2c963f66afa6"],
    ["vendor trace id", "trace-123"],
    ["header with punctuation", "a.b:c/d-e"],
    ["absent header", undefined],
    ["301-character header", "a".repeat(301)],
    ["129-character opaque-looking header", "a".repeat(129)],
  ]);

export type PersistedDraftSummary = Readonly<{
  campaignRef: string;
  campaignVersionRef: string;
  manifestHash: string;
  resultHash: string;
}>;

export function createTemporaryCampaignStore(prefix: string) {
  let directory: string | undefined;
  let storePath: string | undefined;
  return {
    async enter() {
      directory = await mkdtemp(join(tmpdir(), prefix));
      storePath = join(directory, "local-campaign-store.json");
      return storePath;
    },
    env() {
      if (storePath === undefined) {
        throw new Error("Temporary campaign store was not entered");
      }
      return Object.freeze({
        ...LOCAL_SYNTHETIC_ENV,
        OALO_LOCAL_CAMPAIGN_STORE: storePath,
      });
    },
    async restore() {
      if (directory === undefined) return;
      await rm(directory, { recursive: true, force: true });
      directory = undefined;
      storePath = undefined;
    },
  };
}

export interface EmbeddedTestActor {
  readonly actorRef: string;
  readonly actorId: string;
  readonly role: ApplicationRole;
  readonly roleVersion?: number;
}

export interface EmbeddedSessionFixtureInput {
  readonly locationRef: string;
  readonly locationId: string;
  readonly installationRef: string;
  readonly actors: readonly EmbeddedTestActor[];
  readonly mutation: BrowserMutationGate;
}

export interface EmbeddedSessionFixture {
  readonly ports: CampaignCommandPorts;
  headersFor(actorRef: string, extra?: HeadersInit): HeadersInit;
}

const EMBEDDED_TEST_ISSUER = "https://auth.operation-automated-lo.test";
const EMBEDDED_TEST_AUDIENCE = "oalo-web";
const EMBEDDED_TEST_NOW_EPOCH_SECONDS = 1_000;

/**
 * Builds an ed25519-signed embedded-session fixture (ports plus a header factory) for one
 * tenant and its actors, without depending on 005b's first-party session issuance. Used by the
 * route-level Postgres regression matrix, which authenticates the same way
 * `campaign-approval-handler.unit.test.ts` already does against the filesystem adapter.
 */
export function embeddedSessionFixture(input: EmbeddedSessionFixtureInput): EmbeddedSessionFixture {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const ports: CampaignCommandPorts = {
    identityDirectory: createStaticIdentityDirectory(
      input.actors.map((actor) => ({
        locationRef: input.locationRef,
        locationId: input.locationId,
        actorRef: actor.actorRef,
        actorId: actor.actorId,
      })),
    ),
    roleBindings: createStaticRoleBindingPort(
      input.actors.map((actor) => ({
        actorRef: actor.actorRef,
        locationRef: input.locationRef,
        role: actor.role,
        roleVersion: actor.roleVersion ?? 1,
      })),
    ),
    mutation: input.mutation,
    embedded: {
      issuer: EMBEDDED_TEST_ISSUER,
      audience: EMBEDDED_TEST_AUDIENCE,
      publicKeysById: { key_primary: publicKeyPem },
      nowEpochSeconds: () => EMBEDDED_TEST_NOW_EPOCH_SECONDS + 1,
      isSessionActive: () => true,
    },
  };
  return {
    ports,
    headersFor(actorRef, extra = {}) {
      const actor = input.actors.find((candidate) => candidate.actorRef === actorRef);
      if (actor === undefined) {
        throw new Error(`No embedded test actor registered for ${actorRef}`);
      }
      const token = issueEmbeddedSessionToken({
        privateKeyPem,
        keyId: "key_primary",
        issuer: EMBEDDED_TEST_ISSUER,
        audience: EMBEDDED_TEST_AUDIENCE,
        subject: actor.actorRef,
        sessionId: `session_${actor.actorRef}`,
        nonce: `${actor.actorRef}-nonce`,
        locationId: input.locationRef,
        installationId: input.installationRef,
        role: actor.role,
        roleVersion: actor.roleVersion ?? 1,
        nowEpochSeconds: EMBEDDED_TEST_NOW_EPOCH_SECONDS,
      });
      return {
        authorization: `Bearer ${token}`,
        origin: input.mutation.allowedBrowserOrigins[0] ?? "",
        host: input.mutation.expectedHost,
        ...extra,
      };
    },
  };
}

/**
 * Environment for the route-level Postgres regression matrix (005C-AC-007, 008, 009, 011, 012).
 * `OALO_REVIEW_SURFACE=authorized` selects the "review" workspace mode, which
 * `campaignPersistenceKind` maps onto the real Postgres repositories instead of the synthetic
 * filesystem store. Authentication itself still goes through the embedded-bearer test ports
 * (see `authenticated-principal.ts`'s `createStaticIdentityDirectory` /
 * `createStaticRoleBindingPort`), not a first-party session: 005b's session issuance is a
 * separate lane and this matrix does not depend on it landing first.
 */
export function reviewPostgresEnv(databaseUrl: string): Readonly<Record<string, string>> {
  return Object.freeze({
    OALO_ENVIRONMENT: "preview",
    OALO_PROVIDER_MODE: "stub",
    OALO_SYNTHETIC_DATA_ONLY: "true",
    OALO_REVIEW_SURFACE: "authorized",
    OALO_DATABASE_URL: databaseUrl,
    OALO_DATABASE_SSL_MODE: "disable",
  });
}

/**
 * NOTE for Wave 2: this module intentionally does not seed a tenant or read audit/command rows
 * itself. The repository's database-privilege-escalation security test refuses any shipped
 * `apps/**` source that assumes the harness's elevated schema-owning database role (or touches
 * the append-only trigger switches), and `platform.locations` / `audit.events` /
 * `integration.command_executions` are not writable or fully readable under the tenant runtime
 * role outside the campaign repositories' own security-definer paths. Seeding a review tenant is
 * 005b's `tooling/scripts/database/seed-review-location.mjs` (see `EXECUTION_LEDGER.md` lane
 * 1b); reading back stored correlation ids for assertions needs either that script's own
 * verification output or a sanctioned read path 005a/005b expose. The two
 * `*.correlation.postgres.test.ts` suites are authored as `it.todo` cases against this
 * constraint rather than against a helper that would fail the security gate.
 */
export function reviewPostgresPool(databaseUrl: string): PostgresDatabasePool {
  return createPostgresPool({
    applicationName: "oalo-web-correlation-postgres-test",
    connectionString: databaseUrl,
    deploymentEnvironment: "test",
    maxConnections: 4,
    poolingMode: "transaction",
    preparedStatements: false,
    sslMode: "disable",
  });
}

export function persistedDraftFromPreflightBody(payload: unknown): PersistedDraftSummary {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Preflight response body must be an object");
  }
  const record = payload as {
    campaignRef?: unknown;
    campaignVersionRef?: unknown;
    manifestHash?: unknown;
    preflightResultHash?: unknown;
  };
  if (
    typeof record.campaignRef !== "string" ||
    typeof record.campaignVersionRef !== "string" ||
    typeof record.manifestHash !== "string" ||
    typeof record.preflightResultHash !== "string"
  ) {
    throw new Error("Preflight response is missing persisted draft fields");
  }
  return {
    campaignRef: record.campaignRef,
    campaignVersionRef: record.campaignVersionRef,
    manifestHash: record.manifestHash,
    resultHash: record.preflightResultHash,
  };
}
