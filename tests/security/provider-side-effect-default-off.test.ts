import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  executeProviderOperation,
  getFoundationSnapshot,
  type ProviderOperationPort,
} from "@oalo/application";
import {
  RuntimeEnvironmentSchema,
  createCandidateDeploymentManifest,
  parseRuntimeEnvironment,
} from "@oalo/config";
import {
  ProviderOperationSchema,
  type AuthoritySnapshot,
  type ProviderOperation,
} from "@oalo/contracts";
import {
  GHL_LEAD_ADAPTER_ALLOWLIST,
  LEADCONNECTOR_V2_ROUTE_ALLOWLIST,
  createLeadConnectorV2HttpTransport,
} from "@oalo/ghl";
import { PhaseZeroSecurityCoverageRegisterSchema } from "@oalo/test-support";

import { createDeployedProductionTaskBindings } from "../../apps/tasks/src/core/production-runtime-composition.js";

/**
 * Union proof for PRD-004 `RGL-007` and PRD-003 `APA-008`: under the environment a
 * deployment actually has by default, no HighLevel provider write, Meta publish, lead
 * routing, or Stripe charge side effect is reachable.
 *
 * The operation inventory is derived from the repository's own provider contract
 * register (`ProviderOperationSchema`) and wire-route allowlist
 * (`LEADCONNECTOR_V2_ROUTE_ALLOWLIST`) rather than from a hand-written list, so a newly
 * added provider surface is exercised automatically. The surface classification below is
 * declared `satisfies Readonly<Record<ProviderOperationName, ...>>`, which makes an
 * unclassified new operation a typecheck failure, and the first test re-checks the same
 * totality at runtime.
 */

const ACCEPTANCE_CRITERIA_SURFACES = [
  "highlevel-provider-write",
  "meta-publish",
  "lead-routing",
  "stripe-charge",
] as const;

type AcceptanceCriteriaSurface = (typeof ACCEPTANCE_CRITERIA_SURFACES)[number];

/** External go-live gate that owns each acceptance-criteria surface. */
const SURFACE_EXTERNAL_GATE = {
  "highlevel-provider-write": "G2",
  "meta-publish": "G3",
  "lead-routing": "G5",
  "stripe-charge": "G6",
} as const satisfies Readonly<Record<AcceptanceCriteriaSurface, string>>;

type ProviderOperationName = ProviderOperation["operation"];

type SurfaceList = readonly [AcceptanceCriteriaSurface, ...AcceptanceCriteriaSurface[]];

const OPERATION_SURFACES = {
  "ghl.meta.draft.upsert": ["highlevel-provider-write", "meta-publish"],
  "ghl.meta.publish": ["highlevel-provider-write", "meta-publish"],
  "ghl.meta.pause": ["highlevel-provider-write", "meta-publish"],
  "ghl.meta.resume": ["highlevel-provider-write", "meta-publish"],
  "ghl.contact.upsert": ["highlevel-provider-write", "lead-routing"],
  "ghl.opportunity.upsert": ["highlevel-provider-write", "lead-routing"],
  "ghl.workflow.enroll": ["highlevel-provider-write", "lead-routing"],
  "stripe.entitlement.reconcile": ["stripe-charge"],
} as const satisfies Readonly<Record<ProviderOperationName, SurfaceList>>;

const registeredProviderOperations: readonly ProviderOperationName[] =
  ProviderOperationSchema.shape.operation.options;

/**
 * Authority a location has before anything is provisioned. Every field is the
 * least-privileged member of its own contract schema.
 */
const UNPROVISIONED_AUTHORITY: AuthoritySnapshot = Object.freeze({
  installationActive: false,
  entitlementActive: false,
  actorAuthorized: false,
  tokenHealth: "unavailable",
  readinessState: "not_ready",
});

const FULLY_GRANTED_AUTHORITY: AuthoritySnapshot = Object.freeze({
  installationActive: true,
  entitlementActive: true,
  actorAuthorized: true,
  tokenHealth: "healthy",
  readinessState: "launch_ready",
});

/** Single-fact withdrawals that must block every registered operation on their own. */
const AUTHORITY_WITHDRAWALS: readonly Readonly<Partial<AuthoritySnapshot>>[] = Object.freeze([
  Object.freeze({ installationActive: false }),
  Object.freeze({ entitlementActive: false }),
  Object.freeze({ actorAuthorized: false }),
  Object.freeze({ tokenHealth: "unavailable" as const }),
  Object.freeze({ tokenHealth: "reconnect-required" as const }),
]);

/**
 * Operations that additionally require a launch-ready location. Pausing, drafting, and
 * entitlement reconciliation are deliberately outside this set because they withdraw or
 * reconcile external effect rather than create it.
 */
const READINESS_GATED_OPERATIONS: readonly ProviderOperationName[] = Object.freeze([
  "ghl.contact.upsert",
  "ghl.meta.publish",
  "ghl.meta.resume",
  "ghl.opportunity.upsert",
  "ghl.workflow.enroll",
]);

const STRIPE_OUTBOUND_MARKER =
  /\bapi\.stripe\.com|\bcheckout\.stripe\.com|from\s+["']stripe["']|require\(\s*["']stripe["']\s*\)|\bnew\s+Stripe\s*\(|\bsk_(?:live|test)_/u;

const LEAD_PROVIDER_PORT_MARKER = /\bGhlLeadProviderPort\b/u;

function providerOperationFixture(operation: ProviderOperationName): ProviderOperation {
  return ProviderOperationSchema.parse({
    schemaVersion: 1,
    operationRef: "operation_default_off_proof",
    operation,
    locationRef: "location_default_off_proof",
    aggregateRef: "aggregate_default_off_proof",
    commandRef: "command_default_off_proof",
    idempotencyKey: "a".repeat(64),
    safeRequestHash: "b".repeat(64),
    correlationId: "correlation_default_off_proof",
  });
}

interface RecordingProviderPort {
  readonly port: ProviderOperationPort;
  readonly writes: readonly ProviderOperation[];
  readonly reservations: readonly ProviderOperation[];
}

function recordingProviderPort(authority: AuthoritySnapshot): RecordingProviderPort {
  const writes: ProviderOperation[] = [];
  const reservations: ProviderOperation[] = [];
  const port: ProviderOperationPort = {
    load: async () => ({ status: "new" }),
    currentAuthority: async () => authority,
    reserve: async (operation) => {
      reservations.push(operation);
    },
    write: async (operation) => {
      writes.push(operation);
      return { kind: "confirmed", normalizedResultRef: "result_default_off_proof" };
    },
    reconcile: async () => ({ kind: "absent" }),
    markConfirmed: async () => undefined,
    markUncertain: async () => undefined,
    markFailed: async () => undefined,
  };
  return { port, writes, reservations };
}

/** Literal modes each runtime environment variant pins, read back from the schema union. */
const runtimeEnvironmentVariants = RuntimeEnvironmentSchema.options.map((option) => {
  const { shape } = option.unwrap();
  return Object.freeze({
    environment: shape.environment.value,
    providerMode: shape.providerMode.value,
    stripeMode: shape.stripeMode.value,
    dataClassification: shape.dataClassification.value,
    triggerEnvironment: shape.triggerEnvironment.value,
    supabaseMode: shape.supabaseMode.value,
    productionTraffic: shape.productionTraffic.value,
  });
});

const PREVIEW_COMMIT = "c".repeat(40);
const PREVIEW_BUILD_ID = "build-default-off-proof";
const PREVIEW_APP_URL = "https://preview-default-off.oalo.test";

/**
 * The environment a deployed preview branch actually carries, assembled from the mode
 * literals the preview schema variant itself pins rather than from a copied fixture.
 */
function deployedPreviewEnvironment(): Readonly<Record<string, string>> {
  const preview = runtimeEnvironmentVariants.find((variant) => variant.environment === "preview");
  if (preview === undefined) {
    throw new Error("Runtime environment schema no longer declares a preview variant.");
  }

  const identity = Object.fromEntries(
    (
      [
        ["OALO_DATABASE_ID", "database"],
        ["OALO_TASK_PROJECT_ID", "tasks"],
        ["OALO_SECRET_SCOPE_ID", "secrets"],
        ["OALO_PRIVATE_STORAGE_ID", "private-storage"],
        ["OALO_PUBLISHED_STORAGE_ID", "published-storage"],
        ["OALO_PROVIDER_APP_ID", "provider-app"],
      ] as const
    ).map(([name, suffix]) => [name, `preview:${suffix}`]),
  );

  return Object.freeze({
    ...identity,
    OALO_ENVIRONMENT: preview.environment,
    OALO_PROVIDER_MODE: preview.providerMode,
    OALO_STRIPE_MODE: preview.stripeMode,
    OALO_DATA_CLASSIFICATION: preview.dataClassification,
    OALO_TRIGGER_ENVIRONMENT: preview.triggerEnvironment,
    OALO_SUPABASE_MODE: preview.supabaseMode,
    OALO_PRODUCTION_TRAFFIC: preview.productionTraffic,
    OALO_APP_URL: PREVIEW_APP_URL,
    OALO_ALLOWED_ORIGINS: PREVIEW_APP_URL,
    OALO_BUILD_COMMIT: PREVIEW_COMMIT,
    OALO_BUILD_ID: PREVIEW_BUILD_ID,
    OALO_RELEASE_MANIFEST_JSON: JSON.stringify(
      createCandidateDeploymentManifest({
        environment: "preview",
        commit: PREVIEW_COMMIT,
        buildId: PREVIEW_BUILD_ID,
        generatedAt: "2026-09-15T00:00:00.000Z",
        verificationReference: "test:default-off-proof:001",
        versions: {
          web: PREVIEW_BUILD_ID,
          tasks: PREVIEW_BUILD_ID,
          databaseMigration: "migration-default-off",
          contract: "contract-default-off",
          renderer: "renderer-default-off",
          template: "template-default-off",
        },
      }),
    ),
    NEXT_PUBLIC_OALO_ENVIRONMENT: preview.environment,
    NEXT_PUBLIC_OALO_APP_URL: PREVIEW_APP_URL,
    NEXT_PUBLIC_OALO_BUILD_ID: PREVIEW_BUILD_ID,
  });
}

async function collectProductionSources(directory: string): Promise<readonly string[]> {
  const collected: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".next") {
        continue;
      }
      collected.push(...(await collectProductionSources(target)));
      continue;
    }
    if (![".ts", ".tsx", ".mjs"].includes(extname(entry.name))) continue;
    if (/\.(?:test|spec)\.[a-z]+$/u.test(entry.name)) continue;
    collected.push(target);
  }
  return collected;
}

async function productionSourcesMatching(marker: RegExp): Promise<readonly string[]> {
  const workspaceRoot = resolve(".");
  const roots = [resolve("apps"), resolve("packages")];
  const matches: string[] = [];
  for (const root of roots) {
    for (const file of await collectProductionSources(root)) {
      const repositoryPath = relative(workspaceRoot, file).replaceAll("\\", "/");
      if (repositoryPath.startsWith("packages/test-support/")) continue;
      if (marker.test(await readFile(file, "utf8"))) matches.push(repositoryPath);
    }
  }
  return matches.sort();
}

describe("provider side effects stay disabled by default", () => {
  it("classifies every operation in the provider contract register into a named acceptance-criteria surface", () => {
    expect(registeredProviderOperations.length).toBeGreaterThan(0);
    expect(Object.keys(OPERATION_SURFACES).sort()).toEqual(
      [...registeredProviderOperations].sort(),
    );
    expect(new Set(Object.values(OPERATION_SURFACES).flat())).toEqual(
      new Set(ACCEPTANCE_CRITERIA_SURFACES),
    );
    for (const surfaces of Object.values(OPERATION_SURFACES)) {
      expect(surfaces.length).toBeGreaterThan(0);
    }
  });

  it("keeps the external gate owning each named surface blocked in the Phase 0 provider contract register", async () => {
    const register = PhaseZeroSecurityCoverageRegisterSchema.parse(
      JSON.parse(await readFile("tests/fixtures/security/phase0-threat-coverage.json", "utf8")),
    );

    expect(register.productionTrafficEnabled).toBe(false);
    expect(register.liveProviderPathEnabled).toBe(false);

    for (const surface of ACCEPTANCE_CRITERIA_SURFACES) {
      const gateId = SURFACE_EXTERNAL_GATE[surface];
      const contract = register.providerContracts.find((entry) => entry.gateId === gateId);
      expect(contract, `${surface} must own a registered external gate`).toBeDefined();
      expect(contract?.externalStatus).toBe("BLOCKED");
      expect(contract?.evidenceMode).toBe("synthetic-fixture-only");
      expect(contract?.liveProviderCallsAllowed).toBe(false);
    }
  });

  it("pins production traffic off in every runtime environment variant and stubs providers for local and preview", () => {
    expect(runtimeEnvironmentVariants.length).toBe(4);
    expect(new Set(runtimeEnvironmentVariants.map((variant) => variant.productionTraffic))).toEqual(
      new Set(["disabled"]),
    );

    for (const variant of runtimeEnvironmentVariants.filter((candidate) =>
      ["local", "preview"].includes(candidate.environment),
    )) {
      expect(variant.providerMode).toBe("stub");
      expect(variant.stripeMode).toBe("test");
      expect(variant.dataClassification).toBe("synthetic-only");
    }

    expect(getFoundationSnapshot().productionTrafficEnabled).toBe(false);
  });

  it("resolves stub providers and test-mode Stripe from a completely unset environment and from a deployed preview environment", () => {
    for (const input of [{}, deployedPreviewEnvironment()]) {
      const runtime = parseRuntimeEnvironment(input);
      expect(runtime.providerMode).toBe("stub");
      expect(runtime.stripeMode).toBe("test");
      expect(runtime.productionTraffic).toBe("disabled");
      expect(runtime.dataClassification).toBe("synthetic-only");
    }
  });

  it("blocks every registered provider operation under unprovisioned authority without reserving or writing", async () => {
    for (const operation of registeredProviderOperations) {
      const recorder = recordingProviderPort(UNPROVISIONED_AUTHORITY);
      const outcome = await executeProviderOperation(
        providerOperationFixture(operation),
        recorder.port,
      );

      expect(outcome, `${operation} must be blocked by default`).toEqual({
        kind: "blocked",
        reason: "AUTHORITY_REVOKED",
      });
      expect(recorder.writes).toEqual([]);
      expect(recorder.reservations).toEqual([]);
    }
  });

  it("blocks every registered provider operation when any single authority fact is withdrawn", async () => {
    for (const withdrawal of AUTHORITY_WITHDRAWALS) {
      for (const operation of registeredProviderOperations) {
        const recorder = recordingProviderPort({ ...FULLY_GRANTED_AUTHORITY, ...withdrawal });
        const outcome = await executeProviderOperation(
          providerOperationFixture(operation),
          recorder.port,
        );

        expect(outcome, `${operation} must block on ${JSON.stringify(withdrawal)}`).toEqual({
          kind: "blocked",
          reason: "AUTHORITY_REVOKED",
        });
        expect(recorder.writes).toEqual([]);
      }
    }
  });

  it("requires a launch-ready location for exactly the effect-creating provider operations", async () => {
    const blocked: ProviderOperationName[] = [];
    for (const operation of registeredProviderOperations) {
      const recorder = recordingProviderPort({
        ...FULLY_GRANTED_AUTHORITY,
        readinessState: "not_ready",
      });
      const outcome = await executeProviderOperation(
        providerOperationFixture(operation),
        recorder.port,
      );

      if (outcome.kind === "blocked") {
        expect(outcome.reason).toBe("READINESS_REQUIRED");
        expect(recorder.writes).toEqual([]);
        blocked.push(operation);
      }
    }

    expect(blocked.sort()).toEqual([...READINESS_GATED_OPERATIONS].sort());
  });

  it("refuses every HighLevel write route before any network access when no location token resolver is configured", async () => {
    const writeRoutes = Object.entries(LEADCONNECTOR_V2_ROUTE_ALLOWLIST).filter(
      ([, descriptor]) => descriptor.method !== "GET",
    );

    expect(writeRoutes.length).toBeGreaterThan(0);
    expect(
      writeRoutes.some(([operation]) => operation === "publish-campaign"),
      "the Meta publish route must be part of the derived write inventory",
    ).toBe(true);

    const network = vi.fn(async (): Promise<never> => {
      throw new Error("Default-off proof must never reach the network.");
    });
    const transport = createLeadConnectorV2HttpTransport({}, { fetch: network });

    for (const [operation, descriptor] of writeRoutes) {
      const parameters = {
        ...(descriptor.route.includes(":campaignId")
          ? { campaignId: "campaign_default_off_proof" }
          : {}),
        ...(descriptor.route.includes(":pageId") ? { pageId: "page_default_off_proof" } : {}),
      };

      await expect(
        transport.execute(
          {
            operation,
            locationRef: "location_default_off_proof",
            parameters,
            body: { syntheticProof: true },
            idempotencyKey: "default-off-proof",
          },
          z.unknown(),
        ),
        `${operation} must fail closed`,
      ).rejects.toMatchObject({ classification: "DEPENDENCY_BLOCKED" });
    }

    expect(network).not.toHaveBeenCalled();
  });

  it("cannot compose deployed production task bindings from an unset or deployed preview environment", () => {
    for (const input of [{}, deployedPreviewEnvironment()]) {
      expect(() => createDeployedProductionTaskBindings(input)).toThrow(
        /Production task runtime configuration is absent or invalid/u,
      );
    }
  });

  // productionSourcesMatching walks apps/ and packages/ from disk and reads every .ts/.tsx/.mjs
  // file, twice over (once per marker), so its wall time tracks filesystem cache state rather
  // than the code under test. That can run past vitest's 5,000 ms default on a cold disk even
  // though it finishes in a couple of seconds once the OS has the tree cached. An explicit
  // budget keeps machine load from reddening this gate; it does not change what the scan
  // asserts.
  it("has no Stripe charge adapter and no wired lead-routing write transport, and detects either if one appears", async () => {
    expect(registeredProviderOperations).toContain("stripe.entitlement.reconcile");
    expect(await productionSourcesMatching(STRIPE_OUTBOUND_MARKER)).toEqual([]);
    expect(STRIPE_OUTBOUND_MARKER.test('import Stripe from "stripe";\nnew Stripe(key);')).toBe(
      true,
    );
    expect(STRIPE_OUTBOUND_MARKER.test("await fetch('https://api.stripe.com/v1/charges')")).toBe(
      true,
    );

    expect(await productionSourcesMatching(LEAD_PROVIDER_PORT_MARKER)).toEqual([
      "packages/ghl/src/lead-routing.ts",
    ]);

    const wiredRoutes = new Set<string>(
      Object.values(LEADCONNECTOR_V2_ROUTE_ALLOWLIST).map((descriptor) => descriptor.route),
    );
    const leadWritePaths = GHL_LEAD_ADAPTER_ALLOWLIST.filter((entry) => entry.method !== "GET").map(
      (entry) => entry.path,
    );

    expect(leadWritePaths.length).toBeGreaterThan(0);
    expect(leadWritePaths.filter((path) => wiredRoutes.has(path))).toEqual([]);
  }, 30_000);
});
