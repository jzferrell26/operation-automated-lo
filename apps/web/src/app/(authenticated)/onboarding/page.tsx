import { OnboardingScreen } from "../../../features/onboarding/components/onboarding-screen.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";
import { canRenderDashboardPreview } from "../../../server/dashboard-preview.js";
import { DashboardPreviewScreen } from "../../../features/dashboard-preview/dashboard-screen.js";

export default async function OnboardingPage() {
  if (canRenderDashboardPreview()) return <DashboardPreviewScreen view="onboarding" />;
  const fixture = await Promise.resolve(loadAuthenticatedWorkspace().ui);
  return <OnboardingScreen onboarding={fixture.onboarding} session={fixture.session} />;
}
