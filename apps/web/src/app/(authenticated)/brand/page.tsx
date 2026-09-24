import { BrandProfileScreen } from "../../../features/brand/components/brand-profile-screen.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";
import { canRenderDashboardPreview } from "../../../server/dashboard-preview.js";
import { DashboardPreviewScreen } from "../../../features/dashboard-preview/dashboard-screen.js";
import { WorkspaceScreen } from "../../../features/workspace/workspace-screen.js";
import { workspacePageData } from "../../../server/workspace-page-data.js";

async function SavedReportBrandPage() {
  return <WorkspaceScreen data={await workspacePageData("profile")} />;
}

export default function BrandProfilePage() {
  if (canRenderDashboardPreview()) return <DashboardPreviewScreen view="brand" />;
  if (
    loadAuthenticatedWorkspace().mode === "review" &&
    process.env.OALO_HOMEOWNER_REPORTS === "enabled"
  )
    return <SavedReportBrandPage />;
  return <BrandProfileScreen profile={loadAuthenticatedWorkspace().brand} />;
}
