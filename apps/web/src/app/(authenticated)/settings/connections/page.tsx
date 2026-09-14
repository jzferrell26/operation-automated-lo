import { PermissionScreen } from "../../../../features/onboarding/components/permission-screen.js";
import { loadAuthenticatedWorkspace } from "../../../../server/authenticated-workspace-data.js";

export default function ConnectionsPage() {
  const fixture = loadAuthenticatedWorkspace().ui;
  return <PermissionScreen onboarding={fixture.onboarding} />;
}
