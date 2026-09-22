"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation.js";
import { Button, Dialog, Icon, IconButton, Link, TextField, type IconName } from "@oalo/ui";
import { ThemeControl } from "../../theme/ThemeControl.js";
import { useRequiredDashboardPreview } from "./preview-provider.js";
import styles from "./product-shell.module.css";
import "@oalo/ui/product-tokens.css";
import { SetupWelcome } from "./setup-wizard.js";
import { ProductHelp } from "./product-help.js";
import { ProductWalkthrough } from "./product-walkthrough.js";

const navigation: readonly { label: string; href: string; icon: IconName; section: string }[] = [
  { label: "Overview", href: "/overview", icon: "home", section: "Workspace" },
  { label: "Campaigns", href: "/marketing/campaigns", icon: "megaphone", section: "Workspace" },
  { label: "Partners", href: "/partners", icon: "users", section: "Workspace" },
  { label: "Leads & pipeline", href: "/leads", icon: "layers", section: "Workspace" },
  { label: "Reports", href: "/reports", icon: "chart", section: "Workspace" },
  { label: "Marketing studio", href: "/marketing", icon: "sparkles", section: "Create & grow" },
  {
    label: "Property sites",
    href: "/marketing/property-sites",
    icon: "globe",
    section: "Create & grow",
  },
  {
    label: "Creative library",
    href: "/marketing/creative",
    icon: "image",
    section: "Create & grow",
  },
  { label: "Brand kit", href: "/brand", icon: "building", section: "Create & grow" },
  { label: "Automations", href: "/automations", icon: "bolt", section: "Create & grow" },
];
const utility = [
  { label: "Settings", href: "/settings", icon: "settings" as const },
  { label: "Getting started", href: "/onboarding", icon: "help" as const },
];
export const initials = (name: string) =>
  name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export function ProductShell({ children }: { children: ReactNode }) {
  const { state } = useRequiredDashboardPreview();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [about, setAbout] = useState(false);
  const [appearance, setAppearance] = useState(false);
  const [help, setHelp] = useState(false);
  const closeHelp = useCallback(() => setHelp(false), []);
  const headerRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    const root = header?.closest('[data-product-shell="true"]') as HTMLElement | null;
    if (!header || !root) return;
    const measure = () =>
      root.style.setProperty(
        "--product-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    measure();
    return () => {
      observer.disconnect();
      root.style.removeProperty("--product-header-height");
    };
  }, []);
  const title =
    [...navigation, ...utility]
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.label ?? "Workspace";
  const displayName = state.profile.name === "Preview owner" ? "Alex Morgan" : state.profile.name;
  const pending = state.campaigns.filter(
    (campaign) => !campaign.blocking && campaign.state !== "approved",
  ).length;
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearch((current) => !current);
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  useEffect(() => {
    if (search) searchRef.current?.focus();
  }, [search]);
  function selected(href: string) {
    return href === "/marketing"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  }
  function rail(compact: boolean) {
    return (
      <>
        <Link className={styles.brand} href="/overview" aria-label="AutomatedLO home">
          <span className={styles.brandMark}>
            <Icon name="bolt" decorative />
          </span>
          {!compact ? (
            <span>
              Automated<span className={styles.brandAccent}>LO</span>
              <small>Built for your next chapter.</small>
            </span>
          ) : null}
        </Link>
        <nav aria-label="Main navigation" className={styles.navigation}>
          {["Workspace", "Create & grow"].map((section) => (
            <div key={section} className={styles.navGroup}>
              {!compact ? <span className={styles.groupLabel}>{section}</span> : null}
              {navigation
                .filter((item) => item.section === section)
                .map((item) => (
                  <Link
                    key={item.href}
                    className={styles.navLink}
                    href={item.href}
                    aria-current={selected(item.href) ? "page" : undefined}
                    aria-label={item.label}
                    title={compact ? item.label : undefined}
                    onClick={() => setDrawer(false)}
                  >
                    <Icon name={item.icon} decorative />
                    {!compact ? (
                      <>
                        <span>{item.label}</span>
                        {item.href === "/marketing/campaigns" && pending > 0 ? (
                          <span className={styles.count}>{pending}</span>
                        ) : null}
                      </>
                    ) : null}
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        {!compact ? (
          <div className={styles.railFeature}>
            <span className={styles.railFeatureIcon}>
              <Icon name="sparkles" decorative />
            </span>
            <strong>A better open house starts here.</strong>
            <p>Turn a property into your next conversation.</p>
            <Link
              href="/marketing/campaigns/new"
              className={styles.railFeatureLink}
              onClick={() => setDrawer(false)}
            >
              Create a campaign <Icon name="arrow-right" decorative size="sm" />
            </Link>
          </div>
        ) : null}
        <div className={styles.utilities}>
          {utility.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.navLink}
              aria-label={item.label}
              aria-current={selected(item.href) ? "page" : undefined}
              onClick={() => setDrawer(false)}
              title={compact ? item.label : undefined}
            >
              <Icon name={item.icon} decorative />
              {!compact ? <span>{item.label}</span> : null}
            </Link>
          ))}
        </div>
        <Link href="/settings/account" className={styles.identity} aria-label="Your profile">
          <span className={styles.avatar}>{initials(displayName)}</span>
          {!compact ? (
            <span>
              <strong>{displayName}</strong>
              <small>Loan officer</small>
            </span>
          ) : null}
        </Link>
      </>
    );
  }
  const searchItems = [
    ...navigation.map((item) => ({ ...item, detail: "Page" })),
    ...utility.map((item) => ({ ...item, detail: "Page" })),
    {
      label: "New campaign",
      href: "/marketing/campaigns/new",
      icon: "plus" as const,
      detail: "Action",
    },
    {
      label: "Connections",
      href: "/settings/connections",
      icon: "globe" as const,
      detail: "Settings",
    },
    ...state.campaigns.map((campaign) => ({
      label: campaign.headline,
      href: campaign.detailHref,
      icon: "megaphone" as const,
      detail: campaign.propertyAddress,
    })),
  ].filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className={styles.root} data-product-shell="true" data-collapsed={collapsed || undefined}>
      <Link href="#main-content" className={styles.skip}>
        Skip to content
      </Link>
      <aside className={styles.sidebar} aria-label="Workspace navigation">
        {rail(collapsed)}
      </aside>
      <div className={styles.workspace}>
        <header ref={headerRef} className={styles.topbar} data-shell-sticky-header="true">
          <IconButton
            className={styles.desktopToggle}
            icon="panel-left"
            label={collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() => setCollapsed((current) => !current)}
          />
          <IconButton
            className={styles.mobileToggle}
            icon="menu"
            label="Open navigation"
            aria-expanded={drawer}
            onClick={() => setDrawer(true)}
          />
          <div className={styles.breadcrumb}>
            <span>{state.profile.company}</span>
            <Icon name="chevron-down" decorative size="sm" />
            <strong>{title}</strong>
          </div>
          <div className={styles.headerTools}>
            <Button
              variant="ghost"
              className={styles.searchTrigger}
              onClick={() => setSearch(true)}
              aria-label="Search workspace"
            >
              <Icon name="search" decorative size="sm" />
              <span className={styles.searchLabel}>Search anything</span>
              <kbd>Ctrl K</kbd>
            </Button>
            <Button variant="ghost" className={styles.demoBadge} onClick={() => setAbout(true)}>
              Demo workspace
            </Button>
            <IconButton icon="sun" label="Appearance" onClick={() => setAppearance(true)} />
            <IconButton icon="help" label="Help & setup" onClick={() => setHelp(true)} />
            <Link
              href="/settings/account"
              className={styles.headerAvatar}
              aria-label="Your profile"
            >
              {initials(displayName)}
            </Link>
          </div>
        </header>
        <main className={styles.content} id="main-content">
          {pathname !== "/onboarding" ? <SetupWelcome /> : null}
          {pathname !== "/onboarding" &&
          state.setup.welcomeSeen &&
          state.setup.status !== "completed" ? (
            <div className={styles.setupStrip}>
              <Link href="/onboarding">
                Continue workspace setup <Icon name="arrow-right" decorative size="sm" />
              </Link>
              {state.setup.guide?.paused ? (
                <Button variant="ghost" onClick={() => setHelp(true)}>
                  Resume walkthrough
                </Button>
              ) : null}
            </div>
          ) : null}
          {children}
        </main>
        <footer className={styles.footer}>
          <span>AutomatedLO</span>
          <span>Your relationships. Your business. Moving forward.</span>
        </footer>
      </div>
      <Dialog
        className={styles.drawer}
        placement="inline-start"
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Your workspace"
        closeLabel="Close navigation"
      >
        {rail(false)}
      </Dialog>
      <Dialog title="Search your workspace" open={search} onClose={() => setSearch(false)}>
        <div className={styles.searchPanel}>
          <TextField
            ref={searchRef}
            label="Search pages and campaigns"
            placeholder="Try campaigns, brand, or a property address"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className={styles.searchResults}>
            {searchItems.slice(0, 12).map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setSearch(false)}>
                <Icon name={item.icon} decorative />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <Icon name="arrow-right" decorative size="sm" />
              </Link>
            ))}
            {searchItems.length === 0 ? (
              <p>No results. Try a page name or property address.</p>
            ) : null}
          </div>
        </div>
      </Dialog>
      <Dialog
        title="Make yourself at home"
        open={about}
        onClose={() => setAbout(false)}
        description="You're exploring a demo workspace with sample contacts and campaigns."
      >
        <div className={styles.dialogCopy}>
          <p>
            Use fictional details while you explore. Your changes are saved on this device. Other
            browsers have their own demo.
          </p>
          <p>
            Nothing is sent, published, or charged here. Connecting accounts and inviting a team
            will be available in the live product.
          </p>
          <Link href="/onboarding" variant="action" onClick={() => setAbout(false)}>
            Show me around
          </Link>
        </div>
      </Dialog>
      <Dialog
        title="Appearance"
        open={appearance}
        onClose={() => setAppearance(false)}
        description="Choose the look that works for you."
      >
        <ThemeControl />
      </Dialog>
      <ProductHelp open={help} onClose={closeHelp} />
      <ProductWalkthrough suspended={drawer || search || about || appearance || help} />
    </div>
  );
}
