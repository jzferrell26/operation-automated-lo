import { z } from "zod";

export const DeploymentEnvironmentSchema = z.enum(["local", "preview", "staging", "production"]);

export type DeploymentEnvironment = z.infer<typeof DeploymentEnvironmentSchema>;

const CommitShaSchema = z.string().regex(/^[0-9a-f]{40}$/u);
const VersionIdentifierSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9._:+/-]{1,128}$/u);
const EvidenceReferenceSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9._:/@+-]{1,256}$/u);

const PendingEvidenceSchema = z
  .object({
    status: z.literal("pending"),
  })
  .strict();

const PassedEvidenceSchema = z
  .object({
    status: z.literal("passed"),
    reference: EvidenceReferenceSchema,
  })
  .strict();

const ReviewEvidenceSchema = z.discriminatedUnion("status", [
  PendingEvidenceSchema,
  PassedEvidenceSchema,
]);

const ExternalExerciseEvidenceSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("not-run") }).strict(),
  z
    .object({
      status: z.literal("verified"),
      references: z.array(EvidenceReferenceSchema).min(1),
    })
    .strict(),
]);

export const DeploymentManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    environment: DeploymentEnvironmentSchema,
    commit: CommitShaSchema,
    buildId: VersionIdentifierSchema,
    generatedAt: z.string().datetime({ offset: true }),
    versions: z
      .object({
        web: VersionIdentifierSchema,
        tasks: VersionIdentifierSchema,
        databaseMigration: VersionIdentifierSchema,
        contract: VersionIdentifierSchema,
        renderer: VersionIdentifierSchema,
        template: VersionIdentifierSchema,
      })
      .strict(),
    evidence: z
      .object({
        canonicalVerification: ReviewEvidenceSchema,
        securityReview: ReviewEvidenceSchema,
        qualityReview: ReviewEvidenceSchema,
        externalExercises: ExternalExerciseEvidenceSchema,
      })
      .strict(),
  })
  .strict()
  .readonly();

export type DeploymentManifest = z.infer<typeof DeploymentManifestSchema>;

export interface CandidateDeploymentManifestInput {
  readonly environment: Exclude<DeploymentEnvironment, "production">;
  readonly commit: string;
  readonly buildId: string;
  readonly generatedAt: string;
  readonly versions: DeploymentManifest["versions"];
  readonly verificationReference: string;
}

export function createCandidateDeploymentManifest(
  input: CandidateDeploymentManifestInput,
): DeploymentManifest {
  const environment = DeploymentEnvironmentSchema.parse(input.environment);
  if (environment === "production") {
    throw new Error("Candidate manifest generation refuses production releases");
  }

  return DeploymentManifestSchema.parse({
    schemaVersion: 1,
    environment,
    commit: input.commit,
    buildId: input.buildId,
    generatedAt: input.generatedAt,
    versions: input.versions,
    evidence: {
      canonicalVerification: {
        status: "passed",
        reference: input.verificationReference,
      },
      securityReview: { status: "pending" },
      qualityReview: { status: "pending" },
      externalExercises: { status: "not-run" },
    },
  });
}

export function parseDeploymentManifestJson(input: string): DeploymentManifest {
  let decoded: unknown;

  try {
    decoded = JSON.parse(input);
  } catch {
    throw new Error("Release manifest is not valid JSON");
  }

  return DeploymentManifestSchema.parse(decoded);
}

export function assertDeploymentManifestCompatibility(
  manifest: DeploymentManifest,
  expected: {
    readonly environment: DeploymentEnvironment;
    readonly commit: string;
    readonly buildId: string;
  },
): void {
  if (manifest.environment !== expected.environment) {
    throw new Error("Release manifest environment does not match runtime environment");
  }

  if (manifest.commit !== expected.commit) {
    throw new Error("Release manifest commit does not match runtime commit");
  }

  if (manifest.buildId !== expected.buildId) {
    throw new Error("Release manifest build ID does not match runtime build ID");
  }
}

export function assertProductionReleaseEvidence(manifest: DeploymentManifest): void {
  if (manifest.environment !== "production") {
    throw new Error("Production release evidence can only be checked for production manifests");
  }

  const requiredReviews = [
    manifest.evidence.canonicalVerification,
    manifest.evidence.securityReview,
    manifest.evidence.qualityReview,
  ];

  if (requiredReviews.some((evidence) => evidence.status !== "passed")) {
    throw new Error("Production release reviews are incomplete");
  }

  if (manifest.evidence.externalExercises.status !== "verified") {
    throw new Error("Production external exercises are not independently verified");
  }
}
