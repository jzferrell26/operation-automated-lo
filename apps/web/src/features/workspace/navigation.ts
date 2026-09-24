import type {
  DeepReadonly,
  Navigation,
  NavigationItem,
} from "../ui-foundation/model/synthetic-ui.js";
import { workspaceRoutes } from "./model.js";

/** The enabled report workspace has working preparation pages even when delivery
 * connections are absent. Role capability checks still run after this projection. */
export function reportWorkspaceNavigation(
  navigation: DeepReadonly<Navigation>,
): DeepReadonly<Navigation> {
  const labels: Record<string, string> = {
    "/marketing/messaging": "Message drafts",
    "/marketing/blueprints": "Campaign templates",
    "/marketplace": "Workspace tools",
    "/brand": "Report branding",
  };
  function project(item: DeepReadonly<NavigationItem>): DeepReadonly<NavigationItem> {
    if (!Object.hasOwn(workspaceRoutes, item.href) && item.href !== "/brand") return item;
    const { stateDetail: _detail, ...rest } = item;
    return { ...rest, label: labels[item.href] ?? item.label, state: "available" };
  }
  return {
    items: navigation.items.map(project),
    marketingItems: navigation.marketingItems.map(project),
  };
}
