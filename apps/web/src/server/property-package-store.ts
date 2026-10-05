import {
  assertCampaignAccessible,
  assertMayExecuteCampaignMutation,
  CampaignCommandForbiddenError,
  type AuthenticatedPrincipal,
} from "@oalo/application";
import {
  PropertyCampaignPackageSchema,
  PROPERTY_PACKAGE_TEMPLATE_VERSION,
  type PropertyCampaignPackage,
} from "@oalo/contracts";
import {
  createPrincipalBoundTenantContextAuthority,
  defineSqlContract,
  withTenantTransaction,
  type DatabasePool,
} from "@oalo/db";
import { z } from "zod";
import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";
import {
  campaignDatabasePool,
  workspaceCorrelationReferenceFor,
} from "./campaign-persistence-runtime.js";
import { persistLocalPropertyPackage, readLocalPropertyPackage } from "./local-campaign-store.js";
import { PropertyPackageError } from "./property-package-content.js";

export interface PropertyPackageStore {
  read(campaignVersionRef: string): Promise<PropertyCampaignPackage | undefined>;
  commit(bundle: PropertyCampaignPackage): Promise<PropertyCampaignPackage>;
}

const row = z.object({ package: PropertyCampaignPackageSchema });
const readContract = defineSqlContract({
  name: "property-package.read.v1",
  access: "read",
  text: `select package from campaign.property_campaign_packages
    where location_id=platform.current_location_id() and campaign_version_ref=$1 and template_version=$2`,
  decode: (value) => row.parse(value).package,
});
const insertContract = defineSqlContract({
  name: "property-package.insert.v1",
  access: "write",
  text: `insert into campaign.property_campaign_packages
    (location_id,campaign_version_ref,campaign_ref,source_manifest_hash,template_version,generated_by_actor_id,created_at,package)
    values (platform.current_location_id(),$1,$2,$3,$4,platform.current_actor_id(),$5::timestamptz,$6::text::jsonb)
    on conflict (location_id,campaign_version_ref,template_version) do nothing returning package`,
  decode: (value) => row.parse(value).package,
});

export function postgresPropertyPackageStore(
  principal: Readonly<AuthenticatedPrincipal>,
  pool: DatabasePool,
): PropertyPackageStore {
  const authority = createPrincipalBoundTenantContextAuthority(
    principal,
    workspaceCorrelationReferenceFor(principal),
  );
  return {
    async read(versionRef) {
      return withTenantTransaction(
        pool,
        authority,
        async (tx) =>
          (await tx.read(readContract, [versionRef, PROPERTY_PACKAGE_TEMPLATE_VERSION]))[0],
      );
    },
    async commit(input) {
      assertMayExecuteCampaignMutation(principal);
      const bundle = PropertyCampaignPackageSchema.parse(input);
      assertCampaignAccessible(principal, bundle);
      if (bundle.generatedBy !== principal.actorRef)
        throw new PropertyPackageError("PROPERTY_PACKAGE_INVALID_SOURCE", 400);
      return withTenantTransaction(pool, authority, async (tx) => {
        const inserted = await tx.write(insertContract, [
          bundle.campaignVersionRef,
          bundle.campaignRef,
          bundle.sourceManifestHash,
          bundle.templateVersion,
          bundle.generatedAt,
          JSON.stringify(bundle),
        ]);
        // Separate SELECT gets a fresh READ COMMITTED snapshot if a concurrent insert won.
        const saved =
          inserted[0] ??
          (await tx.read(readContract, [bundle.campaignVersionRef, bundle.templateVersion]))[0];
        if (
          saved === undefined ||
          saved.sourceManifestHash !== bundle.sourceManifestHash ||
          saved.locationRef !== principal.locationRef
        ) {
          throw new PropertyPackageError("PROPERTY_PACKAGE_INTEGRITY_FAILED", 503);
        }
        return saved;
      });
    },
  };
}

export function createPropertyPackageStore(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
): PropertyPackageStore {
  if (principal.role === "platform_support") throw new CampaignCommandForbiddenError();
  if (authenticatedWorkspaceMode(environment) === "synthetic") {
    if (principal.authenticationMode !== "local_synthetic")
      throw new PropertyPackageError("PROPERTY_PACKAGE_UNAVAILABLE", 503);
    return {
      read: (versionRef) =>
        readLocalPropertyPackage(principal.locationRef, versionRef, environment),
      commit: (bundle) => {
        assertMayExecuteCampaignMutation(principal);
        assertCampaignAccessible(principal, bundle);
        if (bundle.generatedBy !== principal.actorRef)
          throw new PropertyPackageError("PROPERTY_PACKAGE_INVALID_SOURCE", 400);
        return persistLocalPropertyPackage(bundle, environment);
      },
    };
  }
  return postgresPropertyPackageStore(principal, campaignDatabasePool(environment));
}
