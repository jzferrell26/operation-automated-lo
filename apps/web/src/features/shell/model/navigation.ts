import {
  deepFreeze,
  type DeepReadonly,
  type Navigation,
  type NavigationItem,
  type SyntheticSession,
} from "../../ui-foundation/model/synthetic-ui.js";

export type ProjectedNavigationItem = DeepReadonly<NavigationItem>;

function projectItem(
  item: DeepReadonly<NavigationItem>,
  session: DeepReadonly<SyntheticSession>,
): ProjectedNavigationItem {
  if (
    item.requiredCapability &&
    !session.user.capabilities.includes(item.requiredCapability) &&
    item.state !== "planned" &&
    item.state !== "unavailable"
  ) {
    return deepFreeze({
      ...item,
      state: "permission_restricted" as const,
      stateDetail: item.requiredRole
        ? `Requires ${item.requiredRole}. Ask an authorized resolver for access.`
        : "Your validated role does not include this capability. Ask an authorized resolver.",
    });
  }

  return item;
}

export function projectNavigationForSession(
  navigation: DeepReadonly<Navigation>,
  session: DeepReadonly<SyntheticSession>,
) {
  return deepFreeze({
    items: navigation.items.map((item) => projectItem(item, session)),
    marketingItems: navigation.marketingItems.map((item) => projectItem(item, session)),
  });
}

export function isNavigationItemInteractive(item: ProjectedNavigationItem): boolean {
  return item.state === "available" || item.state === "degraded";
}

export function isNavigationItemSelected(item: ProjectedNavigationItem, pathname: string): boolean {
  if (item.href === "/overview") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
