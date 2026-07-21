import { createCandidateDeploymentManifest, parseRuntimeEnvironment } from "@oalo/config";
import { describe, expect, it } from "vitest";

import {
  aggregateReadiness,
  evaluateEnvironmentReadiness,
  evaluateRuntimeReadiness,
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

    expect(summary.status).toBe("not-ready");
    expect(summary.checks).toContainEqual({
      name: "external-dependencies",
      ready: false,
      code: "DEPENDENCY_PROBES_NOT_CONFIGURED",
    });
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
      status: "not-ready",
      checks: [{ name: "configuration", ready: false, code: "CONFIGURATION_INVALID" }],
    });
  });
});
