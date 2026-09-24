import { BrandProfileScreen } from "../../../features/brand/components/brand-profile-screen.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";
import { canRenderDashboardPreview } from "../../../server/dashboard-preview.js";
import { DashboardPreviewScreen } from "../../../features/dashboard-preview/dashboard-screen.js";

export default function BrandProfilePage() {
  if (canRenderDashboardPreview()) return <DashboardPreviewScreen view="brand" />;
  return <BrandProfileScreen profile={loadAuthenticatedWorkspace().brand} />;
}
