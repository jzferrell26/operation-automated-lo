import { describe, expect, it } from "vitest";

import {
  META_ADAPTER_MODE,
  META_DELIVERY_SEMANTICS,
  META_ROUTE_ALLOWLIST,
  MetaApprovedTargetingSchema,
  MetaFixtureOperationLedger,
  MetaReadBackMismatchError,
  MetaSafeAttemptAuditSchema,
  advanceMetaPublishProgress,
  assertMetaDraftReadBackMatches,
  assertMetaPublishAuthorized,
  compareMetaDraftReadBack,
  compileFrozenMetaDraft,
  configureMetaSpecialCategoryFixture,
  createSafeMetaAttemptAudit,
  evaluateMetaMaterialChange,
  normalizeMetaReporting,
  normalizeMetaPublishingProgress,
  planExplicitMetaStatusChange,
  planMetaFixtureOperation,
  selectMetaAssets,
  validateMetaBudget,
} from "../../../../packages/ghl/src/meta-adapter.js";

const sha = (character: string) => `sha256:${character.repeat(64)}`;

const targeting = {
  includedGeographies: [
    { providerId: "geo_Austin", safeDisplayName: "Austin, Texas", kind: "city" as const },
  ],
  excludedGeographies: [
    { providerId: "geo_Dallas", safeDisplayName: "Dallas, Texas", kind: "city" as const },
  ],
  placements: ["facebook_feed", "instagram_feed"] as Array<
    "facebook_feed" | "facebook_story" | "instagram_feed" | "instagram_story"
  >,
};

const bounds = {
  tenantDailyMinimumMinor: 2_000,
  tenantDailyMaximumMinor: 10_000,
  platformDailyMinimumMinor: 1_000,
  platformDailyMaximumMinor: 20_000,
  tenantTotalMaximumMinor: 70_000,
  minimumDurationDays: 3,
  maximumDurationDays: 14,
};

const budget = {
  currency: "USD",
  dailyBudgetMinor: 5_000,
  startsAt: "2026-08-01T00:00:00.000Z",
  endsAt: "2026-08-08T00:00:00.000Z",
};

function category(campaignType: "property_only" | "mortgage_only" | "property_and_mortgage") {
  const values = {
    property_only: ["CONFIGURED_PROPERTY"],
    mortgage_only: ["CONFIGURED_MORTGAGE"],
    property_and_mortgage: ["CONFIGURED_PROPERTY", "CONFIGURED_MORTGAGE"],
  } as const;
  return configureMetaSpecialCategoryFixture({
    campaignType,
    configuredValues: values[campaignType],
  });
}

function draft(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    locationRef: "loc_MetaFixture",
    campaignVersionRef: "ver_Meta001",
    revision: 1,
    manifestHash: sha("a"),
    frozen: true as const,
    campaignName: "Austin Property Campaign",
    category: category("property_and_mortgage"),
    assetSelection: {
      adAccountId: "act_001",
      facebookPageId: "page_001",
      instagramAccountId: "ig_001",
      leadFormId: "form_001",
      pixelId: "pixel_001",
    },
    targeting,
    budget,
    bounds,
    creative: {
      creativeRef: "crt_Meta001",
      headline: "Explore financing options",
      primaryText: "Review available property financing paths.",
      description: "Fixture-only campaign creative.",
    },
    ...overrides,
  };
}

describe("PRD-001e fixture-only Meta adapter", () => {
  it("exposes the exact safe HighLevel route and method allowlist", () => {
    expect(META_ADAPTER_MODE).toBe("fixture-plan");
    expect(META_ROUTE_ALLOWLIST).toEqual({
      "get-integration": { method: "GET", route: "/ad-publishing/facebook/integration" },
      "get-pages": { method: "GET", route: "/ad-publishing/facebook/pages" },
      "get-instagram-accounts": {
        method: "GET",
        route: "/ad-publishing/facebook/page/:pageId/instagram",
      },
      "get-page-forms": {
        method: "GET",
        route: "/ad-publishing/facebook/page/:pageId/forms",
      },
      "get-ad-accounts": { method: "GET", route: "/ad-publishing/facebook/ad-accounts" },
      "get-pixels": { method: "GET", route: "/ad-publishing/facebook/pixels" },
      "get-campaign": {
        method: "GET",
        route: "/ad-publishing/facebook/campaign/:campaignId",
      },
      "get-publishing-progress": {
        method: "GET",
        route: "/ad-publishing/facebook/campaigns/:campaignId/publishing-progress",
      },
      "get-campaign-reporting": {
        method: "GET",
        route: "/ad-publishing/facebook/reporting/campaign/:campaignId",
      },
      "upsert-campaign-draft": { method: "PUT", route: "/ad-publishing/facebook/campaigns" },
      "upsert-adset-draft": { method: "PUT", route: "/ad-publishing/facebook/adsets" },
      "upsert-ad-draft": { method: "PUT", route: "/ad-publishing/facebook/ads-v2" },
      "publish-campaign": {
        method: "POST",
        route: "/ad-publishing/facebook/campaigns/:campaignId/publish",
      },
      "pause-campaign": {
        method: "POST",
        route: "/ad-publishing/facebook/campaigns/:campaignId/pause",
      },
      "resume-campaign": {
        method: "POST",
        route: "/ad-publishing/facebook/campaigns/:campaignId/resume",
      },
    });
    const descriptors = Object.values(META_ROUTE_ALLOWLIST);
    expect(descriptors.every(({ method }) => ["GET", "PUT", "POST"].includes(method))).toBe(true);
    expect(
      descriptors.every(
        ({ route }) =>
          !/(delete|duplicate|custom-audience|\/google\/|\/linkedin\/|reselling|subscription)/i.test(
            route,
          ),
      ),
    ).toBe(true);
    expect(() =>
      planMetaFixtureOperation({
        action: "delete-campaign" as never,
        locationRef: "loc_MetaFixture",
      }),
    ).toThrow();
  });

  it("plans parameterized fixture operations without network or credential material", () => {
    expect(
      planMetaFixtureOperation({
        action: "get-instagram-accounts",
        locationRef: "loc_MetaFixture",
        parameters: { pageId: "page_001" },
      }),
    ).toEqual({
      transport: "fixture-plan",
      documentationVersion: "v3",
      action: "get-instagram-accounts",
      locationRef: "loc_MetaFixture",
      method: "GET",
      route: "/ad-publishing/facebook/page/page_001/instagram",
    });
    expect(() =>
      planMetaFixtureOperation({
        action: "get-campaign",
        locationRef: "loc_MetaFixture",
      }),
    ).toThrow("campaignId");
  });

  it("selects only assets exposed for the location and returns actionable remediation", () => {
    const connection = {
      locationRef: "loc_MetaFixture",
      connectionState: "connected" as const,
      assets: [
        {
          kind: "ad_account" as const,
          providerId: "act_001",
          safeDisplayName: "Fixture Ad Account",
          availability: "available" as const,
        },
        {
          kind: "facebook_page" as const,
          providerId: "page_001",
          safeDisplayName: "Fixture Page",
          availability: "available" as const,
        },
        {
          kind: "lead_form" as const,
          providerId: "form_001",
          safeDisplayName: "Fixture Form",
          availability: "missing_permission" as const,
        },
      ],
    };
    expect(
      selectMetaAssets(connection, {
        adAccountId: "act_001",
        facebookPageId: "page_001",
      }),
    ).toMatchObject({ ok: true, remediations: [] });
    expect(
      selectMetaAssets(connection, {
        adAccountId: "act_001",
        facebookPageId: "page_001",
        leadFormId: "form_001",
        pixelId: "pixel_missing",
      }),
    ).toMatchObject({
      ok: false,
      remediations: [
        "Reconnect Meta and grant access to the selected asset.",
        "Select an available pixel exposed by HighLevel for this location.",
      ],
    });
    expect(
      selectMetaAssets(
        {
          ...connection,
          connectionState: "reconnect_required",
          assets: [
            ...connection.assets,
            {
              kind: "pixel",
              providerId: "pixel_disapproved",
              safeDisplayName: "Fixture Pixel",
              availability: "disapproved",
            },
          ],
        },
        {
          adAccountId: "act_001",
          facebookPageId: "page_001",
          pixelId: "pixel_disapproved",
        },
      ),
    ).toMatchObject({
      ok: false,
      connectionState: "reconnect_required",
      remediations: [
        "Reconnect the Meta integration for this HighLevel location.",
        "Choose an approved Meta asset or resolve its provider policy status.",
      ],
    });
  });

  it.each(["property_only", "mortgage_only", "property_and_mortgage"] as const)(
    "keeps the %s category variant distinct without claiming provider acceptance",
    (campaignType) => {
      const configured = category(campaignType);
      expect(configured.campaignType).toBe(campaignType);
      expect(configured.providerAcceptedValues).toBeNull();
      expect(configured.evidenceStatus).toBe("REQUIRES_HIGHLEVEL_APP_TEST");
    },
  );

  it("allows only approved geography and placement targeting fields", () => {
    expect(MetaApprovedTargetingSchema.parse(targeting)).toEqual(targeting);
    expect(() => MetaApprovedTargetingSchema.parse({ ...targeting, minimumAge: 21 })).toThrow();
    expect(() =>
      MetaApprovedTargetingSchema.parse({ ...targeting, postalCodes: ["78701"] }),
    ).toThrow();
    expect(() =>
      MetaApprovedTargetingSchema.parse({ ...targeting, customAudienceId: "aud_001" }),
    ).toThrow();
  });

  it("enforces the intersection of tenant and platform budget and duration bounds", () => {
    expect(validateMetaBudget(budget, bounds)).toMatchObject({
      durationDays: 7,
      projectedTotalMinor: 35_000,
    });
    expect(() => validateMetaBudget({ ...budget, dailyBudgetMinor: 500 }, bounds)).toThrow(
      "daily budget",
    );
    expect(() =>
      validateMetaBudget({ ...budget, endsAt: "2026-08-20T00:00:00.000Z" }, bounds),
    ).toThrow("duration");
    expect(() =>
      validateMetaBudget(budget, { ...bounds, tenantTotalMaximumMinor: 10_000 }),
    ).toThrow("tenant cap");
  });

  it("compiles a deterministic frozen draft, complete summary, and three draft operations", () => {
    const first = compileFrozenMetaDraft(draft());
    const second = compileFrozenMetaDraft(draft());
    expect(first.compiledHash).toBe(second.compiledHash);
    expect(first.fixtureOnly).toBe(true);
    expect(first.providerContractEvidence).toBe("REQUIRES_HIGHLEVEL_APP_TEST");
    expect(first.operations.map(({ action }) => action)).toEqual([
      "upsert-campaign-draft",
      "upsert-adset-draft",
      "upsert-ad-draft",
    ]);
    expect(first.summary).toMatchObject({
      includedGeographies: targeting.includedGeographies,
      excludedGeographies: targeting.excludedGeographies,
      placements: targeting.placements,
      budget: { durationDays: 7, projectedTotalMinor: 35_000 },
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.summary.budget)).toBe(true);
  });

  it("diffs strict normalized read-back and surfaces the mismatched fields", () => {
    const compiled = compileFrozenMetaDraft(draft());
    expect(compareMetaDraftReadBack(compiled, compiled.expectedReadBack)).toMatchObject({
      matches: true,
      differingFields: [],
    });
    expect(
      compareMetaDraftReadBack(compiled, {
        ...compiled.expectedReadBack,
        dailyBudgetMinor: 6_000,
        placements: ["facebook_story"],
      }),
    ).toMatchObject({
      matches: false,
      differingFields: ["$readBack.placements", "$readBack.dailyBudgetMinor"],
    });
    expect(() =>
      assertMetaDraftReadBackMatches(compiled, {
        ...compiled.expectedReadBack,
        dailyBudgetMinor: 6_000,
      }),
    ).toThrow(MetaReadBackMismatchError);
    expect(() => assertMetaDraftReadBackMatches(compiled, compiled.expectedReadBack)).not.toThrow();
  });

  it("requires a new immutable version and approval for every material change", () => {
    const original = compileFrozenMetaDraft(draft());
    const changed = compileFrozenMetaDraft(
      draft({
        campaignVersionRef: "ver_Meta002",
        revision: 2,
        campaignName: "Austin Property Campaign Revision Two",
      }),
    );
    expect(
      evaluateMetaMaterialChange({
        previousCompiledHash: original.compiledHash,
        nextCompiledHash: changed.compiledHash,
        previousCampaignVersionRef: original.campaignVersionRef,
        nextCampaignVersionRef: changed.campaignVersionRef,
      }),
    ).toEqual({ materialChange: true, requiresNewApproval: true });
    expect(() =>
      evaluateMetaMaterialChange({
        previousCompiledHash: original.compiledHash,
        nextCompiledHash: changed.compiledHash,
        previousCampaignVersionRef: original.campaignVersionRef,
        nextCampaignVersionRef: original.campaignVersionRef,
      }),
    ).toThrow("new campaign version");
  });

  it("reserves idempotency before work and rejects key reuse with another request", () => {
    const ledger = new MetaFixtureOperationLedger();
    const first = ledger.reserve({
      locationRef: "loc_MetaFixture",
      idempotencyKey: "idem_Meta001",
      requestHash: sha("b"),
      action: "draft",
    });
    const duplicate = ledger.reserve({
      locationRef: "loc_MetaFixture",
      idempotencyKey: "idem_Meta001",
      requestHash: sha("b"),
      action: "draft",
    });
    expect(first).toMatchObject({ status: "reserved", duplicate: false });
    expect(duplicate).toMatchObject({ status: "reserved", duplicate: true });
    expect(META_DELIVERY_SEMANTICS).toBe("at-least-once-with-idempotent-reconciliation");
    expect(() =>
      ledger.reserve({
        locationRef: "loc_MetaFixture",
        idempotencyKey: "idem_Meta001",
        requestHash: sha("c"),
        action: "draft",
      }),
    ).toThrow("conflicts");
  });

  it("requires reconciliation before retry and records provider IDs only after confirmation", () => {
    const ledger = new MetaFixtureOperationLedger();
    ledger.reserve({
      locationRef: "loc_MetaFixture",
      idempotencyKey: "idem_Meta002",
      requestHash: sha("d"),
      action: "publish",
    });
    ledger.markUncertain("loc_MetaFixture", "idem_Meta002");
    expect(ledger.canRetry("loc_MetaFixture", "idem_Meta002")).toBe(false);
    expect(ledger.read("loc_MetaFixture", "idem_Meta002").providerReferences).toBeUndefined();
    expect(
      ledger.reconcile({
        locationRef: "loc_MetaFixture",
        idempotencyKey: "idem_Meta002",
        outcome: { kind: "unresolved" },
      }),
    ).toBe("uncertain");
    expect(ledger.canRetry("loc_MetaFixture", "idem_Meta002")).toBe(false);
    expect(
      ledger.reconcile({
        locationRef: "loc_MetaFixture",
        idempotencyKey: "idem_Meta002",
        outcome: { kind: "absent" },
      }),
    ).toBe("retry_allowed");
    expect(ledger.canRetry("loc_MetaFixture", "idem_Meta002")).toBe(true);

    const confirmedLedger = new MetaFixtureOperationLedger();
    confirmedLedger.reserve({
      locationRef: "loc_MetaFixture",
      idempotencyKey: "idem_Meta003",
      requestHash: sha("e"),
      action: "publish",
    });
    confirmedLedger.markUncertain("loc_MetaFixture", "idem_Meta003");
    confirmedLedger.reconcile({
      locationRef: "loc_MetaFixture",
      idempotencyKey: "idem_Meta003",
      outcome: {
        kind: "confirmed",
        providerReferences: {
          campaignId: "cmp_provider001",
          adsetId: "set_provider001",
          adId: "ad_provider001",
        },
      },
    });
    expect(confirmedLedger.read("loc_MetaFixture", "idem_Meta003")).toMatchObject({
      status: "confirmed",
      providerReferences: { campaignId: "cmp_provider001" },
    });
  });

  it("gates publish on every authority fact and advances only valid durable states", () => {
    const authority = {
      publisherRole: "publisher",
      currentPreflightPassed: true,
      currentApprovalPassed: true,
      exactVersionMatch: true,
      tokenHealth: "healthy",
      connectedAssets: true,
      externalCategoryEvidence: "confirmed",
      finalSummaryConfirmed: true,
      materialHashMatch: true,
    } as const;
    expect(() => assertMetaPublishAuthorized(authority)).not.toThrow();
    expect(() =>
      assertMetaPublishAuthorized({ ...authority, finalSummaryConfirmed: false }),
    ).toThrow();
    let state = advanceMetaPublishProgress("drafting", "draft_compiled");
    state = advanceMetaPublishProgress(state, "publish_requested");
    state = advanceMetaPublishProgress(state, "provider_confirmed_live");
    expect(state).toBe("live");
    expect(() => advanceMetaPublishProgress("live", "publish_requested")).toThrow(
      "Invalid Meta publish transition",
    );
    expect(
      normalizeMetaPublishingProgress({
        state: "publishing",
        completedSteps: 2,
        totalSteps: 4,
        observedAt: "2026-08-01T00:00:00.000Z",
      }),
    ).toMatchObject({ terminal: false, nextAction: "poll" });
    expect(
      normalizeMetaPublishingProgress({
        state: "live",
        completedSteps: 4,
        totalSteps: 4,
        observedAt: "2026-08-01T00:01:00.000Z",
      }),
    ).toMatchObject({ terminal: true, nextAction: "stop_polling" });
  });

  it("creates minimal safe audit records and rejects secret or PII additions", () => {
    const input = {
      schemaVersion: 1 as const,
      occurredAt: "2026-08-01T01:00:00.000Z",
      locationRef: "loc_MetaFixture",
      actorRef: "usr_Publisher001",
      approvalRef: "apr_Meta001",
      correlationId: "corr_Meta001",
      idempotencyKey: "idem_Meta004",
      requestHash: sha("f"),
      providerOperation: "publish-campaign" as const,
      action: "publish" as const,
      attempt: 1,
      state: "confirmed" as const,
      classification: "provider_confirmed" as const,
      providerReferences: {
        campaignId: "cmp_provider001",
        adsetId: "set_provider001",
        adId: "ad_provider001",
      },
    };
    expect(createSafeMetaAttemptAudit(input)).toEqual(input);
    expect(() =>
      MetaSafeAttemptAuditSchema.parse({ ...input, accessToken: "fixture-secret" }),
    ).toThrow();
    expect(() =>
      MetaSafeAttemptAuditSchema.parse({ ...input, contactEmail: "person@example.test" }),
    ).toThrow();
  });

  it("requires explicit confirmation for pause and resume and has no delete status action", () => {
    expect(
      planExplicitMetaStatusChange({
        action: "pause",
        locationRef: "loc_MetaFixture",
        campaignId: "cmp_provider001",
        currentState: "live",
        explicitConfirmation: true,
        exactVersionMatch: true,
        publisherAuthorized: true,
      }),
    ).toMatchObject({ action: "pause-campaign", method: "POST" });
    expect(() =>
      planExplicitMetaStatusChange({
        action: "resume",
        locationRef: "loc_MetaFixture",
        campaignId: "cmp_provider001",
        currentState: "paused",
        explicitConfirmation: false,
        exactVersionMatch: true,
        publisherAuthorized: true,
      }),
    ).toThrow("explicit confirmation");
    expect(Object.keys(META_ROUTE_ALLOWLIST)).not.toContain("delete-campaign");
  });

  it("normalizes reporting freshness while preserving missing metrics as null", () => {
    const normalized = normalizeMetaReporting(
      {
        campaignId: "cmp_provider001",
        status: "active",
        spendMinor: null,
        impressions: null,
        clicks: null,
        leads: null,
        healthSignals: ["provider_unavailable"],
        observedAt: null,
        lastSuccessfulSyncAt: null,
      },
      { now: "2026-08-02T00:00:00.000Z", staleAfterMilliseconds: 3_600_000 },
    );
    expect(normalized.metrics).toEqual({
      spendMinor: null,
      impressions: null,
      clicks: null,
      leads: null,
      costPerLeadMinor: null,
    });
    expect(normalized.freshness).toBe("unavailable");

    expect(
      normalizeMetaReporting(
        {
          campaignId: "cmp_provider001",
          status: "paused",
          spendMinor: 12_000,
          impressions: 5_000,
          clicks: 200,
          leads: 4,
          healthSignals: ["limited_delivery"],
          observedAt: "2026-08-01T23:50:00.000Z",
          lastSuccessfulSyncAt: "2026-08-01T20:00:00.000Z",
        },
        { now: "2026-08-02T00:00:00.000Z", staleAfterMilliseconds: 3_600_000 },
      ),
    ).toMatchObject({
      freshness: "delayed",
      metrics: { costPerLeadMinor: 3_000 },
    });
  });
});
