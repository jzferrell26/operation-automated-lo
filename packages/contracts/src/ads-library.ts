import { z } from "zod";

/**
 * PRD-009c D1. The format of one ads library entry, and of a whole catalog.
 *
 * The catalog is code: an entry is added, versioned, or retired by a pull request the repository
 * owner merges (D7). This module is the automated half of that gate. It is strict on purpose,
 * because an entry that passes here is what a person's approval ends up covering (D5).
 *
 * The module is pure (no `node:` import) because `@oalo/contracts` also reaches browser bundles.
 */

export const ADS_LIBRARY_TOPICS = [
  "first-time-buyers",
  "refinance",
  "va-loans",
  "pre-approval",
  "down-payment-help",
] as const;
export const AdsLibraryTopicSchema = z.enum(ADS_LIBRARY_TOPICS);
export type AdsLibraryTopic = z.infer<typeof AdsLibraryTopicSchema>;

/**
 * A fixed list, `LEARN_MORE` by default. Meta's own allowed list for a Housing lead ad is
 * UNVERIFIED (009D-AC-012 checks it); this list only keeps a curator from typing free text here.
 */
export const ADS_LIBRARY_CALLS_TO_ACTION = [
  "LEARN_MORE",
  "CONTACT_US",
  "GET_QUOTE",
  "APPLY_NOW",
  "SIGN_UP",
] as const;
export const AdsLibraryCallToActionSchema = z.enum(ADS_LIBRARY_CALLS_TO_ACTION);
export type AdsLibraryCallToAction = z.infer<typeof AdsLibraryCallToActionSchema>;

export const ADS_LIBRARY_ART_SHAPES = ["tall", "square"] as const;
export type AdsLibraryArtShape = (typeof ADS_LIBRARY_ART_SHAPES)[number];
export const ADS_LIBRARY_ART_EXTENSIONS = ["png", "jpg"] as const;
export type AdsLibraryArtExtension = (typeof ADS_LIBRARY_ART_EXTENSIONS)[number];

/** D1: the tall art is the top 1080 by 1080 of the 4:5 ad, the square art the top of the 1:1. */
export const ADS_LIBRARY_ART_SIZES = Object.freeze({
  tall: Object.freeze({ width: 1_080, height: 1_080 }),
  square: Object.freeze({ width: 1_080, height: 842 }),
});
export const ADS_LIBRARY_MAX_ART_BYTES = 1_048_576;

/** D1 and D7: a handle, never a real name, and the literal every sample entry carries instead. */
export const ADS_LIBRARY_OWNER_HANDLE = "jzferrell26";
export const ADS_LIBRARY_SAMPLE_APPROVAL = "Sample catalog, not a real approval";
export const ADS_LIBRARY_SAMPLE_NAME_PREFIX = "Sample:";
export const ADS_LIBRARY_SAMPLE_ID_PREFIX = "sample-";

export const ADS_LIBRARY_REQUIRED_ON_AD = ["nmls", "equal-housing"] as const;
export const ADS_LIBRARY_BLOCKED_IN_WORDS = [
  "rate-claims",
  "payment-claims",
  "term-claims",
  "guarantees",
  "realtor-or-brokerage-names",
] as const;

export const ADS_LIBRARY_HEADLINE_MAX = 60;
export const ADS_LIBRARY_PRIMARY_TEXT_MAX = 300;

export const AdsLibraryAdIdSchema = z
  .string()
  .max(60)
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u);
export const AdsLibraryVersionSchema = z.number().int().min(1).max(999);
export const AdsLibrarySha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

/**
 * Unicode control and format characters, including the zero-width and bidirectional ranges the
 * authoring security review names (U+200B to U+200F, U+202A to U+202E, U+2060 to U+2069, U+FEFF).
 * Catalog text is shown to every loan officer, so none of it may hide what it says.
 */
const HIDDEN_CHARACTER = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

function catalogText(minimum: number, maximum: number, allowLineBreaks = false) {
  return z
    .string()
    .min(minimum)
    .max(maximum)
    .refine((value) => value === value.trim(), "No leading or trailing whitespace")
    .refine(
      (value) => !HIDDEN_CHARACTER.test(allowLineBreaks ? value.replaceAll("\n", " ") : value),
      "No hidden or control characters",
    );
}

/** The only value `images.<shape>.art` may hold: a name derived from the entry's own fields. */
export function adsLibraryArtName(
  id: string,
  version: number,
  shape: AdsLibraryArtShape,
  extension: AdsLibraryArtExtension,
): string {
  return `${id}/v${String(version)}/${shape}.${extension}`;
}

export function isDerivedAdsLibraryArtName(
  art: string,
  id: string,
  version: number,
  shape: AdsLibraryArtShape,
): boolean {
  return ADS_LIBRARY_ART_EXTENSIONS.some(
    (extension) => art === adsLibraryArtName(id, version, shape, extension),
  );
}

export function adsLibraryArtExtension(art: string): AdsLibraryArtExtension {
  return art.endsWith(".jpg") ? "jpg" : "png";
}

const ArtFileSchema = z
  .object({
    art: z.string().min(1).max(200),
    sha256: AdsLibrarySha256Schema,
  })
  .strict();

const RetiredSchema = z
  .object({
    on: z.iso.date(),
    reason: catalogText(3, 200),
    replacedBy: AdsLibraryAdIdSchema.nullable(),
  })
  .strict();

function uniqueValues<T extends string>(values: readonly T[]): boolean {
  return new Set(values).size === values.length;
}

export const AdsLibraryEntrySchema = z
  .object({
    id: AdsLibraryAdIdSchema,
    version: AdsLibraryVersionSchema,
    status: z.enum(["active", "retired", "replaced"]),
    sample: z.boolean(),
    topic: AdsLibraryTopicSchema,
    name: catalogText(3, 60),
    images: z
      .object({
        tall: ArtFileSchema,
        square: ArtFileSchema,
        alt: catalogText(10, 200),
      })
      .strict(),
    defaults: z
      .object({
        headline: catalogText(1, ADS_LIBRARY_HEADLINE_MAX),
        primaryText: catalogText(1, ADS_LIBRARY_PRIMARY_TEXT_MAX, true),
      })
      .strict(),
    editable: z
      .object({
        headline: z
          .object({ maxLength: z.number().int().min(1).max(ADS_LIBRARY_HEADLINE_MAX) })
          .strict(),
        primaryText: z
          .object({ maxLength: z.number().int().min(1).max(ADS_LIBRARY_PRIMARY_TEXT_MAX) })
          .strict(),
      })
      .strict(),
    callToAction: AdsLibraryCallToActionSchema.default("LEARN_MORE"),
    specialAdCategory: z.literal("HOUSING"),
    compliance: z
      .object({
        notes: catalogText(3, 300),
        requiredOnAd: z.array(z.enum(ADS_LIBRARY_REQUIRED_ON_AD)).min(2).max(2),
        blockedInWords: z.array(z.enum(ADS_LIBRARY_BLOCKED_IN_WORDS)).min(1).max(5),
      })
      .strict(),
    approval: z
      .object({
        approvedBy: z.string().min(1).max(60),
        approvedOn: z.iso.date(),
      })
      .strict(),
    retired: RetiredSchema.optional(),
  })
  .strict()
  .superRefine((entry, context) => {
    for (const shape of ADS_LIBRARY_ART_SHAPES) {
      if (!isDerivedAdsLibraryArtName(entry.images[shape].art, entry.id, entry.version, shape)) {
        context.addIssue({
          code: "custom",
          path: ["images", shape, "art"],
          message: `The art must be exactly ${adsLibraryArtName(entry.id, entry.version, shape, "png")} or .jpg`,
        });
      }
    }
    if (entry.defaults.headline.length > entry.editable.headline.maxLength) {
      context.addIssue({
        code: "custom",
        path: ["defaults", "headline"],
        message: "The default headline is longer than its editable limit",
      });
    }
    if (entry.defaults.primaryText.length > entry.editable.primaryText.maxLength) {
      context.addIssue({
        code: "custom",
        path: ["defaults", "primaryText"],
        message: "The default primary text is longer than its editable limit",
      });
    }
    if ((entry.status === "retired") !== (entry.retired !== undefined)) {
      context.addIssue({
        code: "custom",
        path: ["retired"],
        message: "The retired block is required exactly when the status is retired",
      });
    }
    if (
      !uniqueValues(entry.compliance.requiredOnAd) ||
      !uniqueValues(entry.compliance.blockedInWords)
    ) {
      context.addIssue({
        code: "custom",
        path: ["compliance"],
        message: "Compliance lists hold each value once, and requiredOnAd holds both marks",
      });
    }
    const expectedApprover = entry.sample ? ADS_LIBRARY_SAMPLE_APPROVAL : ADS_LIBRARY_OWNER_HANDLE;
    if (entry.approval.approvedBy !== expectedApprover) {
      context.addIssue({
        code: "custom",
        path: ["approval", "approvedBy"],
        message: entry.sample
          ? `A sample entry is approved by "${ADS_LIBRARY_SAMPLE_APPROVAL}"`
          : "A real entry is approved by the repository owner's handle",
      });
    }
    if (entry.name.startsWith(ADS_LIBRARY_SAMPLE_NAME_PREFIX) !== entry.sample) {
      context.addIssue({
        code: "custom",
        path: ["name"],
        message: 'A name starts "Sample:" exactly when the entry is a sample',
      });
    }
    if (entry.id.startsWith(ADS_LIBRARY_SAMPLE_ID_PREFIX) !== entry.sample) {
      context.addIssue({
        code: "custom",
        path: ["id"],
        message: 'An id starts "sample-" exactly when the entry is a sample',
      });
    }
  });
export type AdsLibraryEntry = z.infer<typeof AdsLibraryEntrySchema>;
export type AdsLibraryEntryInput = z.input<typeof AdsLibraryEntrySchema>;

export type AdsLibraryCatalogKind = "real" | "sample";

/**
 * The rules that need the whole catalog: one kind of entry per catalog, each `(id, version)` once,
 * versions contiguous from 1, `replaced` on every lower version and `active` or `retired` on the
 * highest, and `retired.replacedBy` naming another id that exists.
 */
export function adsLibraryCatalogSchema(kind: AdsLibraryCatalogKind) {
  return z
    .array(AdsLibraryEntrySchema)
    .max(500)
    .superRefine((entries, context) => {
      const versionsById = new Map<string, number[]>();
      entries.forEach((entry, index) => {
        if (entry.sample !== (kind === "sample")) {
          context.addIssue({
            code: "custom",
            path: [index, "sample"],
            message:
              kind === "sample"
                ? "Every sample catalog entry has sample: true"
                : "The real catalog never holds a sample",
          });
        }
        const versions = versionsById.get(entry.id) ?? [];
        versions.push(entry.version);
        versionsById.set(entry.id, versions);
      });
      for (const [id, versions] of versionsById) {
        const ordered = [...versions].sort((left, right) => left - right);
        const contiguous = ordered.every((version, position) => version === position + 1);
        if (!contiguous) {
          context.addIssue({
            code: "custom",
            path: [],
            message: `Versions of ${id} must be unique and contiguous from 1`,
          });
        }
      }
      entries.forEach((entry, index) => {
        const highest = Math.max(...(versionsById.get(entry.id) ?? [entry.version]));
        const expectsHighest = entry.version === highest;
        const statusFits = expectsHighest
          ? entry.status !== "replaced"
          : entry.status === "replaced";
        if (!statusFits) {
          context.addIssue({
            code: "custom",
            path: [index, "status"],
            message: "The highest version is active or retired; every lower version is replaced",
          });
        }
        const replacedBy = entry.retired?.replacedBy;
        if (
          replacedBy !== undefined &&
          replacedBy !== null &&
          (replacedBy === entry.id || !versionsById.has(replacedBy))
        ) {
          context.addIssue({
            code: "custom",
            path: [index, "retired", "replacedBy"],
            message: "retired.replacedBy names another id that exists in this catalog",
          });
        }
      });
    });
}
export type AdsLibraryCatalog = readonly AdsLibraryEntry[];
