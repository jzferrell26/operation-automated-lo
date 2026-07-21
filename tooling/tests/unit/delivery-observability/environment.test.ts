import {
  assertEnvironmentIsolation,
  createCandidateDeploymentManifest,
  parseRuntimeEnvironment,
  toEnvironmentIsolationDescriptor,
  type DeploymentEnvironment,
  type EnvironmentIsolationDescriptor,
} from "@oalo/config";
import { describe, expect, it } from "vitest";

const commit = "a".repeat(40);
const buildId = "build-preview-001";

function previewInput(): Readonly<Record<string, string>> {
  const manifest = createCandidateDeploymentManifest({
    environment: "preview",
    commit,
    buildId,
    generatedAt: "2026-07-21T12:00:00.000Z",
    verificationReference: "test:canonical:001",
    versions: {
      web: buildId,
      tasks: buildId,
      databaseMigration: "migration-001",
      contract: "contract-001",
      renderer: "renderer-001",
      template: "template-001",
    },
  });

  return {
    OALO_ENVIRONMENT: "preview",
    OALO_APP_URL: "https://preview.oalo.test",
    OALO_ALLOWED_ORIGINS: "https://preview.oalo.test",
    OALO_PROVIDER_MODE: "stub",
    OALO_DATA_CLASSIFICATION: "synthetic-only",
    OALO_STRIPE_MODE: "test",
    OALO_TRIGGER_ENVIRONMENT: "preview",
    OALO_SUPABASE_MODE: "ephemeral-preview",
    OALO_PRODUCTION_TRAFFIC: "disabled",
    OALO_BUILD_COMMIT: commit,
    OALO_BUILD_ID: buildId,
    OALO_DATABASE_ID: "preview:database",
    OALO_TASK_PROJECT_ID: "preview:tasks",
    OALO_SECRET_SCOPE_ID: "preview:secrets",
    OALO_PRIVATE_STORAGE_ID: "preview:private",
    OALO_PUBLISHED_STORAGE_ID: "preview:published",
    OALO_PROVIDER_APP_ID: "preview:provider",
    OALO_RELEASE_MANIFEST_JSON: JSON.stringify(manifest),
    NEXT_PUBLIC_OALO_ENVIRONMENT: "preview",
    NEXT_PUBLIC_OALO_APP_URL: "https://preview.oalo.test",
    NEXT_PUBLIC_OALO_BUILD_ID: buildId,
  };
}

function productionInput(): Readonly<Record<string, string>> {
  const preview = previewInput();
  const candidate = JSON.parse(preview.OALO_RELEASE_MANIFEST_JSON ?? "null") as Record<
    string,
    unknown
  >;
  const releaseManifest = {
    ...candidate,
    environment: "production",
    evidence: {
      canonicalVerification: { status: "passed", reference: "ci:canonical:production:001" },
      securityReview: { status: "passed", reference: "review:security:production:001" },
      qualityReview: { status: "passed", reference: "review:quality:production:001" },
      externalExercises: {
        status: "verified",
        references: ["exercise:restore:production:001"],
      },
    },
  };

  return {
    ...preview,
    OALO_ENVIRONMENT: "production",
    OALO_APP_URL: "https://app.oalo.test",
    OALO_ALLOWED_ORIGINS: "https://app.oalo.test",
    OALO_PROVIDER_MODE: "live",
    OALO_DATA_CLASSIFICATION: "minimum-customer-data",
    OALO_STRIPE_MODE: "live",
    OALO_TRIGGER_ENVIRONMENT: "prod",
    OALO_SUPABASE_MODE: "production",
    OALO_DATABASE_ID: "production:database",
    OALO_TASK_PROJECT_ID: "production:tasks",
    OALO_SECRET_SCOPE_ID: "production:secrets",
    OALO_PRIVATE_STORAGE_ID: "production:private",
    OALO_PUBLISHED_STORAGE_ID: "production:published",
    OALO_PROVIDER_APP_ID: "production:provider",
    OALO_RELEASE_MANIFEST_JSON: JSON.stringify(releaseManifest),
    NEXT_PUBLIC_OALO_ENVIRONMENT: "production",
    NEXT_PUBLIC_OALO_APP_URL: "https://app.oalo.test",
  };
}

function descriptor(environment: DeploymentEnvironment): EnvironmentIsolationDescriptor {
  const production = environment === "production";
  const preview = environment === "preview";

  return {
    environment,
    identity: {
      database: `${environment}:database`,
      tasks: `${environment}:tasks`,
      secrets: `${environment}:secrets`,
      privateStorage: `${environment}:private`,
      publishedStorage: `${environment}:published`,
      providerApp: `${environment}:provider`,
    },
    stripeMode: production ? "live" : "test",
    providerMode: production ? "live" : preview ? "stub" : "contract-test",
    dataClassification: production
      ? "minimum-customer-data"
      : preview
        ? "synthetic-only"
        : "approved-test-only",
  };
}

describe("runtime environment isolation", () => {
  it("permits fixture defaults only for local", () => {
    const local = parseRuntimeEnvironment({});

    expect(local.environment).toBe("local");
    expect(local.providerMode).toBe("stub");
    expect(local.dataClassification).toBe("synthetic-only");
    expect(local.productionTraffic).toBe("disabled");
    expect(toEnvironmentIsolationDescriptor(local).identity.database).toBe("local:database");
  });

  it("rejects an undeclared public variable", () => {
    expect(() => parseRuntimeEnvironment({ NEXT_PUBLIC_PROVIDER_TOKEN: "unsafe" })).toThrow(
      "Unexpected public environment variables",
    );
  });

  it("requires staging values instead of inheriting fixture defaults", () => {
    expect(() => parseRuntimeEnvironment({ OALO_ENVIRONMENT: "staging" })).toThrow();
  });

  it("binds preview runtime identity to its release manifest", () => {
    const preview = parseRuntimeEnvironment(previewInput());

    expect(preview.environment).toBe("preview");
    expect(preview.releaseManifest?.commit).toBe(commit);
    expect(preview.public.buildId).toBe(buildId);
  });

  it("accepts production only with verified release evidence", () => {
    const production = parseRuntimeEnvironment(productionInput());
    const releaseManifest = production.releaseManifest;

    if (releaseManifest === undefined) {
      throw new Error("Expected production release manifest");
    }

    expect(production.environment).toBe("production");
    expect(production.productionTraffic).toBe("disabled");
    expect(releaseManifest.evidence.externalExercises.status).toBe("verified");
  });

  it("rejects fixture provider settings in production", () => {
    const input = { ...productionInput(), OALO_PROVIDER_MODE: "stub" };

    expect(() => parseRuntimeEnvironment(input)).toThrow();
  });

  it("rejects enabled traffic in production", () => {
    const input = { ...productionInput(), OALO_PRODUCTION_TRAFFIC: "enabled" };

    expect(() => parseRuntimeEnvironment(input)).toThrow();
  });

  it("rejects pending production release evidence", () => {
    const input = productionInput();
    const manifest = JSON.parse(input.OALO_RELEASE_MANIFEST_JSON ?? "null") as {
      evidence: Record<string, unknown>;
    };
    const incomplete = {
      ...manifest,
      evidence: { ...manifest.evidence, securityReview: { status: "pending" } },
    };

    expect(() =>
      parseRuntimeEnvironment({
        ...input,
        OALO_RELEASE_MANIFEST_JSON: JSON.stringify(incomplete),
      }),
    ).toThrow("Production release reviews are incomplete");
  });

  it("rejects a shared resource identity across environments", () => {
    const descriptors = (["local", "preview", "staging", "production"] as const).map(descriptor);
    const [local, preview, staging, production] = descriptors;

    if (
      local === undefined ||
      preview === undefined ||
      staging === undefined ||
      production === undefined
    ) {
      throw new Error("Expected all environment descriptors");
    }

    const duplicate = [
      local,
      preview,
      staging,
      {
        ...production,
        identity: {
          ...production.identity,
          database: staging.identity.database,
        },
      },
    ];

    expect(() => assertEnvironmentIsolation(duplicate)).toThrow(
      "Environment identity is shared across environments: database",
    );
  });
});
