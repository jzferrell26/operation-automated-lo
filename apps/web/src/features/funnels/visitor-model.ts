import { z } from "zod";

export const FunnelVisitorSchema = z
  .object({
    requestId: z.uuid(),
    firstName: z.string().trim().min(1).max(100),
    email: z
      .email()
      .max(254)
      .transform((value) => value.trim().toLowerCase()),
    phone: z
      .string()
      .trim()
      .max(30)
      .refine(
        (value) =>
          value === "" ||
          (/^\+?[\d ()-]{7,30}$/u.test(value) &&
            value.replace(/\D/gu, "").length >= 7 &&
            value.replace(/\D/gu, "").length <= 15),
      ),
    goal: z.enum([
      "learn",
      "buy-soon",
      "buy-later",
      "first-home",
      "compare",
      "payment",
      "equity",
      "term",
      "guide",
    ]),
    consent: z.literal(true),
    website: z.string().max(0),
  })
  .strict();
export type FunnelVisitor = z.infer<typeof FunnelVisitorSchema>;
export interface FunnelCaptureResult {
  readonly accepted: true;
}
export type FunnelCapture = (visitor: FunnelVisitor) => Promise<FunnelCaptureResult>;
