import { z } from "zod";

export const DOMAIN_API = "/api/funnel-domains";
export const DOMAIN_PATH = "/settings/domains";
export const DOMAIN_FRESHNESS_MS = 72 * 60 * 60 * 1000;
export const DOMAIN_CHECK_COOLDOWN_MS = 30 * 1000;
export const DOMAIN_KINDS = [
  "live-webinar",
  "on-demand",
  "buyer",
  "refinance",
  "lead-magnet",
] as const;

/** A hostname, never a URL, IP literal, wildcard or customer-provided routing expression. */
export function normalizeFunnelDomain(input: string): string | null {
  const value = input.trim().toLowerCase().replace(/\.$/u, "");
  if (value.length < 4 || value.length > 253) return null;
  if (!/^[a-z0-9.-]+$/u.test(value)) return null;
  const labels = value.split(".");
  if (labels.length < 2 || !/^[a-z]{2,63}$/u.test(labels.at(-1)!)) return null;
  if (labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label))) {
    return null;
  }
  if (/(?:^|\.)(?:localhost|local|internal|invalid|test|example)$/u.test(value)) return null;
  if (value === "vercel.app" || value.endsWith(".vercel.app")) return null;
  if (/^\d+(?:\.\d+){3}$/u.test(value)) return null;
  return value;
}

export const DomainNameSchema = z
  .string()
  .max(255)
  .transform(normalizeFunnelDomain)
  .refine((value): value is string => value !== null, "Enter a domain without https:// or a path.");
export const DomainStatusSchema = z.enum([
  "ownership_needed",
  "hosting_needed",
  "dns_needed",
  "certificate_needed",
  "ready",
  "attention",
  "disconnected",
]);
export type DomainStatus = z.infer<typeof DomainStatusSchema>;
export const DomainRecordSchema = z
  .object({
    type: z.enum(["TXT", "CNAME", "A"]),
    name: z.string().min(1).max(300),
    value: z.string().min(1).max(1000),
    purpose: z.enum(["ownership", "hosting", "routing"]),
  })
  .strict();
export type DomainDnsRecord = z.infer<typeof DomainRecordSchema>;
export const FunnelDomainSchema = z
  .object({
    id: z.uuid(),
    hostname: DomainNameSchema,
    apex: z.boolean(),
    challenge: z.string().regex(/^[a-f0-9]{64}$/u),
    status: DomainStatusSchema,
    claimed: z.boolean(),
    revision: z.uuid(),
    defaultKind: z.enum(DOMAIN_KINDS),
    records: z.array(DomainRecordSchema).max(12),
    checkedAt: z.iso.datetime({ offset: true }).nullable(),
    readyUntil: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();
export type FunnelDomain = z.infer<typeof FunnelDomainSchema>;
export const DomainCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("connect"),
    hostname: DomainNameSchema,
    apex: z.boolean(),
    defaultKind: z.enum(DOMAIN_KINDS),
    confirmed: z.literal(true),
  }).strict(),
  z.object({
    action: z.enum(["check", "disconnect"]),
    id: z.uuid(),
    expectedRevision: z.uuid(),
  }).strict(),
]);
export const DomainStateSchema = z.object({
  available: z.boolean(),
  canEdit: z.boolean(),
  domain: FunnelDomainSchema.nullable(),
}).strict();
export type DomainState = z.infer<typeof DomainStateSchema>;

export function ownershipRecord(hostname: string, challenge: string): DomainDnsRecord {
  return DomainRecordSchema.parse({
    type: "TXT",
    name: `_automatedlo.${hostname}`,
    value: `automatedlo-verification=${challenge}`,
    purpose: "ownership",
  });
}

export function isReadyDomain(domain: FunnelDomain, now = Date.now()): boolean {
  return domain.status === "ready" && domain.claimed && domain.readyUntil !== null &&
    Date.parse(domain.readyUntil) > now;
}

/** TLS probes use an already-resolved public IPv4, never a second hostname lookup. */
export function isPublicDomainAddress(value: string): boolean {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(value)) return false;
  const parts = value.split(".").map(Number);
  if (parts.some((part, index) => part > 255 || String(part) !== value.split(".")[index])) {
    return false;
  }
  const [a, b, c] = parts as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99))) {
    return false;
  }
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}
