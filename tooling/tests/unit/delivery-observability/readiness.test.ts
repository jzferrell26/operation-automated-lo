import { createCandidateDeploymentManifest, parseRuntimeEnvironment } from "@oalo/config";
import { describe, expect, it } from "vitest";

import {
  aggregateReadiness,
  dependencyReadinessChecks,
  evaluateEnvironmentReadiness,
  evaluateRuntimeReadiness,
  isolationStubDependencyChecks,
  shouldProbeLiveDependencies,
} from "../../../../apps/web/src/app/api/health/ready/route.js";

function previewEnvironment() {
  const commit = "c".repeat(40);
  const buildId = "ready-preview-001";
  const manifest = createCandidateDeploymentManifest({
    environment: "preview",
    commit,
    buildId,
    generatedAt: "2026-07-21T12:00:00.000Z",
    verificationReference: "test:canonical:003",
    versions: {
      web: buildId,
      tasks: buildId,
      databaseMigration: "migration-001",
      contract: "contract-001",
      renderer: "renderer-001",
      template: "template-001",
    },
  });

  return parseRuntimeEnvironment({
    OALO_ENVIRONMENT: "preview",
    OALO_APP_URL: "https://ready-preview.oalo.test",
    OALO_ALLOWED_ORIGINS: "https://ready-preview.oalo.test",
    OALO_PROVIDER_MODE: "stub",
    OALO_DATA_CLASSIFICATION: "synthetic-only",
    OALO_STRIPE_MODE: "test",
    OALO_TRIGGER_ENVIRONMENT: "preview",
    OALO_SUPABASE_MODE: "ephemeral-preview",
    OALO_PRODUCTION_TRAFFIC: "disabled",
    OALO_BUILD_COMMIT: commit,
    OALO_BUILD_ID: buildId,
    OALO_DATABASE_ID: "ready-preview:database",
    OALO_TASK_PROJECT_ID: "ready-preview:tasks",
    OALO_SECRET_SCOPE_ID: "ready-preview:secrets",
    OALO_PRIVATE_STORAGE_ID: "ready-preview:private",
    OALO_PUBLISHED_STORAGE_ID: "ready-preview:published",
    OALO_PROVIDER_APP_ID: "ready-preview:provider",
    OALO_RELEASE_MANIFEST_JSON: JSON.stringify(manifest),
    NEXT_PUBLIC_OALO_ENVIRONMENT: "preview",
    NEXT_PUBLIC_OALO_APP_URL: "https://ready-preview.oalo.test",
    NEXT_PUBLIC_OALO_BUILD_ID: buildId,
  });
}

describe("readiness aggregation", () => {
  it("reports local defaults ready without exposing configuration", () => {
    expect(evaluateRuntimeReadiness({})).toEqual({
      status: "ready",
      checks: [
        { name: "configuration", ready: true, code: "READY" },
        { name: "release-manifest", ready: true, code: "READY" },
      ],
    });
  });

  it("fails closed when non-local dependency probes are absent", () => {
    const summary = evaluateEnvironmentReadiness(previewEnvironment());

    expect(summary.status).toBe("unavailable");
    expect(summary.checks).toContainEqual({
      name: "external-dependencies",
      ready: false,
      code: "DEPENDENCY_PROBES_NOT_CONFIGURED",
    });
  });

  it("reports degraded when optional providers fail but durable dependencies are ready", () => {
    const checks = dependencyReadinessChecks({
      database: "ready",
      highLevel: "degraded",
      ai: "degraded",
      objectStore: "ready",
    });

    expect(evaluateEnvironmentReadiness(previewEnvironment(), checks)).toMatchObject({
      status: "degraded",
    });
  });

  it("reports ready when every non-local dependency probe succeeds", () => {
    const checks = dependencyReadinessChecks({
      database: "ready",
      highLevel: "ready",
      ai: "ready",
      objectStore: "ready",
    });

    expect(evaluateEnvironmentReadiness(previewEnvironment(), checks)).toMatchObject({
      status: "ready",
    });
  });

  it("reports unavailable when a durable dependency is unavailable", () => {
    const checks = dependencyReadinessChecks({
      database: "unavailable",
      highLevel: "ready",
      ai: "ready",
      objectStore: "ready",
    });

    expect(evaluateEnvironmentReadiness(previewEnvironment(), checks)).toMatchObject({
      status: "unavailable",
    });
  });

  it("keeps preview and staging on isolation stubs instead of live probes", () => {
    const preview = previewEnvironment();
    expect(shouldProbeLiveDependencies(preview)).toBe(false);
    expect(
      shouldProbeLiveDependencies({ environment: "staging", providerMode: "contract-test" }),
    ).toBe(false);
    expect(shouldProbeLiveDependencies({ environment: "production", providerMode: "live" })).toBe(
      true,
    );
    expect(shouldProbeLiveDependencies({ environment: "local", providerMode: "stub" })).toBe(false);

    const summary = evaluateEnvironmentReadiness(preview, isolationStubDependencyChecks());
    expect(summary.status).toBe("ready");
    expect(summary.checks).toEqual(
      expect.arrayContaining([
        { name: "database", ready: true, code: "READY" },
        { name: "highlevel", ready: true, code: "READY" },
        { name: "ai-provider", ready: true, code: "READY" },
        { name: "object-store", ready: true, code: "READY" },
      ]),
    );
  });

  it("accepts only safe dependency check output", () => {
    expect(() =>
      aggregateReadiness([
        { name: "database connection string", ready: false, code: "DEPENDENCY_UNAVAILABLE" },
      ]),
    ).toThrow("Readiness check output is invalid");
  });

  it("reduces invalid configuration to a safe code", () => {
    expect(evaluateRuntimeReadiness({ OALO_ENVIRONMENT: "production" })).toEqual({
      status: "unavailable",
      checks: [{ name: "configuration", ready: false, code: "CONFIGURATION_INVALID" }],
    });
  });
});
