import { describe, expect, it, vi } from "vitest";

import {
  LeadSubmissionRejectedError,
  acceptPublicLeadSubmission,
  evaluateLeadPathLaunchGate,
  normalizeLeadEmail,
  normalizeLeadPhone,
  type LeadSubmissionAcceptancePort,
  type LeadSubmissionPorts,
  type ResolvedLeadCampaign,
} from "@oalo/application";
import type {
  AttributionEvent,
  ConsentReceipt,
  LeadRoutingCommand,
  LeadRoutingResult,
  PrivateLeadPayload,
  PublicLeadSubmission,
} from "@oalo/contracts";
import {
  GHL_LEAD_ADAPTER_ALLOWLIST,
  GHL_SYNTHETIC_LEAD_LABEL,
  GHL_SYNTHETIC_LEAD_TAG,
  GhlLeadRoutingError,
  createAuthorizedSyntheticLeadTestPlan,
  createEmptyLeadRoutingProgress,
  processAttributionWebhook,
  planLeadRoutingRetry,
  reconcileAttributionEvents,
  routeLeadToGhl,
  verifySyntheticLeadPath,
  type AttributionEventStorePort,
  type GhlLeadProviderPort,
  type LeadRoutingProgress,
  type LeadRoutingStatePort,
} from "../../../../packages/ghl/src/index.js";

const now = new Date("2026-07-21T19:00:00.000Z");
const sha = (value: string): string => value.codePointAt(0)!.toString(16).padStart(64, "0");

const resolvedCampaign: ResolvedLeadCampaign = {
  authority: {
    locationRef: "location_01TenantAlpha",
    campaignRef: "campaign_01OpenHouse",
    campaignVersionRef: "campaignversion_01Published",
    state: "published",
    approved: true,
    active: true,
    leadPathStatus: "passed",
  },
  mappings: {
    pipelineProviderId: "pipeline-provider-1",
    stageProviderId: "stage-provider-1",
    ownerProviderId: "owner-provider-1",
    workflowProviderId: "workflow-provider-1",
    campaignTag: "oalo:campaign:open-house-01",
  },
  attributionKey: "attribution_01OpenHouse",
};

function submission(overrides: Partial<PublicLeadSubmission> = {}): PublicLeadSubmission {
  return {
    givenName: "Jamie",
    familyName: "Taylor",
    email: " Jamie@Example.COM ",
    phone: "(312) 555-0199",
    consent: {
      disclosureHash: sha("disclosure"),
      disclosureVisible: true,
      initialCheckboxState: false,
      userInitiated: true,
      emailSelected: true,
      smsSelected: true,
      phoneSelected: false,
    },
    ...overrides,
  };
}

function acceptancePort(): LeadSubmissionAcceptancePort {
  return {
    accept: async (input) => {
      const destinations = input.destinations.map((destination, index) => ({
        channel: destination.channel,
        encryptedDestinationRef: `destination_${String(index + 1).padStart(2, "0")}Encrypted`,
      }));
      const receipt: ConsentReceipt = {
        receiptRef: input.receiptRef,
        locationRef: input.campaign.authority.locationRef,
        campaignRef: input.campaign.authority.campaignRef,
        campaignVersionRef: input.campaign.authority.campaignVersionRef,
        disclosureHash: input.disclosureHash,
        channels: input.payload.consentChannels,
        destinations,
        submittedAt: input.submittedAt,
        safeRequestMetadata: input.safeRequestMetadata,
      };
      const command: LeadRoutingCommand = {
        commandRef: input.commandRef,
        idempotencyRef: input.serverIdempotencyRef,
        correlationRef: input.correlationRef,
        locationRef: input.campaign.authority.locationRef,
        campaignRef: input.campaign.authority.campaignRef,
        campaignVersionRef: input.campaign.authority.campaignVersionRef,
        receiptRef: input.receiptRef,
        encryptedPayloadRef: input.encryptedPayloadRef,
        attributionKey: input.campaign.attributionKey,
        mappings: input.campaign.mappings,
        synthetic: input.safeRequestMetadata.synthetic,
      };
      return { receipt, command, durableJobAccepted: true };
    },
  };
}

function intakePorts(
  campaign: ResolvedLeadCampaign | null = resolvedCampaign,
): LeadSubmissionPorts & { accepted: LeadSubmissionAcceptancePort["accept"] } {
  let sequence = 0;
  const acceptance = acceptancePort();
  return {
    campaigns: { resolvePublishedCampaign: async () => campaign ?? undefined },
    abuse: { assertAllowed: async () => undefined },
    identity: {
      next: (prefix) => `${prefix}_${String(++sequence).padStart(8, "0")}`,
    },
    clock: { now: () => now },
    acceptance,
    accepted: acceptance.accept,
  };
}

const metadata = {
  tenantRateLimitKey: "tenant-rate-key",
  ipRateLimitKeyHash: sha("ip"),
  ipRiskBucket: "low" as const,
  userAgentFamily: "Chromium",
  synthetic: false,
};

function routingCommand(overrides: Partial<LeadRoutingCommand> = {}): LeadRoutingCommand {
  return {
    commandRef: "command_01RouteLead",
    idempotencyRef: "idempotency_01RouteLead",
    correlationRef: "correlation_01RouteLead",
    locationRef: "location_01TenantAlpha",
    campaignRef: "campaign_01OpenHouse",
    campaignVersionRef: "campaignversion_01Published",
    receiptRef: "receipt_01Consent",
    encryptedPayloadRef: "payload_01Encrypted",
    attributionKey: "attribution_01OpenHouse",
    mappings: resolvedCampaign.mappings,
    synthetic: false,
    ...overrides,
  };
}

const privatePayload: PrivateLeadPayload = {
  givenName: "Jamie",
  familyName: "Taylor",
  normalizedEmail: "jamie@example.com",
  normalizedPhone: "+13125550199",
  consentChannels: ["email", "sms"],
};

function provider(overrides: Partial<GhlLeadProviderPort> = {}): GhlLeadProviderPort {
  return {
    reconcile: vi.fn(async () => createEmptyLeadRoutingProgress()),
    findContacts: vi.fn(async () => []),
    createContact: vi.fn(async () => ({ providerId: "contact-provider-1" })),
    updateContact: vi.fn(async () => undefined),
    applyTag: vi.fn(async () => undefined),
    createOrUpdateOpportunity: vi.fn(async () => ({ providerId: "opportunity-provider-1" })),
    applyOwner: vi.fn(async () => undefined),
    readContactPolicy: vi.fn(async () => ({ dnd: false, workflowConsentAllowed: true })),
    enrollWorkflow: vi.fn(async () => undefined),
    ...overrides,
  };
}

function routingState(initial?: LeadRoutingProgress): {
  port: LeadRoutingStatePort;
  saved: LeadRoutingProgress[];
  exceptions: string[];
  finalized: LeadRoutingResult[];
  deletions: string[];
} {
  let current = initial;
  const saved: LeadRoutingProgress[] = [];
  const exceptions: string[] = [];
  const finalized: LeadRoutingResult[] = [];
  const deletions: string[] = [];
  return {
    port: {
      load: async () => current,
      save: async (_commandRef, progress) => {
        current = progress;
        saved.push(progress);
      },
      recordException: async ({ classification }) => void exceptions.push(classification),
      finalize: async (result) => {
        finalized.push(result);
        return result;
      },
      schedulePayloadDeletion: async ({ encryptedPayloadRef }) =>
        void deletions.push(encryptedPayloadRef),
    },
    saved,
    exceptions,
    finalized,
    deletions,
  };
}

function routePorts(
  ghlProvider: GhlLeadProviderPort,
  state: LeadRoutingStatePort,
  workflowAllowed = true,
) {
  return {
    provider: ghlProvider,
    state,
    workflowPolicy: { mayEnroll: async () => workflowAllowed },
    clock: { now: () => now },
    retry: { schedule: vi.fn(async () => undefined) },
  };
}

function attributionEvent(overrides: Partial<AttributionEvent> = {}): AttributionEvent {
  return {
    eventRef: "event_01Opportunity",
    sourceEventRef: "webhook_01Opportunity",
    locationRef: "location_01TenantAlpha",
    campaignRef: "campaign_01OpenHouse",
    campaignVersionRef: "campaignversion_01Published",
    contactProviderId: "contact-provider-1",
    opportunityProviderId: "opportunity-provider-1",
    milestone: "opportunity",
    provenance: "observed",
    observedAt: now.toISOString(),
    recordedAt: now.toISOString(),
    synthetic: false,
    ...overrides,
  };
}

function attributionStore() {
  const events: AttributionEvent[] = [];
  const sources = new Set<string>();
  const port: AttributionEventStorePort = {
    hasSourceEvent: async (source) => sources.has(source),
    assertCampaignLocation: async () => undefined,
    append: async (event) => {
      events.push(event);
      sources.add(event.sourceEventRef);
    },
  };
  return { port, events };
}

describe("public lead intake", () => {
  it("normalizes email and phone using the documented exact-match strategy", () => {
    expect(normalizeLeadEmail(undefined)).toBeUndefined();
    expect(normalizeLeadEmail(" Jamie@Example.COM ")).toBe("jamie@example.com");
    expect(normalizeLeadPhone(undefined)).toBeUndefined();
    expect(normalizeLeadPhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(normalizeLeadPhone("312-555-0199")).toBe("+13125550199");
    expect(normalizeLeadPhone("1-312-555-0199")).toBe("+13125550199");
    expect(() => normalizeLeadPhone("12345")).toThrow(LeadSubmissionRejectedError);
    expect(() => normalizeLeadPhone("2-312-555-0199")).toThrow(LeadSubmissionRejectedError);
  });

  it("accepts only after an authoritative campaign and durable job acceptance", async () => {
    const ports = intakePorts();
    const acceptanceSpy = vi.spyOn(ports.acceptance, "accept");
    const response = await acceptPublicLeadSubmission(
      "campaign_01OpenHouse",
      submission(),
      metadata,
      ports,
    );

    expect(response).toMatchObject({ accepted: true });
    const acceptedInput = acceptanceSpy.mock.calls[0]?.[0];
    expect(acceptedInput?.campaign.authority.locationRef).toBe("location_01TenantAlpha");
    expect(acceptedInput?.payload).toMatchObject({
      normalizedEmail: "jamie@example.com",
      normalizedPhone: "+13125550199",
    });
    expect(JSON.stringify(response)).not.toMatch(/jamie|312|email|phone/iu);
  });

  it("supports email-only and phone-only consent destinations", async () => {
    const emailPorts = intakePorts();
    const emailSpy = vi.spyOn(emailPorts.acceptance, "accept");
    await acceptPublicLeadSubmission(
      "campaign_01OpenHouse",
      submission({
        phone: undefined,
        consent: {
          ...submission().consent,
          smsSelected: false,
          phoneSelected: false,
        },
      }),
      metadata,
      emailPorts,
    );
    expect(emailSpy.mock.calls[0]?.[0].destinations).toEqual([
      { channel: "email", normalizedValue: "jamie@example.com" },
    ]);

    const phonePorts = intakePorts();
    const phoneSpy = vi.spyOn(phonePorts.acceptance, "accept");
    await acceptPublicLeadSubmission(
      "campaign_01OpenHouse",
      submission({
        email: undefined,
        consent: {
          ...submission().consent,
          emailSelected: false,
          smsSelected: false,
          phoneSelected: true,
        },
      }),
      metadata,
      phonePorts,
    );
    expect(phoneSpy.mock.calls[0]?.[0].destinations).toEqual([
      { channel: "phone", normalizedValue: "+13125550199" },
    ]);
  });

  it("rejects missing campaigns, resolver mismatches, invalid consent, and abuse", async () => {
    await expect(
      acceptPublicLeadSubmission("campaign_01OpenHouse", submission(), metadata, intakePorts(null)),
    ).rejects.toThrow("campaign is unavailable");
    await expect(
      acceptPublicLeadSubmission(
        "campaign_99Wrong",
        submission(),
        metadata,
        intakePorts(resolvedCampaign),
      ),
    ).rejects.toThrow("mismatched campaign");
    await expect(
      acceptPublicLeadSubmission(
        "campaign_01OpenHouse",
        { ...submission(), consent: { ...submission().consent, initialCheckboxState: true } },
        metadata,
        intakePorts(),
      ),
    ).rejects.toThrow();
    const blocked = intakePorts();
    blocked.abuse.assertAllowed = vi.fn().mockRejectedValue(new Error("rate limited"));
    await expect(
      acceptPublicLeadSubmission("campaign_01OpenHouse", submission(), metadata, blocked),
    ).rejects.toThrow("rate limited");
  });

  it("fails closed when durable acceptance does not preserve campaign authority", async () => {
    const ports = intakePorts();
    const base = acceptancePort();
    ports.acceptance.accept = async (input) => {
      const accepted = await base.accept(input);
      return {
        ...accepted,
        command: { ...accepted.command, locationRef: "location_02TenantBravo" },
      };
    };
    await expect(
      acceptPublicLeadSubmission("campaign_01OpenHouse", submission(), metadata, ports),
    ).rejects.toThrow("did not preserve campaign authority");
  });

  it("requires a passed lead test or an explicit authorized exception", () => {
    expect(evaluateLeadPathLaunchGate({ syntheticTestPassed: true })).toMatchObject({
      reason: "test_passed",
    });
    expect(
      evaluateLeadPathLaunchGate({
        syntheticTestPassed: false,
        authorizedException: { actorRef: "actor_01Admin", reason: "Controlled waiver" },
      }),
    ).toMatchObject({ reason: "authorized_exception" });
    expect(() =>
      evaluateLeadPathLaunchGate({
        syntheticTestPassed: false,
        authorizedException: { actorRef: "short", reason: "" },
      }),
    ).toThrow(LeadSubmissionRejectedError);
    expect(() =>
      evaluateLeadPathLaunchGate({
        syntheticTestPassed: false,
        authorizedException: { actorRef: "actor_01Admin", reason: "" },
      }),
    ).toThrow(LeadSubmissionRejectedError);
    expect(() => evaluateLeadPathLaunchGate({ syntheticTestPassed: false })).toThrow(
      LeadSubmissionRejectedError,
    );
  });
});

describe("fixture-only GHL lead routing", () => {
  it("exposes only the explicit non-messaging, non-delete operation allowlist", () => {
    expect(GHL_LEAD_ADAPTER_ALLOWLIST.every((route) => String(route.method) !== "DELETE")).toBe(
      true,
    );
    expect(JSON.stringify(GHL_LEAD_ADAPTER_ALLOWLIST)).not.toMatch(
      /sms|email|call|voicemail|delete/iu,
    );
  });

  it("creates or updates every configured object and schedules private-payload cleanup", async () => {
    const ghlProvider = provider();
    const state = routingState();
    const result = await routeLeadToGhl(
      routingCommand(),
      privatePayload,
      routePorts(ghlProvider, state.port),
      new Date("2026-08-20T19:00:00.000Z"),
    );

    expect(result).toMatchObject({
      contactProviderId: "contact-provider-1",
      opportunityProviderId: "opportunity-provider-1",
      tagApplied: true,
      ownerApplied: true,
      workflowEnrollment: "enrolled",
    });
    expect(ghlProvider.createContact).toHaveBeenCalledOnce();
    expect(ghlProvider.enrollWorkflow).toHaveBeenCalledOnce();
    expect(state.deletions).toEqual(["payload_01Encrypted"]);
    expect(Object.keys(result)).not.toContain("payload");
  });

  it("derives a synthetic test destination and tag from authoritative campaign identity", async () => {
    const resolveSyntheticLeadCampaign = vi.fn(async () => ({
      campaignRef: "campaign_01OpenHouse",
      campaignLocationRef: "location_01TenantAlpha",
      campaignTag: "oalo:campaign:open-house-01",
    }));
    const plan = await createAuthorizedSyntheticLeadTestPlan(
      {
        validatedActorRef: "actor_01Admin",
        validatedActorRole: "location_admin",
        validatedActorLocationRef: "location_01TenantAlpha",
        requestedCampaignRef: "campaign_01OpenHouse",
      },
      { resolveSyntheticLeadCampaign },
    );

    expect(plan).toEqual({
      actorRef: "actor_01Admin",
      actorRole: "location_admin",
      locationRef: "location_01TenantAlpha",
      campaignRef: "campaign_01OpenHouse",
      label: GHL_SYNTHETIC_LEAD_LABEL,
      tags: ["oalo:campaign:open-house-01", GHL_SYNTHETIC_LEAD_TAG],
      safeRequestMetadata: { synthetic: true },
      productionMetrics: "excluded",
      requiresLiveG5Evidence: true,
    });
    expect(resolveSyntheticLeadCampaign).toHaveBeenCalledWith({
      campaignRef: "campaign_01OpenHouse",
    });

    const callerOverride = {
      validatedActorRef: "actor_01Admin",
      validatedActorRole: "location_admin",
      validatedActorLocationRef: "location_01TenantAlpha",
      requestedCampaignRef: "campaign_01OpenHouse",
      locationRef: "location_99AttackerOverride",
      campaignTag: "oalo:campaign:attacker-override",
    } as unknown as Parameters<typeof createAuthorizedSyntheticLeadTestPlan>[0];
    await expect(
      createAuthorizedSyntheticLeadTestPlan(callerOverride, { resolveSyntheticLeadCampaign }),
    ).rejects.toThrow();
  });

  it("rejects a tenant-A actor requesting a tenant-B synthetic campaign", async () => {
    const resolveSyntheticLeadCampaign = vi.fn(async () => ({
      campaignRef: "campaign_02TenantBravo",
      campaignLocationRef: "location_02TenantBravo",
      campaignTag: "oalo:campaign:tenant-bravo",
    }));

    await expect(
      createAuthorizedSyntheticLeadTestPlan(
        {
          validatedActorRef: "actor_01Admin",
          validatedActorRole: "location_admin",
          validatedActorLocationRef: "location_01TenantAlpha",
          requestedCampaignRef: "campaign_02TenantBravo",
        },
        { resolveSyntheticLeadCampaign },
      ),
    ).rejects.toThrow("must match the campaign location");
    expect(resolveSyntheticLeadCampaign).toHaveBeenCalledWith({
      campaignRef: "campaign_02TenantBravo",
    });
  });

  it("applies a distinct idempotent test tag only for synthetic routing", async () => {
    const ghlProvider = provider();
    const state = routingState();

    await routeLeadToGhl(
      routingCommand({ synthetic: true }),
      privatePayload,
      routePorts(ghlProvider, state.port),
      now,
    );

    expect(ghlProvider.createContact).toHaveBeenCalledWith(
      expect.objectContaining({
        synthetic: true,
        syntheticLabel: GHL_SYNTHETIC_LEAD_LABEL,
      }),
    );
    expect(ghlProvider.applyTag).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tag: "oalo:campaign:open-house-01",
        idempotencyRef: "idempotency_01RouteLead:campaign-tag",
      }),
    );
    expect(ghlProvider.applyTag).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tag: GHL_SYNTHETIC_LEAD_TAG,
        idempotencyRef: "idempotency_01RouteLead:synthetic-test-tag",
      }),
    );
    expect(state.saved.at(-1)?.syntheticTagApplied).toBe(true);

    await routeLeadToGhl(
      routingCommand({ synthetic: true }),
      privatePayload,
      routePorts(ghlProvider, state.port),
      now,
    );
    expect(ghlProvider.createContact).toHaveBeenCalledOnce();
    expect(ghlProvider.applyTag).toHaveBeenCalledTimes(2);
  });

  it("uses a unique exact normalized contact and respects DND before workflow enrollment", async () => {
    const ghlProvider = provider({
      findContacts: vi.fn(async () => [
        {
          providerId: "contact-provider-existing",
          normalizedEmail: "jamie@example.com",
          normalizedPhone: "+13125550199",
        },
      ]),
      readContactPolicy: vi.fn(async () => ({ dnd: true, workflowConsentAllowed: false })),
    });
    const state = routingState();
    const result = await routeLeadToGhl(
      routingCommand(),
      privatePayload,
      routePorts(ghlProvider, state.port),
      now,
    );

    expect(result.contactProviderId).toBe("contact-provider-existing");
    expect(result.workflowEnrollment).toBe("skipped_dnd");
    expect(ghlProvider.createContact).not.toHaveBeenCalled();
    expect(ghlProvider.enrollWorkflow).not.toHaveBeenCalled();
  });

  it("reconciles partial work before retry and skips completed provider writes", async () => {
    const partial: LeadRoutingProgress = {
      contactProviderId: "contact-provider-existing",
      contactUpdated: true,
      tagApplied: true,
      opportunityProviderId: "opportunity-provider-existing",
      ownerApplied: true,
      workflowEnrollment: "skipped_policy",
    };
    const ghlProvider = provider({ reconcile: vi.fn(async () => partial) });
    const state = routingState();
    const result = await routeLeadToGhl(
      routingCommand(),
      privatePayload,
      routePorts(ghlProvider, state.port),
      now,
    );

    expect(result.opportunityProviderId).toBe("opportunity-provider-existing");
    expect(ghlProvider.findContacts).not.toHaveBeenCalled();
    expect(ghlProvider.updateContact).not.toHaveBeenCalled();
    expect(ghlProvider.applyTag).not.toHaveBeenCalled();
    expect(ghlProvider.createOrUpdateOpportunity).not.toHaveBeenCalled();
    expect(ghlProvider.applyOwner).not.toHaveBeenCalled();
    expect(ghlProvider.enrollWorkflow).not.toHaveBeenCalled();
  });

  it("records contact collisions and provider failures in the exception queue", async () => {
    const collisionProvider = provider({
      findContacts: vi.fn(async () => [
        {
          providerId: "contact-provider-1",
          normalizedEmail: "jamie@example.com",
          normalizedPhone: "+13125550199",
        },
        {
          providerId: "contact-provider-2",
          normalizedEmail: "jamie@example.com",
          normalizedPhone: "+13125550199",
        },
      ]),
    });
    const collisionState = routingState();
    const collisionPorts = routePorts(collisionProvider, collisionState.port);
    await expect(
      routeLeadToGhl(routingCommand(), privatePayload, collisionPorts, now),
    ).rejects.toMatchObject({ classification: "contact_collision" });
    expect(collisionState.exceptions).toEqual(["contact_collision"]);
    expect(collisionPorts.retry.schedule).not.toHaveBeenCalled();

    const failedState = routingState();
    const failedPorts = routePorts(
      provider({
        createContact: vi.fn().mockRejectedValue(new Error("secret upstream error")),
      }),
      failedState.port,
    );
    await expect(
      routeLeadToGhl(routingCommand(), privatePayload, failedPorts, now),
    ).rejects.toEqual(
      new GhlLeadRoutingError("provider_failure", "provider step did not complete"),
    );
    expect(failedState.exceptions).toEqual(["provider_failure"]);
    expect(failedPorts.retry.schedule).toHaveBeenCalledWith({
      commandRef: "command_01RouteLead",
      correlationRef: "correlation_01RouteLead",
      encryptedPayloadRef: "payload_01Encrypted",
      idempotencyRef: "idempotency_01RouteLead:retry:2",
      attempt: 2,
      maxAttempts: 5,
      runAt: "2026-07-21T19:00:05.000Z",
    });
  });

  it("classifies early state and reconcile failures inside the retry boundary", async () => {
    const loadFailureState = routingState();
    loadFailureState.port.load = vi.fn(async () => {
      throw new Error("state store unavailable");
    });
    const loadFailurePorts = routePorts(provider(), loadFailureState.port);
    await expect(
      routeLeadToGhl(routingCommand(), privatePayload, loadFailurePorts, now),
    ).rejects.toEqual(
      new GhlLeadRoutingError("provider_failure", "provider step did not complete"),
    );
    expect(loadFailureState.exceptions).toEqual(["provider_failure"]);
    expect(loadFailurePorts.retry.schedule).toHaveBeenCalled();

    const reconcileFailureState = routingState();
    const reconcileFailurePorts = routePorts(
      provider({
        reconcile: vi.fn(async () => {
          throw new Error("reconcile failed");
        }),
      }),
      reconcileFailureState.port,
    );
    await expect(
      routeLeadToGhl(routingCommand(), privatePayload, reconcileFailurePorts, now),
    ).rejects.toEqual(
      new GhlLeadRoutingError("provider_failure", "provider step did not complete"),
    );
    expect(reconcileFailureState.exceptions).toEqual(["provider_failure"]);
  });

  it("uses bounded retry scheduling and stops after the final provider attempt", async () => {
    expect(planLeadRoutingRetry(4, now)).toEqual({
      attempt: 5,
      maxAttempts: 5,
      runAt: "2026-07-21T19:00:40.000Z",
    });
    expect(() => planLeadRoutingRetry(0, now)).toThrow(RangeError);
    expect(() => planLeadRoutingRetry(5, now)).toThrow(RangeError);

    const finalState = routingState();
    const finalPorts = routePorts(
      provider({ createContact: vi.fn().mockRejectedValue(new Error("provider failed")) }),
      finalState.port,
    );
    await expect(
      routeLeadToGhl(routingCommand(), privatePayload, finalPorts, now, 5),
    ).rejects.toMatchObject({ classification: "provider_failure" });
    expect(finalPorts.retry.schedule).not.toHaveBeenCalled();
    expect(finalState.exceptions).toEqual(["provider_failure"]);
  });

  it("handles absent owner and workflow plus tenant workflow policy denial", async () => {
    const noOptionalState = routingState();
    const noOptional = await routeLeadToGhl(
      routingCommand({
        mappings: {
          pipelineProviderId: "pipeline-provider-1",
          stageProviderId: "stage-provider-1",
          campaignTag: "oalo:campaign:open-house-01",
        },
      }),
      { ...privatePayload, normalizedPhone: undefined },
      routePorts(provider(), noOptionalState.port),
      now,
    );
    expect(noOptional).toMatchObject({
      ownerApplied: true,
      workflowEnrollment: "skipped_not_configured",
    });

    const policyProvider = provider();
    const policyState = routingState();
    const policyResult = await routeLeadToGhl(
      routingCommand(),
      { ...privatePayload, normalizedEmail: undefined },
      routePorts(policyProvider, policyState.port, false),
      now,
    );
    expect(policyResult.workflowEnrollment).toBe("skipped_policy");
  });

  it("signature-verifies, deduplicates, and appends normalized attribution events", async () => {
    const store = attributionStore();
    const verifier = { verify: vi.fn(async () => attributionEvent()) };
    expect(
      await processAttributionWebhook(
        new Uint8Array([1, 2]),
        "fixture-signature",
        verifier,
        store.port,
      ),
    ).toBe("recorded");
    expect(
      await processAttributionWebhook(
        new Uint8Array([1, 2]),
        "fixture-signature",
        verifier,
        store.port,
      ),
    ).toBe("duplicate");
    const appended = await reconcileAttributionEvents(
      [
        attributionEvent(),
        attributionEvent({
          eventRef: "event_02Appointment",
          sourceEventRef: "reconcile_02Appointment",
          milestone: "appointment",
          provenance: "inferred",
        }),
        attributionEvent({
          eventRef: "event_03Funded",
          sourceEventRef: "manual_03Funded",
          milestone: "funded",
          provenance: "manually_confirmed",
        }),
      ],
      store.port,
    );
    expect(appended).toBe(2);
    expect(store.events.map((event) => event.provenance)).toEqual([
      "observed",
      "inferred",
      "manually_confirmed",
    ]);
  });

  it("requires the complete labeled synthetic path and metric exclusion", () => {
    expect(
      verifySyntheticLeadPath({
        clearlyLabeled: true,
        contactVerified: true,
        tagVerified: true,
        opportunityVerified: true,
        ownerVerified: true,
        workflowVerified: true,
        notificationVerified: true,
        excludedFromProductionMetrics: true,
      }),
    ).toEqual({ passed: true });
    expect(() =>
      verifySyntheticLeadPath({
        clearlyLabeled: true,
        contactVerified: true,
        tagVerified: true,
        opportunityVerified: true,
        ownerVerified: true,
        workflowVerified: true,
        notificationVerified: true,
        excludedFromProductionMetrics: false,
      }),
    ).toThrow(GhlLeadRoutingError);
  });
});
