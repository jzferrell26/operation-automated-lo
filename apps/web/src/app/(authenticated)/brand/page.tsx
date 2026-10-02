import type { Metadata } from "next";

import { PAGE_TITLES } from "../../../copy/page-titles.js";
import { BrandProfileScreen } from "../../../features/brand/components/brand-profile-screen.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";
import { canRenderDashboardPreview } from "../../../server/dashboard-preview.js";
import { DashboardPreviewScreen } from "../../../features/dashboard-preview/dashboard-screen.js";
import { WorkspaceScreen } from "../../../features/workspace/workspace-screen.js";
import { workspacePageData } from "../../../server/workspace-page-data.js";

/** Writing review W-13: the tab says which page this is. */
export const metadata: Metadata = { title: PAGE_TITLES.brand };

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
