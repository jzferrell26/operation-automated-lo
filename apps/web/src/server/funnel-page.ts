import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";
import {
  resolveAuthenticatedReadPrincipal,
  UnauthenticatedPrincipalError,
} from "./authenticated-principal.js";
import { canRenderDashboardPreview } from "./dashboard-preview.js";
import { resolveRuntimeCampaignCommandPorts, SIGN_IN_PATH } from "./runtime-authentication.js";
import { EMPTY_FUNNEL_CONTEXT, readFunnelStudio } from "./funnel-http.js";

export async function funnelPageContext() {
  if (canRenderDashboardPreview()) return EMPTY_FUNNEL_CONTEXT;
  let principal;
  try {
    principal = await resolveAuthenticatedReadPrincipal(
      new Request("https://oalo.local/marketing/campaigns/funnels", { headers: await headers() }),
      process.env,
      resolveRuntimeCampaignCommandPorts(process.env),
    );
  } catch (error) {
    if (error instanceof UnauthenticatedPrincipalError) redirect(SIGN_IN_PATH);
    throw error;
  }
  return readFunnelStudio(principal, process.env);
}
