import { z } from "zod";

const ReferenceSchema = z
  .string()
  .min(8)
  .max(160)
  .regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const SafeTextSchema = z.string().trim().min(1).max(20_000);

export const ExtractedBrandSuggestionFieldSchema = z.enum([
  "voice",
  "tone",
  "content_pattern",
  "framework",
  "signature_language",
  "banned_language",
]);
export type ExtractedBrandSuggestionField = z.infer<typeof ExtractedBrandSuggestionFieldSchema>;

export const BrandSampleSchema = z
  .object({
    sourceRef: ReferenceSchema,
    content: z.string().trim().min(1).max(50_000),
  })
  .strict();
export type BrandSample = z.infer<typeof BrandSampleSchema>;

export const ExtractedBrandSuggestionSchema = z
  .object({
    field: ExtractedBrandSuggestionFieldSchema,
    value: z.string().trim().min(1).max(5_000),
    sourceRefs: z.array(ReferenceSchema).min(1).max(20),
    confidence: z.number().min(0).max(1),
    status: z.literal("needs_confirmation"),
  })
  .strict();
export type ExtractedBrandSuggestion = z.infer<typeof ExtractedBrandSuggestionSchema>;

export const BrandSuggestionSetSchema = z
  .object({
    suggestions: z.array(ExtractedBrandSuggestionSchema).max(100),
  })
  .strict();
export type BrandSuggestionSet = z.infer<typeof BrandSuggestionSetSchema>;

export const ModelRouteSchema = z
  .object({
    routeRef: ReferenceSchema,
    providerRef: ReferenceSchema,
    modelRef: z.string().trim().min(1).max(300),
    purpose: z.enum(["quality", "cheap", "fallback"]),
  })
  .strict();
export type ModelRoute = z.infer<typeof ModelRouteSchema>;

export const ModelPolicySchema = z
  .object({
    versionRef: ReferenceSchema,
    primary: ModelRouteSchema,
    cheap: ModelRouteSchema,
    fallback: ModelRouteSchema.optional(),
    fallbackEvaluationStatus: z.enum(["disabled", "passed"]),
    evaluationCorpusVersionRef: ReferenceSchema,
    maxProviderAttempts: z.number().int().min(1).max(3),
    maxRepairAttempts: z.number().int().min(0).max(1),
    maxOutputTokens: z.number().int().positive().max(20_000),
  })
  .strict();
export type ModelPolicy = z.infer<typeof ModelPolicySchema>;

export const PromptPolicySchema = z
  .object({
    versionRef: ReferenceSchema,
    compilerVersion: z.string().trim().min(1).max(100),
    policyText: z.string().trim().min(1).max(20_000),
    contentHash: Sha256Schema,
  })
  .strict();
export type PromptPolicy = z.infer<typeof PromptPolicySchema>;

export const FrozenGenerationInputsSchema = z
  .object({
    campaignRef: ReferenceSchema,
    campaignVersionRef: ReferenceSchema,
    campaignInputVersionRef: ReferenceSchema,
    brandProfileVersionRef: ReferenceSchema,
    brandPromptSnapshotRef: ReferenceSchema,
    brandPromptContentHash: Sha256Schema,
    complianceProfileVersionRef: ReferenceSchema,
    partnerProfileVersionRef: ReferenceSchema,
    propertyVersionRef: ReferenceSchema,
    blueprintVersionRef: ReferenceSchema,
    rulesetVersionRef: ReferenceSchema,
    modelPolicyVersionRef: ReferenceSchema,
    promptPolicyVersionRef: ReferenceSchema,
  })
  .strict();
export type FrozenGenerationInputs = z.infer<typeof FrozenGenerationInputsSchema>;

export const TextPieceRequestSchema = z
  .object({
    pieceRef: ReferenceSchema,
    channel: z.enum(["landing_page", "meta_ad", "email", "sms", "social"]),
    purpose: z.string().trim().min(1).max(500),
    maximumCharacters: z.number().int().positive().max(20_000),
  })
  .strict();
export type TextPieceRequest = z.infer<typeof TextPieceRequestSchema>;

export const CampaignGenerationRequestSchema = z
  .object({
    locationRef: ReferenceSchema,
    actorRef: ReferenceSchema,
    correlationRef: ReferenceSchema,
    idempotencyRef: ReferenceSchema,
    draftVersionRef: ReferenceSchema,
    generationKind: z.enum(["campaign_pack", "regeneration"]),
    frozenInputs: FrozenGenerationInputsSchema,
    promptPolicy: PromptPolicySchema,
    modelPolicy: ModelPolicySchema,
    compactBrandPrompt: z.string().trim().min(1).max(30_000),
    blueprintInstructions: z.string().trim().min(1).max(20_000),
    allowedFacts: z.record(z.string().min(1).max(100), z.string().max(5_000)),
    pieces: z.array(TextPieceRequestSchema).min(1).max(30),
  })
  .strict();
export type CampaignGenerationRequest = z.infer<typeof CampaignGenerationRequestSchema>;

export const GeneratedTextPieceSchema = z
  .object({
    pieceRef: ReferenceSchema,
    channel: TextPieceRequestSchema.shape.channel,
    headline: z.string().trim().max(500),
    body: SafeTextSchema,
    callToAction: z.string().trim().max(500),
  })
  .strict();
export type GeneratedTextPiece = z.infer<typeof GeneratedTextPieceSchema>;

export const GeneratedTextPackSchema = z
  .object({
    pieces: z.array(GeneratedTextPieceSchema).min(1).max(30),
  })
  .strict();
export type GeneratedTextPack = z.infer<typeof GeneratedTextPackSchema>;

export const ProviderFailureClassificationSchema = z.enum([
  "timeout",
  "malformed_output",
  "rate_limited",
  "refusal",
  "uncertain_response",
  "provider_unavailable",
]);
export type ProviderFailureClassification = z.infer<typeof ProviderFailureClassificationSchema>;

export const ProviderTokenUsageSchema = z
  .object({
    cacheWriteTokens: z.number().int().nonnegative(),
    cacheReadTokens: z.number().int().nonnegative(),
    uncachedInputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
  })
  .strict();
export type ProviderTokenUsage = z.infer<typeof ProviderTokenUsageSchema>;

export const AiUsageEventSchema = z
  .object({
    usageEventRef: ReferenceSchema,
    locationRef: ReferenceSchema,
    actorRef: ReferenceSchema,
    feature: z.enum(["brand_extraction", "campaign_pack", "repair", "regeneration"]),
    campaignRef: ReferenceSchema.optional(),
    brandVersionRef: ReferenceSchema,
    correlationRef: ReferenceSchema,
    providerRef: ReferenceSchema,
    modelRef: z.string().trim().min(1).max(300),
    modelPolicyVersionRef: ReferenceSchema,
    promptPolicyVersionRef: ReferenceSchema,
    providerRequestRef: z.string().trim().min(1).max(300).optional(),
    tokenUsage: ProviderTokenUsageSchema,
    estimatedCostUsd: z.number().nonnegative().max(1_000),
    latencyMs: z.number().int().nonnegative(),
    retryCount: z.number().int().nonnegative().max(3),
    outcome: z.enum(["accepted", "rejected", "failed", "reconciled"]),
    chargedPlanUnit: z.enum(["none", "campaign_pack", "regeneration"]),
    failureClassification: ProviderFailureClassificationSchema.optional(),
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type AiUsageEvent = z.infer<typeof AiUsageEventSchema>;

export const AiTraceRecordSchema = z
  .object({
    traceRef: ReferenceSchema,
    locationRef: ReferenceSchema,
    actorRef: ReferenceSchema,
    correlationRef: ReferenceSchema,
    feature: AiUsageEventSchema.shape.feature,
    routeRef: ReferenceSchema,
    modelPolicyVersionRef: ReferenceSchema,
    promptPolicyVersionRef: ReferenceSchema,
    promptContextHash: Sha256Schema,
    acceptedOutputHash: Sha256Schema.optional(),
    providerRequestRef: z.string().trim().min(1).max(300).optional(),
    latencyMs: z.number().int().nonnegative(),
    outcome: AiUsageEventSchema.shape.outcome,
    failureClassification: ProviderFailureClassificationSchema.optional(),
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type AiTraceRecord = z.infer<typeof AiTraceRecordSchema>;

export const GenerationPreflightSchema = z
  .object({
    rulesetVersionRef: ReferenceSchema,
    blockingRuleCodes: z.array(z.string().trim().min(1).max(200)).max(100),
    warningRuleCodes: z.array(z.string().trim().min(1).max(200)).max(100),
  })
  .strict();
export type GenerationPreflight = z.infer<typeof GenerationPreflightSchema>;

export const AcceptedGenerationSchema = z
  .object({
    locationRef: ReferenceSchema,
    campaignRef: ReferenceSchema,
    campaignVersionRef: ReferenceSchema,
    draftVersionRef: ReferenceSchema,
    sourceProviderRequestRef: z.string().trim().min(1).max(300),
    outputHash: Sha256Schema,
    promptContextHash: Sha256Schema,
    frozenInputs: FrozenGenerationInputsSchema,
    textPack: GeneratedTextPackSchema,
    preflight: GenerationPreflightSchema,
    approvalAvailable: z.boolean(),
    createdAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type AcceptedGeneration = z.infer<typeof AcceptedGenerationSchema>;

export const EvaluationCaseResultSchema = z
  .object({
    caseRef: ReferenceSchema,
    brandFidelityPassed: z.boolean(),
    structuredOutputPassed: z.boolean(),
    bannedClaimPassed: z.boolean(),
    frameworkPassed: z.boolean(),
    noInventedFactsPassed: z.boolean(),
  })
  .strict();
export type EvaluationCaseResult = z.infer<typeof EvaluationCaseResultSchema>;

export const ModelEvaluationResultSchema = z
  .object({
    routeRef: ReferenceSchema,
    corpusVersionRef: ReferenceSchema,
    results: z.array(EvaluationCaseResultSchema).min(1).max(10_000),
  })
  .strict();
export type ModelEvaluationResult = z.infer<typeof ModelEvaluationResultSchema>;
