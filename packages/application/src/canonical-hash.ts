import { createHash } from "node:crypto";

/**
 * The canonical JSON every campaign hash is computed over: object keys sorted, no whitespace. It
 * lives in its own module so both `campaign-foundation.ts` and `library-ad-references.ts` can use
 * it without importing each other.
 */
export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
    .join(",")}}`;
}

export function canonicalCampaignHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}
