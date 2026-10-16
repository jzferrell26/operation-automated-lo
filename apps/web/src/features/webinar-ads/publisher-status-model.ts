import {
  OpaqueReferenceSchema,
  WebinarPublisherStateSchema,
  WebinarPublisherStageSchema,
  WebinarPublisherActionSchema,
} from "@oalo/contracts";
import { z } from "zod";
import { getInternalJson } from "../http/internal-api.js";

/** Private owner DTO. No provider IDs, authentication provenance, media lease or raw failure. */
export const PublisherStatusSchema = z
  .object({
    operationRef: OpaqueReferenceSchema,
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    action: WebinarPublisherActionSchema,
    state: WebinarPublisherStateSchema,
    campaignState: WebinarPublisherStateSchema,
    stage: WebinarPublisherStageSchema,
    providerObservedAt: z.iso.datetime({ offset: true }).nullable(),
    checkedAt: z.iso.datetime({ offset: true }),
    accountLabel: z.string().min(1).max(300),
    pageLabel: z.string().min(1).max(300),
    destination: z.url().startsWith("https://"),
    headline: z.string().min(1).max(500),
    dailyBudgetMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    totalBudgetMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    totalSemantics: z.enum(["estimated_ceiling", "hard_cap"]),
    endsAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type PublisherStatus = z.infer<typeof PublisherStatusSchema>;

const STATES: Readonly<Record<PublisherStatus["state"], string>> = {
  reserved: "Command saved",
  drafting: "Preparing the provider draft",
  draft_ready: "Provider draft ready",
  publish_queued: "Publication queued",
  publishing: "Publishing",
  in_review: "Provider review pending",
  live: "Reported live",
  pause_pending: "Pause pending",
  paused: "Reported paused",
  resume_pending: "Resume pending",
  cancelled: "Command cancelled",
  blocked: "Action blocked",
  failed: "Action failed",
  uncertain: "Provider result unconfirmed",
};
export function publisherStatusLabel(
  state: PublisherStatus["state"],
  observedAt: string | null,
): string {
  if (observedAt === null && ["live", "paused", "in_review"].includes(state))
    return "Awaiting provider confirmation";
  return STATES[state];
}

export function webinarStatusReadPath(operationRef: string): string {
  return `/api/campaigns/webinar-ads/status/${encodeURIComponent(OpaqueReferenceSchema.parse(operationRef))}`;
}

export class PublisherStatusReadError extends Error {}

export async function loadPublisherStatus(operationRef: string): Promise<PublisherStatus> {
  const response = await getInternalJson(webinarStatusReadPath(operationRef));
  if (!response.ok)
    throw new PublisherStatusReadError(
      response.status === 401
        ? "Sign in again to read this campaign's status."
        : response.status === 404
          ? "This publishing operation is not available to this account."
          : "Publishing status is unavailable. Check again or contact support.",
    );
  const result = PublisherStatusSchema.parse(await response.json());
  if (result.operationRef !== operationRef) throw new Error("Mismatched publishing operation");
  return result;
}
