import { Resolver } from "node:dns/promises";
import { connect } from "node:tls";
import { BlockList, isIP } from "node:net";
import { z } from "zod";
import {
  DomainRecordSchema,
  isPublicDomainAddress,
  normalizeFunnelDomain,
  ownershipRecord,
  type DomainDnsRecord,
} from "../features/domains/model.js";
import { readBoundedJson } from "./homeowners/errors.js";

const ConfigurationSchema = z
  .object({
    OALO_FUNNEL_DOMAINS: z.literal("enabled"),
    OALO_VERCEL_DOMAINS_TOKEN: z.string().min(20).max(4096).regex(/^\S+$/u),
    OALO_VERCEL_PROJECT_ID: z.string().regex(/^prj_[A-Za-z0-9]+$/u),
    OALO_VERCEL_TEAM_ID: z.string().regex(/^team_[A-Za-z0-9]+$/u),
  })
  .passthrough();

export function domainManagementConfigured(environment: unknown): boolean {
  return ConfigurationSchema.safeParse(environment).success;
}

export interface DomainProvider {
  owns(hostname: string, challenge: string): Promise<boolean>;
  attach(
    hostname: string,
    apex: boolean,
  ): Promise<{
    verified: boolean;
    configured: boolean;
    records: DomainDnsRecord[];
  }>;
  certificate(hostname: string): Promise<boolean>;
}
export class DomainProviderError extends Error {
  constructor(readonly status: number) {
    super("Domain provider could not confirm the operation.");
  }
}

const ProjectDomainSchema = z.object({
  name: z.string(),
  projectId: z.string(),
  verified: z.boolean(),
  customEnvironmentId: z.string().nullable().optional(),
  redirect: z.string().nullable().optional(),
  gitBranch: z.string().nullable().optional(),
  verification: z
    .array(
      z.object({
        type: z.literal("TXT"),
        domain: z.string().min(1).max(300),
        value: z.string().min(1).max(1000),
      }),
    )
    .optional(),
});
const DomainConfigSchema = z.object({
  misconfigured: z.boolean(),
  recommendedCNAME: z.array(z.object({ rank: z.number(), value: z.string() })).optional(),
  recommendedIPv4: z.array(z.object({ rank: z.number(), value: z.array(z.string()) })).optional(),
});

export interface DomainResolver {
  resolveTxt(host: string): Promise<string[][]>;
  resolve4(host: string): Promise<string[]>;
  resolve6(host: string): Promise<string[]>;
}
const specialIpv6 = new BlockList();
for (const [address, prefix] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
] as const)
  specialIpv6.addSubnet(address, prefix, "ipv6");
export function isPublicIpv6(value: string): boolean {
  return (
    isIP(value) === 6 && /^[23][a-f0-9]{3}:/iu.test(value) && !specialIpv6.check(value, "ipv6")
  );
}
function missingDns(error: unknown) {
  return z.object({ code: z.enum(["ENODATA", "ENOTFOUND"]) }).safeParse(error).success;
}
export function probeDomainTls(hostname: string, address: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let finished = false;
    const socket = connect({
      host: address,
      port: 443,
      servername: hostname,
      rejectUnauthorized: true,
    });
    const finish = (result: boolean) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(3000, () => finish(false));
    socket.once("error", () => finish(false));
    socket.once("secureConnect", () => finish(socket.authorized));
  });
}

/** No force, move, domain purchase, DNS edit or account-wide deletion endpoint exists here. */
export function createDomainProvider(
  environment: unknown,
  transport: typeof fetch = fetch,
  resolver: DomainResolver = new Resolver({ timeout: 2500, tries: 1 }),
  tlsProbe: typeof probeDomainTls = probeDomainTls,
): DomainProvider {
  const config = ConfigurationSchema.parse(environment);
  const project = encodeURIComponent(config.OALO_VERCEL_PROJECT_ID);
  const scope = `teamId=${encodeURIComponent(config.OALO_VERCEL_TEAM_ID)}`;
  async function api(path: string, method: "GET" | "POST", body?: { name: string }) {
    const response = await transport(`https://api.vercel.com${path}`, {
      method,
      headers: {
        authorization: `Bearer ${config.OALO_VERCEL_DOMAINS_TOKEN}`,
        "content-type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (response.status === 404 && method === "GET") return null;
    if (!response.ok) throw new DomainProviderError(response.status);
    return readBoundedJson(response, 64000);
  }
  function checkedHostname(value: string) {
    const host = normalizeFunnelDomain(value);
    if (!host || host !== value) throw new Error("Invalid domain.");
    return host;
  }
  return {
    async owns(hostname, challenge) {
      const record = ownershipRecord(checkedHostname(hostname), challenge);
      try {
        const answer = await resolver.resolveTxt(record.name);
        return answer.some((parts) => parts.join("") === record.value);
      } catch (error) {
        if (missingDns(error)) return false;
        throw new Error("Domain ownership DNS check is temporarily unavailable.");
      }
    },
    async attach(hostname, apex) {
      const host = checkedHostname(hostname);
      const memberPath = `/v9/projects/${project}/domains/${encodeURIComponent(host)}`;
      let raw = await api(`${memberPath}?${scope}`, "GET");
      if (raw === null) {
        raw = await api(`/v10/projects/${project}/domains?${scope}`, "POST", { name: host });
      }
      let domain = ProjectDomainSchema.parse(raw);
      if (
        domain.name !== host ||
        domain.projectId !== config.OALO_VERCEL_PROJECT_ID ||
        domain.redirect ||
        domain.gitBranch ||
        domain.customEnvironmentId
      ) {
        throw new Error("Domain has an existing destination. No destination was changed.");
      }
      if (!domain.verified) {
        try {
          domain = ProjectDomainSchema.parse(await api(`${memberPath}/verify?${scope}`, "POST"));
        } catch (error) {
          // Vercel documents 400 for an incomplete TXT challenge. Keep its exact records
          // visible, without treating verification refusal as successful hosting.
          if (error instanceof DomainProviderError && error.status === 400) {
            domain.verified = false;
          } else {
            throw new Error("Hosting verification is temporarily unavailable.", { cause: error });
          }
        }
      }
      if (
        domain.name !== host ||
        domain.projectId !== config.OALO_VERCEL_PROJECT_ID ||
        domain.redirect ||
        domain.gitBranch ||
        domain.customEnvironmentId
      ) {
        throw new Error("Unexpected domain destination.");
      }
      const dns = DomainConfigSchema.parse(
        await api(
          `/v6/domains/${encodeURIComponent(host)}/config?${scope}&projectIdOrName=${project}`,
          "GET",
        ),
      );
      const records: DomainDnsRecord[] = (domain.verification ?? []).map((record) =>
        DomainRecordSchema.parse({
          type: record.type,
          value: record.value,
          name: record.domain,
          purpose: "hosting",
        }),
      );
      const preferred = <T extends { rank: number }>(items: T[]) =>
        [...items].sort((a, b) => a.rank - b.rank)[0];
      if (apex) {
        for (const address of preferred(dns.recommendedIPv4 ?? [])?.value ?? []) {
          if (!isPublicDomainAddress(address)) throw new Error("Invalid hosting address.");
          records.push({ type: "A", name: host, value: address, purpose: "routing" });
        }
      } else {
        const target = preferred(dns.recommendedCNAME ?? [])?.value;
        if (target) {
          const normalized = normalizeFunnelDomain(target);
          // Vercel's DNS targets may end in vercel.app, unlike customer domains.
          if (!normalized && !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app\.?$/u.test(target))
            throw new Error("Invalid hosting target.");
          records.push({ type: "CNAME", name: host, value: target, purpose: "routing" });
        }
      }
      return { verified: domain.verified, configured: !dns.misconfigured, records };
    },
    async certificate(hostname) {
      const host = checkedHostname(hostname);
      let addresses: string[], ipv6: string[];
      try {
        addresses = await resolver.resolve4(host);
        try {
          ipv6 = await resolver.resolve6(host);
        } catch (error) {
          if (!missingDns(error)) throw error;
          ipv6 = [];
        }
      } catch (error) {
        if (missingDns(error)) return false;
        throw new Error("Domain address DNS check is temporarily unavailable.");
      }
      if (
        !addresses.length ||
        addresses.some((address) => !isPublicDomainAddress(address)) ||
        ipv6.some((address) => !isPublicIpv6(address))
      ) {
        return false;
      }
      return tlsProbe(host, addresses[0]!);
    },
  };
}
