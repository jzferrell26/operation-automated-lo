import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { getFoundationSnapshot } from "@oalo/application";
import { parsePhaseZeroEnvironment } from "@oalo/config";
import { PhaseZeroSecurityCoverageRegisterSchema } from "@oalo/test-support";
import { createAnthropicMessagesProviderClient } from "../../packages/ai/src/anthropic-messages-provider.js";
import { createLeadConnectorV2HttpTransport } from "../../packages/ghl/src/leadconnector-v2-http-transport.js";
import { createLiveCaptureAdapter } from "../../packages/ghl/src/live-capture.js";
import { createR2ObjectStoreClient } from "../../packages/storage/src/r2-object-store-client.js";

const requiredThreatIds = new Set([
  "TENANT-LOCATION-SWAP",
  "FORGED-SIGNED-CONTEXT",
  "OAUTH-INSTALL-CSRF",
  "INSTALLER-ROLE-ELEVATION",
  "BROWSER-READINESS-FORGERY",
  "SUPPORT-ATTESTATION-SUBSTITUTION",
  "TOKEN-THEFT",
  "TOKEN-REFRESH-RACE",
  "BROAD-AD-SCOPE-ABUSE",
  "POST-APPROVAL-EDIT",
  "PUBLISH-REPLAY",
  "WEBHOOK-FORGERY-REPLAY",
  "PUBLIC-PROJECTION-DATA-LEAK",
  "STORED-REFLECTED-SCRIPT-INJECTION",
  "MALICIOUS-FILE-UPLOAD",
  "LEAD-ENDPOINT-ABUSE",
  "CONSENT-EVIDENCE-TAMPERING",
  "PII-OR-SECRET-LOGGING",
  "RENDERER-INTERNAL-NETWORK",
  "MODEL-PROMPT-INJECTION",
  "MODEL-CROSS-TENANT-CACHE",
  "MODEL-INVENTED-FACT",
  "MODEL-PUBLISH-AUTHORITY",
  "MODEL-RETRY-SPEND",
  "MODEL-DATA-LEAK",
  "CLIENT-PROVIDER-OVERRIDE",
  "OBJECT-STORAGE-BROKEN-ACCESS",
  "THEME-CSS-INJECTION",
  "THEME-BOOTSTRAP-CSP",
  "DEPENDENCY-OR-CI-COMPROMISE",
  "PRODUCTION-FEATURE-TRAFFIC",
  "LIVE-PROVIDER-PATH",
]);

async function sourceFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(target)));
    else if ([".ts", ".tsx", ".mjs"].includes(extname(entry.name))) files.push(target);
  }
  return files;
}

describe("Phase 0 security coverage and traffic boundary", () => {
  it("parses the complete threat and provider coverage register", async () => {
    const source = await readFile("tests/fixtures/security/phase0-threat-coverage.json", "utf8");
    const register = PhaseZeroSecurityCoverageRegisterSchema.parse(JSON.parse(source));

    expect(new Set(register.threats.map(({ threatId }) => threatId))).toEqual(requiredThreatIds);
    expect(new Set(register.providerContracts.map(({ gateId }) => gateId))).toEqual(
      new Set(["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"]),
    );
    expect(
      register.providerContracts.every(({ externalStatus }) => externalStatus === "BLOCKED"),
    ).toBe(true);
    expect(
      register.providerContracts.every(({ liveProviderCallsAllowed }) => !liveProviderCallsAllowed),
    ).toBe(true);
  });

  it("fails closed for production, live providers, and non-synthetic data", () => {
    expect(getFoundationSnapshot().productionTrafficEnabled).toBe(false);
    expect(() => parsePhaseZeroEnvironment({ OALO_ENVIRONMENT: "production" })).toThrow();
    expect(() => parsePhaseZeroEnvironment({ OALO_PROVIDER_MODE: "live" })).toThrow();
    expect(() => parsePhaseZeroEnvironment({ OALO_SYNTHETIC_DATA_ONLY: "false" })).toThrow();
  });

  it("limits outbound transport code to the required production adapters", async () => {
    const workspaceRoot = resolve(".");
    const files = [
      ...(await sourceFiles(resolve("apps"))),
      ...(await sourceFiles(resolve("packages"))),
    ];
    const forbidden =
      /\b(?:fetch|axios)\s*\(|https?\.request\s*\(|from\s+["'](?:stripe|@aws-sdk|undici)["']/u;
    const findings: string[] = [];
    for (const file of files) {
      if (forbidden.test(await readFile(file, "utf8")))
        findings.push(relative(workspaceRoot, file).replaceAll("\\", "/"));
    }

    expect(findings.sort()).toEqual(
      [
        "packages/ai/src/anthropic-messages-provider.ts",
        "packages/ghl/src/leadconnector-v2-http-transport.ts",
        "packages/storage/src/r2-object-store-client.ts",
      ].sort(),
    );
  });

  it("keeps local defaults and fixture paths disconnected from production adapters", async () => {
    expect(parsePhaseZeroEnvironment({})).toMatchObject({
      OALO_ENVIRONMENT: "local",
      OALO_PROVIDER_MODE: "stub",
      OALO_SYNTHETIC_DATA_ONLY: "true",
    });

    const workspaceRoot = resolve(".");
    const fixtureEntryPoints = [
      "apps/tasks/src/local/run-phase-zero.ts",
      "apps/tasks/src/core/validate-render-fixtures.ts",
      "apps/tasks/src/core/render-campaign-pdf.ts",
      "apps/tasks/src/core/poll-meta-publish.ts",
      "apps/tasks/src/core/fixture-delivery-guard.ts",
      "packages/ghl/src/live-capture.ts",
    ];
    const productionSelection =
      /production-runtime-composition|productionTaskBindings|anthropic-messages-provider|leadconnector-v2-http-transport|r2-object-store-client|OALO_ANTHROPIC_API_KEY|OALO_GHL_LOCATION_PIT_JSON|OALO_R2_SECRET_ACCESS_KEY/u;
    const findings: string[] = [];

    for (const path of fixtureEntryPoints) {
      if (productionSelection.test(await readFile(resolve(path), "utf8"))) {
        findings.push(relative(workspaceRoot, resolve(path)));
      }
    }

    expect(findings).toEqual([]);
  });

  it("fails before network access when production adapters lack credentials", async () => {
    const network = vi.fn(async (): Promise<never> => {
      throw new Error("network must remain disabled");
    });

    expect(() => createAnthropicMessagesProviderClient({}, { fetch: network })).toThrow();
    expect(() => createR2ObjectStoreClient({}, { fetch: network })).toThrow();

    const leadConnector = createLeadConnectorV2HttpTransport({}, { fetch: network });
    await expect(
      leadConnector.get({
        locationRef: "location_phase0_fixture",
        route: "/ad-publishing/facebook/campaigns/campaign_fixture_01/publishing-progress",
      }),
    ).rejects.toMatchObject({ classification: "DEPENDENCY_BLOCKED" });
    expect(network).not.toHaveBeenCalled();
  });

  it("keeps the Phase 0 capture adapter disabled", async () => {
    const adapter = createLiveCaptureAdapter();
    expect(adapter.mode).toBe("disabled");
    await expect(adapter.capture()).rejects.toThrow(/OALO_GHL_LIVE_CAPTURE=authorized/i);
  });
});
