import { createHash } from "node:crypto";
import { isIP } from "node:net";

import {
  BrandSuggestionSchema,
  CompiledBrandRulesSchema,
  ProfileAssetSchema,
  ProfileReadinessContextSchema,
  ProfileReadinessResultSchema,
  ProfileVersionInputSchema,
  ProfileVersionSchema,
  type BrandSuggestion,
  type CompiledBrandRules,
  type ProfileAsset,
  type ProfileReadinessResult,
  type ProfileType,
  type ProfileValue,
  type ProfileVersion,
  type ProfileVersionInput,
} from "@oalo/contracts";
import {
  assertProfileCanBecomeCurrent,
  evaluateProfileReadiness as evaluateDomainProfileReadiness,
} from "@oalo/domain";
import { z } from "zod";

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export interface ProfileTransaction {
  getCurrent(locationRef: string, profileType: ProfileType): Promise<ProfileVersion | undefined>;
  getVersion(locationRef: string, profileVersionRef: string): Promise<ProfileVersion | undefined>;
  getLatestVersionNo(locationRef: string, profileType: ProfileType): Promise<number>;
  append(version: ProfileVersion): Promise<void>;
  promote(
    input: Readonly<{
      locationRef: string;
      profileType: ProfileType;
      profileVersionRef: string;
      expectedCurrentRef?: string;
    }>,
  ): Promise<void>;
}

export interface ProfileRepository {
  run<T>(work: (transaction: ProfileTransaction) => Promise<T>): Promise<T>;
}

export interface AppendProfileVersionInput {
  readonly version: unknown;
  readonly promote: boolean;
  readonly createdAt: Date;
}

export async function appendProfileVersion(
  input: AppendProfileVersionInput,
  repository: ProfileRepository,
): Promise<Readonly<ProfileVersion>> {
  const versionInput = ProfileVersionInputSchema.parse(input.version);
  return repository.run(async (transaction) => {
    const current = await transaction.getCurrent(
      versionInput.locationRef,
      versionInput.profileType,
    );
    const version = ProfileVersionSchema.parse({
      ...versionInput,
      versionNo:
        (await transaction.getLatestVersionNo(versionInput.locationRef, versionInput.profileType)) +
        1,
      createdAt: input.createdAt.toISOString(),
    });
    if (input.promote) assertProfileCanBecomeCurrent(version);
    await transaction.append(version);
    if (input.promote) {
      await transaction.promote({
        locationRef: version.locationRef,
        profileType: version.profileType,
        profileVersionRef: version.profileVersionRef,
        ...(current === undefined ? {} : { expectedCurrentRef: current.profileVersionRef }),
      });
    }
    return deepFreeze(version);
  });
}

export async function previewProfileVersion(
  locationRef: string,
  profileVersionRef: string,
  repository: ProfileRepository,
): Promise<Readonly<ProfileVersion>> {
  return repository.run(async (transaction) => {
    const version = await transaction.getVersion(locationRef, profileVersionRef);
    if (version === undefined || version.locationRef !== locationRef) {
      throw new Error("Profile version does not exist in the active location");
    }
    return deepFreeze(ProfileVersionSchema.parse(version));
  });
}

export async function rollBackProfileVersion(
  input: Readonly<{
    locationRef: string;
    historicalVersionRef: string;
    newProfileVersionRef: string;
    actorRef: string;
    createdAt: Date;
  }>,
  repository: ProfileRepository,
): Promise<Readonly<ProfileVersion>> {
  const historical = await previewProfileVersion(
    input.locationRef,
    input.historicalVersionRef,
    repository,
  );
  const next: ProfileVersionInput = {
    schemaVersion: 1,
    profileVersionRef: input.newProfileVersionRef,
    locationRef: historical.locationRef,
    profileType: historical.profileType,
    values: historical.values,
    providerMappings: historical.providerMappings,
    assets: historical.assets,
    ...(historical.attestation === undefined ? {} : { attestation: historical.attestation }),
    sourceVersionRef: historical.profileVersionRef,
    createdBy: input.actorRef,
  };
  return appendProfileVersion(
    { version: next, promote: true, createdAt: input.createdAt },
    repository,
  );
}

export function evaluateValidatedProfileReadiness(
  untrustedVersions: readonly unknown[],
  untrustedContext: unknown,
): Readonly<ProfileReadinessResult> {
  const versions = untrustedVersions.map((version) => ProfileVersionSchema.parse(version));
  const context = ProfileReadinessContextSchema.parse(untrustedContext);
  return deepFreeze(
    ProfileReadinessResultSchema.parse(evaluateDomainProfileReadiness(versions, context)),
  );
}

function isPrivateIpv4(hostname: string): boolean {
  const [first, second, third] = hostname.split(".").map(Number) as [
    number,
    number,
    number,
    number,
  ];
  return (
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224 ||
    first === 0
  );
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/gu, "").toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/u.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8") ||
    normalized.startsWith("::ffff:")
  );
}

function isProhibitedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
}

export function validateExternalProfileUrl(untrustedUrl: unknown): URL {
  const raw = z.string().trim().min(1).max(2_048).parse(untrustedUrl);
  const parsed = new URL(raw);
  if (parsed.protocol !== "https:") throw new Error("Only HTTPS profile URLs are supported");
  if (parsed.username !== "" || parsed.password !== "") {
    throw new Error("Profile URLs cannot contain credentials");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    (isIP(hostname) === 4 && isPrivateIpv4(hostname)) ||
    (isIP(hostname.replace(/^\[|\]$/gu, "")) === 6 && isPrivateIpv6(hostname))
  ) {
    throw new Error("Profile URL resolves to a prohibited private address literal");
  }
  return parsed;
}

export interface ProfileDnsResolverPort {
  resolveAll(hostname: string): Promise<readonly string[]>;
}

export interface ValidatedExternalProfileFetchPlan {
  readonly url: string;
  readonly hostname: string;
  readonly approvedAddresses: readonly string[];
  readonly redirect: "error";
}

export interface PinnedProfileRetrieverPort<T> {
  retrieve(plan: ValidatedExternalProfileFetchPlan): Promise<T>;
}

export async function resolveExternalProfileUrl(
  untrustedUrl: unknown,
  resolver: ProfileDnsResolverPort,
): Promise<ValidatedExternalProfileFetchPlan> {
  const url = validateExternalProfileUrl(untrustedUrl);
  const literal = url.hostname.replace(/^\[|\]$/gu, "");
  const addresses = isIP(literal) === 0 ? await resolver.resolveAll(url.hostname) : [literal];
  const approvedAddresses = [...new Set(addresses)].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  if (approvedAddresses.length === 0 || approvedAddresses.some(isProhibitedAddress)) {
    throw new Error("Profile URL DNS result includes a prohibited address");
  }
  return Object.freeze({
    url: url.href,
    hostname: url.hostname,
    approvedAddresses: Object.freeze(approvedAddresses),
    redirect: "error" as const,
  });
}

export async function fetchExternalProfileUrl<T>(
  untrustedUrl: unknown,
  ports: Readonly<{ resolver: ProfileDnsResolverPort; retriever: PinnedProfileRetrieverPort<T> }>,
): Promise<T> {
  const plan = await resolveExternalProfileUrl(untrustedUrl, ports.resolver);
  return ports.retriever.retrieve(plan);
}

export interface ProfileAssetDecoderPort {
  decodeAndReencode(
    input: Readonly<{
      bytes: Uint8Array<ArrayBufferLike>;
      claimedMimeType: "image/jpeg" | "image/png";
    }>,
  ): Promise<
    Readonly<{
      bytes: Uint8Array<ArrayBufferLike>;
      mimeType: "image/jpeg" | "image/png";
      width: number;
      height: number;
      metadataStripped: true;
    }>
  >;
}

export interface PrivateProfileAssetPort {
  store(
    input: Readonly<{
      locationRef: string;
      assetRef: string;
      bytes: Uint8Array<ArrayBufferLike>;
      mimeType: "image/jpeg" | "image/png";
      sha256: string;
    }>,
  ): Promise<string>;
}

export async function ingestProfileAsset(
  input: Readonly<{
    locationRef: string;
    assetRef: string;
    bytes: Uint8Array<ArrayBufferLike>;
    claimedMimeType: "image/jpeg" | "image/png";
  }>,
  ports: Readonly<{ decoder: ProfileAssetDecoderPort; storage: PrivateProfileAssetPort }>,
): Promise<Readonly<ProfileAsset>> {
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > 25 * 1024 * 1024) {
    throw new Error("Profile asset input exceeds the allowed size");
  }
  const decoded = await ports.decoder.decodeAndReencode({
    bytes: input.bytes,
    claimedMimeType: input.claimedMimeType,
  });
  if (decoded.bytes.byteLength === 0 || decoded.bytes.byteLength > 25 * 1024 * 1024) {
    throw new Error("Sanitized profile asset exceeds the allowed size");
  }
  const sha256 = createHash("sha256").update(decoded.bytes).digest("hex");
  const storageKey = await ports.storage.store({
    locationRef: input.locationRef,
    assetRef: input.assetRef,
    bytes: decoded.bytes,
    mimeType: decoded.mimeType,
    sha256,
  });
  return deepFreeze(
    ProfileAssetSchema.parse({
      assetRef: input.assetRef,
      storageKey,
      mimeType: decoded.mimeType,
      sha256,
      byteSize: decoded.bytes.byteLength,
      width: decoded.width,
      height: decoded.height,
      metadataStripped: decoded.metadataStripped,
      visibility: "private",
      approvalStatus: "pending",
    }),
  );
}

export function confirmBrandSuggestion(
  untrustedSuggestion: unknown,
  actorRef: string,
  confirmedAt: Date,
): Readonly<{ field: BrandSuggestion["field"]; value: ProfileValue }> {
  const suggestion = BrandSuggestionSchema.parse(untrustedSuggestion);
  return deepFreeze({
    field: suggestion.field,
    value: {
      value: suggestion.suggestedValue,
      confirmation: "user-confirmed",
      confirmedBy: actorRef,
      confirmedAt: confirmedAt.toISOString(),
    },
  });
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
    .join(",")}}`;
}

export function compileBrandRules(untrustedVersion: unknown): Readonly<CompiledBrandRules> {
  const version = ProfileVersionSchema.parse(untrustedVersion);
  if (version.profileType !== "brand") throw new Error("Only a brand profile can be compiled");
  assertProfileCanBecomeCurrent(version);
  const sourceEntries = Object.entries(version.values)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([field, confirmed]) => ({ field, value: confirmed?.value }));
  const promptSnapshot = stableJson(sourceEntries);
  const deterministicRules = sourceEntries.map(
    ({ field, value }) => `${field}=${stableJson(value)}`,
  );
  const contentHash = createHash("sha256")
    .update(stableJson({ promptSnapshot, deterministicRules }))
    .digest("hex");
  return deepFreeze(
    CompiledBrandRulesSchema.parse({
      schemaVersion: 1,
      locationRef: version.locationRef,
      profileVersionRef: version.profileVersionRef,
      promptSnapshot,
      deterministicRules,
      contentHash,
    }),
  );
}
