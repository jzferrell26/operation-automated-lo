import { z } from "zod";

export const contractVersion = "2026-07-20" as const;

export const FixtureValidationRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    fixtureSet: z.literal("rendering-v1"),
  })
  .strict();

export type FixtureValidationRequest = z.infer<typeof FixtureValidationRequestSchema>;
