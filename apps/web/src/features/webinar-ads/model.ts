import { z } from "zod";

/** Authored preparation assets, deliberately incompatible with the approved ads catalog. */
export const WEBINAR_GOALS = {
  planning: "Make a buying plan",
  budget: "Understand the housing budget",
  credit: "Prepare credit questions",
  preapproval: "Understand preapproval",
  closing: "Know the path to closing",
} as const;
export const WebinarGoalSchema = z.enum(["planning", "budget", "credit", "preapproval", "closing"]);
export type WebinarGoal = z.infer<typeof WebinarGoalSchema>;
export const WebinarFormatSchema = z.enum(["live-webinar", "on-demand"]);
export type WebinarFormat = z.infer<typeof WebinarFormatSchema>;
const words = (max: number) =>
  z
    .string()
    .trim()
    .min(3)
    .max(max)
    .refine((value) => !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}<>]/u.test(value), "Use plain visible text.");
const art = z
  .object({
    path: z
      .string()
      .regex(/^\/webinar-ads\/webinar-[a-z]+(?:-[a-z]+)*\/v1\/(?:tall|square)\.png$/u),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  })
  .strict();
export const WebinarAdSchema = z
  .object({
    id: z.string().regex(/^webinar-[a-z]+(?:-[a-z]+)*$/u),
    version: z.literal(1),
    status: z.literal("pending-review"),
    name: words(60),
    goal: WebinarGoalSchema,
    learningConnection: words(300),
    headline: words(60),
    primaryText: words(300),
    art: z.object({ tall: art, square: art, alt: words(200) }).strict(),
  })
  .strict()
  .superRefine((entry, context) => {
    for (const shape of ["tall", "square"] as const) {
      if (entry.art[shape].path !== `/webinar-ads/${entry.id}/v1/${shape}.png`) {
        context.addIssue({
          code: "custom",
          path: ["art", shape, "path"],
          message: "Use this creative's derived art path.",
        });
      }
    }
  });
export type WebinarAd = z.infer<typeof WebinarAdSchema>;
export const WebinarPackSchema = z
  .array(WebinarAdSchema)
  .length(15)
  .superRefine((entries, context) => {
    if (new Set(entries.map((entry) => entry.id)).size !== entries.length) {
      context.addIssue({ code: "custom", message: "Creative identifiers must be unique." });
    }
  });
export function webinarEditorHref(format: WebinarFormat): string {
  return `/marketing/campaigns/funnels/${WebinarFormatSchema.parse(format)}`;
}
export function webinarReviewCopy(
  ad: WebinarAd,
  headline: string,
  primaryText: string,
  format: WebinarFormat,
): string {
  return [
    `${ad.name} | Pending owner and lender review`,
    `Webinar: ${format === "live-webinar" ? "Live" : "On-demand"}`,
    `Learning goal: ${WEBINAR_GOALS[ad.goal]}`,
    `Headline: ${headline}`,
    `Primary text: ${primaryText}`,
    "Artwork downloads are unbranded art only. Add the required advertiser identity and disclosures before any use.",
    "No webinar destination is bound. No approval, campaign save or publication has occurred.",
  ].join("\n\n");
}
