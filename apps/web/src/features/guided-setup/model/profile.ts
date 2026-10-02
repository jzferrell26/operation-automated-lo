import { z } from "zod";

/**
 * The `setup_profile.v1` preference value: the small saved profile of a person's name, company,
 * licence number, and phone, and the Realtor fields kept for the rows saved before PRD-009.
 *
 * This is all that is left of the guided setup (PRD-009b D4). The walkthrough that collected it is
 * gone, its prefill of the old campaign draft is gone with it, and what reads the value now is the
 * Brand form, which starts from `displayName`, `company`, `nmlsNumber`, and `phone` when a person
 * has a profile and no saved brand (009B-AC-012). `POST /api/setup/profile` writes it.
 *
 * Every field is the user's own data: their name, their company, their licence number, their phone,
 * and the name of the Realtor they once ran an open house with. It is bounded, validated strictly on
 * write, never logged, and named in the retention, deletion, and export runbooks.
 */

export const SETUP_PROFILE_PREFERENCE_KEY = "setup_profile.v1";

const RequiredName = z.string().trim().min(1).max(120);
const OptionalName = z.string().trim().max(120).optional();
const OptionalShort = z.string().trim().max(40).optional();

export const SetupProfileSchema = z
  .object({
    displayName: RequiredName,
    company: z.string().trim().max(120),
    nmlsNumber: OptionalShort,
    phone: OptionalShort,
    realtorName: OptionalName,
    realtorBrokerage: OptionalName,
  })
  .strict();

export type SetupProfile = z.infer<typeof SetupProfileSchema>;

/** A stored value that no longer parses is treated as absent, so the Brand form starts empty. */
export function parseStoredProfile(value: unknown): SetupProfile | undefined {
  const parsed = SetupProfileSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
