import { canRenderSyntheticDemo } from "./authenticated-workspace-data.js";

/** This switch cannot grant a real session or activate on an authenticated review runtime. */
export function canRenderDashboardPreview(environment: unknown = process.env): boolean {
  return (
    typeof environment === "object" &&
    environment !== null &&
    "OALO_DASHBOARD_PREVIEW" in environment &&
    environment.OALO_DASHBOARD_PREVIEW === "enabled" &&
    canRenderSyntheticDemo(environment)
  );
}
