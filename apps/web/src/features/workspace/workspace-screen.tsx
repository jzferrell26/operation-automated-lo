"use client";
import { useRouter } from "next/navigation.js";
import { Badge, Button, Card, Icon, Link, type IconName } from "@oalo/ui";
import type { WorkspacePageData, WorkspaceView } from "./model.js";
import { AdBrandEditor, ReportBrandEditor, PartnersEditor } from "./preference-editors.js";
import "@oalo/ui/product-tokens.css";
import styles from "./workspace.module.css";

const PARTNERS_AND_ADS = "Your ads show only you. Realtor partners never appear in paid ads.";
const headings: Record<WorkspaceView, { title: string; description: string }> = {
  partners: {
    title: "Your Realtor partners",
    description: PARTNERS_AND_ADS,
  },
  settings: {
    title: "Settings",
    description: "Your account, your connections, and where new leads go in HighLevel.",
  },
  /*
   * PRD-009d D3. Brand holds what goes on every ad as well as the homeowner report identity, so the
   * page is named for both. Whether homeowner reports are on is said on the report card itself.
   */
  profile: {
    title: "Brand",
    description: "Your name and NMLS number go on every ad automatically.",
  },
  routing: {
    title: "Where new leads go in HighLevel",
    description: "See what is ready before leads and report requests reach HighLevel.",
  },
  billing: {
    title: "Plan and usage",
    description: "Review valuation usage separately from subscription or lookup charges.",
  },
};
/**
 * PRD-009f D1 and 009F-AC-004. The three things Settings holds, each with the link to its page.
 *
 * Account also carries "Plan and usage", because billing lives under Account (D-8). The card is a
 * section with its own links rather than one big link, so it can hold two without nesting anchors.
 */
type SettingsCard = {
  title: string;
  detail: string;
  href: string;
  openLabel: string;
  icon: IconName;
  also?: { label: string; href: string };
};
const settingsCards: readonly SettingsCard[] = [
  {
    title: "Account",
    detail: "Change the password for your signed-in account, or see your plan and usage.",
    href: "/settings/account",
    openLabel: "Open account",
    icon: "lock",
    also: { label: "Plan and usage", href: "/settings/billing" },
  },
  {
    title: "Connections",
    detail: "See what HighLevel and Meta each need from you and what the app uses them for.",
    href: "/settings/connections",
    openLabel: "Open connections",
    icon: "layers",
  },
  {
    title: "Where new leads go in HighLevel",
    detail: "See what is ready before leads and report requests reach HighLevel.",
    href: "/settings/routing",
    openLabel: "See where leads go",
    icon: "calendar",
  },
];
function SettingsCards() {
  return (
    <div className={styles.cards}>
      {settingsCards.map((card) => (
        <section key={card.href} className={styles.toolCard}>
          <span className={styles.iconTile}>
            <Icon name={card.icon} decorative />
          </span>
          <h2>{card.title}</h2>
          <p>{card.detail}</p>
          <div className={styles.actions}>
            <Link href={card.href} variant="action">
              {card.openLabel}
            </Link>
            {card.also ? (
              <Link href={card.also.href} variant="action">
                {card.also.label}
              </Link>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
function Metrics({
  items,
}: {
  items: { label: string; value: string | number; detail: string }[];
}) {
  return (
    <div className={styles.metrics}>
      {items.map((item) => (
        <Card key={item.label} padding="md">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.detail}</small>
        </Card>
      ))}
    </div>
  );
}
function Routing({ data }: { data: WorkspacePageData }) {
  return (
    <div className={styles.stack}>
      <div className={styles.cards}>
        {[
          {
            title: "Property valuations",
            ready: data.valuationConfigured,
            detail: data.valuationConfigured
              ? "Your valuation connection is set up for this workspace. Each new lookup counts against your monthly allowance. You confirm the ones you start, and monthly updates, if you turn them on, run without asking each time."
              : "A valuation connection and an approved workspace allowance are needed before requesting live values.",
          },
          {
            title: "Homeowner contact lookup",
            ready: data.contactConfigured,
            detail: data.contactConfigured
              ? "The report contact connection is configured for this workspace. Contacts are verified in HighLevel before linking a report."
              : "Property-only reports can be prepared without a CRM contact. Linked homeowner reports require the HighLevel contact connection.",
          },
          {
            title: "Report workflow handoff",
            ready: data.deliveryEnabled,
            detail: data.deliveryEnabled
              ? "The report handoff is enabled. Each delivery checks the contact and communication settings before starting the designated HighLevel workflow."
              : "Report delivery is disabled. No workflow is started by saving settings or viewing this page.",
          },
        ].map((item) => (
          <Card key={item.title} padding="lg" className={styles.panel}>
            <Badge tone={item.ready ? "info" : "neutral"}>
              {item.ready ? "Configured" : "Setup needed"}
            </Badge>
            <h2>{item.title}</h2>
            <p>{item.detail}</p>
          </Card>
        ))}
      </div>
      <div className={`${styles.actions} ${styles.pageActions}`}>
        <Link href="/homeowners" variant="action">
          Manage report updates
        </Link>
        <Link href="/settings/connections" variant="action">
          Review connections
        </Link>
      </div>
    </div>
  );
}

export function WorkspaceScreen({ data }: { data: WorkspacePageData }) {
  const router = useRouter();
  const heading = headings[data.view];
  return (
    <div
      className={styles.workspace}
      data-product-shell="true"
      data-authenticated-workspace-page={data.view}
    >
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{data.identity.company}</span>
          <h1>{heading.title}</h1>
          <p>{heading.description}</p>
        </div>
        {!["profile", "partners"].includes(data.view) ? (
          <Button
            className={styles.headerAction}
            variant="outline"
            onClick={() => router.refresh()}
          >
            Refresh page
          </Button>
        ) : null}
      </header>
      {data.view === "settings" ? <SettingsCards /> : null}
      {data.view === "profile" ? (
        <>
          <ReportBrandEditor data={data} />
          <AdBrandEditor data={data} />
        </>
      ) : null}
      {data.view === "partners" ? <PartnersEditor data={data} /> : null}
      {data.view === "routing" ? <Routing data={data} /> : null}
      {data.view === "billing" ? (
        <>
          <Metrics
            items={[
              {
                label: "Valuation attempts this month",
                value: data.lookupsUsed,
                detail: "Includes attempts requiring review",
              },
              {
                label: "Workspace lookup allowance",
                value: data.lookupLimit,
                detail: "An allowance, not a subscription price",
              },
            ]}
          />
          <Card padding="lg" className={styles.panel}>
            <h2>Subscription billing is not enabled</h2>
            <p>
              No subscription, invoice or payment method is claimed for this workspace. Your lookup
              allowance controls requests; it is not proof of a lookup charge or customer payment.
            </p>
            <p>
              Opening saved reports and downloading their PDFs do not request another valuation.
            </p>
            <Link href="/homeowners" variant="action">
              Open saved reports
            </Link>
          </Card>
        </>
      ) : null}
    </div>
  );
}
