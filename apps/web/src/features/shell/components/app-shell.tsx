"use client";

import { Button, Dialog, Icon, IconButton, Surface } from "@oalo/ui";
import { usePathname } from "next/navigation.js";
import { useState, type ReactNode } from "react";

import {
  NOT_CONNECTED_BANNER_LABEL,
  NOT_CONNECTED_HEADLINE,
  WORKSPACE_EYEBROW,
} from "../../../copy/user-language.js";
import { ThemeControl } from "../../../theme/index.js";
import type {
  DeepReadonly,
  Navigation,
  NavigationItem,
} from "../../ui-foundation/model/synthetic-ui.js";
import {
  isNavigationItemInteractive,
  isNavigationItemSelected,
  type WorkspaceSessionView,
} from "../model/navigation.js";
import styles from "./app-shell.module.css";

type AppShellProps = Readonly<{
  /**
   * `03-components/application-shell-and-navigation.md`: the shell's own account area, beside the
   * theme control in the topbar. The signed-in layout puts the sign-out form here. Until the
   * PRD-006d named-state review's F-21 that form was the first child of `<main>`, so every page in
   * the workspace opened with a control instead of its own heading, which is rubric axis 1. The
   * shell takes it as a slot for the same reason it takes `headerControls`: the form carries a
   * server-rendered field, and the shell stays a client component that knows nothing about
   * sessions.
   */
  accountControls?: ReactNode;
  children: ReactNode;
  /**
   * PRD-006c D5. The guided setup's two ways back in: the "Finish setup" chip and the help menu.
   * The shell takes them as a slot rather than importing them, so the shell keeps knowing nothing
   * about the walkthrough, and a workspace without one simply passes nothing.
   */
  headerControls?: ReactNode;
  navigation: DeepReadonly<Navigation>;
  session: WorkspaceSessionView;
  workspaceMode?: "synthetic" | "review";
}>;

/**
 * PRD-006c D5 and D6's words for the drawer, kept beside each other so the trigger's name, the
 * layer's name, and the close control's name cannot drift apart.
 */
const DRAWER_TITLE = "Workspace navigation";
const DRAWER_CLOSE_LABEL = "Close navigation";
const DRAWER_OPEN_LABEL = "Open navigation";
const DRAWER_ID = "mobile-navigation-drawer";

export function AppShell({
  accountControls,
  children,
  headerControls,
  navigation,
  session,
  workspaceMode = "synthetic",
}: AppShellProps) {
  const pathname = usePathname();
  const [isRailCollapsed, setRailCollapsed] = useState(false);
  const [isMarketingExpanded, setMarketingExpanded] = useState(pathname.startsWith("/marketing"));
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  function closeDrawerAfterNavigation() {
    setDrawerOpen(false);
  }

  return (
    <div
      className={styles.shell}
      data-data-mode={session.safety.dataMode}
      data-workspace-mode={workspaceMode}
    >
      <aside
        className={styles.desktopSidebar}
        data-collapsed={isRailCollapsed || undefined}
        aria-label="Primary workspace"
      >
        <NavigationHeader isCollapsed={isRailCollapsed} />
        <NavigationItems
          isCollapsed={isRailCollapsed}
          isMarketingExpanded={isMarketingExpanded}
          navigation={navigation}
          onMarketingExpandedChange={setMarketingExpanded}
          pathname={pathname}
        />
        <Button
          aria-expanded={!isRailCollapsed}
          className={styles.railToggle}
          onClick={() => setRailCollapsed((current) => !current)}
          size="sm"
          variant="ghost"
        >
          {isRailCollapsed ? "Expand navigation" : "Collapse navigation"}
        </Button>
        <SessionIdentity isCollapsed={isRailCollapsed} session={session} />
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.mobileMenu}>
            <IconButton
              aria-controls={DRAWER_ID}
              aria-expanded={isDrawerOpen}
              icon="menu"
              label={DRAWER_OPEN_LABEL}
              onClick={() => setDrawerOpen(true)}
            />
          </div>
          <div className={styles.locationContext}>
            <span className={styles.eyebrow}>{WORKSPACE_EYEBROW}</span>
            <strong>{session.location.displayName}</strong>
            <span>{session.user.roleLabel}</span>
          </div>
          {headerControls}
          <div className={styles.themeControl} aria-label="Theme settings">
            <ThemeControl />
          </div>
          {accountControls === undefined ? null : (
            <div className={styles.accountControls}>{accountControls}</div>
          )}
        </header>

        <aside
          className={styles.syntheticDisclosure}
          data-review-surface={workspaceMode === "review" || undefined}
          aria-label={
            workspaceMode === "review"
              ? NOT_CONNECTED_BANNER_LABEL
              : "Local demo, nothing connected"
          }
        >
          <Icon
            decorative
            name="info"
            size="sm"
            tone={workspaceMode === "review" ? "warning" : "info"}
          />
          <span>{session.safety.disclosure}</span>
          <strong>
            {workspaceMode === "review" ? NOT_CONNECTED_HEADLINE : "Nothing is connected."}
          </strong>
        </aside>

        <main className={styles.content} id="main-content">
          {children}
        </main>
      </div>

      {/*
        PRD-006d 006D-AC-003 and D4 line 88. The drawer is the `Dialog` primitive at its
        `inline-start` placement, not a hand-built layer.

        Until 2026-09-20 this was a plain element wearing the dialog role and the modal flag, with
        its own focus trap, its own Escape handler, its own scroll lock, and its own focus return,
        which is exactly the behaviour D4 named `Dialog` to generalise. Two implementations of one
        contract is how the two drift: the trap here already differed from the primitive's, which
        decides the wrap in `resolveTabTarget`, a pure function with its own test.

        The wrapper stays, with nothing in it but the media gate. The drawer is the mobile
        frame's rail, so above the mobile frame there is no drawer to draw, and `display: none`
        on an ancestor is what keeps a layer opened at 390 from reappearing over a tablet layout
        after a resize. At the mobile frame it is `display: contents`, so the primitive's own
        fixed scrim does the positioning.
      */}
      <div className={styles.drawerLayer}>
        <Dialog
          className={styles.drawer}
          closeLabel={DRAWER_CLOSE_LABEL}
          id={DRAWER_ID}
          onClose={() => setDrawerOpen(false)}
          open={isDrawerOpen}
          placement="inline-start"
          title={DRAWER_TITLE}
        >
          <NavigationItems
            isCollapsed={false}
            isMarketingExpanded={isMarketingExpanded}
            navigation={navigation}
            onItemNavigate={closeDrawerAfterNavigation}
            onMarketingExpandedChange={setMarketingExpanded}
            pathname={pathname}
          />
          <SessionIdentity isCollapsed={false} session={session} />
        </Dialog>
      </div>
    </div>
  );
}

function NavigationHeader({ isCollapsed }: Readonly<{ isCollapsed: boolean }>) {
  return (
    <div className={styles.brand}>
      <span className={styles.brandMark} aria-hidden="true">
        OA
      </span>
      {!isCollapsed ? <strong>Operation Automated LO</strong> : null}
    </div>
  );
}

type NavigationItemsProps = Readonly<{
  isCollapsed: boolean;
  isMarketingExpanded: boolean;
  navigation: DeepReadonly<Navigation>;
  onItemNavigate?: () => void;
  onMarketingExpandedChange: (expanded: boolean) => void;
  pathname: string;
}>;

function NavigationItems({
  isCollapsed,
  isMarketingExpanded,
  navigation,
  onItemNavigate,
  onMarketingExpandedChange,
  pathname,
}: NavigationItemsProps) {
  return (
    <nav className={styles.navigation} aria-label="Product navigation">
      <ul className={styles.navigationList}>
        {navigation.items.map((item) => (
          <li key={item.id}>
            <NavigationItemView
              isCollapsed={isCollapsed}
              item={item}
              {...(onItemNavigate ? { onNavigate: onItemNavigate } : {})}
              pathname={pathname}
            />
            {item.id === "marketing" && !isCollapsed ? (
              <>
                <Button
                  aria-controls="marketing-subnavigation"
                  aria-expanded={isMarketingExpanded}
                  className={styles.subnavToggle}
                  onClick={() => onMarketingExpandedChange(!isMarketingExpanded)}
                  size="sm"
                  variant="ghost"
                >
                  {isMarketingExpanded ? "Collapse Marketing" : "Expand Marketing"}
                </Button>
                {isMarketingExpanded ? (
                  <ul className={styles.subnavigation} id="marketing-subnavigation">
                    {navigation.marketingItems.map((marketingItem) => (
                      <li key={marketingItem.id}>
                        <NavigationItemView
                          isCollapsed={false}
                          item={marketingItem}
                          {...(onItemNavigate ? { onNavigate: onItemNavigate } : {})}
                          pathname={pathname}
                          subordinate
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}

type NavigationItemViewProps = Readonly<{
  isCollapsed: boolean;
  item: DeepReadonly<NavigationItem>;
  onNavigate?: () => void;
  pathname: string;
  subordinate?: boolean;
}>;

function NavigationItemView({
  isCollapsed,
  item,
  onNavigate,
  pathname,
  subordinate = false,
}: NavigationItemViewProps) {
  const isSelected = isNavigationItemSelected(item, pathname);
  const isInteractive = isNavigationItemInteractive(item);
  const stateLabel = navigationStateLabel(item.state);
  const accessibleLabel = item.state === "available" ? item.label : `${item.label}. ${stateLabel}`;
  const tooltipLabel = item.stateDetail
    ? `${item.label}: ${stateLabel}. ${item.stateDetail}`
    : accessibleLabel;
  const content = (
    <>
      <Icon
        decorative
        name={isSelected ? "circle-dot" : navigationStateIcon(item.state)}
        size="sm"
        tone={navigationStateTone(item.state)}
      />
      {!isCollapsed ? <span>{item.label}</span> : null}
      {!isCollapsed && item.state !== "available" ? (
        <span className={styles.navigationState}>{navigationStateLabel(item.state)}</span>
      ) : null}
    </>
  );

  if (isInteractive) {
    return (
      <a
        aria-current={isSelected ? "page" : undefined}
        aria-label={accessibleLabel}
        className={styles.navigationLink}
        data-selected={isSelected || undefined}
        data-subordinate={subordinate || undefined}
        href={item.href}
        onClick={onNavigate}
        title={tooltipLabel}
      >
        {content}
      </a>
    );
  }

  return (
    <span
      aria-disabled="true"
      aria-label={accessibleLabel}
      className={styles.navigationLink}
      data-subordinate={subordinate || undefined}
      data-state={item.state}
      role="link"
      tabIndex={0}
      title={tooltipLabel}
    >
      {content}
      {!isCollapsed && item.stateDetail ? (
        <span className={styles.navigationDetail}>{item.stateDetail}</span>
      ) : null}
    </span>
  );
}

function SessionIdentity({
  isCollapsed,
  session,
}: Readonly<{ isCollapsed: boolean; session: WorkspaceSessionView }>) {
  return (
    <Surface className={styles.identity} data-collapsed={isCollapsed || undefined} padding="sm">
      <Icon decorative name="lock" size="sm" tone="navigation" />
      {!isCollapsed ? (
        <div>
          <strong>{session.location.displayName}</strong>
          <span>{session.user.displayName}</span>
          <span>{session.user.roleLabel}</span>
          <small>{session.location.source}</small>
        </div>
      ) : null}
    </Surface>
  );
}

function navigationStateLabel(state: NavigationItem["state"]): string {
  switch (state) {
    case "available":
      return "Available";
    case "permission_restricted":
      return "No access";
    case "unavailable":
      return "Not included in your plan";
    case "planned":
      return "Coming later";
    case "degraded":
      return "Having trouble";
  }
}

function navigationStateIcon(state: NavigationItem["state"]): "circle-dot" | "clock" | "lock" {
  switch (state) {
    case "available":
      return "circle-dot";
    case "degraded":
      return "clock";
    case "permission_restricted":
    case "unavailable":
    case "planned":
      return "lock";
  }
}

function navigationStateTone(
  state: NavigationItem["state"],
): "navigation" | "neutral" | "uncertain" | "warning" {
  switch (state) {
    case "available":
      return "navigation";
    case "degraded":
      return "warning";
    case "permission_restricted":
      return "uncertain";
    case "unavailable":
    case "planned":
      return "neutral";
  }
}
