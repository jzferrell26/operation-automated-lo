import { notFound } from "next/navigation.js";
import { DashboardPreviewScreen } from "../../../features/dashboard-preview/dashboard-screen.js";
import { previewPaths } from "../../../features/dashboard-preview/model.js";
import { canRenderDashboardPreview } from "../../../server/dashboard-preview.js";
import { authenticatedWorkspaceMode } from "../../../server/authenticated-workspace-data.js";
import { workspaceRoutes } from "../../../features/workspace/model.js";
import { WorkspaceScreen } from "../../../features/workspace/workspace-screen.js";
import { workspacePageData } from "../../../server/workspace-page-data.js";

export default async function WorkspaceModulePage({
  params,
}: {
  params: Promise<{ workspacePath: string[] }>;
}) {
  const path = `/${(await params).workspacePath.join("/")}`;
  if (!canRenderDashboardPreview()) {
    if (authenticatedWorkspaceMode() !== "review" || !Object.hasOwn(workspaceRoutes, path))
      notFound();
    return (
      <WorkspaceScreen
        data={await workspacePageData(workspaceRoutes[path as keyof typeof workspaceRoutes])}
      />
    );
  }
  if (!Object.hasOwn(previewPaths, path)) notFound();
  return <DashboardPreviewScreen view={previewPaths[path as keyof typeof previewPaths]} />;
}
