import {
  AttributionEventSchema,
  LeadRoutingCommandSchema,
  LeadRoutingResultSchema,
  PrivateLeadPayloadSchema,
  type AttributionEvent,
  type LeadRoutingCommand,
  type LeadRoutingResult,
  type PrivateLeadPayload,
} from "@oalo/contracts";

export const GHL_LEAD_ADAPTER_ALLOWLIST = Object.freeze([
  { operation: "search_contact", method: "GET", path: "/contacts/search" },
  { operation: "create_contact", method: "POST", path: "/contacts" },
  { operation: "update_contact", method: "PUT", path: "/contacts/{contactId}" },
  { operation: "apply_tag", method: "POST", path: "/contacts/{contactId}/tags" },
  { operation: "create_opportunity", method: "POST", path: "/opportunities" },
  { operation: "update_opportunity", method: "PUT", path: "/opportunities/{opportunityId}" },
  { operation: "read_contact_policy", method: "GET", path: "/contacts/{contactId}" },
  {
    operation: "enroll_workflow",
    method: "POST",
    path: "/workflows/{workflowId}/contacts/{contactId}",
  },
] as const);

export class GhlLeadRoutingError extends Error {
  public readonly classification:
    "contact_collision" | "provider_failure" | "stale_mapping" | "tenant_mismatch";

  public constructor(classification: GhlLeadRoutingError["classification"], message: string) {
    super(`GHL lead routing failed: ${message}`);
    this.name = "GhlLeadRoutingError";
    this.classification = classification;
  }
}

export interface GhlContactCandidate {
  readonly providerId: string;
  readonly normalizedEmail?: string;
  readonly normalizedPhone?: string;
}

export interface LeadRoutingProgress {
  readonly contactProviderId?: string;
  readonly contactUpdated: boolean;
  readonly tagApplied: boolean;
  readonly opportunityProviderId?: string;
  readonly ownerApplied: boolean;
  readonly workflowEnrollment?: LeadRoutingResult["workflowEnrollment"];
}

export interface GhlLeadProviderPort {
  reconcile(command: LeadRoutingCommand): Promise<LeadRoutingProgress>;
  findContacts(input: {
    readonly locationRef: string;
    readonly normalizedEmail?: string;
    readonly normalizedPhone?: string;
  }): Promise<readonly GhlContactCandidate[]>;
  createContact(input: {
    readonly locationRef: string;
    readonly payload: PrivateLeadPayload;
    readonly idempotencyRef: string;
    readonly synthetic: boolean;
  }): Promise<{ readonly providerId: string }>;
  updateContact(input: {
    readonly locationRef: string;
    readonly contactProviderId: string;
    readonly payload: PrivateLeadPayload;
    readonly idempotencyRef: string;
  }): Promise<void>;
  applyTag(input: {
    readonly locationRef: string;
    readonly contactProviderId: string;
    readonly tag: string;
    readonly attributionKey: string;
    readonly idempotencyRef: string;
  }): Promise<void>;
  createOrUpdateOpportunity(input: {
    readonly locationRef: string;
    readonly contactProviderId: string;
    readonly pipelineProviderId: string;
    readonly stageProviderId: string;
    readonly campaignRef: string;
    readonly idempotencyRef: string;
  }): Promise<{ readonly providerId: string }>;
  applyOwner(input: {
    readonly locationRef: string;
    readonly contactProviderId: string;
    readonly opportunityProviderId: string;
    readonly ownerProviderId: string;
    readonly idempotencyRef: string;
  }): Promise<void>;
  readContactPolicy(input: {
    readonly locationRef: string;
    readonly contactProviderId: string;
  }): Promise<{ readonly dnd: boolean; readonly workflowConsentAllowed: boolean }>;
  enrollWorkflow(input: {
    readonly locationRef: string;
    readonly contactProviderId: string;
    readonly workflowProviderId: string;
    readonly idempotencyRef: string;
  }): Promise<void>;
}

export interface LeadRoutingStatePort {
  load(commandRef: string): Promise<LeadRoutingProgress | undefined>;
  save(commandRef: string, progress: LeadRoutingProgress): Promise<void>;
  recordException(input: {
    readonly commandRef: string;
    readonly correlationRef: string;
    readonly encryptedPayloadRef: string;
    readonly classification: GhlLeadRoutingError["classification"];
  }): Promise<void>;
  finalize(result: LeadRoutingResult): Promise<LeadRoutingResult>;
  schedulePayloadDeletion(input: {
    readonly encryptedPayloadRef: string;
    readonly deleteAfter: string;
  }): Promise<void>;
}

export interface LeadWorkflowPolicyPort {
  mayEnroll(input: {
    readonly locationRef: string;
    readonly campaignRef: string;
    readonly consentChannels: readonly ("email" | "sms" | "phone")[];
  }): Promise<boolean>;
}

export interface LeadRoutingClockPort {
  now(): Date;
}

export interface LeadRoutingPorts {
  readonly provider: GhlLeadProviderPort;
  readonly state: LeadRoutingStatePort;
  readonly workflowPolicy: LeadWorkflowPolicyPort;
  readonly clock: LeadRoutingClockPort;
}

function mergeProgress(
  stored: LeadRoutingProgress | undefined,
  reconciled: LeadRoutingProgress,
): LeadRoutingProgress {
  return {
    ...(stored?.contactProviderId === undefined && reconciled.contactProviderId === undefined
      ? {}
      : { contactProviderId: stored?.contactProviderId ?? reconciled.contactProviderId }),
    contactUpdated: (stored?.contactUpdated ?? false) || reconciled.contactUpdated,
    tagApplied: (stored?.tagApplied ?? false) || reconciled.tagApplied,
    ...(stored?.opportunityProviderId === undefined &&
    reconciled.opportunityProviderId === undefined
      ? {}
      : {
          opportunityProviderId: stored?.opportunityProviderId ?? reconciled.opportunityProviderId,
        }),
    ownerApplied: (stored?.ownerApplied ?? false) || reconciled.ownerApplied,
    ...(stored?.workflowEnrollment === undefined && reconciled.workflowEnrollment === undefined
      ? {}
      : {
          workflowEnrollment: stored?.workflowEnrollment ?? reconciled.workflowEnrollment,
        }),
  };
}

function findExactContact(
  payload: PrivateLeadPayload,
  candidates: readonly GhlContactCandidate[],
): GhlContactCandidate | undefined {
  const matching = candidates.filter((candidate) => {
    const emailMatches =
      payload.normalizedEmail !== undefined &&
      candidate.normalizedEmail === payload.normalizedEmail;
    const phoneMatches =
      payload.normalizedPhone !== undefined &&
      candidate.normalizedPhone === payload.normalizedPhone;
    if (payload.normalizedEmail !== undefined && payload.normalizedPhone !== undefined) {
      return emailMatches && phoneMatches;
    }
    return emailMatches || phoneMatches;
  });
  if (matching.length > 1) {
    throw new GhlLeadRoutingError(
      "contact_collision",
      "multiple exact normalized contacts matched",
    );
  }
  return matching[0];
}

function idempotency(command: LeadRoutingCommand, step: string): string {
  return `${command.idempotencyRef}:${step}`;
}

function emptyProgress(): LeadRoutingProgress {
  return { contactUpdated: false, tagApplied: false, ownerApplied: false };
}

export async function routeLeadToGhl(
  unsafeCommand: LeadRoutingCommand,
  unsafePayload: PrivateLeadPayload,
  ports: LeadRoutingPorts,
  auditWindowEndsAt: Date,
): Promise<LeadRoutingResult> {
  const command = LeadRoutingCommandSchema.parse(unsafeCommand);
  const payload = PrivateLeadPayloadSchema.parse(unsafePayload);
  let progress = mergeProgress(
    await ports.state.load(command.commandRef),
    await ports.provider.reconcile(command),
  );
  await ports.state.save(command.commandRef, progress);

  try {
    let contactProviderId = progress.contactProviderId;
    if (contactProviderId === undefined) {
      const candidates = await ports.provider.findContacts({
        locationRef: command.locationRef,
        ...(payload.normalizedEmail === undefined
          ? {}
          : { normalizedEmail: payload.normalizedEmail }),
        ...(payload.normalizedPhone === undefined
          ? {}
          : { normalizedPhone: payload.normalizedPhone }),
      });
      const matched = findExactContact(payload, candidates);
      contactProviderId =
        matched?.providerId ??
        (
          await ports.provider.createContact({
            locationRef: command.locationRef,
            payload,
            idempotencyRef: idempotency(command, "contact-create"),
            synthetic: command.synthetic,
          })
        ).providerId;
      progress = { ...progress, contactProviderId };
      await ports.state.save(command.commandRef, progress);
    }

    if (!progress.contactUpdated) {
      await ports.provider.updateContact({
        locationRef: command.locationRef,
        contactProviderId,
        payload,
        idempotencyRef: idempotency(command, "contact-update"),
      });
      progress = { ...progress, contactUpdated: true };
      await ports.state.save(command.commandRef, progress);
    }
    if (!progress.tagApplied) {
      await ports.provider.applyTag({
        locationRef: command.locationRef,
        contactProviderId,
        tag: command.mappings.campaignTag,
        attributionKey: command.attributionKey,
        idempotencyRef: idempotency(command, "campaign-tag"),
      });
      progress = { ...progress, tagApplied: true };
      await ports.state.save(command.commandRef, progress);
    }

    let opportunityProviderId = progress.opportunityProviderId;
    if (opportunityProviderId === undefined) {
      opportunityProviderId = (
        await ports.provider.createOrUpdateOpportunity({
          locationRef: command.locationRef,
          contactProviderId,
          pipelineProviderId: command.mappings.pipelineProviderId,
          stageProviderId: command.mappings.stageProviderId,
          campaignRef: command.campaignRef,
          idempotencyRef: idempotency(command, "opportunity"),
        })
      ).providerId;
      progress = { ...progress, opportunityProviderId };
      await ports.state.save(command.commandRef, progress);
    }

    if (command.mappings.ownerProviderId !== undefined && !progress.ownerApplied) {
      await ports.provider.applyOwner({
        locationRef: command.locationRef,
        contactProviderId,
        opportunityProviderId,
        ownerProviderId: command.mappings.ownerProviderId,
        idempotencyRef: idempotency(command, "owner"),
      });
      progress = { ...progress, ownerApplied: true };
      await ports.state.save(command.commandRef, progress);
    }

    let workflowEnrollment = progress.workflowEnrollment;
    if (workflowEnrollment === undefined) {
      if (command.mappings.workflowProviderId === undefined) {
        workflowEnrollment = "skipped_not_configured";
      } else {
        const [contactPolicy, tenantAllowsWorkflow] = await Promise.all([
          ports.provider.readContactPolicy({
            locationRef: command.locationRef,
            contactProviderId,
          }),
          ports.workflowPolicy.mayEnroll({
            locationRef: command.locationRef,
            campaignRef: command.campaignRef,
            consentChannels: payload.consentChannels,
          }),
        ]);
        if (contactPolicy.dnd || !contactPolicy.workflowConsentAllowed) {
          workflowEnrollment = "skipped_dnd";
        } else if (!tenantAllowsWorkflow) {
          workflowEnrollment = "skipped_policy";
        } else {
          await ports.provider.enrollWorkflow({
            locationRef: command.locationRef,
            contactProviderId,
            workflowProviderId: command.mappings.workflowProviderId,
            idempotencyRef: idempotency(command, "workflow"),
          });
          workflowEnrollment = "enrolled";
        }
      }
      progress = { ...progress, workflowEnrollment };
      await ports.state.save(command.commandRef, progress);
    }

    const result = LeadRoutingResultSchema.parse({
      commandRef: command.commandRef,
      locationRef: command.locationRef,
      campaignRef: command.campaignRef,
      contactProviderId,
      opportunityProviderId,
      tagApplied: progress.tagApplied,
      ownerApplied: command.mappings.ownerProviderId === undefined ? true : progress.ownerApplied,
      workflowEnrollment,
      synthetic: command.synthetic,
      completedAt: ports.clock.now().toISOString(),
    });
    const finalized = await ports.state.finalize(result);
    await ports.state.schedulePayloadDeletion({
      encryptedPayloadRef: command.encryptedPayloadRef,
      deleteAfter: auditWindowEndsAt.toISOString(),
    });
    return finalized;
  } catch (error) {
    const classified =
      error instanceof GhlLeadRoutingError
        ? error
        : new GhlLeadRoutingError("provider_failure", "provider step did not complete");
    await ports.state.recordException({
      commandRef: command.commandRef,
      correlationRef: command.correlationRef,
      encryptedPayloadRef: command.encryptedPayloadRef,
      classification: classified.classification,
    });
    throw classified;
  }
}

export interface AttributionEventStorePort {
  hasSourceEvent(sourceEventRef: string): Promise<boolean>;
  assertCampaignLocation(input: {
    readonly locationRef: string;
    readonly campaignRef: string;
    readonly campaignVersionRef: string;
  }): Promise<void>;
  append(event: AttributionEvent): Promise<void>;
}

export interface GhlAttributionWebhookVerifierPort {
  verify(rawBody: Uint8Array, signature: string): Promise<unknown>;
}

export async function processAttributionWebhook(
  rawBody: Uint8Array,
  signature: string,
  verifier: GhlAttributionWebhookVerifierPort,
  store: AttributionEventStorePort,
): Promise<"recorded" | "duplicate"> {
  const event = AttributionEventSchema.parse(await verifier.verify(rawBody, signature));
  if (await store.hasSourceEvent(event.sourceEventRef)) return "duplicate";
  await store.assertCampaignLocation(event);
  await store.append(event);
  return "recorded";
}

export async function reconcileAttributionEvents(
  normalizedEvents: readonly AttributionEvent[],
  store: AttributionEventStorePort,
): Promise<number> {
  let appended = 0;
  for (const unsafeEvent of normalizedEvents) {
    const event = AttributionEventSchema.parse(unsafeEvent);
    if (await store.hasSourceEvent(event.sourceEventRef)) continue;
    await store.assertCampaignLocation(event);
    await store.append(event);
    appended += 1;
  }
  return appended;
}

export function verifySyntheticLeadPath(input: {
  readonly clearlyLabeled: boolean;
  readonly contactVerified: boolean;
  readonly tagVerified: boolean;
  readonly opportunityVerified: boolean;
  readonly ownerVerified: boolean;
  readonly workflowVerified: boolean;
  readonly notificationVerified: boolean;
  readonly excludedFromProductionMetrics: boolean;
}): { readonly passed: true } {
  if (!Object.values(input).every(Boolean)) {
    throw new GhlLeadRoutingError("provider_failure", "synthetic lead path is incomplete");
  }
  return { passed: true };
}

export function createEmptyLeadRoutingProgress(): LeadRoutingProgress {
  return emptyProgress();
}
