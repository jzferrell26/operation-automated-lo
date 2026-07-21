import { getFoundationSnapshot } from "@oalo/application";
import { FixtureValidationRequestSchema } from "@oalo/contracts";
import { z } from "zod";

const foundation = getFoundationSnapshot();

export const FixtureValidationResultSchema = z
  .object({
    fixtureSet: z.literal("rendering-v1"),
    schemaVersion: z.literal(1),
    phase: z.literal(foundation.phase),
    productionTrafficEnabled: z.literal(false),
    networkAccessRequired: z.literal(false),
  })
  .strict()
  .readonly();

export type FixtureValidationResult = z.infer<typeof FixtureValidationResultSchema>;

export function validateRenderFixturesCore(input: unknown): FixtureValidationResult {
  const request = FixtureValidationRequestSchema.parse(input);

  return FixtureValidationResultSchema.parse({
    fixtureSet: request.fixtureSet,
    schemaVersion: request.schemaVersion,
    phase: foundation.phase,
    productionTrafficEnabled: foundation.productionTrafficEnabled,
    networkAccessRequired: false,
  });
}
