import { z } from "zod";

export const SafeTenantReferenceSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,95}$/);

export const InstallationModeSchema = z.enum(["DIRECT", "AGENCY_BULK"]);
export const InstallationStatusSchema = z.enum(["ACTIVE", "UNINSTALLED"]);
export const ScopeProfileSchema = z.enum([
  "PROFILE_A_READ",
  "PROFILE_B_INSTALL",
  "PROFILE_C_ADS_PUBLISH",
]);
export const ProductCapabilitySchema = z.enum(["LOCATION_READ", "INSTALL_MANAGE", "ADS_PUBLISH"]);

export const InstallationActivationSchema = z
  .object({
    locationId: SafeTenantReferenceSchema,
    installationMode: InstallationModeSchema,
    grantedScopes: z.array(z.string().regex(/^[A-Za-z0-9./:_-]+$/)).max(64),
    scopeProfiles: z.array(ScopeProfileSchema).max(3),
  })
  .strict();

export type InstallationActivation = z.infer<typeof InstallationActivationSchema>;
export type InstallationMode = z.infer<typeof InstallationModeSchema>;
export type InstallationStatus = z.infer<typeof InstallationStatusSchema>;
export type ProductCapability = z.infer<typeof ProductCapabilitySchema>;
export type ScopeProfile = z.infer<typeof ScopeProfileSchema>;

export const FixtureRateLimitHeadersSchema = z
  .object({
    "retry-after": z.string().regex(/^\d+$/).optional(),
    "x-ratelimit-remaining": z.string().regex(/^\d+$/).optional(),
    "x-ratelimit-reset": z.string().regex(/^\d+$/).optional(),
  })
  .strict();

export type FixtureRateLimitHeaders = z.infer<typeof FixtureRateLimitHeadersSchema>;
