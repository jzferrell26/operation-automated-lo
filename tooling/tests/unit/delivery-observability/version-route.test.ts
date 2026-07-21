import { createCandidateDeploymentManifest } from "@oalo/config";
import { describe, expect, it } from "vitest";

import { versionEvidenceForEnvironment } from "../../../../apps/web/src/app/api/version/route.js";

const commit = "a".repeat(40);

function environmentInput(environment: "preview" | "staging" | "production") {
  const buildId = `build-${environment}-001`;
  const appUrl = `https://${environment}.oalo.test`;
  const versions = {
    web: buildId,
    tasks: buildId,
    databaseMigration: "migration-001",
    contract: "contract-001",
    renderer: "renderer-001",
    template: "template-001",
  };
  const candidate = createCandidateDeploymentManifest({
    environment: environment === "production" ? "staging" : environment,
    commit,
    buildId,
    generatedAt: "2026-07-21T12:00:00.000Z",
    verificationReference: `test:version:${environment}:001`,
    versions,
  });
  const manifest =
    environment === "production"
      ? {
          ...candidate,
          environment,
          evidence: {
            canonicalVerification: {
              status: "passed" as const,
              reference: "ci:canonical:production:001",
            },
            securityReview: {
              status: "passed" as const,
              reference: "review:security:production:001",
            },
            qualityReview: {
              status: "passed" as const,
              reference: "review:quality:production:001",
            },
            externalExercises: {
              status: "verified" as const,
              references: ["exercise:restore:production:001"],
            },
          },
        }
      : candidate;
  const preview = environment === "preview";
  const production = environment === "production";
  return {
    OALO_ENVIRONMENT: environment,
    OALO_APP_URL: appUrl,
    OALO_ALLOWED_ORIGINS: appUrl,
    OALO_PROVIDER_MODE: production ? "live" : preview ? "stub" : "contract-test",
    OALO_DATA_CLASSIFICATION: production
      ? "minimum-customer-data"
      : preview
        ? "synthetic-only"
        : "approved-test-only",
    OALO_STRIPE_MODE: production ? "live" : "test",
    OALO_TRIGGER_ENVIRONMENT: production ? "prod" : environment,
    OALO_SUPABASE_MODE: production ? "production" : preview ? "ephemeral-preview" : "staging",
    OALO_PRODUCTION_TRAFFIC: "disabled",
    OALO_BUILD_COMMIT: commit,
    OALO_BUILD_ID: buildId,
    OALO_DATABASE_ID: `${environment}:database`,
    OALO_TASK_PROJECT_ID: `${environment}:tasks`,
    OALO_SECRET_SCOPE_ID: `${environment}:secrets`,
    OALO_PRIVATE_STORAGE_ID: `${environment}:private`,
    OALO_PUBLISHED_STORAGE_ID: `${environment}:published`,
    OALO_PROVIDER_APP_ID: `${environment}:provider`,
    OALO_RELEASE_MANIFEST_JSON: JSON.stringify(manifest),
    NEXT_PUBLIC_OALO_ENVIRONMENT: environment,
    NEXT_PUBLIC_OALO_APP_URL: appUrl,
    NEXT_PUBLIC_OALO_BUILD_ID: buildId,
  };
}

describe("version route evidence", () => {
  it("returns validated local evidence without a release manifest", () => {
    expect(versionEvidenceForEnvironment({})).toMatchObject({
      environment: "local",
      buildId: "local",
      commit: "local",
      releaseVersions: null,
    });
  });

  it.each(["preview", "staging", "production"] as const)(
    "returns validated %s release evidence",
    (environment) => {
      const evidence = versionEvidenceForEnvironment(environmentInput(environment));

      expect(evidence).toMatchObject({
        environment,
        buildId: `build-${environment}-001`,
        commit,
        releaseVersions: {
          web: `build-${environment}-001`,
          databaseMigration: "migration-001",
          contract: "contract-001",
        },
      });
    },
  );

  it("rejects incomplete non-local configuration instead of falling back to Phase Zero", () => {
    expect(() => versionEvidenceForEnvironment({ OALO_ENVIRONMENT: "production" })).toThrow();
  });
});
