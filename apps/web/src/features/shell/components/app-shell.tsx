"use client";

import { Button, Icon, Link, Sheet, SheetAnchor } from "@oalo/ui";
import { usePathname } from "next/navigation.js";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import {
  SHELL_ACCOUNT_CLOSE,
  SHELL_ACCOUNT_TITLE,
  SHELL_HELP_BUTTON,
  SHELL_HELP_CLOSE,
  SHELL_HELP_TITLE,
  SHELL_MAIN_MENU_LABEL,
  SHELL_MENU_BUTTON,
  SHELL_MENU_CLOSE,
  SHELL_MENU_SHEET_LIST_LABEL,
  SHELL_MENU_SHEET_TITLE,
  SHELL_SKIP_TO_CONTENT,
  SHELL_WORDMARK,
  SHELL_WORDMARK_INITIALS,
  shellAccountButtonLabel,
  shellHelpBody,
} from "../../../copy/shell-messages.js";
import { ThemeControl } from "../../../theme/index.js";
import type { DeepReadonly, Navigation } from "../../ui-foundation/model/synthetic-ui.js";
import { firstNameOf, initialsOf } from "../model/display-name.js";
import {
  isNavigationItemInteractive,
  isNavigationItemSelected,
  mainMenuIcon,
  type ProjectedNavigationItem,
  type WorkspaceSessionView,
} from "../model/navigation.js";
import styles from "./app-shell.module.css";

type AppShellProps = Readonly<{
  /**
   * The account control's own actions. The signed-in layout puts the sign-out form here: a plain
   * form post carrying a server-rendered field, which is why the shell takes it as a slot and stays
   * a client component that knows nothing about sessions.
   */
  accountControls?: ReactNode;
  children: ReactNode;
  navigation: DeepReadonly<Navigation>;
  session: WorkspaceSessionView;
  workspaceMode?: "synthetic" | "review";
}>;

/**
 * PRD-009a, 009A-AC-009 to 014, and design `00-direction.md` section 2.1: the light top bar.
 *
 * One `<header>` holds the wordmark (linking Home), the six-item "Main" menu, Help, and the account
 * control (name, the Light/Dark/System choice, Sign out). The current page is marked by a pale blue
 * tint, navy text, semibold weight, and `aria-current="page"`, so the mark is never colour alone.
 * At 1440 and 1180 the bar is one row; at 768 the six links take a second row; below 720 a "Menu"
 * button opens them in the `Sheet` primitive. There is no left rail, no collapse toggle, and no
 * shell-wide not-connected banner (D-11): connection facts are stated once, where they matter.
 * The local demo keeps one sample-data line in the top bar region (009a D3), because the contract
 * requires sample data to be labelled.
 */
export function AppShell({
  accountControls,
  children,
  navigation,
  session,
  workspaceMode = "synthetic",
}: AppShellProps) {
  const pathname = usePathname();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const topbarRef = useRef<HTMLElement>(null);

  /*
   * PRD-009g, 009G-AC-010. The page reserves the bar's real height as scroll padding, so a control
   * focused from below the fold lands under the bar's lower edge and never behind it.
   *
   * The bar is not one height. It is one row at 1440 and 1180, two rows at 768, and the local demo
   * adds a line of sample-data text to it, so a fixed `--topbar-height` reserved too little at two
   * of the four frames and in the demo. The bar says how tall it is now: this publishes that on the
   * root, where `globals.css` reads it, and the server-rendered fallback is the token it used to be.
   */
  useEffect(() => {
    const topbar = topbarRef.current;
    if (topbar === null || typeof ResizeObserver === "undefined") return undefined;
    const root = document.documentElement;
    const publish = () => root.style.setProperty("--topbar-reserved", `${topbar.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(topbar);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--topbar-reserved");
    };
  }, []);

  return (
    <div
      className={styles.shell}
      data-data-mode={session.safety.dataMode}
      data-workspace-mode={workspaceMode}
    >
      <Link className={styles.skipLink} href="#main-content">
        {SHELL_SKIP_TO_CONTENT}
      </Link>
      {/*
        PRD-006c D7. The attribute is the shell saying which of its own elements is pinned to the
        block start, so anything that scrolls the page can keep clear of it without reading this
        file's class names.
      */}
      <header className={styles.topbar} data-shell-sticky-header="true" ref={topbarRef}>
        <div className={styles.bar}>
          <div className={styles.menuButton}>
            <SheetAnchor>
              <Button
                aria-controls={isMenuOpen ? "main-menu-sheet" : undefined}
                aria-expanded={isMenuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                variant="secondary"
              >
                <span className={styles.buttonContent}>
                  <Icon decorative name="menu" size="sm" />
                  {SHELL_MENU_BUTTON}
                </span>
              </Button>
              <Sheet
                anchor="block-end"
                className={styles.menuSheet}
                closeLabel={SHELL_MENU_CLOSE}
                id="main-menu-sheet"
                onClose={() => setMenuOpen(false)}
                open={isMenuOpen}
                title={SHELL_MENU_SHEET_TITLE}
              >
                <MenuList
                  label={SHELL_MENU_SHEET_LIST_LABEL}
                  navigation={navigation}
                  onNavigate={() => setMenuOpen(false)}
                  pathname={pathname}
                  variant="sheet"
                />
              </Sheet>
            </SheetAnchor>
          </div>

          <Link className={styles.wordmark} href="/overview">
            <span className={styles.wordmarkTile} aria-hidden="true">
              {SHELL_WORDMARK_INITIALS}
            </span>
            <span>{SHELL_WORDMARK}</span>
          </Link>

          <MenuList
            label={SHELL_MAIN_MENU_LABEL}
            navigation={navigation}
            pathname={pathname}
            variant="bar"
          />

          <div className={styles.cluster}>
            <ShellHelp roleLabel={session.user.roleLabel} />
            <AccountControl accountControls={accountControls} session={session} />
          </div>
        </div>
        {workspaceMode === "synthetic" ? (
          <p className={styles.sampleLine}>
            <Icon decorative name="info" size="sm" tone="info" />
            <span>{session.safety.disclosure}</span>
          </p>
        ) : null}
      </header>

      <main className={styles.content} id="main-content">
        {children}
      </main>
    </div>
  );
}

type MenuListProps = Readonly<{
  label: string;
  navigation: DeepReadonly<Navigation>;
  onNavigate?: () => void;
  pathname: string;
  variant: "bar" | "sheet";
}>;

function MenuList({ label, navigation, onNavigate, pathname, variant }: MenuListProps) {
  return (
    <nav aria-label={label} className={variant === "bar" ? styles.menu : styles.sheetMenu}>
      <ul className={styles.menuList}>
        {navigation.items.map((item) => (
          <li key={item.id}>
            <MenuItem
              item={item}
              {...(onNavigate ? { onNavigate } : {})}
              pathname={pathname}
              variant={variant}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

type MenuItemProps = Readonly<{
  item: ProjectedNavigationItem;
  onNavigate?: () => void;
  pathname: string;
  variant: "bar" | "sheet";
}>;

function MenuItem({ item, onNavigate, pathname, variant }: MenuItemProps) {
  const reasonId = useId();
  const icon =
    variant === "sheet" ? <Icon decorative name={mainMenuIcon(item.href)} size="sm" /> : null;

  if (isNavigationItemInteractive(item)) {
    const isCurrent = isNavigationItemSelected(item, pathname);
    return (
      <a
        aria-current={isCurrent ? "page" : undefined}
        className={styles.navigationLink}
        data-current={isCurrent || undefined}
        href={item.href}
        onClick={onNavigate}
      >
        {icon}
        <span data-menu-label="">{item.label}</span>
      </a>
    );
  }

  /*
   * 009A-AC-009: a role without access sees the same label, as text that goes nowhere, with its
   * reason. The reason is the element's description, shown on hover and on keyboard focus in the
   * bar and always in the sheet, where there is room for it.
   */
  const reason = navigationReason(item);
  return (
    <span
      aria-describedby={reasonId}
      className={styles.menuText}
      data-state={item.state}
      tabIndex={0}
      title={reason}
    >
      {icon}
      <Icon decorative name="lock" size="sm" tone="neutral" />
      <span data-menu-label="">{item.label}</span>
      <span className={styles.menuReason} id={reasonId}>
        {reason}
      </span>
    </span>
  );
}

function ShellHelp({ roleLabel }: Readonly<{ roleLabel: string }>) {
  const [isOpen, setOpen] = useState(false);
  return (
    <SheetAnchor className={styles.anchorEnd}>
      <Button
        aria-expanded={isOpen}
        className={styles.helpButton}
        onClick={() => setOpen((open) => !open)}
        variant="ghost"
      >
        <span className={styles.buttonContent}>
          <Icon decorative name="help" size="sm" />
          <span className={styles.helpLabel}>{SHELL_HELP_BUTTON}</span>
        </span>
      </Button>
      <Sheet
        anchor="block-end"
        className={styles.endSheet}
        closeLabel={SHELL_HELP_CLOSE}
        onClose={() => setOpen(false)}
        open={isOpen}
        title={SHELL_HELP_TITLE}
      >
        <p className={styles.sheetText}>{shellHelpBody(roleLabel)}</p>
      </Sheet>
    </SheetAnchor>
  );
}

type AccountControlProps = Readonly<{
  accountControls: ReactNode;
  session: WorkspaceSessionView;
}>;

/**
 * 009A-AC-009 and 013: the person's name, the Light/Dark/System choice, and Sign out. It states
 * who is signed in and nothing else: the session's source line, which named the connections, is
 * not rendered here any more.
 */
function AccountControl({ accountControls, session }: AccountControlProps) {
  const [isOpen, setOpen] = useState(false);
  const name = session.user.displayName;

  return (
    <SheetAnchor className={styles.anchorEnd}>
      <Button
        aria-expanded={isOpen}
        aria-label={shellAccountButtonLabel(name)}
        className={styles.accountButton}
        onClick={() => setOpen((open) => !open)}
        variant="ghost"
      >
        <span className={styles.buttonContent}>
          <span className={styles.avatar} aria-hidden="true">
            {initialsOf(name)}
          </span>
          <span className={styles.accountName} aria-hidden="true">
            {firstNameOf(name)}
          </span>
        </span>
      </Button>
      <Sheet
        anchor="block-end"
        className={styles.endSheet}
        closeLabel={SHELL_ACCOUNT_CLOSE}
        onClose={() => setOpen(false)}
        open={isOpen}
        title={SHELL_ACCOUNT_TITLE}
      >
        <div className={styles.accountIdentity}>
          <strong>{name}</strong>
          <span>{session.user.roleLabel}</span>
          <span>{session.location.displayName}</span>
        </div>
        <ThemeControl />
        {accountControls === undefined ? null : (
          <div className={styles.accountActions}>{accountControls}</div>
        )}
      </Sheet>
    </SheetAnchor>
  );
}

/**
 * What a menu item that is not open to this person says about itself. The item's own sentence
 * stands alone when it has one ("You don't have access to this. Ask your workspace owner."), so
 * a person is not told three times that they have no access; the state's short label is the
 * fallback for an item with no sentence (writing review W-19).
 */
function navigationReason(item: ProjectedNavigationItem): string {
  const detail = item.stateDetail?.trim();
  return detail === undefined || detail === "" ? navigationStateLabel(item.state) : detail;
}

/** What a menu item that is not open to this person says about itself (user-language section 4). */
function navigationStateLabel(state: ProjectedNavigationItem["state"]): string {
  switch (state) {
    case "available":
      return "Available";
    case "permission_restricted":
      return "No access";
    case "unavailable":
      return "Not included in your plan";
    case "planned":
      return "Not available yet";
    case "degraded":
      return "Having trouble";
  }
}
