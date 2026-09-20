"use client";

import { Button, Icon, IconButton, Surface } from "@oalo/ui";
import { usePathname } from "next/navigation.js";
import { useEffect, useRef, useState, type ReactNode } from "react";

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

const focusableSelector = [
  "a[href]",
  "button:not([disabled]):not([tabindex='-1'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

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
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const drawerWasOpenRef = useRef(false);

  useEffect(() => {
    if (!isDrawerOpen) {
      if (drawerWasOpenRef.current) {
        drawerWasOpenRef.current = false;
        drawerTriggerRef.current?.focus();
      }
      return;
    }

    drawerWasOpenRef.current = true;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) {
        return;
      }

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      );
      const first = focusable.at(0);
      const last = focusable.at(-1);

      if (!first || !last) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = priorOverflow;
    };
  }, [isDrawerOpen]);

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
              ref={drawerTriggerRef}
              aria-controls="mobile-navigation-drawer"
              aria-expanded={isDrawerOpen}
              icon="menu"
              label="Open navigation"
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

      {isDrawerOpen ? (
        <div className={styles.drawerLayer}>
          <Button
            aria-label="Close navigation"
            className={styles.drawerBackdrop}
            onClick={() => setDrawerOpen(false)}
            tabIndex={-1}
            variant="ghost"
          >
            Close navigation
          </Button>
          <div
            ref={drawerRef}
            aria-labelledby="mobile-navigation-title"
            aria-modal="true"
            className={styles.drawer}
            id="mobile-navigation-drawer"
            role="dialog"
          >
            <div className={styles.drawerHeader}>
              <h2 id="mobile-navigation-title">Workspace navigation</h2>
              <IconButton icon="x" label="Close navigation" onClick={() => setDrawerOpen(false)} />
            </div>
            <NavigationItems
              isCollapsed={false}
              isMarketingExpanded={isMarketingExpanded}
              navigation={navigation}
              onItemNavigate={closeDrawerAfterNavigation}
              onMarketingExpandedChange={setMarketingExpanded}
              pathname={pathname}
            />
            <SessionIdentity isCollapsed={false} session={session} />
          </div>
        </div>
      ) : null}
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
