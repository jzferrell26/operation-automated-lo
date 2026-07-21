import { z } from "zod";

const IntegerStringSchema = z.string().regex(/^\d+$/u).transform(Number);
const JsonObjectStringSchema = z.string().transform((value, context): unknown => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      context.addIssue({ code: "custom", message: "Expected a JSON object" });
      return z.NEVER;
    }
    return parsed;
  } catch {
    context.addIssue({ code: "custom", message: "Expected valid JSON" });
    return z.NEVER;
  }
});

const ProductionServiceEnvironmentSchema = z
  .object({
    OALO_ENVIRONMENT: z.enum(["preview", "staging", "production"]),
    OALO_DATABASE_URL: z.string().url().startsWith("postgres"),
    OALO_DATABASE_SSL_MODE: z.enum(["require", "verify-full"]),
    OALO_ANTHROPIC_PROVIDER_REF: z.string().regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u),
    OALO_ANTHROPIC_API_KEY: z.string().min(20).max(512).regex(/^\S+$/u),
    OALO_ANTHROPIC_PRICING_JSON: JsonObjectStringSchema,
    OALO_R2_ACCOUNT_ID: z.string().regex(/^[a-f0-9]{32}$/u),
    OALO_R2_ACCESS_KEY_ID: z
      .string()
      .min(16)
      .max(256)
      .regex(/^[A-Za-z0-9_-]+$/u),
    OALO_R2_SECRET_ACCESS_KEY: z.string().min(32).max(512).regex(/^\S+$/u),
    OALO_R2_PRIVATE_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9.-]{2,62}$/u),
    OALO_R2_PUBLIC_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9.-]{2,62}$/u),
    OALO_R2_PUBLIC_BASE_URL: z.url({ protocol: /^https$/u }),
    OALO_GHL_READINESS_LOCATION_REF: z.string().min(8).max(128),
    OALO_PROVIDER_TIMEOUT_MS: IntegerStringSchema.pipe(
      z.number().int().min(100).max(60_000),
    ).default(15_000),
  })
  .passthrough()
  .superRefine((value, context) => {
    if (value.OALO_R2_PRIVATE_BUCKET === value.OALO_R2_PUBLIC_BUCKET) {
      context.addIssue({ code: "custom", message: "R2 buckets must be distinct" });
    }
  });

export interface ProductionServiceConfiguration {
  readonly database: Readonly<{
    connectionString: string;
    deploymentEnvironment: "preview" | "staging" | "production";
    poolingMode: "transaction";
    preparedStatements: false;
    sslMode: "require" | "verify-full";
    applicationName: "oalo-runtime";
  }>;
  readonly anthropic: Readonly<{
    providerRef: string;
    apiKey: string;
    pricingByModel: unknown;
    requestTimeoutMs: number;
  }>;
  readonly r2: Readonly<{
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    privateBucket: string;
    publicBucket: string;
    publicBaseUrl: string;
    requestTimeoutMs: number;
  }>;
  readonly ghl: Readonly<{
    readinessLocationRef: string;
    requestTimeoutMs: number;
  }>;
}

export class ProductionServiceConfigurationError extends Error {
  readonly code = "PRODUCTION_SERVICE_CONFIGURATION_INVALID" as const;

  constructor() {
    super("Production service configuration is absent or invalid.");
    this.name = "ProductionServiceConfigurationError";
  }
}

export function parseProductionServiceConfiguration(
  input: unknown,
): ProductionServiceConfiguration {
  const result = ProductionServiceEnvironmentSchema.safeParse(input);
  if (!result.success) throw new ProductionServiceConfigurationError();
  const value = result.data;
  return Object.freeze({
    database: Object.freeze({
      connectionString: value.OALO_DATABASE_URL,
      deploymentEnvironment: value.OALO_ENVIRONMENT,
      poolingMode: "transaction",
      preparedStatements: false,
      sslMode: value.OALO_DATABASE_SSL_MODE,
      applicationName: "oalo-runtime",
    }),
    anthropic: Object.freeze({
      providerRef: value.OALO_ANTHROPIC_PROVIDER_REF,
      apiKey: value.OALO_ANTHROPIC_API_KEY,
      pricingByModel: value.OALO_ANTHROPIC_PRICING_JSON,
      requestTimeoutMs: value.OALO_PROVIDER_TIMEOUT_MS,
    }),
    r2: Object.freeze({
      accountId: value.OALO_R2_ACCOUNT_ID,
      accessKeyId: value.OALO_R2_ACCESS_KEY_ID,
      secretAccessKey: value.OALO_R2_SECRET_ACCESS_KEY,
      privateBucket: value.OALO_R2_PRIVATE_BUCKET,
      publicBucket: value.OALO_R2_PUBLIC_BUCKET,
      publicBaseUrl: value.OALO_R2_PUBLIC_BASE_URL,
      requestTimeoutMs: value.OALO_PROVIDER_TIMEOUT_MS,
    }),
    ghl: Object.freeze({
      readinessLocationRef: value.OALO_GHL_READINESS_LOCATION_REF,
      requestTimeoutMs: value.OALO_PROVIDER_TIMEOUT_MS,
    }),
  });
}
