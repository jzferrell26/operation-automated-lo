import { z } from "zod";
import { normalizeFunnelDomain, DOMAIN_KINDS } from "../features/domains/model.js";
import { campaignDatabasePool } from "./campaign-persistence-runtime.js";
import { funnelCapability, FunnelPublicError, publicFunnelConfig } from "./funnel-public-store.js";
const RoutingEnvironmentSchema = z
  .object({
    OALO_APP_URL: z.url(),
    OALO_ENVIRONMENT: z.string().optional(),
    OALO_FUNNEL_DOMAINS: z.string().optional(),
  })
  .passthrough();
export function platformDomainOrigin(environment: unknown): string {
  const value = RoutingEnvironmentSchema.parse(environment),
    url = new URL(value.OALO_APP_URL);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        value.OALO_ENVIRONMENT === "local" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    throw new FunnelPublicError(503);
  return url.origin;
}
/** URL authority is the routing input. Forwarded-host and caller tenant headers are ignored. */
export function publicDomainAuthority(
  url: string,
  hostHeader: string | null,
  environment: unknown,
): { origin: string; domainHost: string | null } {
  const incoming = new URL(url),
    platform = new URL(platformDomainOrigin(environment));
  if (incoming.username || incoming.password) throw new FunnelPublicError(404);
  const config = RoutingEnvironmentSchema.parse(environment);
  // Next's locally configured fetch hostname/port can describe its loopback transport,
  // while Host names the TLS gateway. Normalize only that exact local platform authority.
  // Neither forwarded-host nor a customer hostname can establish this exception.
  if (
    config.OALO_ENVIRONMENT === "local" &&
    platform.protocol === "https:" &&
    incoming.protocol === platform.protocol &&
    ["localhost", "127.0.0.1", "[::1]"].includes(platform.hostname) &&
    ["localhost", "127.0.0.1", "[::1]"].includes(incoming.hostname) &&
    platform.port !== "" &&
    incoming.port !== "" &&
    hostHeader === platform.host
  ) {
    return { origin: platform.origin, domainHost: null };
  }
  if (hostHeader !== null && hostHeader !== incoming.host) throw new FunnelPublicError(404);
  if (incoming.origin === platform.origin) return { origin: platform.origin, domainHost: null };
  const host = normalizeFunnelDomain(incoming.hostname);
  if (
    config.OALO_FUNNEL_DOMAINS !== "enabled" ||
    incoming.protocol !== "https:" ||
    incoming.port ||
    !host ||
    host !== incoming.hostname
  )
    throw new FunnelPublicError(404);
  return { origin: incoming.origin, domainHost: host };
}
/** Private pages and auth APIs never render on a customer host, even when a session is present. */
export function isCustomerDomainPath(pathname: string, method: string): boolean {
  if (pathname.split("/").some((segment) => segment === ".." || segment === ".")) return false;
  if (["GET", "HEAD"].includes(method))
    return (
      pathname === "/" ||
      /^\/f\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\/(?:landing|confirmation|watch|book|thanks))?\/?$/iu.test(
        pathname,
      ) ||
      /^\/_next\/static\/[A-Za-z0-9_./-]+$/u.test(pathname) ||
      /^\/funnel-media\/(?:homeowners|homebuyers)\.webp$/u.test(pathname) ||
      pathname === "/favicon.ico"
    );
  return (
    method === "POST" &&
    /^\/api\/funnel-public\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      pathname,
    )
  );
}
const BindingSchema = z
  .object({
    id: z.uuid(),
    locationId: z.uuid(),
    userId: z.uuid(),
    hostname: z.string(),
    revision: z.uuid(),
    defaultKind: z.enum(DOMAIN_KINDS),
  })
  .strict();
/** Future financing consumers may resolve this binding, then compare their immutable owner. */
export async function readCurrentDomainBinding(hostname: string, environment: unknown) {
  if (
    normalizeFunnelDomain(hostname) !== hostname ||
    !RoutingEnvironmentSchema.safeParse(environment).success ||
    RoutingEnvironmentSchema.parse(environment).OALO_FUNNEL_DOMAINS !== "enabled"
  )
    return null;
  const value = await funnelCapability(campaignDatabasePool(environment), "domainBinding", [
    hostname,
  ]);
  return value === null ? null : BindingSchema.parse(value);
}

/** Only public owner-checked destinations are returned. No caller can choose a tenant or ID. */
export async function domainRootDestination(
  host: string | null,
  environment: unknown,
): Promise<{ kind: "platform" } | { kind: "customer"; path: string | null }> {
  const platform = new URL(platformDomainOrigin(environment));
  if (host === platform.host) return { kind: "platform" };
  if (host === null || normalizeFunnelDomain(host) !== host) throw new FunnelPublicError(404);
  const authority = publicDomainAuthority(`https://${host}/`, host, environment);
  if (authority.domainHost === null) throw new FunnelPublicError(404);
  publicFunnelConfig(environment);
  const value = await funnelCapability(campaignDatabasePool(environment), "domainDefault", [host]);
  const destination = value === null ? null : z.object({ id: z.uuid() }).strict().parse(value);
  return { kind: "customer", path: destination === null ? null : `/f/${destination.id}` };
}
