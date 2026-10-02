import type { Metadata } from "next";
import { notFound } from "next/navigation.js";
import { PAGE_TITLES } from "../../../copy/page-titles.js";
import { DashboardPreviewScreen } from "../../../features/dashboard-preview/dashboard-screen.js";
import { previewPaths } from "../../../features/dashboard-preview/model.js";
import { canRenderDashboardPreview } from "../../../server/dashboard-preview.js";
import { authenticatedWorkspaceMode } from "../../../server/authenticated-workspace-data.js";
import { workspaceRoutes } from "../../../features/workspace/model.js";
import { WorkspaceScreen } from "../../../features/workspace/workspace-screen.js";
import { workspacePageData } from "../../../server/workspace-page-data.js";

/**
 * Writing review closing check, N-1. The four addresses this page serves each name themselves in the
 * tab, keyed on the same table that decides which addresses it serves. An address it does not serve
 * is left to the default title, because the page answers it not-found.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspacePath: string[] }>;
}): Promise<Metadata> {
  const path = `/${(await params).workspacePath.join("/")}`;
  if (!Object.hasOwn(workspaceRoutes, path)) return {};
  return { title: PAGE_TITLES[workspaceRoutes[path as keyof typeof workspaceRoutes]] };
}

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
