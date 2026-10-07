import { z } from "zod";

export const FunnelKindSchema = z.enum([
  "live-webinar",
  "on-demand",
  "buyer",
  "refinance",
  "lead-magnet",
]);
export type FunnelKind = z.infer<typeof FunnelKindSchema>;
export const FUNNEL_ROOT = "/marketing/campaigns/funnels";
export const FUNNEL_API = "/api/funnels";
export const FUNNEL_TEMPLATE_VERSION = "1.0.0";
const short = z.string().trim().max(150);
const paragraph = z.string().trim().max(1200);
export function safeDestination(value: string): boolean {
  if (value === "") return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      ![...value].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127) &&
      /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/iu.test(url.hostname) &&
      !/(?:^|\.)(?:localhost|local|internal|invalid|test|example)$/iu.test(url.hostname) &&
      !/^\d+(?:\.\d+)*$/u.test(url.hostname)
    );
  } catch {
    return false;
  }
}
export const DestinationSchema = z
  .string()
  .trim()
  .max(1500)
  .refine(safeDestination, "Use an HTTPS website address without sign-in credentials.");
export const FunnelPhotoSchema = z
  .object({
    dataUrl: z
      .string()
      .max(400000)
      .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/u),
    alt: z.string().trim().min(1).max(180),
  })
  .strict();
/** Additive content contract. Older saved v1 fields remain readable and are never overwritten. */
export const FunnelSalesSchema = z
  .object({
    headlineAccent: short.default(""),
    invitationVideoUrl: DestinationSchema.default(""),
    storyTitle: short.default(""),
    storyText: paragraph.default(""),
    problemTitle: short.default(""),
    problemOneTitle: short.default(""),
    problemOneText: paragraph.default(""),
    problemTwoTitle: short.default(""),
    problemTwoText: paragraph.default(""),
    problemThreeTitle: short.default(""),
    problemThreeText: paragraph.default(""),
    problemFourTitle: short.default(""),
    problemFourText: paragraph.default(""),
    solutionTitle: short.default(""),
    solutionText: paragraph.default(""),
    presenterRole: short.default(""),
    presenterCredentials: paragraph.default(""),
    formTitle: short.default(""),
    formNote: paragraph.default(""),
    quoteText: paragraph.default(""),
    quoteName: short.default(""),
    quoteContext: short.default(""),
    proofPermissionConfirmed: z.boolean().default(false),
    privacyUrl: DestinationSchema.default(""),
    termsUrl: DestinationSchema.default(""),
  })
  .strict();
export type FunnelSales = z.infer<typeof FunnelSalesSchema>;
export type FunnelSalesTextKey = Exclude<keyof FunnelSales, "proofPermissionConfirmed">;
export const FunnelFieldsSchema = z
  .object({
    eyebrow: short,
    headline: short.min(3),
    description: paragraph.min(3),
    cta: short.min(2).max(60),
    offerTitle: short.min(2),
    sectionTitle: short.min(2),
    finalTitle: short.min(2),
    finalText: paragraph,
    benefitOneTitle: short,
    benefitOneText: paragraph,
    benefitTwoTitle: short,
    benefitTwoText: paragraph,
    benefitThreeTitle: short,
    benefitThreeText: paragraph,
    hostBio: paragraph,
    faqOneQuestion: short,
    faqOneAnswer: paragraph,
    faqTwoQuestion: short,
    faqTwoAnswer: paragraph,
    faqThreeQuestion: short,
    faqThreeAnswer: paragraph,
    confirmationTitle: short.min(2),
    confirmationText: paragraph,
    bookingTitle: short.min(2),
    bookingText: paragraph,
    thanksTitle: short.min(2),
    thanksText: paragraph,
    videoUrl: DestinationSchema,
    bookingUrl: DestinationSchema,
    resourceUrl: DestinationSchema,
    webinarUrl: DestinationSchema,
    eventStartsAt: z.union([z.literal(""), z.iso.datetime({ offset: true })]),
    eventTimeZone: z
      .string()
      .max(64)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
          return true;
        } catch {
          return false;
        }
      }),
    eventDurationMinutes: z.number().int().min(15).max(240),
    heroPhoto: FunnelPhotoSchema.nullable(),
    hostPhoto: FunnelPhotoSchema.nullable(),
    mediaPermissionConfirmed: z.boolean(),
    sales: FunnelSalesSchema.optional(),
  })
  .strict();
export type FunnelFields = z.infer<typeof FunnelFieldsSchema>;
export type FunnelTextKey = {
  [K in keyof FunnelFields]: FunnelFields[K] extends string ? K : never;
}[keyof FunnelFields] &
  string;
export const FunnelBrandSchema = z
  .object({
    name: z.string().max(120),
    company: z.string().max(160),
    nmls: z.string().max(12),
    companyNmls: z.string().max(12),
    disclosure: z.string().max(2500),
    colorPresetId: z.string().max(32),
  })
  .strict();
export type FunnelBrand = z.infer<typeof FunnelBrandSchema>;
export const FunnelSaveSchema = z
  .object({
    kind: FunnelKindSchema,
    templateVersion: z.literal(FUNNEL_TEMPLATE_VERSION),
    fields: FunnelFieldsSchema,
    expectedRevision: z.uuid().nullable(),
    requestId: z.uuid(),
  })
  .strict();
export type FunnelSave = z.infer<typeof FunnelSaveSchema>;
export const FunnelDraftSchema = z
  .object({
    kind: FunnelKindSchema,
    templateVersion: z.literal(FUNNEL_TEMPLATE_VERSION),
    fields: FunnelFieldsSchema,
    revision: z.uuid(),
    savedAt: z.iso.datetime(),
    requestId: z.uuid(),
    requestHash: z.string().regex(/^[a-f0-9]{64}$/u),
    brand: FunnelBrandSchema,
    publicationAuthorized: z.literal(false),
  })
  .strict();
export type FunnelDraft = z.infer<typeof FunnelDraftSchema>;
export const FunnelSaveResponseSchema = z.object({ draft: FunnelDraftSchema }).strict();
export type FunnelStep = "landing" | "confirmation" | "watch" | "book" | "thanks";
export interface FunnelDefinition {
  readonly kind: FunnelKind;
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly steps: readonly Readonly<{ id: FunnelStep; label: string }>[];
  readonly defaults: FunnelFields;
}
export interface FunnelStudioContext {
  readonly canSave: boolean;
  readonly brandReady: boolean;
  readonly brand: FunnelBrand;
  readonly drafts: readonly FunnelDraft[];
  readonly synthetic: boolean;
}
