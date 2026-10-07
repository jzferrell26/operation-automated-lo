import { Resolver } from "node:dns/promises";
import { connect } from "node:tls";
import { z } from "zod";
import {
  DomainRecordSchema,
  isPublicDomainAddress,
  normalizeFunnelDomain,
  ownershipRecord,
  type DomainDnsRecord,
} from "../features/domains/model.js";
import { readBoundedJson } from "./homeowners/errors.js";

const ConfigurationSchema = z.object({
  OALO_FUNNEL_DOMAINS: z.literal("enabled"),
  OALO_VERCEL_DOMAINS_TOKEN: z.string().min(20).max(4096).regex(/^\S+$/u),
  OALO_VERCEL_PROJECT_ID: z.string().regex(/^prj_[A-Za-z0-9]+$/u),
  OALO_VERCEL_TEAM_ID: z.string().regex(/^team_[A-Za-z0-9]+$/u),
}).passthrough();

export function domainManagementConfigured(environment: unknown): boolean {
  return ConfigurationSchema.safeParse(environment).success;
}

export interface DomainProvider {
  owns(hostname: string, challenge: string): Promise<boolean>;
  attach(hostname: string, apex: boolean): Promise<{
    verified: boolean;
    configured: boolean;
    records: DomainDnsRecord[];
  }>;
  certificate(hostname: string): Promise<boolean>;
}

const ProjectDomainSchema = z.object({
  name: z.string(),
  verified: z.boolean(),
  redirect: z.string().nullable().optional(),
  gitBranch: z.string().nullable().optional(),
  verification: z.array(z.object({
    type: z.literal("TXT"),
    domain: z.string().min(1).max(300),
    value: z.string().min(1).max(1000),
  })).optional(),
});
const DomainConfigSchema = z.object({
  misconfigured: z.boolean(),
  recommendedCNAME: z.array(z.object({ rank: z.number(), value: z.string() })).optional(),
  recommendedIPv4: z.array(z.object({ rank: z.number(), value: z.array(z.string()) })).optional(),
});

/** No force, move, domain purchase, DNS edit or account-wide deletion endpoint exists here. */
export function createDomainProvider(
  environment: unknown,
  transport: typeof fetch = fetch,
  resolver = new Resolver({ timeout: 2500, tries: 1 }),
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
    if (!response.ok) throw new Error("Domain provider could not confirm the operation.");
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
      } catch {
        return false;
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
      if (domain.name !== host || domain.redirect || domain.gitBranch) {
        throw new Error("Domain has an existing destination. No destination was changed.");
      }
      if (!domain.verified) {
        try {
          domain = ProjectDomainSchema.parse(await api(`${memberPath}/verify?${scope}`, "POST"));
        } catch {
          // DNS challenges remain visible; a failed check never implies ownership.
        }
      }
      if (domain.name !== host || domain.redirect || domain.gitBranch) {
        throw new Error("Unexpected domain destination.");
      }
      const dns = DomainConfigSchema.parse(await api(
        `/v6/domains/${encodeURIComponent(host)}/config?${scope}&projectIdOrName=${project}`,
        "GET",
      ));
      const records: DomainDnsRecord[] = (domain.verification ?? []).map((record) =>
        DomainRecordSchema.parse({ ...record, name: record.domain, purpose: "hosting", domain: undefined }),
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
        if (target) records.push({ type: "CNAME", name: host, value: target, purpose: "routing" });
      }
      return { verified: domain.verified, configured: !dns.misconfigured, records };
    },
    async certificate(hostname) {
      const host = checkedHostname(hostname);
      let addresses: string[];
      try {
        addresses = await resolver.resolve4(host);
      } catch {
        return false;
      }
      if (!addresses.length || addresses.some((address) => !isPublicDomainAddress(address))) {
        return false;
      }
      return new Promise<boolean>((resolve) => {
        let finished = false;
        const socket = connect({
          host: addresses[0],
          port: 443,
          servername: host,
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
    },
  };
}
