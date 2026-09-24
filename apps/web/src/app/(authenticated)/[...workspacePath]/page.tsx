import { notFound } from "next/navigation.js";
import { DashboardPreviewScreen } from "../../../features/dashboard-preview/dashboard-screen.js";
import { previewPaths } from "../../../features/dashboard-preview/model.js";
import { canRenderDashboardPreview } from "../../../server/dashboard-preview.js";

export default async function WorkspaceModulePage({
  params,
}: {
  params: Promise<{ workspacePath: string[] }>;
}) {
  if (!canRenderDashboardPreview()) notFound();
  const path = `/${(await params).workspacePath.join("/")}`;
  if (!Object.hasOwn(previewPaths, path)) notFound();
  return <DashboardPreviewScreen view={previewPaths[path as keyof typeof previewPaths]} />;
}
