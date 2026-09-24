import { PermissionScreen } from "../../../../features/onboarding/components/permission-screen.js";
import { loadAuthenticatedWorkspace } from "../../../../server/authenticated-workspace-data.js";
import { canRenderDashboardPreview } from "../../../../server/dashboard-preview.js";
import { DashboardPreviewScreen } from "../../../../features/dashboard-preview/dashboard-screen.js";

export default function ConnectionsPage() {
  if (canRenderDashboardPreview()) return <DashboardPreviewScreen view="connections" />;
  const fixture = loadAuthenticatedWorkspace().ui;
  return <PermissionScreen onboarding={fixture.onboarding} />;
}
