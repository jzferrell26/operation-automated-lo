import {
  deepFreeze,
  type Capability,
  type DeepReadonly,
  type Navigation,
  type NavigationItem,
} from "../../ui-foundation/model/synthetic-ui.js";

export type ProjectedNavigationItem = DeepReadonly<NavigationItem>;

/**
 * PRD-005a 005A-AC-011. The shell renders from this shape rather than from `SyntheticSession`.
 *
 * `SyntheticSession` structurally satisfies it, so synthetic mode is unchanged, while review mode
 * supplies a session projected from the verified principal. The shape is deliberately narrow: it
 * holds only what the shell paints, so a fixture field cannot leak into a principal-derived render
 * by being spread in.
 */
export interface WorkspaceSessionView {
  readonly safety: {
    readonly dataMode: "synthetic";
    readonly writesEnabled: false;
    readonly disclosure: string;
  };
  readonly user: {
    readonly displayName: string;
    readonly roleLabel: string;
    readonly capabilities: readonly Capability[];
  };
  readonly location: {
    readonly displayName: string;
    readonly source: string;
  };
}

function projectItem(
  item: DeepReadonly<NavigationItem>,
  session: WorkspaceSessionView,
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
  session: WorkspaceSessionView,
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
