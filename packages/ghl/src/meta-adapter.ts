import { createHash } from "node:crypto";

import { z } from "zod";

import { canonicalizeJson } from "./canonical-json.js";

export const META_ADAPTER_MODE = "fixture-plan" as const;
export const META_DOCUMENTATION_VERSION = "v3" as const;
export const META_DELIVERY_SEMANTICS = "at-least-once-with-idempotent-reconciliation" as const;

const SafeReferenceSchema = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{2,95}$/);
const SafeHashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const SafeDisplayNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine((value) => !value.includes("@"), "Display names must not contain email addresses.")
  .refine(
    (value) => !/(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\d)/.test(value),
    "Display names must not contain phone numbers.",
  );

const ProviderIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{1,127}$/);
const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const META_ROUTE_ALLOWLIST = Object.freeze({
  "get-integration": Object.freeze({
    method: "GET",
    route: "/ad-publishing/facebook/integration",
  }),
  "get-pages": Object.freeze({ method: "GET", route: "/ad-publishing/facebook/pages" }),
  "get-instagram-accounts": Object.freeze({
    method: "GET",
    route: "/ad-publishing/facebook/page/:pageId/instagram",
  }),
  "get-page-forms": Object.freeze({
    method: "GET",
    route: "/ad-publishing/facebook/page/:pageId/forms",
  }),
  "get-ad-accounts": Object.freeze({
    method: "GET",
    route: "/ad-publishing/facebook/ad-accounts",
  }),
  "get-pixels": Object.freeze({ method: "GET", route: "/ad-publishing/facebook/pixels" }),
  "get-campaign": Object.freeze({
    method: "GET",
    route: "/ad-publishing/facebook/campaign/:campaignId",
  }),
  "get-publishing-progress": Object.freeze({
    method: "GET",
    route: "/ad-publishing/facebook/campaigns/:campaignId/publishing-progress",
  }),
  "get-campaign-reporting": Object.freeze({
    method: "GET",
    route: "/ad-publishing/facebook/reporting/campaign/:campaignId",
  }),
  "upsert-campaign-draft": Object.freeze({
    method: "PUT",
    route: "/ad-publishing/facebook/campaigns",
  }),
  "upsert-adset-draft": Object.freeze({
    method: "PUT",
    route: "/ad-publishing/facebook/adsets",
  }),
  "upsert-ad-draft": Object.freeze({
    method: "PUT",
    route: "/ad-publishing/facebook/ads-v2",
  }),
  "publish-campaign": Object.freeze({
    method: "POST",
    route: "/ad-publishing/facebook/campaigns/:campaignId/publish",
  }),
  "pause-campaign": Object.freeze({
    method: "POST",
    route: "/ad-publishing/facebook/campaigns/:campaignId/pause",
  }),
  "resume-campaign": Object.freeze({
    method: "POST",
    route: "/ad-publishing/facebook/campaigns/:campaignId/resume",
  }),
} as const);

export type MetaAllowedAction = keyof typeof META_ROUTE_ALLOWLIST;

const MetaAllowedActionSchema = z.enum(
  Object.keys(META_ROUTE_ALLOWLIST) as [MetaAllowedAction, ...MetaAllowedAction[]],
);

const MetaOperationParametersSchema = z
  .object({
    pageId: ProviderIdSchema.optional(),
    campaignId: ProviderIdSchema.optional(),
  })
  .strict();

function parameterizeRoute(
  template: string,
  parameters: z.infer<typeof MetaOperationParametersSchema>,
): string {
  return template.replace(/:(pageId|campaignId)/g, (_match, parameter: "pageId" | "campaignId") => {
    const value = parameters[parameter];
    if (value === undefined) {
      throw new Error(`Meta fixture operation requires ${parameter}.`);
    }
    return encodeURIComponent(value);
  });
}

export function planMetaFixtureOperation(input: {
  readonly action: MetaAllowedAction;
  readonly locationRef: string;
  readonly parameters?: z.input<typeof MetaOperationParametersSchema>;
}): Readonly<{
  transport: typeof META_ADAPTER_MODE;
  documentationVersion: typeof META_DOCUMENTATION_VERSION;
  action: MetaAllowedAction;
  locationRef: string;
  method: "GET" | "POST" | "PUT";
  route: string;
}> {
  const action = MetaAllowedActionSchema.parse(input.action);
  const locationRef = SafeReferenceSchema.parse(input.locationRef);
  const parameters = MetaOperationParametersSchema.parse(input.parameters ?? {});
  const descriptor = META_ROUTE_ALLOWLIST[action];

  return Object.freeze({
    transport: META_ADAPTER_MODE,
    documentationVersion: META_DOCUMENTATION_VERSION,
    action,
    locationRef,
    method: descriptor.method,
    route: parameterizeRoute(descriptor.route, parameters),
  });
}

export const MetaAssetKindSchema = z.enum([
  "ad_account",
  "facebook_page",
  "instagram_account",
  "lead_form",
  "pixel",
]);

export const MetaDiscoveredAssetSchema = z
  .object({
    kind: MetaAssetKindSchema,
    providerId: ProviderIdSchema,
    safeDisplayName: SafeDisplayNameSchema,
    availability: z.enum([
      "available",
      "missing_permission",
      "disconnected",
      "disapproved",
      "inaccessible",
      "unsupported",
    ]),
  })
  .strict();

export const MetaConnectionSchema = z
  .object({
    locationRef: SafeReferenceSchema,
    connectionState: z.enum(["connected", "disconnected", "reconnect_required"]),
    assets: z.array(MetaDiscoveredAssetSchema),
  })
  .strict();

export const MetaAssetSelectionSchema = z
  .object({
    adAccountId: ProviderIdSchema,
    facebookPageId: ProviderIdSchema,
    instagramAccountId: ProviderIdSchema.optional(),
    leadFormId: ProviderIdSchema.optional(),
    pixelId: ProviderIdSchema.optional(),
  })
  .strict();

type MetaAssetKind = z.infer<typeof MetaAssetKindSchema>;
type MetaDiscoveredAsset = z.infer<typeof MetaDiscoveredAssetSchema>;

const selectionByKind = {
  ad_account: "adAccountId",
  facebook_page: "facebookPageId",
  instagram_account: "instagramAccountId",
  lead_form: "leadFormId",
  pixel: "pixelId",
} as const satisfies Record<MetaAssetKind, keyof z.infer<typeof MetaAssetSelectionSchema>>;

const remediationByAvailability = {
  missing_permission: "Reconnect Meta and grant access to the selected asset.",
  disconnected: "Reconnect the selected Meta asset in HighLevel.",
  disapproved: "Choose an approved Meta asset or resolve its provider policy status.",
  inaccessible: "Grant this HighLevel location access to the selected Meta asset.",
  unsupported: "Choose a supported Meta asset exposed by HighLevel.",
} as const;

export function selectMetaAssets(
  connectionInput: z.input<typeof MetaConnectionSchema>,
  selectionInput: z.input<typeof MetaAssetSelectionSchema>,
): Readonly<{
  ok: boolean;
  locationRef: string;
  connectionState: z.infer<typeof MetaConnectionSchema>["connectionState"];
  selectedAssets: readonly MetaDiscoveredAsset[];
  remediations: readonly string[];
}> {
  const connection = MetaConnectionSchema.parse(connectionInput);
  const selection = MetaAssetSelectionSchema.parse(selectionInput);
  const selectedAssets: MetaDiscoveredAsset[] = [];
  const remediations: string[] = [];

  if (connection.connectionState !== "connected") {
    remediations.push("Reconnect the Meta integration for this HighLevel location.");
  }

  for (const [kind, selectionKey] of Object.entries(selectionByKind) as [
    MetaAssetKind,
    keyof typeof selection,
  ][]) {
    const selectedId = selection[selectionKey];
    if (selectedId === undefined) continue;
    const asset = connection.assets.find(
      (candidate) => candidate.kind === kind && candidate.providerId === selectedId,
    );
    if (asset === undefined) {
      remediations.push(`Select an available ${kind} exposed by HighLevel for this location.`);
      continue;
    }
    selectedAssets.push(asset);
    if (asset.availability !== "available") {
      remediations.push(remediationByAvailability[asset.availability]);
    }
  }

  return Object.freeze({
    ok: remediations.length === 0,
    locationRef: connection.locationRef,
    connectionState: connection.connectionState,
    selectedAssets: Object.freeze(selectedAssets),
    remediations: Object.freeze([...new Set(remediations)]),
  });
}

export const MetaCampaignTypeSchema = z.enum([
  "property_only",
  "mortgage_only",
  "property_and_mortgage",
]);

const ConfiguredCategoryValueSchema = z.string().regex(/^[A-Z][A-Z0-9_]{1,63}$/);

export const MetaSpecialCategoryFixtureSchema = z
  .object({
    campaignType: MetaCampaignTypeSchema,
    configuredValues: z.array(ConfiguredCategoryValueSchema).min(1).max(4),
    providerAcceptedValues: z.null(),
    evidenceStatus: z.literal("REQUIRES_HIGHLEVEL_APP_TEST"),
  })
  .strict();

export function configureMetaSpecialCategoryFixture(input: {
  readonly campaignType: z.infer<typeof MetaCampaignTypeSchema>;
  readonly configuredValues: readonly string[];
}): Readonly<z.infer<typeof MetaSpecialCategoryFixtureSchema>> {
  return deepFreeze(
    MetaSpecialCategoryFixtureSchema.parse({
      campaignType: input.campaignType,
      configuredValues: input.configuredValues,
      providerAcceptedValues: null,
      evidenceStatus: "REQUIRES_HIGHLEVEL_APP_TEST",
    }),
  );
}

const MetaGeoTargetSchema = z
  .object({
    providerId: ProviderIdSchema,
    safeDisplayName: SafeDisplayNameSchema,
    kind: z.enum(["country", "region", "city"]),
  })
  .strict();

export const MetaApprovedTargetingSchema = z
  .object({
    includedGeographies: z.array(MetaGeoTargetSchema).min(1).max(50),
    excludedGeographies: z.array(MetaGeoTargetSchema).max(50),
    placements: z
      .array(z.enum(["facebook_feed", "facebook_story", "instagram_feed", "instagram_story"]))
      .min(1)
      .max(4),
  })
  .strict();

export const MetaBudgetBoundsSchema = z
  .object({
    tenantDailyMinimumMinor: z.number().int().positive(),
    tenantDailyMaximumMinor: z.number().int().positive(),
    platformDailyMinimumMinor: z.number().int().positive(),
    platformDailyMaximumMinor: z.number().int().positive(),
    tenantTotalMaximumMinor: z.number().int().positive(),
    minimumDurationDays: z.number().int().positive(),
    maximumDurationDays: z.number().int().positive(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.tenantDailyMinimumMinor > value.tenantDailyMaximumMinor) {
      context.addIssue({ code: "custom", message: "Tenant daily budget bounds are inverted." });
    }
    if (value.platformDailyMinimumMinor > value.platformDailyMaximumMinor) {
      context.addIssue({ code: "custom", message: "Platform daily budget bounds are inverted." });
    }
    if (value.minimumDurationDays > value.maximumDurationDays) {
      context.addIssue({ code: "custom", message: "Duration bounds are inverted." });
    }
  });

export const MetaCampaignBudgetSchema = z
  .object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    dailyBudgetMinor: z.number().int().positive(),
    startsAt: IsoDateTimeSchema,
    endsAt: IsoDateTimeSchema,
  })
  .strict();

export function validateMetaBudget(
  budgetInput: z.input<typeof MetaCampaignBudgetSchema>,
  boundsInput: z.input<typeof MetaBudgetBoundsSchema>,
): Readonly<{
  budget: z.infer<typeof MetaCampaignBudgetSchema>;
  durationDays: number;
  projectedTotalMinor: number;
}> {
  const budget = MetaCampaignBudgetSchema.parse(budgetInput);
  const bounds = MetaBudgetBoundsSchema.parse(boundsInput);
  const startsAt = Date.parse(budget.startsAt);
  const endsAt = Date.parse(budget.endsAt);
  if (endsAt <= startsAt) throw new Error("Meta campaign end must be after its start.");
  const durationDays = Math.ceil((endsAt - startsAt) / 86_400_000);
  const dailyMinimum = Math.max(bounds.tenantDailyMinimumMinor, bounds.platformDailyMinimumMinor);
  const dailyMaximum = Math.min(bounds.tenantDailyMaximumMinor, bounds.platformDailyMaximumMinor);
  if (dailyMinimum > dailyMaximum) {
    throw new Error("Tenant and platform daily budget bounds do not overlap.");
  }
  if (budget.dailyBudgetMinor < dailyMinimum || budget.dailyBudgetMinor > dailyMaximum) {
    throw new Error("Meta daily budget is outside the configured tenant and platform bounds.");
  }
  if (durationDays < bounds.minimumDurationDays || durationDays > bounds.maximumDurationDays) {
    throw new Error("Meta campaign duration is outside the configured bounds.");
  }
  const projectedTotalMinor = budget.dailyBudgetMinor * durationDays;
  if (projectedTotalMinor > bounds.tenantTotalMaximumMinor) {
    throw new Error("Meta projected total exceeds the configured tenant cap.");
  }
  return Object.freeze({ budget, durationDays, projectedTotalMinor });
}

const MetaCreativeSchema = z
  .object({
    creativeRef: SafeReferenceSchema,
    headline: z.string().trim().min(1).max(255),
    primaryText: z.string().trim().min(1).max(2_000),
    description: z.string().trim().max(500),
  })
  .strict();

export const MetaDraftInputSchema = z
  .object({
    locationRef: SafeReferenceSchema,
    campaignVersionRef: SafeReferenceSchema,
    revision: z.number().int().positive(),
    manifestHash: SafeHashSchema,
    frozen: z.literal(true),
    campaignName: SafeDisplayNameSchema,
    category: MetaSpecialCategoryFixtureSchema,
    assetSelection: MetaAssetSelectionSchema,
    targeting: MetaApprovedTargetingSchema,
    budget: MetaCampaignBudgetSchema,
    bounds: MetaBudgetBoundsSchema,
    creative: MetaCreativeSchema,
  })
  .strict();

export const MetaNormalizedReadBackSchema = z
  .object({
    campaignVersionRef: SafeReferenceSchema,
    revision: z.number().int().positive(),
    campaignName: SafeDisplayNameSchema,
    categoryValues: z.array(ConfiguredCategoryValueSchema),
    adAccountId: ProviderIdSchema,
    facebookPageId: ProviderIdSchema,
    instagramAccountId: ProviderIdSchema.nullable(),
    leadFormId: ProviderIdSchema.nullable(),
    pixelId: ProviderIdSchema.nullable(),
    includedGeoIds: z.array(ProviderIdSchema),
    excludedGeoIds: z.array(ProviderIdSchema),
    placements: z.array(z.string()),
    currency: z.string().regex(/^[A-Z]{3}$/),
    dailyBudgetMinor: z.number().int().positive(),
    startsAt: IsoDateTimeSchema,
    endsAt: IsoDateTimeSchema,
    creativeRef: SafeReferenceSchema,
  })
  .strict();

function hashMetaValue(value: unknown): `sha256:${string}` {
  const canonical = JSON.stringify(canonicalizeJson(value));
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function compileFrozenMetaDraft(input: z.input<typeof MetaDraftInputSchema>) {
  const draft = MetaDraftInputSchema.parse(input);
  const validatedBudget = validateMetaBudget(draft.budget, draft.bounds);
  const expectedReadBack = MetaNormalizedReadBackSchema.parse({
    campaignVersionRef: draft.campaignVersionRef,
    revision: draft.revision,
    campaignName: draft.campaignName,
    categoryValues: draft.category.configuredValues,
    adAccountId: draft.assetSelection.adAccountId,
    facebookPageId: draft.assetSelection.facebookPageId,
    instagramAccountId: draft.assetSelection.instagramAccountId ?? null,
    leadFormId: draft.assetSelection.leadFormId ?? null,
    pixelId: draft.assetSelection.pixelId ?? null,
    includedGeoIds: draft.targeting.includedGeographies.map((geo) => geo.providerId),
    excludedGeoIds: draft.targeting.excludedGeographies.map((geo) => geo.providerId),
    placements: draft.targeting.placements,
    currency: draft.budget.currency,
    dailyBudgetMinor: draft.budget.dailyBudgetMinor,
    startsAt: draft.budget.startsAt,
    endsAt: draft.budget.endsAt,
    creativeRef: draft.creative.creativeRef,
  });
  const summary = {
    campaignName: draft.campaignName,
    campaignType: draft.category.campaignType,
    categoryEvidenceStatus: draft.category.evidenceStatus,
    assets: {
      adAccountId: draft.assetSelection.adAccountId,
      facebookPageId: draft.assetSelection.facebookPageId,
      instagramAccountId: draft.assetSelection.instagramAccountId ?? null,
      leadFormId: draft.assetSelection.leadFormId ?? null,
      pixelId: draft.assetSelection.pixelId ?? null,
    },
    includedGeographies: draft.targeting.includedGeographies,
    excludedGeographies: draft.targeting.excludedGeographies,
    placements: draft.targeting.placements,
    budget: {
      ...draft.budget,
      durationDays: validatedBudget.durationDays,
      projectedTotalMinor: validatedBudget.projectedTotalMinor,
    },
  };
  const commonFixturePayload = {
    locationRef: draft.locationRef,
    campaignVersionRef: draft.campaignVersionRef,
    revision: draft.revision,
    manifestHash: draft.manifestHash,
    expectedReadBack,
  };
  const operations = [
    {
      ...planMetaFixtureOperation({
        action: "upsert-campaign-draft",
        locationRef: draft.locationRef,
      }),
      fixturePayload: {
        ...commonFixturePayload,
        campaignName: draft.campaignName,
        configuredCategoryValues: draft.category.configuredValues,
      },
    },
    {
      ...planMetaFixtureOperation({
        action: "upsert-adset-draft",
        locationRef: draft.locationRef,
      }),
      fixturePayload: {
        ...commonFixturePayload,
        assetSelection: draft.assetSelection,
        targeting: draft.targeting,
        budget: draft.budget,
      },
    },
    {
      ...planMetaFixtureOperation({ action: "upsert-ad-draft", locationRef: draft.locationRef }),
      fixturePayload: { ...commonFixturePayload, creative: draft.creative },
    },
  ];
  const compiled = {
    schemaVersion: 1 as const,
    fixtureOnly: true as const,
    providerContractEvidence: "REQUIRES_HIGHLEVEL_APP_TEST" as const,
    locationRef: draft.locationRef,
    campaignVersionRef: draft.campaignVersionRef,
    revision: draft.revision,
    manifestHash: draft.manifestHash,
    expectedReadBack,
    summary,
    operations,
  };
  return deepFreeze({ ...compiled, compiledHash: hashMetaValue(compiled) });
}

function collectDifferences(expected: unknown, actual: unknown, path: string): string[] {
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) return [path];
    return expected.flatMap((entry, index) =>
      collectDifferences(entry, actual[index], `${path}[${index}]`),
    );
  }
  if (
    expected !== null &&
    actual !== null &&
    typeof expected === "object" &&
    typeof actual === "object" &&
    !Array.isArray(expected) &&
    !Array.isArray(actual)
  ) {
    return Object.keys(expected).flatMap((key) =>
      collectDifferences(
        (expected as Record<string, unknown>)[key],
        (actual as Record<string, unknown>)[key],
        `${path}.${key}`,
      ),
    );
  }
  return Object.is(expected, actual) ? [] : [path];
}

export function compareMetaDraftReadBack(
  compiled: ReturnType<typeof compileFrozenMetaDraft>,
  readBackInput: unknown,
): Readonly<{ matches: boolean; differingFields: readonly string[]; readBackHash: string }> {
  const readBack = MetaNormalizedReadBackSchema.parse(readBackInput);
  const differingFields = collectDifferences(compiled.expectedReadBack, readBack, "$readBack");
  return Object.freeze({
    matches: differingFields.length === 0,
    differingFields: Object.freeze(differingFields),
    readBackHash: hashMetaValue(readBack),
  });
}

export class MetaReadBackMismatchError extends Error {
  public readonly differingFields: readonly string[];

  public constructor(differingFields: readonly string[]) {
    super("Meta draft read-back differs from the approved frozen version.");
    this.name = "MetaReadBackMismatchError";
    this.differingFields = Object.freeze([...differingFields]);
  }
}

export function assertMetaDraftReadBackMatches(
  compiled: ReturnType<typeof compileFrozenMetaDraft>,
  readBackInput: unknown,
): void {
  const comparison = compareMetaDraftReadBack(compiled, readBackInput);
  if (!comparison.matches) throw new MetaReadBackMismatchError(comparison.differingFields);
}

export function evaluateMetaMaterialChange(input: {
  readonly previousCompiledHash: string;
  readonly nextCompiledHash: string;
  readonly previousCampaignVersionRef: string;
  readonly nextCampaignVersionRef: string;
}): Readonly<{ materialChange: boolean; requiresNewApproval: boolean }> {
  const previousCompiledHash = SafeHashSchema.parse(input.previousCompiledHash);
  const nextCompiledHash = SafeHashSchema.parse(input.nextCompiledHash);
  const previousCampaignVersionRef = SafeReferenceSchema.parse(input.previousCampaignVersionRef);
  const nextCampaignVersionRef = SafeReferenceSchema.parse(input.nextCampaignVersionRef);
  if (previousCompiledHash === nextCompiledHash) {
    return Object.freeze({ materialChange: false, requiresNewApproval: false });
  }
  if (previousCampaignVersionRef === nextCampaignVersionRef) {
    throw new Error("A material Meta campaign change requires a new campaign version.");
  }
  return Object.freeze({ materialChange: true, requiresNewApproval: true });
}

const MetaProviderReferencesSchema = z
  .object({
    campaignId: ProviderIdSchema,
    adsetId: ProviderIdSchema,
    adId: ProviderIdSchema,
  })
  .strict();

type MetaProviderReferences = z.infer<typeof MetaProviderReferencesSchema>;
type MetaLedgerStatus = "reserved" | "uncertain" | "confirmed" | "failed" | "retry_allowed";

interface MetaLedgerRecord {
  readonly locationRef: string;
  readonly idempotencyKey: string;
  readonly requestHash: string;
  readonly action: "draft" | "publish" | "pause" | "resume";
  readonly status: MetaLedgerStatus;
  readonly providerReferences?: MetaProviderReferences;
}

export class MetaFixtureOperationLedger {
  readonly #records = new Map<string, MetaLedgerRecord>();

  public reserve(input: {
    readonly locationRef: string;
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly action: MetaLedgerRecord["action"];
  }): Readonly<MetaLedgerRecord & { duplicate: boolean }> {
    const locationRef = SafeReferenceSchema.parse(input.locationRef);
    const idempotencyKey = SafeReferenceSchema.parse(input.idempotencyKey);
    const requestHash = SafeHashSchema.parse(input.requestHash);
    const key = `${locationRef}:${idempotencyKey}`;
    const existing = this.#records.get(key);
    if (existing !== undefined) {
      if (existing.requestHash !== requestHash || existing.action !== input.action) {
        throw new Error("Meta idempotency key conflicts with a different fixture operation.");
      }
      return Object.freeze({ ...existing, duplicate: true });
    }
    const record: MetaLedgerRecord = {
      locationRef,
      idempotencyKey,
      requestHash,
      action: input.action,
      status: "reserved",
    };
    this.#records.set(key, record);
    return Object.freeze({ ...record, duplicate: false });
  }

  public markUncertain(locationRefInput: string, idempotencyKeyInput: string): void {
    this.#replace(locationRefInput, idempotencyKeyInput, "uncertain");
  }

  public markConfirmed(
    locationRefInput: string,
    idempotencyKeyInput: string,
    referencesInput: z.input<typeof MetaProviderReferencesSchema>,
  ): void {
    const references = MetaProviderReferencesSchema.parse(referencesInput);
    this.#replace(locationRefInput, idempotencyKeyInput, "confirmed", references);
  }

  public markFailed(locationRefInput: string, idempotencyKeyInput: string): void {
    this.#replace(locationRefInput, idempotencyKeyInput, "failed");
  }

  public reconcile(input: {
    readonly locationRef: string;
    readonly idempotencyKey: string;
    readonly outcome:
      | Readonly<{ kind: "absent" }>
      | Readonly<{ kind: "unresolved" }>
      | Readonly<{ kind: "confirmed"; providerReferences: MetaProviderReferences }>;
  }): MetaLedgerStatus {
    const current = this.#get(input.locationRef, input.idempotencyKey);
    if (current.status !== "uncertain") {
      throw new Error("Only uncertain Meta operations can be reconciled.");
    }
    if (input.outcome.kind === "confirmed") {
      this.markConfirmed(input.locationRef, input.idempotencyKey, input.outcome.providerReferences);
      return "confirmed";
    }
    if (input.outcome.kind === "absent") {
      this.#replace(input.locationRef, input.idempotencyKey, "retry_allowed");
      return "retry_allowed";
    }
    return "uncertain";
  }

  public canRetry(locationRefInput: string, idempotencyKeyInput: string): boolean {
    return this.#get(locationRefInput, idempotencyKeyInput).status === "retry_allowed";
  }

  public read(locationRefInput: string, idempotencyKeyInput: string): Readonly<MetaLedgerRecord> {
    return Object.freeze({ ...this.#get(locationRefInput, idempotencyKeyInput) });
  }

  #get(locationRefInput: string, idempotencyKeyInput: string): MetaLedgerRecord {
    const locationRef = SafeReferenceSchema.parse(locationRefInput);
    const idempotencyKey = SafeReferenceSchema.parse(idempotencyKeyInput);
    const record = this.#records.get(`${locationRef}:${idempotencyKey}`);
    if (record === undefined) throw new Error("Meta fixture operation was not reserved.");
    return record;
  }

  #replace(
    locationRefInput: string,
    idempotencyKeyInput: string,
    status: MetaLedgerStatus,
    providerReferences?: MetaProviderReferences,
  ): void {
    const current = this.#get(locationRefInput, idempotencyKeyInput);
    this.#records.set(`${current.locationRef}:${current.idempotencyKey}`, {
      ...current,
      status,
      ...(providerReferences === undefined ? {} : { providerReferences }),
    });
  }
}

export const MetaPublishAuthoritySchema = z
  .object({
    publisherRole: z.literal("publisher"),
    currentPreflightPassed: z.literal(true),
    currentApprovalPassed: z.literal(true),
    exactVersionMatch: z.literal(true),
    tokenHealth: z.literal("healthy"),
    connectedAssets: z.literal(true),
    externalCategoryEvidence: z.literal("confirmed"),
    finalSummaryConfirmed: z.literal(true),
    materialHashMatch: z.literal(true),
  })
  .strict();

export function assertMetaPublishAuthorized(input: unknown): void {
  MetaPublishAuthoritySchema.parse(input);
}

export const MetaPublishProgressSchema = z.enum([
  "drafting",
  "ready",
  "publishing",
  "live",
  "paused",
  "failed",
  "uncertain",
]);

export const MetaPublishEventSchema = z.enum([
  "draft_compiled",
  "publish_requested",
  "provider_confirmed_live",
  "provider_confirmed_paused",
  "provider_failed",
  "provider_uncertain",
  "pause_requested",
  "resume_requested",
]);

const progressTransitions: Readonly<Record<string, z.infer<typeof MetaPublishProgressSchema>>> = {
  "drafting:draft_compiled": "ready",
  "ready:publish_requested": "publishing",
  "publishing:provider_confirmed_live": "live",
  "publishing:provider_failed": "failed",
  "publishing:provider_uncertain": "uncertain",
  "live:pause_requested": "publishing",
  "publishing:provider_confirmed_paused": "paused",
  "paused:resume_requested": "publishing",
};

export function advanceMetaPublishProgress(
  stateInput: z.input<typeof MetaPublishProgressSchema>,
  eventInput: z.input<typeof MetaPublishEventSchema>,
): z.infer<typeof MetaPublishProgressSchema> {
  const state = MetaPublishProgressSchema.parse(stateInput);
  const event = MetaPublishEventSchema.parse(eventInput);
  const next = progressTransitions[`${state}:${event}`];
  if (next === undefined) throw new Error(`Invalid Meta publish transition: ${state}:${event}.`);
  return next;
}

export const MetaPublishingProgressResponseSchema = z
  .object({
    state: z.enum(["queued", "publishing", "live", "failed"]),
    completedSteps: z.number().int().nonnegative(),
    totalSteps: z.number().int().positive(),
    observedAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.completedSteps > value.totalSteps) {
      context.addIssue({ code: "custom", message: "Completed publish steps exceed total steps." });
    }
    if (value.state === "live" && value.completedSteps !== value.totalSteps) {
      context.addIssue({ code: "custom", message: "A live publish must complete every step." });
    }
  });

export function normalizeMetaPublishingProgress(input: unknown) {
  const progress = MetaPublishingProgressResponseSchema.parse(input);
  return Object.freeze({
    ...progress,
    terminal: progress.state === "live" || progress.state === "failed",
    nextAction: progress.state === "live" || progress.state === "failed" ? "stop_polling" : "poll",
  });
}

export const MetaSafeAttemptAuditSchema = z
  .object({
    schemaVersion: z.literal(1),
    occurredAt: IsoDateTimeSchema,
    locationRef: SafeReferenceSchema,
    actorRef: SafeReferenceSchema,
    approvalRef: SafeReferenceSchema,
    correlationId: SafeReferenceSchema,
    idempotencyKey: SafeReferenceSchema,
    requestHash: SafeHashSchema,
    providerOperation: MetaAllowedActionSchema,
    action: z.enum(["draft", "publish", "pause", "resume", "reconcile", "report"]),
    attempt: z.number().int().positive(),
    state: z.enum(["reserved", "uncertain", "confirmed", "failed", "retry_allowed"]),
    classification: z.enum([
      "fixture_planned",
      "provider_confirmed",
      "provider_uncertain",
      "provider_terminal",
      "reconciled_absent",
    ]),
    providerReferences: MetaProviderReferencesSchema.optional(),
  })
  .strict();

export function createSafeMetaAttemptAudit(
  input: z.input<typeof MetaSafeAttemptAuditSchema>,
): Readonly<z.infer<typeof MetaSafeAttemptAuditSchema>> {
  return Object.freeze(MetaSafeAttemptAuditSchema.parse(input));
}

export function planExplicitMetaStatusChange(input: {
  readonly action: "pause" | "resume";
  readonly locationRef: string;
  readonly campaignId: string;
  readonly currentState: "live" | "paused";
  readonly explicitConfirmation: boolean;
  readonly exactVersionMatch: boolean;
  readonly publisherAuthorized: boolean;
}) {
  if (!input.explicitConfirmation || !input.exactVersionMatch || !input.publisherAuthorized) {
    throw new Error("Meta status change requires explicit confirmation and current authority.");
  }
  if (input.action === "pause" && input.currentState !== "live") {
    throw new Error("Only a live Meta campaign can be paused.");
  }
  if (input.action === "resume" && input.currentState !== "paused") {
    throw new Error("Only a paused Meta campaign can be resumed.");
  }
  return planMetaFixtureOperation({
    action: input.action === "pause" ? "pause-campaign" : "resume-campaign",
    locationRef: input.locationRef,
    parameters: { campaignId: input.campaignId },
  });
}

export const MetaProviderReportingSchema = z
  .object({
    campaignId: ProviderIdSchema,
    status: z.enum(["draft", "publishing", "active", "paused", "failed", "unknown"]),
    spendMinor: z.number().int().nonnegative().nullable(),
    impressions: z.number().int().nonnegative().nullable(),
    clicks: z.number().int().nonnegative().nullable(),
    leads: z.number().int().nonnegative().nullable(),
    healthSignals: z.array(
      z.enum([
        "healthy",
        "learning",
        "limited_delivery",
        "payment_issue",
        "policy_review",
        "provider_unavailable",
      ]),
    ),
    observedAt: IsoDateTimeSchema.nullable(),
    lastSuccessfulSyncAt: IsoDateTimeSchema.nullable(),
  })
  .strict();

export function normalizeMetaReporting(
  input: unknown,
  options: Readonly<{ now: string; staleAfterMilliseconds: number }>,
) {
  const report = MetaProviderReportingSchema.parse(input);
  const now = Date.parse(IsoDateTimeSchema.parse(options.now));
  if (
    !Number.isSafeInteger(options.staleAfterMilliseconds) ||
    options.staleAfterMilliseconds <= 0
  ) {
    throw new Error("Meta reporting stale threshold must be a positive integer.");
  }
  const lastSync =
    report.lastSuccessfulSyncAt === null ? null : Date.parse(report.lastSuccessfulSyncAt);
  const freshness =
    lastSync === null
      ? "unavailable"
      : now - lastSync > options.staleAfterMilliseconds
        ? "delayed"
        : "fresh";
  const costPerLeadMinor =
    report.spendMinor !== null && report.leads !== null && report.leads > 0
      ? Math.round(report.spendMinor / report.leads)
      : null;

  return Object.freeze({
    campaignId: report.campaignId,
    status: report.status,
    metrics: Object.freeze({
      spendMinor: report.spendMinor,
      impressions: report.impressions,
      clicks: report.clicks,
      leads: report.leads,
      costPerLeadMinor,
    }),
    healthSignals: Object.freeze(report.healthSignals),
    freshness,
    observedAt: report.observedAt,
    lastSuccessfulSyncAt: report.lastSuccessfulSyncAt,
  });
}
