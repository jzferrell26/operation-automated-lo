import { z } from "zod";

/**
 * PRD-009f D4. What is left of the local demo's setup record.
 *
 * The setup page, the welcome step, and the walkthrough are retired, so no screen reads this record
 * any more. The schema stays because the demo's saved state carries it and parses strictly: a
 * record a browser saved before the pages went must still open. `model.ts` is its one reader.
 */
export const setupStepIds = [
  "profile",
  "brand",
  "partner",
  "routing",
  "connections",
  "campaign",
  "review",
] as const;
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
