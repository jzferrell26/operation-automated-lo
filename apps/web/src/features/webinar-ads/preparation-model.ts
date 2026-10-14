import {
  OpaqueReferenceSchema,
  WebinarAdCampaignManifestSchema,
  WebinarAdPreparationRequestSchema,
  WebinarDestinationSchema,
} from "@oalo/contracts";
import { z } from "zod";
import { getInternalJson, postInternalJson } from "../http/internal-api.js";

export const WEBINAR_PREPARATION_PATH = "/marketing/campaigns/webinar";
const band = z
  .object({
    name: z.string(),
    title: z.string(),
    company: z.string(),
    nmls: z.string(),
    companyNmls: z.string(),
    colorPresetId: z.string(),
    disclosureLine: z.string(),
  })
  .strict();
export const WebinarContextSchema = z
  .object({
    canPrepare: z.boolean(),
    brand: z.object({ saved: z.boolean(), band, leadFormWording: z.string() }).strict(),
    destinations: z.array(
      z
        .object({
          destination: WebinarDestinationSchema,
          title: z.string(),
          learningSummary: z.string().nullable(),
        })
        .strict(),
    ),
    providerEnabled: z.literal(false),
  })
  .strict();
export type WebinarContext = z.infer<typeof WebinarContextSchema>;
export type WebinarRequest = z.input<typeof WebinarAdPreparationRequestSchema>;
export const WebinarIncompleteSaveSchema = z.object({
  error: z.literal("WEBINAR_SAVE_INCOMPLETE"),
  incompleteSave: z.literal(true),
  campaignRef: OpaqueReferenceSchema,
  campaignVersionRef: OpaqueReferenceSchema,
});
export const WebinarSavedSchema = z
  .object({
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    manifestHash: z.string().regex(/^[a-f0-9]{64}$/u),
    preflightResultHash: z.string().regex(/^[a-f0-9]{64}$/u),
    rowVersion: z.number().int().nonnegative(),
    versionNo: z.number().int().positive(),
    state: z.string(),
    duplicate: z.boolean(),
    detailHref: z.string(),
    effectiveEndsAt: z.iso.datetime({ offset: true }),
    providerEnabled: z.literal(false),
  })
  .strict()
  .refine(
    (value) =>
      value.detailHref === `/marketing/campaigns/${value.campaignRef}` ||
      value.detailHref === `/marketing/campaigns/${value.campaignRef}/versions/${value.versionNo}`,
  );
export const WebinarReviewSchema = z
  .object({
    manifest: WebinarAdCampaignManifestSchema,
    current: z.union([
      z.object({ available: z.literal(true) }).strict(),
      z.object({ available: z.literal(false), error: z.string() }).strict(),
    ]),
    publication: z
      .object({ title: z.string(), learningSummary: z.string().nullable() })
      .strict()
      .nullable(),
    providerEnabled: z.literal(false),
    art: z.object({ tall: z.string(), square: z.string() }).strict(),
    effectiveEndsAt: z.iso.datetime({ offset: true }),
    incompleteSave: z.boolean(),
  })
  .strict();
export function webinarMoment(value: string): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value)) + " UTC"
  );
}
export function webinarRefusal(code: string | undefined): string {
  if (code?.includes("BRAND"))
    return "Complete your saved name, company, NMLS details and disclosure in Brand, then check availability again.";
  if (code?.includes("DESTINATION") || code?.includes("PUBLICATION"))
    return "This published webinar is unavailable or has changed. Open your funnels and choose an active publication before saving a new version.";
  if (code?.includes("SOURCE") || code?.includes("TEMPLATE"))
    return "This creative's source has changed or been withdrawn. Choose an available creative and save a new version.";
  if (code?.includes("RASTER"))
    return "The saved images could not be verified. Retry later or contact support before approving this version.";
  if (code?.includes("SCHEDULE"))
    return "Choose a future end date before this webinar closes, then save a new version.";
  if (code?.includes("CONFLICT"))
    return "The saved version or its source changed. Reload the campaign before preparing a new version.";
  if (code === "WEBINAR_INVALID")
    return "Check the words, published webinar, budget, dates and city or state. Use plain educational wording.";
  if (code?.includes("FORBIDDEN") || code?.includes("ROLE"))
    return "This loan-officer account cannot make this change. Contact support to check account access.";
  return "We could not verify this preparation. Retry the same save to find out whether it was recorded. Contact support if it remains unavailable.";
}
export async function loadWebinarContext(): Promise<WebinarContext> {
  const response = await getInternalJson("/api/campaigns/webinar-ads/context");
  const value: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(value);
    throw new Error(webinarRefusal(error.success ? error.data.error : undefined));
  }
  const context = WebinarContextSchema.safeParse(value);
  if (!context.success)
    throw new Error(
      "Your saved brand and webinar availability could not be verified. Retry or contact support.",
    );
  return context.data;
}
export const saveWebinarPreparation = (body: WebinarRequest) =>
  postInternalJson("/api/campaigns/webinar-ads", body);
export async function loadWebinarEdit(campaignRef: string, versionRef: string) {
  const path = `/api/campaigns/webinar-ads/${OpaqueReferenceSchema.parse(campaignRef)}/${OpaqueReferenceSchema.parse(versionRef)}`;
  const response = await getInternalJson(path);
  if (!response.ok)
    throw new Error(
      "The saved campaign could not be loaded. Return to Campaigns and open its latest version.",
    );
  const review = WebinarReviewSchema.safeParse(await response.json());
  if (!review.success)
    throw new Error(
      "This saved version could not be verified. Return to Campaigns or contact support.",
    );
  return review.data;
}
