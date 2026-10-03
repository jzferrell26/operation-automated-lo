import type { Metadata } from "next";

import { PAGE_TITLES } from "../../../../copy/page-titles.js";
import { PermissionScreen } from "../../../../features/onboarding/components/permission-screen.js";
import { loadAuthenticatedWorkspace } from "../../../../server/authenticated-workspace-data.js";
import { canRenderDashboardPreview } from "../../../../server/dashboard-preview.js";
import { DashboardPreviewScreen } from "../../../../features/dashboard-preview/dashboard-screen.js";

/** Writing review closing check, N-1: the tab says which page this is. */
export const metadata: Metadata = { title: PAGE_TITLES.connections };

export default function ConnectionsPage() {
  if (canRenderDashboardPreview()) return <DashboardPreviewScreen view="connections" />;
  const fixture = loadAuthenticatedWorkspace().ui;
  return <PermissionScreen onboarding={fixture.onboarding} />;
}
