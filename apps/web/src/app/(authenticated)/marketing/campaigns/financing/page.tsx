import type { Metadata } from "next";
import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";
import { FINANCING_COPY } from "../../../../../copy/financing-messages.js";
import { FinancingForm } from "../../../../../features/financing/form.js";
import {
  resolveAuthenticatedReadPrincipal,
  UnauthenticatedPrincipalError,
} from "../../../../../server/authenticated-principal.js";
import { canRenderDashboardPreview } from "../../../../../server/dashboard-preview.js";
import { readFinancingFormContext } from "../../../../../server/financing-context.js";
import {
  resolveRuntimeCampaignCommandPorts,
  SIGN_IN_PATH,
} from "../../../../../server/runtime-authentication.js";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: FINANCING_COPY.title };
export default async function FinancingPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ from?: string }> }>) {
  if (canRenderDashboardPreview())
    return (
      <FinancingForm
        context={{
          canSave: false,
          brandReady: false,
          brandName: "",
          partners: [],
          previous: [],
          synthetic: false,
        }}
      />
    );
  let principal;
  try {
    principal = await resolveAuthenticatedReadPrincipal(
      new Request("https://oalo.local/marketing/campaigns/financing", { headers: await headers() }),
      process.env,
      resolveRuntimeCampaignCommandPorts(process.env),
    );
  } catch (error) {
    if (error instanceof UnauthenticatedPrincipalError) redirect(SIGN_IN_PATH);
    throw error;
  }
  const context = await readFinancingFormContext(principal, process.env);
  const query = await searchParams;
  return (
    <FinancingForm
      context={context}
      {...(typeof query.from === "string" ? { source: query.from } : {})}
    />
  );
}
