import { Buffer } from "node:buffer";

import { z } from "zod";

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 40 * 1024 * 1024;
const MAX_DECOMPRESSION_RATIO = 100;

const rejectionReasonSchema = z.enum([
  "ACTIVE_CONTENT_DETECTED",
  "ACTIVE_DOCUMENT_TYPE",
  "CORRUPT_ENCODING",
  "DECOMPRESSION_LIMIT",
  "FILE_TOO_LARGE",
  "MIME_SIGNATURE_MISMATCH",
  "REMOTE_URL_FORBIDDEN",
]);

export const MaliciousRenderInputFixtureSchema = z
  .object({
    schemaVersion: z.literal(1),
    fixtureId: z.string().regex(/^[a-z0-9-]+$/u),
    vector: z.enum([
      "image",
      "svg",
      "html",
      "url",
      "oversized",
      "mislabeled",
      "corrupt",
      "high-decompression",
    ]),
    fileName: z.string().regex(/^[a-z0-9.-]+$/u),
    declaredMediaType: z.string().trim().min(1).max(100),
    payloadBase64: z.string().max(32_768),
    declaredSizeBytes: z
      .number()
      .int()
      .nonnegative()
      .max(100 * 1024 * 1024),
    expandedSizeBytes: z
      .number()
      .int()
      .positive()
      .max(1024 * 1024 * 1024)
      .optional(),
    sourceUrl: z.string().max(2_048).optional(),
    expected: z
      .object({
        disposition: z.literal("rejected"),
        reason: rejectionReasonSchema,
      })
      .strict(),
  })
  .strict();

export const MaliciousRenderInputFixtureSetSchema = z
  .object({
    schemaVersion: z.literal(1),
    fixtures: z.array(MaliciousRenderInputFixtureSchema).length(8),
  })
  .strict();

export type MaliciousRenderInputFixture = z.infer<typeof MaliciousRenderInputFixtureSchema>;
export type RenderInputRejectionReason = z.infer<typeof rejectionReasonSchema>;

export interface RenderInputAssessment {
  readonly disposition: "rejected";
  readonly reason: RenderInputRejectionReason;
}

function reject(reason: RenderInputRejectionReason): RenderInputAssessment {
  return Object.freeze({ disposition: "rejected", reason });
}

function decodeStrictBase64(value: string): Uint8Array | undefined {
  if (value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) {
    return undefined;
  }
  const decoded = Buffer.from(value, "base64");
  return decoded.toString("base64") === value ? decoded : undefined;
}

function matchesDeclaredImageType(bytes: Uint8Array, mediaType: string): boolean {
  if (mediaType === "image/png") {
    return Buffer.from(bytes.subarray(0, 8)).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }
  if (mediaType === "image/jpeg") {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes.at(-2) === 0xff &&
      bytes.at(-1) === 0xd9
    );
  }
  return false;
}

export function assessUntrustedRenderInput(input: unknown): RenderInputAssessment {
  const fixture = MaliciousRenderInputFixtureSchema.parse(input);

  if (fixture.sourceUrl !== undefined) {
    return reject("REMOTE_URL_FORBIDDEN");
  }
  if (fixture.declaredMediaType === "image/svg+xml" || fixture.declaredMediaType === "text/html") {
    return reject("ACTIVE_DOCUMENT_TYPE");
  }
  if (fixture.declaredSizeBytes > MAX_MEDIA_BYTES) {
    return reject("FILE_TOO_LARGE");
  }

  const bytes = decodeStrictBase64(fixture.payloadBase64);
  if (bytes === undefined || bytes.length !== fixture.declaredSizeBytes) {
    return reject("CORRUPT_ENCODING");
  }

  if (
    fixture.expandedSizeBytes !== undefined &&
    (fixture.expandedSizeBytes > MAX_EXPANDED_BYTES ||
      fixture.expandedSizeBytes / Math.max(bytes.length, 1) > MAX_DECOMPRESSION_RATIO)
  ) {
    return reject("DECOMPRESSION_LIMIT");
  }

  const lowerBody = Buffer.from(bytes).toString("utf8").toLowerCase();
  if (
    lowerBody.includes("<script") ||
    lowerBody.includes("javascript:") ||
    lowerBody.includes("<iframe")
  ) {
    return reject("ACTIVE_CONTENT_DETECTED");
  }
  if (!matchesDeclaredImageType(bytes, fixture.declaredMediaType)) {
    return reject("MIME_SIGNATURE_MISMATCH");
  }

  throw new Error(
    `Fixture ${fixture.fixtureId} was not malicious and cannot enter this rejection corpus.`,
  );
}
