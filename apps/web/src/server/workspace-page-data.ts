import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";
import { PostgresHomeownerRepository, createPrincipalBoundTenantContextAuthority } from "@oalo/db";
import {
  emptyWorkspacePreferences,
  type WorkspaceView,
  type WorkspacePageData,
} from "../features/workspace/model.js";
import { blankHomeBrand, homeAddressText } from "../features/homeowners/model.js";
import {
  campaignDatabasePool,
  workspaceCorrelationReferenceFor,
} from "./campaign-persistence-runtime.js";
import { listWorkspaceCampaigns } from "./campaign-workspace-reads.js";
import { readSetupPreferences } from "./setup-preferences.js";
import { resolveRuntimeShellSession, SIGN_IN_PATH } from "./runtime-authentication.js";
import { HomeEnvironmentSchema, homeConnectionsFor } from "./homeowners/runtime.js";
import {
  readWorkspacePreferences,
  workspacePrincipal,
  canEditWorkspacePreferences,
} from "./workspace-preferences.js";
import { UnauthenticatedPrincipalError } from "./authenticated-principal.js";

export async function loadWorkspacePageData(
  request: Request,
  view: WorkspaceView,
  environment: unknown = process.env,
): Promise<WorkspacePageData> {
  const principal = await workspacePrincipal(request, environment);
  const shell = await resolveRuntimeShellSession(request, environment);
  if (!shell.authenticated || !shell.session) throw new UnauthenticatedPrincipalError();
  const pool = campaignDatabasePool(environment);
  const needsPreferences = ["settings", "profile", "partners", "messaging"].includes(view);
  const needsCampaigns = ["marketing", "property-sites", "creative", "ads"].includes(view);
  const config = HomeEnvironmentSchema.parse(environment);
  const reportsEnabled = config.OALO_HOMEOWNER_REPORTS === "enabled";
  const needsReports =
    reportsEnabled &&
    ["marketing", "property-sites", "creative", "automations", "routing", "billing"].includes(view);
  const reportRepository = new PostgresHomeownerRepository(
    pool,
    createPrincipalBoundTenantContextAuthority(
      principal,
      workspaceCorrelationReferenceFor(principal),
    ),
  );
  const [preferences, setup, campaigns, properties, connections, usage] = await Promise.all([
    needsPreferences ? readWorkspacePreferences(principal, pool) : emptyWorkspacePreferences(),
    needsPreferences ? readSetupPreferences(principal, environment) : undefined,
    needsCampaigns ? listWorkspaceCampaigns(principal, environment) : [],
    needsReports ? reportRepository.summaries() : [],
    reportsEnabled ? homeConnectionsFor(principal.locationId, reportRepository, config) : null,
    needsReports ? reportRepository.usage() : 0,
  ]);
  const defaultBrand = preferences.brand?.value ?? {
    ...blankHomeBrand,
    name: setup?.profile?.displayName ?? shell.session.user.displayName,
    company: setup?.profile?.company ?? shell.session.location.displayName,
    phone: setup?.profile?.phone ?? "",
    nmls: (setup?.profile?.nmlsNumber ?? "").replace(/\D/gu, "").slice(0, 12),
  };
  return {
    view,
    identity: {
      name: shell.session.user.displayName,
      company: shell.session.location.displayName,
      role: shell.session.user.roleLabel,
    },
    canEdit: canEditWorkspacePreferences(principal),
    preferences,
    defaultBrand,
    campaigns: campaigns.map((campaign) => ({
      id: campaign.campaignRef,
      headline: campaign.headline,
      address: campaign.propertyAddress,
      state: campaign.state,
      href: campaign.detailHref,
      updatedAt: campaign.updatedAt,
    })),
    properties: properties.map((property) => ({
      id: property.id,
      address: homeAddressText(property.address),
      reportCount: property.reportCount,
      updatedAt: property.updatedAt,
      monthly: property.monthly,
      paused: property.paused,
    })),
    reportsEnabled,
    valuationConfigured: connections?.valuation !== null && connections?.valuation !== undefined,
    contactConfigured: connections?.contacts !== null && connections?.contacts !== undefined,
    deliveryEnabled:
      config.OALO_HOMEOWNER_DELIVERY_ENABLED === "enabled" &&
      connections?.contacts !== null &&
      connections?.contacts !== undefined,
    lookupsUsed: usage,
    lookupLimit: config.OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT,
  };
}
export async function workspacePageData(view: WorkspaceView): Promise<WorkspacePageData> {
  const request = new Request("https://oalo.local/workspace", { headers: await headers() });
  try {
    return await loadWorkspacePageData(request, view);
  } catch (error) {
    if (error instanceof UnauthenticatedPrincipalError) redirect(SIGN_IN_PATH);
    throw error;
  }
}
