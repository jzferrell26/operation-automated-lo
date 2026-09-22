import {
  canRenderSyntheticDemo,
  loadAuthenticatedWorkspace,
} from "./authenticated-workspace-data.js";
import type { Navigation, SyntheticSession } from "../features/ui-foundation/model/synthetic-ui.js";

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

export function dashboardPreviewShell() {
  const workspace = loadAuthenticatedWorkspace();
  const session: SyntheticSession = {
    ...workspace.ui.session,
    accessMode: "first-party",
    user: {
      ...workspace.ui.session.user,
      displayName: "Preview owner",
      role: "owner",
      roleLabel: "Product preview",
      capabilities: [
        "campaign:create",
        "location:read",
        "onboarding:read",
        "pipeline:read",
        "reports:read",
        "settings:read",
      ],
    },
    location: { ...workspace.ui.session.location, displayName: "Automated LO demo workspace" },
    safety: {
      dataMode: "synthetic",
      writesEnabled: false,
      disclosure: "Product preview · Sample data · Test edits stay in this browser.",
    },
  };
  const navigation: Navigation = {
    items: workspace.ui.navigation.items.map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      state: "available",
    })),
    marketingItems: workspace.ui.navigation.marketingItems.map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      state: "available",
    })),
  };
  return { session, navigation };
}
