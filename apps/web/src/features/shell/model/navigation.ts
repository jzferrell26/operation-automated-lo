import type { IconName } from "@oalo/ui";

import {
  deepFreeze,
  type Capability,
  type DeepReadonly,
  type Navigation,
  type NavigationItem,
} from "../../ui-foundation/model/synthetic-ui.js";

export type ProjectedNavigationItem = DeepReadonly<NavigationItem>;

export type MainMenuEntry = Readonly<{
  id: string;
  label: string;
  href: string;
  /** Drawn in the Menu sheet at the mobile frame; the desktop bar shows the labels alone. */
  icon: IconName;
  requiredCapability?: Capability;
}>;

/**
 * PRD-009a D2 and 009A-AC-014: the one menu. Six items, in the owner's labels and order ("Yes, as
 * shown", D-2), at today's addresses (D-12). The review shell, the synthetic shell, and the
 * dashboard preview shell all read this list, and the synthetic fixture derives its `navigation`
 * from it, so there is no second menu to drift.
 *
 * Homeowner reports is listed for every account (the owner's answer to D-4); `reports:read` still
 * decides through `projectNavigationForSession` whether a given role can open it. The Ads library
 * is a tab of Campaigns (009c), not a menu item (D-16). Leads and Pipeline, Automations, Reports,
 * Marketplace or Workspace tools, the Marketing Suite and its sub-items, and Getting started are
 * gone (OD-A, OD-D).
 */
export const MAIN_MENU: readonly MainMenuEntry[] = deepFreeze([
  { id: "overview", label: "Home", href: "/overview", icon: "home" },
  { id: "campaigns", label: "Campaigns", href: "/marketing/campaigns", icon: "megaphone" },
  { id: "brand", label: "Brand", href: "/brand", icon: "building" },
  { id: "partners", label: "Realtor partners", href: "/partners", icon: "users" },
  {
    id: "homeowner-reports",
    label: "Homeowner reports",
    href: "/homeowners",
    icon: "file-text",
    requiredCapability: "reports:read",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: "settings",
    requiredCapability: "settings:read",
  },
] satisfies MainMenuEntry[]);

/** The one menu in the navigation shape the shell projects: every item available. */
export function mainMenuNavigation(): DeepReadonly<Navigation> {
  return deepFreeze({
    items: MAIN_MENU.map(({ id, label, href, requiredCapability }) => ({
      id,
      label,
      href,
      state: "available" as const,
      ...(requiredCapability === undefined ? {} : { requiredCapability }),
    })),
  });
}

/** The icon of a menu item, found by its address. */
export function mainMenuIcon(href: string): IconName {
  return MAIN_MENU.find((entry) => entry.href === href)?.icon ?? "circle-dot";
}

/**
 * PRD-005a 005A-AC-011. The shell renders from this shape rather than from `SyntheticSession`.
 *
 * `SyntheticSession` structurally satisfies it, so synthetic mode is unchanged, while review mode
 * supplies a session projected from the verified principal. The shape is deliberately narrow: it
 * holds only what the shell paints, so a fixture field cannot leak into a principal-derived render
 * by being spread in.
 */
/**
 * PRD-006a 006A-AC-021 and PRD-006b D10. Whether the shell has anything to say about this
 * person's email address.
 *
 * Three states, not a boolean, because "we have not asked" is a different fact from "no". A
 * deployment with no sending domain never sent a confirmation message and must never ask anyone to
 * look for one; a session that is not a password sign-in has no credential to confirm. Both are
 * `not_applicable`, and the notice renders for `unverified` alone.
 */
export type EmailVerificationView = "verified" | "unverified" | "not_applicable";

export interface WorkspaceSessionView {
  readonly safety: {
    readonly dataMode: "synthetic";
    readonly writesEnabled: false;
    readonly disclosure: string;
  };
  /**
   * Optional so the synthetic fixture's session keeps satisfying this shape structurally, exactly
   * as it did before this field existed. Absent means `not_applicable`: the fixture is a demo and
   * has no email address to confirm. Review mode always states one of the three.
   */
  readonly emailVerification?: EmailVerificationView | undefined;
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

/** What a user reads when nothing about their role explains the lock. */
export const NO_ACCESS_DETAIL = "You don't have access to this. Ask your workspace owner.";

/**
 * "Only a publisher can do this", "Only an approver can do this". The role arrives as a display
 * label, so it is lowered into sentence position and given the right article rather than being
 * pasted in mid-sentence with its own capitals.
 */
export function restrictedByRoleDetail(requiredRole: string): string {
  const role = requiredRole.toLocaleLowerCase("en-US");
  const article = /^[aeiou]/u.test(role) ? "an" : "a";
  return `Only ${article} ${role} can do this. Ask your workspace owner.`;
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
      stateDetail: item.requiredRole ? restrictedByRoleDetail(item.requiredRole) : NO_ACCESS_DETAIL,
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
