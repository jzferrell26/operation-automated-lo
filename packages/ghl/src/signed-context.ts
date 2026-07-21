import { z } from "zod";

import { assertFixtureIsSanitized } from "./sanitization.js";

const SafeProviderReferenceSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,95}$/);

export const SanitizedSignedContextSchema = z
  .object({
    schemaVersion: z.literal(1),
    contextType: z.enum(["agency", "location"]),
    userRef: SafeProviderReferenceSchema,
    companyRef: SafeProviderReferenceSchema,
    activeLocationRef: SafeProviderReferenceSchema.optional(),
    role: z.enum(["admin", "user"]),
    isAgencyOwner: z.boolean(),
    appVersionRef: SafeProviderReferenceSchema,
    appStatus: z.literal("live"),
  })
  .strict()
  .superRefine((context, issue) => {
    if (context.contextType === "location" && context.activeLocationRef === undefined) {
      issue.addIssue({
        code: "custom",
        path: ["activeLocationRef"],
        message: "Location context requires an active location reference.",
      });
    }
    if (context.contextType === "agency" && context.activeLocationRef !== undefined) {
      issue.addIssue({
        code: "custom",
        path: ["activeLocationRef"],
        message: "Agency context must not claim an active location.",
      });
    }
  });

export const SignedContextFixtureSchema = z
  .object({
    schemaVersion: z.literal(1),
    fixtureKind: z.literal("synthetic-signed-context-projection"),
    verificationState: z.literal("fixture-only"),
    providerCiphertextHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    context: SanitizedSignedContextSchema,
  })
  .strict();

export type SanitizedSignedContext = z.infer<typeof SanitizedSignedContextSchema>;
export type SignedContextFixture = z.infer<typeof SignedContextFixtureSchema>;

export function parseSignedContextFixture(value: unknown): SignedContextFixture {
  assertFixtureIsSanitized(value);
  return SignedContextFixtureSchema.parse(value);
}
