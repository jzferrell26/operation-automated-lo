import {
  CampaignLeadAuthoritySchema,
  ConsentReceiptSchema,
  LeadRoutingCommandSchema,
  LeadRoutingMappingsSchema,
  PrivateLeadPayloadSchema,
  PublicLeadSubmissionSchema,
  type CampaignLeadAuthority,
  type ConsentReceipt,
  type LeadRoutingCommand,
  type LeadRoutingMappings,
  type PrivateLeadPayload,
  type PublicLeadSubmission,
} from "@oalo/contracts";

export class LeadSubmissionRejectedError extends Error {
  public constructor(reason: string) {
    super(`Lead submission rejected: ${reason}`);
    this.name = "LeadSubmissionRejectedError";
  }
}

export interface ResolvedLeadCampaign {
  readonly authority: CampaignLeadAuthority;
  readonly mappings: LeadRoutingMappings;
  readonly attributionKey: string;
}

export interface LeadCampaignResolverPort {
  resolvePublishedCampaign(publicCampaignRef: string): Promise<ResolvedLeadCampaign | undefined>;
}

export interface LeadAbuseGuardPort {
  assertAllowed(input: {
    readonly locationRef: string;
    readonly campaignRef: string;
    readonly tenantRateLimitKey: string;
    readonly ipRateLimitKeyHash: string;
  }): Promise<void>;
}

export interface LeadSubmissionIdentityPort {
  next(prefix: "idempotency" | "correlation" | "receipt" | "command" | "payload"): string;
}

export interface LeadSubmissionClockPort {
  now(): Date;
}

export interface LeadSubmissionAcceptancePort {
  accept(input: {
    readonly serverIdempotencyRef: string;
    readonly correlationRef: string;
    readonly receiptRef: string;
    readonly commandRef: string;
    readonly encryptedPayloadRef: string;
    readonly submittedAt: string;
    readonly campaign: ResolvedLeadCampaign;
    readonly payload: PrivateLeadPayload;
    readonly disclosureHash: string;
    readonly destinations: readonly {
      readonly channel: "email" | "sms" | "phone";
      readonly normalizedValue: string;
    }[];
    readonly safeRequestMetadata: ConsentReceipt["safeRequestMetadata"];
  }): Promise<{
    readonly receipt: ConsentReceipt;
    readonly command: LeadRoutingCommand;
    readonly durableJobAccepted: true;
  }>;
}

export interface PublicLeadRequestMetadata {
  readonly tenantRateLimitKey: string;
  readonly ipRateLimitKeyHash: string;
  readonly ipRiskBucket: "low" | "medium" | "high";
  readonly userAgentFamily: string;
  readonly synthetic: boolean;
}

export interface LeadSubmissionPorts {
  readonly campaigns: LeadCampaignResolverPort;
  readonly abuse: LeadAbuseGuardPort;
  readonly identity: LeadSubmissionIdentityPort;
  readonly clock: LeadSubmissionClockPort;
  readonly acceptance: LeadSubmissionAcceptancePort;
}

export interface PublicLeadAcceptedResponse {
  readonly accepted: true;
  readonly receiptRef: string;
  readonly commandRef: string;
  readonly correlationRef: string;
}

export function normalizeLeadEmail(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase();
}

export function normalizeLeadPhone(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  const digits = trimmed.replaceAll(/\D/gu, "");
  if (trimmed.startsWith("+") && digits.length >= 7 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  throw new LeadSubmissionRejectedError("phone must be E.164 or a ten-digit North American number");
}

function channelsFor(submission: PublicLeadSubmission): Array<"email" | "sms" | "phone"> {
  return [
    ...(submission.consent.emailSelected ? (["email"] as const) : []),
    ...(submission.consent.smsSelected ? (["sms"] as const) : []),
    ...(submission.consent.phoneSelected ? (["phone"] as const) : []),
  ];
}

export async function acceptPublicLeadSubmission(
  publicCampaignRef: string,
  unsafeSubmission: unknown,
  metadata: PublicLeadRequestMetadata,
  ports: LeadSubmissionPorts,
): Promise<PublicLeadAcceptedResponse> {
  const submission = PublicLeadSubmissionSchema.parse(unsafeSubmission);
  const campaign = await ports.campaigns.resolvePublishedCampaign(publicCampaignRef);
  if (campaign === undefined) throw new LeadSubmissionRejectedError("campaign is unavailable");
  const authority = CampaignLeadAuthoritySchema.parse(campaign.authority);
  const mappings = LeadRoutingMappingsSchema.parse(campaign.mappings);
  if (authority.campaignRef !== publicCampaignRef) {
    throw new LeadSubmissionRejectedError("campaign resolver returned a mismatched campaign");
  }
  await ports.abuse.assertAllowed({
    locationRef: authority.locationRef,
    campaignRef: authority.campaignRef,
    tenantRateLimitKey: metadata.tenantRateLimitKey,
    ipRateLimitKeyHash: metadata.ipRateLimitKeyHash,
  });

  const normalizedEmail = normalizeLeadEmail(submission.email);
  const normalizedPhone = normalizeLeadPhone(submission.phone);
  const consentChannels = channelsFor(submission);
  const payload = PrivateLeadPayloadSchema.parse({
    givenName: submission.givenName,
    familyName: submission.familyName,
    ...(normalizedEmail === undefined ? {} : { normalizedEmail }),
    ...(normalizedPhone === undefined ? {} : { normalizedPhone }),
    consentChannels,
  });
  const destinations = consentChannels.map((channel) => ({
    channel,
    normalizedValue: channel === "email" ? normalizedEmail! : normalizedPhone!,
  }));

  const serverIdempotencyRef = ports.identity.next("idempotency");
  const correlationRef = ports.identity.next("correlation");
  const receiptRef = ports.identity.next("receipt");
  const commandRef = ports.identity.next("command");
  const encryptedPayloadRef = ports.identity.next("payload");
  const submittedAt = ports.clock.now().toISOString();
  const accepted = await ports.acceptance.accept({
    serverIdempotencyRef,
    correlationRef,
    receiptRef,
    commandRef,
    encryptedPayloadRef,
    submittedAt,
    campaign: { authority, mappings, attributionKey: campaign.attributionKey },
    payload,
    disclosureHash: submission.consent.disclosureHash,
    destinations,
    safeRequestMetadata: {
      ipRiskBucket: metadata.ipRiskBucket,
      userAgentFamily: metadata.userAgentFamily,
      synthetic: metadata.synthetic,
    },
  });
  const receipt = ConsentReceiptSchema.parse(accepted.receipt);
  const command = LeadRoutingCommandSchema.parse(accepted.command);
  const expectedAuthority = JSON.stringify([
    authority.locationRef,
    authority.locationRef,
    authority.campaignRef,
    encryptedPayloadRef,
  ]);
  const acceptedAuthority = JSON.stringify([
    receipt.locationRef,
    command.locationRef,
    command.campaignRef,
    command.encryptedPayloadRef,
  ]);
  if (acceptedAuthority !== expectedAuthority) {
    throw new LeadSubmissionRejectedError("durable acceptance did not preserve campaign authority");
  }
  return Object.freeze({ accepted: true, receiptRef, commandRef, correlationRef });
}

export function evaluateLeadPathLaunchGate(input: {
  readonly syntheticTestPassed: boolean;
  readonly authorizedException?: { readonly actorRef: string; readonly reason: string };
}): { readonly launchAllowed: boolean; readonly reason: "test_passed" | "authorized_exception" } {
  if (input.syntheticTestPassed) return { launchAllowed: true, reason: "test_passed" };
  if (
    input.authorizedException !== undefined &&
    input.authorizedException.actorRef.length >= 8 &&
    input.authorizedException.reason.trim().length > 0
  ) {
    return { launchAllowed: true, reason: "authorized_exception" };
  }
  throw new LeadSubmissionRejectedError(
    "lead path has not passed and no authorized exception exists",
  );
}
