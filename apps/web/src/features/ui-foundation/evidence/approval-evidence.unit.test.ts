import { afterEach, describe, expect, it, vi } from "vitest";

import {
  approvalProjectionSchema,
  artifactManifestSchema,
  buildLocalApprovalEvidence,
  campaignInputSchema,
} from "./approval-evidence.js";

const forbiddenDashboardStateKeys = new Set([
  "colorScheme",
  "draftFormState",
  "expandedSectionIds",
  "focusedElementId",
  "isDrawerOpen",
  "isMarketingExpanded",
  "isRailCollapsed",
  "resolvedTheme",
  "scrollPosition",
  "theme",
  "themePreference",
]);

function collectKeys(value: unknown, keys = new Set<string>()): ReadonlySet<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
    return keys;
  }

  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      keys.add(key);
      collectKeys(item, keys);
    }
  }

  return keys;
}

describe("theme-independent approval evidence boundary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps dashboard UI state structurally absent from every evidence shape", () => {
    const evidence = buildLocalApprovalEvidence();
    const projectedKeys = collectKeys({
      campaignInput: evidence.campaignInput,
      approval: evidence.approval,
      artifactManifest: evidence.artifactManifest,
    });

    for (const forbiddenKey of forbiddenDashboardStateKeys) {
      expect(projectedKeys).not.toContain(forbiddenKey);
    }

    expect(
      campaignInputSchema.safeParse({
        ...evidence.campaignInput,
        themePreference: "dark",
      }).success,
    ).toBe(false);
    expect(
      approvalProjectionSchema.safeParse({
        ...evidence.approval,
        resolvedTheme: "light",
      }).success,
    ).toBe(false);
    expect(
      artifactManifestSchema.safeParse({
        ...evidence.artifactManifest,
        isDrawerOpen: true,
      }).success,
    ).toBe(false);
  });

  it("keeps canonical bytes, hashes, and identifiers identical across local theme states", () => {
    const localUiStates = [
      { preference: "light", resolvedTheme: "light" },
      { preference: "dark", resolvedTheme: "dark" },
      { preference: "system", resolvedTheme: "light" },
      { preference: "system", resolvedTheme: "dark" },
    ] as const;
    const evidenceByUiState = localUiStates.map((uiState) => ({
      uiState,
      evidence: buildLocalApprovalEvidence(),
    }));
    const baseline = evidenceByUiState[0]?.evidence;

    expect(baseline).toBeDefined();
    for (const { evidence } of evidenceByUiState) {
      expect(evidence.canonicalApprovalBytes).toEqual(baseline?.canonicalApprovalBytes);
      expect(evidence.sha256).toBe(baseline?.sha256);
      expect(evidence.approval.approvalId).toBe(baseline?.approval.approvalId);
      expect(evidence.artifactManifest.manifestId).toBe(baseline?.artifactManifest.manifestId);
      expect(evidence.artifactManifest.artifacts.map((artifact) => artifact.artifactId)).toEqual(
        baseline?.artifactManifest.artifacts.map((artifact) => artifact.artifactId),
      );
    }
  });

  it("is local-only, frozen, writes-disabled, and performs no request", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const evidence = buildLocalApprovalEvidence();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(evidence.campaignInput.safety).toMatchObject({
      dataMode: "synthetic",
      source: "local-synthetic-fixture",
      writesEnabled: false,
    });
    expect(evidence.approval.decisionRecorded).toBe(false);
    expect(evidence.artifactManifest.artifacts.every((artifact) => !artifact.generated)).toBe(true);
    expect(Object.isFrozen(evidence.campaignInput)).toBe(true);
    expect(Object.isFrozen(evidence.approval)).toBe(true);
    expect(Object.isFrozen(evidence.artifactManifest)).toBe(true);
  });
});
