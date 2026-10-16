import "server-only";
import { isIP } from "node:net";
import { FinancingReleaseError } from "@oalo/application";
import { z } from "zod";

const projectId = z
  .string()
  .max(128)
  .regex(/^prj_[A-Za-z0-9]+$/u);
const platformEnvironment = z.enum(["production", "preview"]);
const deploymentSchema = z.object({
  OALO_FINANCING_CLIENT_IDENTITY_PROFILE: z.literal("vercel-direct-v1"),
  OALO_FINANCING_VERCEL_PROJECT_ID: projectId,
  OALO_FINANCING_VERCEL_ENVIRONMENT: platformEnvironment,
  OALO_ENVIRONMENT: z.enum(["production", "preview", "staging"]),
  VERCEL: z.literal("1"),
  VERCEL_PROJECT_ID: projectId,
  VERCEL_ENV: platformEnvironment,
});

function unavailable(): never {
  throw new FinancingReleaseError("UNAVAILABLE", 503);
}

function ipv4Bytes(address: string): number[] {
  return address.split(".").map(Number);
}

/** Called only after Node has validated an unscoped numeric IPv6 address. */
function ipv6Bytes(address: string): Uint8Array {
  let hexadecimal = address;
  if (address.includes(".")) {
    const separator = address.lastIndexOf(":");
    const [a, b, c, d] = ipv4Bytes(address.slice(separator + 1));
    hexadecimal = `${address.slice(0, separator + 1)}${((a! << 8) | b!).toString(16)}:${((c! << 8) | d!).toString(16)}`;
  }
  const halves = hexadecimal.split("::");
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const groups =
    halves.length === 2
      ? [...left, ...Array<string>(8 - left.length - right.length).fill("0"), ...right]
      : left;
  const bytes = new Uint8Array(16);
  for (const [index, group] of groups.entries()) {
    const value = Number.parseInt(group, 16);
    bytes[index * 2] = value >>> 8;
    bytes[index * 2 + 1] = value & 255;
  }
  return bytes;
}

/**
 * Source-qualified only for an operator-qualified direct Vercel deployment.
 * System variables and request headers are not cryptographic attestation.
 * External proxies require a separately qualified profile; no fallback exists.
 */
export function createVercelFinancingClientResolver(environment: unknown = process.env) {
  const parsed = deploymentSchema.safeParse(environment);
  if (!parsed.success) unavailable();
  const config = parsed.data;
  if (
    config.OALO_FINANCING_VERCEL_PROJECT_ID !== config.VERCEL_PROJECT_ID ||
    config.OALO_FINANCING_VERCEL_ENVIRONMENT !== config.VERCEL_ENV ||
    (config.VERCEL_ENV === "production"
      ? config.OALO_ENVIRONMENT !== "production"
      : config.OALO_ENVIRONMENT === "production")
  )
    unavailable();

  return async (request: Request): Promise<Uint8Array> => {
    // Fetch coalesces duplicate values with commas, which the lexical check rejects.
    // Read no ordinary forwarding, visitor cookie, deployment-ID or URL fallback.
    const address = request.headers.get("x-vercel-forwarded-for");
    if (!address || address.length > 45 || !/^[0-9A-Fa-f:.]+$/u.test(address)) unavailable();
    const family = isIP(address);
    if (family === 4) return Uint8Array.from([1, 4, ...ipv4Bytes(address)]);
    if (family !== 6) unavailable();
    const bytes = ipv6Bytes(address);
    // IPv4-mapped representations share the IPv4 bucket instead of multiplying quota.
    if (bytes.slice(0, 10).every((byte) => byte === 0) && bytes[10] === 255 && bytes[11] === 255) {
      return Uint8Array.from([1, 4, ...bytes.slice(12)]);
    }
    return Uint8Array.from([1, 6, ...bytes]);
  };
}
