import { z } from "zod";
import {
  FunnelBrandSchema,
  FunnelFieldsSchema,
  FunnelKindSchema,
  type FunnelFields,
  type FunnelKind,
} from "./model.js";
import { salesContent } from "./sales-content.js";

export const FunnelSnapshotSchema = z
  .object({
    kind: FunnelKindSchema,
    fields: FunnelFieldsSchema,
    brand: FunnelBrandSchema,
  })
  .strict();
export type FunnelSnapshot = z.infer<typeof FunnelSnapshotSchema>;
export const PublishedFunnelSchema = z
  .object({
    id: z.uuid(),
    snapshot: FunnelSnapshotSchema,
    active: z.boolean(),
    sourceRevision: z.uuid(),
    createdAt: z.iso.datetime({ offset: true }),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type PublishedFunnel = z.infer<typeof PublishedFunnelSchema>;
export const FunnelPublicationSummarySchema = PublishedFunnelSchema.pick({
  id: true,
  active: true,
  sourceRevision: true,
  createdAt: true,
  expiresAt: true,
}).extend({ kind: FunnelKindSchema });
export type FunnelPublicationSummary = z.infer<typeof FunnelPublicationSummarySchema>;
export const PublishFunnelCommandSchema = z
  .object({
    kind: FunnelKindSchema,
    expectedRevision: z.uuid(),
    reviewed: z.literal(true),
  })
  .strict();
export const FunnelPublicationStateSchema = z
  .object({
    available: z.boolean(),
    publications: z.array(FunnelPublicationSummarySchema),
    message: z.string(),
    handoffConfigured: z.boolean(),
  })
  .strict();
export function publicationBlockers(
  kind: FunnelKind,
  fields: FunnelFields,
  now = Date.now(),
): string[] {
  const sales = salesContent(kind, fields),
    blockers: string[] = [];
  if (!sales.privacyUrl) blockers.push("Add your Privacy Policy link.");
  if ((fields.heroPhoto || fields.hostPhoto) && !fields.mediaPermissionConfirmed)
    blockers.push("Confirm permission to use your photos.");
  if (
    (sales.quoteText || sales.quoteName) &&
    (!sales.quoteText || !sales.quoteName || !sales.proofPermissionConfirmed)
  )
    blockers.push("Complete and confirm your real client quote, or remove it.");
  if (kind === "live-webinar") {
    if (!fields.eventStartsAt || Date.parse(fields.eventStartsAt) <= now)
      blockers.push("Set a future webinar date and time.");
    if (!fields.webinarUrl) blockers.push("Add the webinar joining link.");
  } else {
    if (!fields.bookingUrl) blockers.push("Add your booking calendar link.");
    if (kind === "on-demand" && !fields.videoUrl) blockers.push("Add the webinar recording link.");
    if (kind === "lead-magnet" && !fields.resourceUrl)
      blockers.push("Add the actual guide download link.");
  }
  return blockers;
}
/** Access-only URLs are never sent in the unauthenticated landing page's HTML/RSC data. */
export function landingSnapshot(snapshot: FunnelSnapshot): FunnelSnapshot {
  return {
    ...snapshot,
    fields: { ...snapshot.fields, videoUrl: "", webinarUrl: "", resourceUrl: "", bookingUrl: "" },
  };
}
export const PUBLIC_FUNNEL_PATH = "/f";
