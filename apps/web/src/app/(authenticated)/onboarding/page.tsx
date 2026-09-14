import { OnboardingScreen } from "../../../features/onboarding/components/onboarding-screen.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";

export default async function OnboardingPage() {
  const fixture = await Promise.resolve(loadAuthenticatedWorkspace().ui);
  return <OnboardingScreen onboarding={fixture.onboarding} session={fixture.session} />;
}
