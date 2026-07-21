import { OnboardingScreen } from "../../../features/onboarding/components/onboarding-screen.js";
import { loadSyntheticUiFixture } from "../../../features/ui-foundation/data/load-synthetic-ui.js";

export default async function OnboardingPage() {
  const fixture = await Promise.resolve(loadSyntheticUiFixture());
  return <OnboardingScreen onboarding={fixture.onboarding} session={fixture.session} />;
}
