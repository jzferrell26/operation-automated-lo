import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";
import type { HomeBrand } from "@oalo/contracts";
import { blankHomeBrand } from "../../features/homeowners/model.js";
import { canRenderDashboardPreview } from "../dashboard-preview.js";
import { readSetupPreferencesForRequest } from "../setup-preferences.js";
import { resolveRuntimeShellSession, SIGN_IN_PATH } from "../runtime-authentication.js";

export async function homePageBrand(): Promise<HomeBrand> {
  if (canRenderDashboardPreview()) return blankHomeBrand;
  const request = new Request("https://oalo.local/homeowners", { headers: await headers() });
  const shell = await resolveRuntimeShellSession(request, process.env);
  if (!shell.authenticated) redirect(SIGN_IN_PATH);
  const preferences = await readSetupPreferencesForRequest(request, process.env);
  const profile = preferences?.profile;
  return {
    ...blankHomeBrand,
    name: profile?.displayName ?? shell.session?.user.displayName ?? "",
    company: profile?.company ?? shell.session?.location.displayName ?? "",
    phone: profile?.phone ?? "",
    nmls: (profile?.nmlsNumber ?? "").replace(/\D/gu, "").slice(0, 12),
  };
}
