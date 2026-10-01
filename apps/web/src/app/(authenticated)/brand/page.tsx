import { BrandProfileScreen } from "../../../features/brand/components/brand-profile-screen.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";
import { canRenderDashboardPreview } from "../../../server/dashboard-preview.js";
import { DashboardPreviewScreen } from "../../../features/dashboard-preview/dashboard-screen.js";
import { WorkspaceScreen } from "../../../features/workspace/workspace-screen.js";
import { workspacePageData } from "../../../server/workspace-page-data.js";

export default async function BrandProfilePage() {
  if (canRenderDashboardPreview()) return <DashboardPreviewScreen view="brand" />;
  const workspace = loadAuthenticatedWorkspace();
  /*
   * PRD-008b 008B-AC-007. Whose branding this is does not depend on whether homeowner reports are switched
   * on. In review mode the signed-in person always edits their own saved branding, through the same
   * user-and-location scoped read the settings page uses, so this widens nothing about who can read
   * or write what. The demo brand is for synthetic mode only.
   */
  if (workspace.mode === "review")
    return <WorkspaceScreen data={await workspacePageData("profile")} />;
  return <BrandProfileScreen profile={workspace.brand} />;
}
