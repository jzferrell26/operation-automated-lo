import { z } from "zod";
import { initialProductSetup, productSetupSchema } from "./setup-model.js";

export const PREVIEW_STORAGE_KEY = "oalo.dashboard-preview.v1";
export const leadStages = ["New", "Contacted", "Appointment", "Application", "Closed"] as const;
export const campaignCheckSchema = z
  .object({
    campaignRef: z.string().regex(/^campaign_[a-f0-9]{32}$/u),
    campaignVersionRef: z.string().max(120),
    detailHref: z.string().regex(/^\/marketing\/campaigns\/campaign_[a-f0-9]{32}$/u),
    manifestHash: z.string().max(128),
    preflightResultHash: z.string().max(128),
    state: z.enum(["awaiting_approval", "preflight_failed", "approved"]),
    blocking: z.boolean(),
    headline: z.string().min(3).max(500),
    propertyAddress: z.string().min(3).max(1000),
    realtorDisplayName: z.string().max(300),
    dailyBudgetMinor: z.number().int().nonnegative().max(100000),
    totalBudgetMinor: z.number().int().nonnegative().max(500000),
    specialAdCategory: z.literal("HOUSING"),
    persistenceKind: z.literal("browser"),
    providerPublicationAuthorized: z.literal(false),
    createdAt: z.iso.datetime(),
    findings: z
      .array(
        z.object({
          severity: z.enum(["blocking", "warning"]),
          ruleCode: z.string().max(200),
          description: z.string().max(2000),
          remediation: z.string().max(2000),
        }),
      )
      .max(100),
  })
  .strict()
  .refine(
    (record) => record.state !== "approved" || !record.blocking,
    "A blocked test campaign cannot be approved",
  );

const partnerSchema = z
  .object({
    id: z.string().max(100),
    name: z.string().trim().min(2).max(120),
    company: z.string().trim().min(2).max(160),
    email: z.union([z.literal(""), z.email().max(200)]),
  })
  .strict();
const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    company: z.string().trim().min(2).max(160),
    tagline: z.string().max(300),
    email: z.union([z.literal(""), z.email().max(200)]),
    region: z.string().max(120),
  })
  .strict();
export const previewStateSchema = z
  .object({
    version: z.literal(1),
    setup: productSetupSchema.default(initialProductSetup),
    campaigns: z.array(campaignCheckSchema).max(50),
    partners: z.array(partnerSchema).max(50),
    leadStages: z.record(z.string().regex(/^sample-lead-\d+$/u), z.enum(leadStages)),
    profile: profileSchema,
    routing: z
      .object({ stage: z.enum(leadStages), owner: z.enum(["Preview owner", "Unassigned"]) })
      .strict(),
  })
  .strict();

export type PreviewCampaign = z.infer<typeof campaignCheckSchema>;
export type PreviewState = z.infer<typeof previewStateSchema>;
export type PreviewPartner = z.infer<typeof partnerSchema>;

export function initialPreviewState(): PreviewState {
  return {
    version: 1,
    setup: initialProductSetup(),
    campaigns: [],
    leadStages: {},
    partners: [
      {
        id: "sample-partner-1",
        name: "Jordan Avery",
        company: "Northside Realty",
        email: "jordan@example.test",
      },
      {
        id: "sample-partner-2",
        name: "Taylor Reed",
        company: "Cedar Homes",
        email: "taylor@example.test",
      },
      {
        id: "sample-partner-3",
        name: "Casey Brooks",
        company: "Prairie Realty",
        email: "casey@example.test",
      },
    ],
    profile: {
      name: "Preview owner",
      company: "Prairie Home Lending",
      tagline: "A clear path to your next home.",
      email: "owner@example.test",
      region: "Dallas, TX",
    },
    routing: { stage: "New", owner: "Preview owner" },
  };
}

export const sampleLeads = [
  {
    id: "sample-lead-1",
    name: "Morgan Ellis",
    email: "morgan@example.test",
    source: "Cedar Street open house",
    partner: "Jordan Avery",
    stage: "New",
  },
  {
    id: "sample-lead-2",
    name: "Alex Rivera",
    email: "alex@example.test",
    source: "Cedar Street open house",
    partner: "Jordan Avery",
    stage: "Contacted",
  },
  {
    id: "sample-lead-3",
    name: "Jamie Parker",
    email: "jamie@example.test",
    source: "Partner referral",
    partner: "Taylor Reed",
    stage: "Appointment",
  },
  {
    id: "sample-lead-4",
    name: "Sam Quinn",
    email: "sam@example.test",
    source: "Partner referral",
    partner: "Casey Brooks",
    stage: "Application",
  },
  {
    id: "sample-lead-5",
    name: "Drew Lane",
    email: "drew@example.test",
    source: "Cedar Street open house",
    partner: "Jordan Avery",
    stage: "New",
  },
  {
    id: "sample-lead-6",
    name: "Riley Hayes",
    email: "riley@example.test",
    source: "Partner referral",
    partner: "Taylor Reed",
    stage: "Appointment",
  },
] as const;

export const previewPaths = {
  "/marketing": "marketing",
  "/marketing/property-sites": "property-sites",
  "/marketing/creative": "creative",
  "/marketing/ads": "ads",
  "/marketing/messaging": "messaging",
  "/marketing/blueprints": "blueprints",
  "/partners": "partners",
  "/leads": "leads",
  "/leads/pipeline": "pipeline",
  "/automations": "automations",
  "/marketplace": "marketplace",
  "/settings": "settings",
  "/settings/routing": "routing",
  "/settings/team": "team",
  "/settings/billing": "billing",
} as const;
export type PreviewView =
  | (typeof previewPaths)[keyof typeof previewPaths]
  | "overview"
  | "campaigns"
  | "reports"
  | "brand"
  | "onboarding"
  | "connections"
  | "account";

export const dollars = (minor: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);
