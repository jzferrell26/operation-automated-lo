import {
  assertCampaignAccessible,
  assertMayExecuteCampaignMutation,
  CampaignCommandForbiddenError,
  CampaignResourceNotAccessibleError,
  type AuthenticatedPrincipal,
  type CampaignWorkspaceReadRepository,
} from "@oalo/application";
import {
  PropertyPackageRequestSchema,
  PropertyPackageSummarySchema,
  type CampaignVersion,
  type PropertyCampaignPackage,
  type PropertyPackageRequest,
  type PropertyPackageSummary,
} from "@oalo/contracts";
import { z } from "zod";
import { PropertyPackageError } from "./property-package-content.js";
import { renderPropertyCampaignPackage, verifyPropertyPackage } from "./property-package-render.js";
import type { PropertyPackageStore } from "./property-package-store.js";

export function propertyPackageOrigin(environment: unknown): string {
  const settings = z
    .object({
      OALO_APP_URL: z.string().optional(),
      OALO_ENVIRONMENT: z.string().optional(),
      OALO_REVIEW_SURFACE: z.string().optional(),
    })
    .parse(environment);
  // Match the dedicated local browser harness. Never infer a production origin from request headers.
  const local =
    settings.OALO_ENVIRONMENT === "local" && settings.OALO_REVIEW_SURFACE !== "authorized";
  const candidate = settings.OALO_APP_URL ?? (local ? "http://127.0.0.1:3100" : "");
  const parsed = z.url().safeParse(candidate);
  if (!parsed.success) throw new PropertyPackageError("PROPERTY_PACKAGE_UNAVAILABLE", 503);
  const url = new URL(parsed.data);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(local && url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname)))
  ) {
    throw new PropertyPackageError("PROPERTY_PACKAGE_UNAVAILABLE", 503);
  }
  return url.origin;
}

export function packageSummary(bundle: PropertyCampaignPackage): PropertyPackageSummary {
  return PropertyPackageSummarySchema.parse({
    packageRef: bundle.packageRef,
    campaignRef: bundle.campaignRef,
    campaignVersionRef: bundle.campaignVersionRef,
    sourceManifestHash: bundle.sourceManifestHash,
    sourceVersionNo: bundle.sourceVersionNo,
    templateVersion: bundle.templateVersion,
    generatedAt: bundle.generatedAt,
    reviewOnly: bundle.reviewOnly,
    pageCount: bundle.outputs.flyer.pageCount,
    hashes: Object.fromEntries(
      Object.entries(bundle.outputs).map(([key, value]) => [key, value.sha256]),
    ),
  });
}

export async function savedPropertyVersion(
  principal: Readonly<AuthenticatedPrincipal>,
  campaignRef: string,
  campaignVersionRef: string,
  repository: CampaignWorkspaceReadRepository,
): Promise<CampaignVersion> {
  if (principal.role === "platform_support") throw new CampaignCommandForbiddenError();
  const record = await repository.getByCampaignRef(campaignRef);
  assertCampaignAccessible(principal, record?.version);
  if (record === undefined) throw new CampaignResourceNotAccessibleError();
  const version =
    record.version.campaignVersionRef === campaignVersionRef
      ? record.version
      : (await repository.listVersionsOf(campaignRef)).find(
          (item) => item.version.campaignVersionRef === campaignVersionRef,
        )?.version;
  if (version === undefined) throw new CampaignResourceNotAccessibleError();
  assertCampaignAccessible(principal, version);
  if (
    version.manifest.blueprintId !== "open-house-boost" ||
    version.manifest.preparation === undefined
  ) {
    throw new PropertyPackageError("PROPERTY_PACKAGE_INVALID_SOURCE", 400);
  }
  return version;
}

let activeRenders = 0;
const MAXIMUM_IN_PROCESS_RENDERS = 2;

export interface PropertyPackageDependencies {
  readonly campaigns: CampaignWorkspaceReadRepository;
  readonly packages: PropertyPackageStore;
  readonly render?: typeof renderPropertyCampaignPackage;
  readonly now?: () => Date;
}

export async function generatePropertyPackage(
  raw: unknown,
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
  ports: PropertyPackageDependencies,
): Promise<PropertyCampaignPackage> {
  assertMayExecuteCampaignMutation(principal);
  const request = PropertyPackageRequestSchema.parse(raw);
  const version = await savedPropertyVersion(
    principal,
    request.campaignRef,
    request.campaignVersionRef,
    ports.campaigns,
  );
  if (version.manifestHash !== request.sourceManifestHash)
    throw new PropertyPackageError("PROPERTY_PACKAGE_STALE", 409);
  const existing = await readVerifiedPropertyPackage(version, ports.packages);
  if (existing !== undefined) return existing;
  const current = await ports.campaigns.getByCampaignRef(request.campaignRef);
  if (current?.version.campaignVersionRef !== version.campaignVersionRef)
    throw new PropertyPackageError("PROPERTY_PACKAGE_STALE", 409);
  const origin = propertyPackageOrigin(environment);
  if (activeRenders >= MAXIMUM_IN_PROCESS_RENDERS)
    throw new PropertyPackageError("PROPERTY_PACKAGE_BUSY", 429);
  activeRenders += 1;
  try {
    const rendered = await (ports.render ?? renderPropertyCampaignPackage)(
      version,
      origin,
      principal.actorRef,
      (ports.now ?? (() => new Date()))().toISOString(),
    );
    const checked = verifyPropertyPackage(rendered);
    if (
      checked.sourceManifestHash !== version.manifestHash ||
      checked.campaignVersionRef !== version.campaignVersionRef ||
      checked.campaignRef !== version.campaignRef ||
      checked.generatedBy !== principal.actorRef ||
      checked.locationRef !== principal.locationRef
    ) {
      throw new PropertyPackageError("PROPERTY_PACKAGE_INTEGRITY_FAILED", 503);
    }
    return verifyPackageSource(await ports.packages.commit(checked), version);
  } finally {
    activeRenders -= 1;
  }
}

export async function readVerifiedPropertyPackage(
  version: CampaignVersion,
  store: PropertyPackageStore,
): Promise<PropertyCampaignPackage | undefined> {
  const saved = await store.read(version.campaignVersionRef);
  if (saved === undefined) return undefined;
  return verifyPackageSource(saved, version);
}

/** The first committer may be another creator, but it must still be this exact source version. */
function verifyPackageSource(saved: unknown, version: CampaignVersion): PropertyCampaignPackage {
  const bundle = verifyPropertyPackage(saved);
  if (
    bundle.locationRef !== version.locationRef ||
    bundle.campaignRef !== version.campaignRef ||
    bundle.campaignVersionRef !== version.campaignVersionRef ||
    bundle.sourceManifestHash !== version.manifestHash ||
    bundle.sourceVersionNo !== version.versionNo
  ) {
    throw new PropertyPackageError("PROPERTY_PACKAGE_INTEGRITY_FAILED", 503);
  }
  return bundle;
}

export type PropertyPackageGenerationRequest = PropertyPackageRequest;
