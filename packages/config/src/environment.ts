import { z } from "zod";

import { assertPublicEnvironmentAllowlistSecure } from "./public-env-guard.js";
import {
  DeploymentManifestSchema,
  assertDeploymentManifestCompatibility,
  assertProductionReleaseEvidence,
  parseDeploymentManifestJson,
  type DeploymentEnvironment,
  type DeploymentManifest,
} from "./deployment-manifest.js";

/**
 * The operational list of public names the runtime reads and forwards. Publishing a variable to
 * browsers takes two independent edits: adding the name here, and adding a reviewed
 * `BrowserPublicationApproval` entry in `./public-env-guard.ts`. Adding a name here alone fails
 * closed in the assertion below. This list is deliberately hand-written rather than derived from the
 * approval registry, because deriving it would collapse both reviews into one edit.
 */
export const PUBLIC_ENVIRONMENT_VARIABLE_NAMES = Object.freeze([
  "NEXT_PUBLIC_OALO_ENVIRONMENT",
  "NEXT_PUBLIC_OALO_APP_URL",
  "NEXT_PUBLIC_OALO_BUILD_ID",
] as const);

assertPublicEnvironmentAllowlistSecure(PUBLIC_ENVIRONMENT_VARIABLE_NAMES);

type PublicEnvironmentVariableName = (typeof PUBLIC_ENVIRONMENT_VARIABLE_NAMES)[number];

const publicEnvironmentVariableNames = new Set<string>(PUBLIC_ENVIRONMENT_VARIABLE_NAMES);
const CommitShaSchema = z.string().regex(/^[0-9a-f]{40}$/u);
const SafeIdentifierSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9._:/+-]{1,128}$/u);
const HttpsUrlSchema = z.string().url().startsWith("https://");

const EnvironmentIdentitySchema = z
  .object({
    database: SafeIdentifierSchema,
    tasks: SafeIdentifierSchema,
    secrets: SafeIdentifierSchema,
    privateStorage: SafeIdentifierSchema,
    publishedStorage: SafeIdentifierSchema,
    providerApp: SafeIdentifierSchema,
  })
  .strict()
  .readonly();

export type EnvironmentIdentity = z.infer<typeof EnvironmentIdentitySchema>;

const PublicEnvironmentSchema = z
  .object({
    environment: z.enum(["local", "preview", "staging", "production"]),
    appUrl: z.string().url(),
    buildId: SafeIdentifierSchema,
  })
  .strict()
  .readonly();

const LocalEnvironmentSchema = z
  .object({
    environment: z.literal("local"),
    appUrl: z.string().url(),
    allowedOrigins: z.array(z.string().url()).min(1),
    providerMode: z.literal("stub"),
    dataClassification: z.literal("synthetic-only"),
    stripeMode: z.literal("test"),
    triggerEnvironment: z.literal("dev"),
    supabaseMode: z.literal("local"),
    productionTraffic: z.literal("disabled"),
    buildCommit: z.union([z.literal("local"), CommitShaSchema]),
    buildId: SafeIdentifierSchema,
    identity: EnvironmentIdentitySchema,
    public: PublicEnvironmentSchema,
    releaseManifest: DeploymentManifestSchema.optional(),
  })
  .strict()
  .readonly();

const PreviewEnvironmentSchema = z
  .object({
    environment: z.literal("preview"),
    appUrl: HttpsUrlSchema,
    allowedOrigins: z.array(HttpsUrlSchema).min(1),
    providerMode: z.literal("stub"),
    dataClassification: z.literal("synthetic-only"),
    stripeMode: z.literal("test"),
    triggerEnvironment: z.literal("preview"),
    supabaseMode: z.literal("ephemeral-preview"),
    productionTraffic: z.literal("disabled"),
    buildCommit: CommitShaSchema,
    buildId: SafeIdentifierSchema,
    identity: EnvironmentIdentitySchema,
    public: PublicEnvironmentSchema,
    releaseManifest: DeploymentManifestSchema,
  })
  .strict()
  .readonly();

const StagingEnvironmentSchema = z
  .object({
    environment: z.literal("staging"),
    appUrl: HttpsUrlSchema,
    allowedOrigins: z.array(HttpsUrlSchema).min(1),
    providerMode: z.literal("contract-test"),
    dataClassification: z.literal("approved-test-only"),
    stripeMode: z.literal("test"),
    triggerEnvironment: z.literal("staging"),
    supabaseMode: z.literal("staging"),
    productionTraffic: z.literal("disabled"),
    buildCommit: CommitShaSchema,
    buildId: SafeIdentifierSchema,
    identity: EnvironmentIdentitySchema,
    public: PublicEnvironmentSchema,
    releaseManifest: DeploymentManifestSchema,
  })
  .strict()
  .readonly();

const ProductionEnvironmentSchema = z
  .object({
    environment: z.literal("production"),
    appUrl: HttpsUrlSchema,
    allowedOrigins: z.array(HttpsUrlSchema).min(1),
    providerMode: z.literal("live"),
    dataClassification: z.literal("minimum-customer-data"),
    stripeMode: z.literal("live"),
    triggerEnvironment: z.literal("prod"),
    supabaseMode: z.literal("production"),
    productionTraffic: z.literal("disabled"),
    buildCommit: CommitShaSchema,
    buildId: SafeIdentifierSchema,
    identity: EnvironmentIdentitySchema,
    public: PublicEnvironmentSchema,
    releaseManifest: DeploymentManifestSchema,
  })
  .strict()
  .readonly();

export const RuntimeEnvironmentSchema = z.discriminatedUnion("environment", [
  LocalEnvironmentSchema,
  PreviewEnvironmentSchema,
  StagingEnvironmentSchema,
  ProductionEnvironmentSchema,
]);

export type RuntimeEnvironment = z.infer<typeof RuntimeEnvironmentSchema>;

const PhaseZeroEnvironmentSchema = z
  .object({
    OALO_ENVIRONMENT: z.enum(["local", "preview", "test"]).default("local"),
    OALO_PROVIDER_MODE: z.literal("stub").default("stub"),
    OALO_SYNTHETIC_DATA_ONLY: z.literal("true").default("true"),
    OALO_BUILD_COMMIT: z.string().trim().min(1).default("local"),
    OALO_BUILD_ID: z.string().trim().min(1).default("local"),
    TRIGGER_PROJECT_REF: z
      .string()
      .regex(/^proj_[a-zA-Z0-9_-]+$/u)
      .default("proj_phase0_fixture_only"),
  })
  .passthrough();

function asEnvironmentRecord(input: unknown): Readonly<Record<string, unknown>> {
  return z.record(z.string(), z.unknown()).parse(input);
}

function readString(
  input: Readonly<Record<string, unknown>>,
  name: string,
  fallback?: string,
): string | undefined {
  const value = input[name];
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function readOrigins(value: string | undefined, fallback: readonly string[]): readonly string[] {
  if (value === undefined) {
    return fallback;
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function assertPublicVariableAllowlist(input: Readonly<Record<string, unknown>>): void {
  const unexpected = Object.keys(input).filter(
    (name) => name.startsWith("NEXT_PUBLIC_") && !publicEnvironmentVariableNames.has(name),
  );

  if (unexpected.length > 0) {
    throw new Error(`Unexpected public environment variables: ${unexpected.sort().join(", ")}`);
  }
}

function readIdentity(
  input: Readonly<Record<string, unknown>>,
  fallbackPrefix?: string,
): EnvironmentIdentity {
  return EnvironmentIdentitySchema.parse({
    database: readString(input, "OALO_DATABASE_ID", fallbackPrefix && `${fallbackPrefix}:database`),
    tasks: readString(input, "OALO_TASK_PROJECT_ID", fallbackPrefix && `${fallbackPrefix}:tasks`),
    secrets: readString(
      input,
      "OALO_SECRET_SCOPE_ID",
      fallbackPrefix && `${fallbackPrefix}:secrets`,
    ),
    privateStorage: readString(
      input,
      "OALO_PRIVATE_STORAGE_ID",
      fallbackPrefix && `${fallbackPrefix}:private-storage`,
    ),
    publishedStorage: readString(
      input,
      "OALO_PUBLISHED_STORAGE_ID",
      fallbackPrefix && `${fallbackPrefix}:published-storage`,
    ),
    providerApp: readString(
      input,
      "OALO_PROVIDER_APP_ID",
      fallbackPrefix && `${fallbackPrefix}:provider-app`,
    ),
  });
}

function readReleaseManifest(
  input: Readonly<Record<string, unknown>>,
): DeploymentManifest | undefined {
  const encoded = readString(input, "OALO_RELEASE_MANIFEST_JSON");
  return encoded === undefined ? undefined : parseDeploymentManifestJson(encoded);
}

export function parsePublicEnvironment(
  input: unknown,
  fallback?: {
    readonly environment: DeploymentEnvironment;
    readonly appUrl: string;
    readonly buildId: string;
  },
) {
  const record = asEnvironmentRecord(input);
  assertPublicVariableAllowlist(record);

  return PublicEnvironmentSchema.parse({
    environment: readString(record, "NEXT_PUBLIC_OALO_ENVIRONMENT", fallback?.environment),
    appUrl: readString(record, "NEXT_PUBLIC_OALO_APP_URL", fallback?.appUrl),
    buildId: readString(record, "NEXT_PUBLIC_OALO_BUILD_ID", fallback?.buildId),
  });
}

export function parseRuntimeEnvironment(input: unknown): RuntimeEnvironment {
  const record = asEnvironmentRecord(input);
  assertPublicVariableAllowlist(record);
  const environment = readString(record, "OALO_ENVIRONMENT", "local");

  const localDefaults = environment === "local";
  const appUrl = readString(
    record,
    "OALO_APP_URL",
    localDefaults ? "http://localhost:3000" : undefined,
  );
  const buildCommit = readString(record, "OALO_BUILD_COMMIT", localDefaults ? "local" : undefined);
  const buildId = readString(record, "OALO_BUILD_ID", localDefaults ? "local" : undefined);
  const publicEnvironment = parsePublicEnvironment(record, {
    environment: environment as DeploymentEnvironment,
    appUrl: appUrl ?? "",
    buildId: buildId ?? "",
  });
  const releaseManifest = readReleaseManifest(record);

  const candidate = {
    environment,
    appUrl,
    allowedOrigins: readOrigins(
      readString(record, "OALO_ALLOWED_ORIGINS"),
      localDefaults ? ["http://localhost:3000"] : [],
    ),
    providerMode: readString(record, "OALO_PROVIDER_MODE", localDefaults ? "stub" : undefined),
    dataClassification: readString(
      record,
      "OALO_DATA_CLASSIFICATION",
      localDefaults ? "synthetic-only" : undefined,
    ),
    stripeMode: readString(record, "OALO_STRIPE_MODE", localDefaults ? "test" : undefined),
    triggerEnvironment: readString(
      record,
      "OALO_TRIGGER_ENVIRONMENT",
      localDefaults ? "dev" : undefined,
    ),
    supabaseMode: readString(record, "OALO_SUPABASE_MODE", localDefaults ? "local" : undefined),
    productionTraffic: readString(
      record,
      "OALO_PRODUCTION_TRAFFIC",
      localDefaults ? "disabled" : undefined,
    ),
    buildCommit,
    buildId,
    identity: readIdentity(record, localDefaults ? "local" : undefined),
    public: publicEnvironment,
    releaseManifest,
  };

  const parsed = RuntimeEnvironmentSchema.parse(candidate);

  if (parsed.public.environment !== parsed.environment) {
    throw new Error("Public environment does not match server environment");
  }

  if (parsed.public.appUrl !== parsed.appUrl) {
    throw new Error("Public application URL does not match server application URL");
  }

  if (parsed.public.buildId !== parsed.buildId) {
    throw new Error("Public build ID does not match server build ID");
  }

  if (parsed.releaseManifest !== undefined) {
    assertDeploymentManifestCompatibility(parsed.releaseManifest, {
      environment: parsed.environment,
      commit: parsed.buildCommit,
      buildId: parsed.buildId,
    });
  }

  if (parsed.environment === "production") {
    assertProductionReleaseEvidence(parsed.releaseManifest);
  }

  return parsed;
}

export function parsePhaseZeroEnvironment(input: unknown) {
  return PhaseZeroEnvironmentSchema.parse(input);
}

export interface EnvironmentIsolationDescriptor {
  readonly environment: DeploymentEnvironment;
  readonly identity: EnvironmentIdentity;
  readonly stripeMode: "test" | "live";
  readonly providerMode: "stub" | "contract-test" | "live";
  readonly dataClassification: "synthetic-only" | "approved-test-only" | "minimum-customer-data";
}

export function toEnvironmentIsolationDescriptor(
  environment: RuntimeEnvironment,
): EnvironmentIsolationDescriptor {
  return Object.freeze({
    environment: environment.environment,
    identity: environment.identity,
    stripeMode: environment.stripeMode,
    providerMode: environment.providerMode,
    dataClassification: environment.dataClassification,
  });
}

export function assertEnvironmentIsolation(
  descriptors: readonly EnvironmentIsolationDescriptor[],
): void {
  const environments = new Set(descriptors.map((descriptor) => descriptor.environment));
  const requiredEnvironments: readonly DeploymentEnvironment[] = [
    "local",
    "preview",
    "staging",
    "production",
  ];

  if (
    descriptors.length !== requiredEnvironments.length ||
    requiredEnvironments.some((environment) => !environments.has(environment))
  ) {
    throw new Error("Isolation evidence must contain exactly one descriptor per environment");
  }

  const identityKeys: readonly (keyof EnvironmentIdentity)[] = [
    "database",
    "tasks",
    "secrets",
    "privateStorage",
    "publishedStorage",
    "providerApp",
  ];

  for (const key of identityKeys) {
    const values = descriptors.map((descriptor) => descriptor.identity[key]);
    if (new Set(values).size !== values.length) {
      throw new Error(`Environment identity is shared across environments: ${key}`);
    }
  }

  const expectedModes = {
    local: {
      stripeMode: "test",
      providerMode: "stub",
      dataClassification: "synthetic-only",
    },
    preview: {
      stripeMode: "test",
      providerMode: "stub",
      dataClassification: "synthetic-only",
    },
    staging: {
      stripeMode: "test",
      providerMode: "contract-test",
      dataClassification: "approved-test-only",
    },
    production: {
      stripeMode: "live",
      providerMode: "live",
      dataClassification: "minimum-customer-data",
    },
  } as const satisfies Record<
    DeploymentEnvironment,
    Pick<EnvironmentIsolationDescriptor, "stripeMode" | "providerMode" | "dataClassification">
  >;

  for (const descriptor of descriptors) {
    const expected = expectedModes[descriptor.environment];
    if (
      descriptor.stripeMode !== expected.stripeMode ||
      descriptor.providerMode !== expected.providerMode ||
      descriptor.dataClassification !== expected.dataClassification
    ) {
      throw new Error(`Environment isolation modes are invalid: ${descriptor.environment}`);
    }
  }
}

export type { PublicEnvironmentVariableName };
