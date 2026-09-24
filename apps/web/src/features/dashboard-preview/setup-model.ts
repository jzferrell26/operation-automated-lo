import { z } from "zod";
import type { PreviewState } from "./model.js";

export const setupStepIds = [
  "profile",
  "brand",
  "partner",
  "routing",
  "connections",
  "campaign",
  "review",
] as const;
export type SetupStepId = (typeof setupStepIds)[number];
export const guideIds = [
  "overview",
  "profile",
  "partners",
  "pipeline",
  "campaign",
  "reports",
  "connections",
  "review",
] as const;
export type ProductGuideId = (typeof guideIds)[number];
export const productSetupSchema = z
  .object({
    version: z.literal(1),
    welcomeSeen: z.boolean(),
    status: z.enum(["not_started", "in_progress", "paused", "completed"]),
    step: z.enum(setupStepIds),
    profileSaved: z.boolean(),
    brandSaved: z.boolean(),
    routingSaved: z.boolean(),
    connectionsReviewed: z.boolean(),
    partnerId: z.string().max(100).nullable(),
    partnerSkipped: z.boolean(),
    campaignRef: z
      .string()
      .regex(/^campaign_[a-f0-9]{32}$/u)
      .nullable(),
    completedAt: z.iso.datetime().nullable(),
    guide: z
      .object({ id: z.enum(guideIds), index: z.number().int().min(0).max(12), paused: z.boolean() })
      .strict()
      .nullable(),
  })
  .strict();
export type ProductSetup = z.infer<typeof productSetupSchema>;
export function initialProductSetup(): ProductSetup {
  return {
    version: 1,
    welcomeSeen: false,
    status: "not_started",
    step: "profile",
    profileSaved: false,
    brandSaved: false,
    routingSaved: false,
    connectionsReviewed: false,
    partnerId: null,
    partnerSkipped: false,
    campaignRef: null,
    completedAt: null,
    guide: null,
  };
}
export function setupTasks(state: PreviewState) {
  const setup = state.setup;
  const campaign = state.campaigns.find((item) => item.campaignRef === setup.campaignRef);
  return [
    {
      id: "profile",
      label: "Your profile",
      detail: "Company, contact details, and market",
      complete:
        setup.profileSaved &&
        state.profile.name.trim().length >= 2 &&
        state.profile.company.trim().length >= 2,
    },
    {
      id: "brand",
      label: "Your brand",
      detail: "The voice behind your campaigns",
      complete: setup.brandSaved && state.profile.tagline.trim().length >= 2,
    },
    {
      id: "partner",
      label: "Realtor partner",
      detail: "Choose a partner or add one",
      complete: setup.partnerSkipped || state.partners.some((item) => item.id === setup.partnerId),
    },
    {
      id: "routing",
      label: "Lead routing",
      detail: "Where new conversations begin",
      complete: setup.routingSaved,
    },
    {
      id: "connections",
      label: "Your connections",
      detail: "Review what you'll connect for launch",
      complete: setup.connectionsReviewed,
    },
    {
      id: "campaign",
      label: "First campaign",
      detail: "Create a draft and pass the content checks",
      complete: campaign !== undefined && !campaign.blocking,
    },
    {
      id: "review",
      label: "Final review",
      detail: "Review and approve your demo campaign",
      complete: campaign !== undefined && !campaign.blocking && campaign.state === "approved",
    },
  ] as const;
}
export function setupCanFinish(state: PreviewState): boolean {
  return setupTasks(state).every((step) => step.complete);
}
export function guideForPath(path: string): ProductGuideId {
  if (path === "/marketing/campaigns/new") return "campaign";
  if (/^\/marketing\/campaigns\/campaign_[a-f0-9]{32}$/u.test(path)) return "review";
  if (path.startsWith("/partners")) return "partners";
  if (path.startsWith("/leads")) return "pipeline";
  if (path.startsWith("/reports")) return "reports";
  if (path === "/settings/connections") return "connections";
  if (path.startsWith("/settings") || path === "/brand") return "profile";
  return "overview";
}
