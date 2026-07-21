import {
  DeploymentManifestSchema,
  assertDeploymentManifestCompatibility,
  assertProductionReleaseEvidence,
  createCandidateDeploymentManifest,
  type CandidateDeploymentManifestInput,
} from "@oalo/config";
import { describe, expect, it } from "vitest";

const input = {
  environment: "preview",
  commit: "b".repeat(40),
  buildId: "candidate-001",
  generatedAt: "2026-07-21T12:00:00.000Z",
  verificationReference: "test:canonical:002",
  versions: {
    web: "candidate-001",
    tasks: "candidate-001",
    databaseMigration: "migration-001",
    contract: "contract-001",
    renderer: "renderer-001",
    template: "template-001",
  },
} as const;

describe("deployment manifest", () => {
  it("binds the environment, commit, and build ID", () => {
    const manifest = createCandidateDeploymentManifest(input);

    expect(() =>
      assertDeploymentManifestCompatibility(manifest, {
        environment: "preview",
        commit: manifest.commit,
        buildId: "different-build",
      }),
    ).toThrow("Release manifest build ID does not match runtime build ID");
  });

  it("refuses candidate production generation at runtime", () => {
    const unsafeInput = {
      ...input,
      environment: "production",
    } as unknown as CandidateDeploymentManifestInput;

    expect(() => createCandidateDeploymentManifest(unsafeInput)).toThrow(
      "Candidate manifest generation refuses production releases",
    );
  });

  it("rejects incomplete production evidence", () => {
    const candidate = createCandidateDeploymentManifest(input);
    const production = DeploymentManifestSchema.parse({
      ...candidate,
      environment: "production",
    });

    expect(() => assertProductionReleaseEvidence(production)).toThrow(
      "Production release reviews are incomplete",
    );
  });

  it("accepts production only when reviews and external exercises are verified", () => {
    const candidate = createCandidateDeploymentManifest(input);
    const production = DeploymentManifestSchema.parse({
      ...candidate,
      environment: "production",
      evidence: {
        canonicalVerification: { status: "passed", reference: "ci:canonical:002" },
        securityReview: { status: "passed", reference: "review:security:002" },
        qualityReview: { status: "passed", reference: "review:quality:002" },
        externalExercises: {
          status: "verified",
          references: ["exercise:rollback:002", "exercise:restore:002"],
        },
      },
    });

    expect(() => assertProductionReleaseEvidence(production)).not.toThrow();
  });
});
