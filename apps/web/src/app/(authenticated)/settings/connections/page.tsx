import { PermissionScreen } from "../../../../features/onboarding/components/permission-screen.js";
import { loadSyntheticUiFixture } from "../../../../features/ui-foundation/data/load-synthetic-ui.js";

export default function ConnectionsPage() {
  const fixture = loadSyntheticUiFixture();
  return <PermissionScreen onboarding={fixture.onboarding} />;
}
