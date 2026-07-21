import { z } from "zod";

const PhaseZeroEnvironmentSchema = z
  .object({
    OALO_ENVIRONMENT: z.enum(["local", "preview", "test"]).default("local"),
    OALO_PROVIDER_MODE: z.literal("stub").default("stub"),
    OALO_SYNTHETIC_DATA_ONLY: z.literal("true").default("true"),
    OALO_BUILD_COMMIT: z.string().trim().min(1).default("local"),
    OALO_BUILD_ID: z.string().trim().min(1).default("local"),
    TRIGGER_PROJECT_REF: z
      .string()
      .regex(/^proj_[a-zA-Z0-9_-]+$/u)
      .default("proj_phase0_fixture_only"),
  })
  .passthrough();

export function parsePhaseZeroEnvironment(input: unknown) {
  return PhaseZeroEnvironmentSchema.parse(input);
}
