import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { getFoundationSnapshot } from "@oalo/application";
import { parsePhaseZeroEnvironment } from "@oalo/config";
import { PhaseZeroSecurityCoverageRegisterSchema } from "@oalo/test-support";
import { createLiveCaptureAdapter } from "../../packages/ghl/src/live-capture.js";

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

  it("has no outbound provider transport in product source", async () => {
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
        findings.push(relative(workspaceRoot, file));
    }

    expect(findings).toEqual([]);
  });

  it("keeps the only provider adapter disabled", async () => {
    const adapter = createLiveCaptureAdapter();
    expect(adapter.mode).toBe("disabled");
    await expect(adapter.capture()).rejects.toThrow(/disabled in Phase 0/i);
  });
});
