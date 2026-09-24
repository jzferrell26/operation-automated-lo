"use client";
import { useRouter } from "next/navigation.js";
import { Badge, Button, Card, Icon, Link, type IconName } from "@oalo/ui";
import type { WorkspacePageData, WorkspaceView } from "./model.js";
import { ReportBrandEditor, PartnersEditor, MessageDraftEditor } from "./preference-editors.js";
import { homeDate } from "../homeowners/model.js";
import "@oalo/ui/product-tokens.css";
import styles from "./workspace.module.css";

const headings: Record<WorkspaceView, { title: string; description: string }> = {
  marketing: {
    title: "Marketing Suite",
    description: "Turn property conversations into campaigns, reports and useful follow-up.",
  },
  "property-sites": {
    title: "Property sites",
    description: "Keep property campaigns and their publication status in view.",
  },
  creative: {
    title: "Your creative library",
    description: "Find the campaigns and homeowner reports saved in this workspace.",
  },
  ads: {
    title: "Ads Manager",
    description: "Review prepared campaigns before connecting publication and reporting.",
  },
  messaging: {
    title: "Email and SMS drafts",
    description: "Prepare your message, save it, and review it in HighLevel before sending.",
  },
  blueprints: {
    title: "Campaign templates",
    description: "Start with a focused workflow and make the details your own.",
  },
  partners: {
    title: "Your Realtor partners",
    description: "Keep your partner details ready for the next property campaign.",
  },
  leads: {
    title: "Leads and Pipeline",
    description: "Your CRM remains the source for contact, opportunity and follow-up information.",
  },
  pipeline: {
    title: "Your pipeline",
    description: "A clear view of the next step begins with your connected CRM.",
  },
  automations: {
    title: "Automations",
    description: "Review homeowner update preferences and the connections behind your follow-up.",
  },
  marketplace: {
    title: "Workspace tools",
    description: "Open the tools available in your AutomatedLO workspace.",
  },
  settings: {
    title: "Workspace settings",
    description: "Manage your account, report identity and connections.",
  },
  profile: {
    title: "Report branding",
    description: "A consistent identity on every new homeowner report.",
  },
  routing: {
    title: "Follow-up routing",
    description: "Understand where report requests go and what is ready to run.",
  },
  team: {
    title: "Workspace access",
    description: "Review the account and permissions used for this workspace.",
  },
  billing: {
    title: "Billing and usage",
    description: "Review valuation usage separately from subscription or lookup charges.",
  },
};
type ToolCard = { title: string; detail: string; href: string; icon: IconName };
const marketingTools: ToolCard[] = [
  {
    title: "Campaigns",
    detail: "Create an Open House Boost and review its saved checks and approval.",
    href: "/marketing/campaigns",
    icon: "layers",
  },
  {
    title: "Homeowner reports",
    detail: "Create a property valuation, review equity assumptions and save a branded report.",
    href: "/homeowners",
    icon: "home",
  },
  {
    title: "Creative library",
    detail: "Reopen saved campaign records and homeowner report downloads.",
    href: "/marketing/creative",
    icon: "file-text",
  },
  {
    title: "Email and SMS drafts",
    detail: "Save invitation, buyer follow-up and partner update wording for each channel.",
    href: "/marketing/messaging",
    icon: "file-text",
  },
  {
    title: "Realtor partners",
    detail: "Save your partner details and select them when preparing a campaign.",
    href: "/partners",
    icon: "users",
  },
  {
    title: "Report branding",
    detail: "Set your company, contact details and license numbers for future reports.",
    href: "/settings/profile",
    icon: "settings",
  },
];
const settingsTools: ToolCard[] = [
  {
    title: "Report branding",
    detail: "Save the identity used on new reports in this account.",
    href: "/settings/profile",
    icon: "home",
  },
  {
    title: "Account and password",
    detail: "Manage the password for your signed-in account.",
    href: "/settings/account",
    icon: "lock",
  },
  {
    title: "Workspace connections",
    detail: "Review connection requirements and the access the app uses.",
    href: "/settings/connections",
    icon: "layers",
  },
  {
    title: "Follow-up routing",
    detail: "Review homeowner workflow and monthly report readiness.",
    href: "/settings/routing",
    icon: "calendar",
  },
  {
    title: "Workspace access",
    detail: "See the current account and its role.",
    href: "/settings/team",
    icon: "users",
  },
  {
    title: "Billing and usage",
    detail: "Review the valuation lookup allowance and usage.",
    href: "/settings/billing",
    icon: "chart",
  },
];
function ToolCards({ items }: { items: readonly ToolCard[] }) {
  return (
    <div className={styles.cards}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={styles.toolCard}>
          <span className={styles.iconTile}>
            <Icon name={item.icon} decorative />
          </span>
          <h2>{item.title}</h2>
          <p>{item.detail}</p>
          <span className={styles.openLink}>
            Open <Icon name="arrow-right" decorative size="sm" />
          </span>
        </Link>
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
function CampaignRecords({ data }: { data: WorkspacePageData }) {
  return (
    <Card padding="lg" className={styles.panel}>
      <div className={styles.sectionHead}>
        <div>
          <h2>Saved property campaigns</h2>
          <p>Open a campaign to review its property details, checks and recorded decisions.</p>
        </div>
        <Link href="/marketing/campaigns/new" variant="action">
          Create campaign
        </Link>
      </div>
      {data.campaigns.length ? (
        <div className={styles.records}>
          {data.campaigns.map((campaign) => (
            <Link className={styles.record} key={campaign.id} href={campaign.href}>
              <span>
                <strong>{campaign.headline}</strong>
                <small>{campaign.address}</small>
                <small>Updated {homeDate(campaign.updatedAt)}</small>
              </span>
              <Badge
                tone={
                  campaign.state === "approved"
                    ? "success"
                    : campaign.state === "preflight_failed"
                      ? "critical"
                      : "neutral"
                }
              >
                {campaign.state === "approved"
                  ? "Approved"
                  : campaign.state === "preflight_failed"
                    ? "Needs changes"
                    : "Saved"}
              </Badge>
              <Icon name="arrow-right" decorative size="sm" />
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <Icon name="layers" decorative size="lg" />
          <h3>No campaigns have been saved yet</h3>
          <p>Create an Open House Boost to start your workspace history.</p>
        </div>
      )}
    </Card>
  );
}
function ReportRecords({ data }: { data: WorkspacePageData }) {
  if (!data.reportsEnabled) return null;
  return (
    <Card padding="lg" className={styles.panel}>
      <div className={styles.sectionHead}>
        <div>
          <h2>Saved homeowner reports</h2>
          <p>Reopen the saved report to print, download its PDF or review its history.</p>
        </div>
        <Link href="/homeowners" variant="action">
          View reports
        </Link>
      </div>
      {data.properties.length ? (
        <div className={styles.records}>
          {data.properties.map((property) => (
            <Link className={styles.record} key={property.id} href={`/homeowners/${property.id}`}>
              <span>
                <strong>{property.address}</strong>
                <small>
                  {property.reportCount} saved {property.reportCount === 1 ? "report" : "reports"} ·
                  Updated {homeDate(property.updatedAt)}
                </small>
              </span>
              <Badge tone="neutral">
                {property.monthly
                  ? property.paused
                    ? "Updates paused"
                    : "Monthly updates"
                  : "On demand"}
              </Badge>
              <Icon name="arrow-right" decorative size="sm" />
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <Icon name="home" decorative size="lg" />
          <h3>Your saved reports will appear here</h3>
          <p>
            {data.valuationConfigured
              ? "Create your first homeowner report to start its history."
              : "Connect valuation data before creating your first property report."}
          </p>
        </div>
      )}
    </Card>
  );
}
function ConnectionNeeded({ title, detail }: { title: string; detail: string }) {
  return (
    <Card padding="lg" className={styles.connection}>
      <span className={styles.iconTile}>
        <Icon name="layers" decorative />
      </span>
      <h2>{title}</h2>
      <p>{detail}</p>
      <Link href="/settings/connections" variant="action">
        Review workspace connections
      </Link>
    </Card>
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
              ? "A valuation adapter is configured for this workspace. Each new lookup still requires an allowance and a confirmed request."
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
      <div className={styles.actions}>
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
  const tools = data.reportsEnabled
    ? marketingTools
    : marketingTools.filter((item) => item.href !== "/homeowners");
  const summary = [
    {
      label: "Saved campaigns",
      value: data.campaigns.length,
      detail: "Real records in this workspace",
    },
    {
      label: "Saved reports",
      value: data.properties.reduce((total, property) => total + property.reportCount, 0),
      detail: data.reportsEnabled ? "Saved property snapshots" : "Report module not enabled",
    },
    {
      label: "Valuation connection",
      value: data.valuationConfigured ? "Configured" : "Setup needed",
      detail: "No lookup runs from this page",
    },
  ];
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
        {!["profile", "partners", "messaging"].includes(data.view) ? (
          <Button variant="outline" onClick={() => router.refresh()}>
            Refresh page
          </Button>
        ) : null}
      </header>
      {data.view === "marketing" ? (
        <>
          <Metrics items={summary} />
          <div className={styles.feature}>
            <span className={styles.eyebrow}>Your next property conversation</span>
            <h2>Prepare it once. Keep it connected.</h2>
            <p>
              Start with a campaign or a homeowner report, then return to its saved history as the
              conversation develops.
            </p>
            <div className={styles.actions}>
              <Link href="/marketing/campaigns/new" variant="action">
                Create Open House Boost
              </Link>
              {data.reportsEnabled ? (
                <Link href="/homeowners/new" variant="action">
                  Create property report
                </Link>
              ) : null}
            </div>
          </div>
          <ToolCards items={tools} />
        </>
      ) : null}
      {data.view === "settings" ? (
        <>
          <Card padding="lg" className={styles.identity}>
            <span className={styles.iconTile}>
              <Icon name="users" decorative />
            </span>
            <div>
              <h2>{data.identity.name}</h2>
              <p>
                {data.identity.company} · {data.identity.role}
              </p>
            </div>
            <Badge tone="info">Signed in</Badge>
          </Card>
          <ToolCards items={settingsTools} />
        </>
      ) : null}
      {data.view === "profile" ? <ReportBrandEditor data={data} /> : null}
      {data.view === "partners" ? <PartnersEditor data={data} /> : null}
      {data.view === "messaging" ? <MessageDraftEditor data={data} /> : null}
      {data.view === "property-sites" ? (
        <>
          <ConnectionNeeded
            title="Publication is not connected"
            detail="These are saved campaign records. A public property website is available only after publication has been connected and an approved version is published."
          />
          <CampaignRecords data={data} />
        </>
      ) : null}
      {data.view === "creative" ? (
        <>
          <ReportRecords data={data} />
          <CampaignRecords data={data} />
          <p className={styles.note}>
            Campaign artwork and public links become available after their publishing connection is
            enabled. A saved approval alone does not create a live ad or public site.
          </p>
        </>
      ) : null}
      {data.view === "ads" ? (
        <>
          <ConnectionNeeded
            title="Connect ad publishing and reporting"
            detail="Prepared campaigns are available below. Live delivery, spend and results have not been connected to this workspace, so no ad performance is shown."
          />
          <CampaignRecords data={data} />
        </>
      ) : null}
      {data.view === "blueprints" ? (
        <>
          <ToolCards
            items={[
              {
                title: "Open House Boost",
                detail:
                  "Prepare property details, content, budget and permissions, then review checks before approving the saved version.",
                href: "/marketing/campaigns/new",
                icon: "layers",
              },
              ...(data.reportsEnabled
                ? [
                    {
                      title: "Homeowner value and equity report",
                      detail:
                        "Start with a property address. Add loan details when known, then keep a branded report and its history.",
                      href: "/homeowners/new",
                      icon: "home" as const,
                    },
                  ]
                : []),
            ]}
          />
          <p className={styles.note}>
            Every new campaign and report starts with details you provide. Choosing a template does
            not publish or send anything.
          </p>
        </>
      ) : null}
      {data.view === "leads" || data.view === "pipeline" ? (
        <>
          <ConnectionNeeded
            title="CRM records are not connected to this view"
            detail="Connect the HighLevel lead and opportunity integration before displaying pipeline records. A missing connection is not an empty pipeline, and no example contacts are shown as your customers."
          />
          <ToolCards
            items={[
              {
                title: "Prepare follow-up wording",
                detail: "Save message drafts for review in HighLevel.",
                href: "/marketing/messaging",
                icon: "file-text",
              },
              ...(data.reportsEnabled
                ? [
                    {
                      title: "Review report requests",
                      detail: "Find homeowners who explicitly asked to review a shared report.",
                      href: "/homeowners",
                      icon: "home" as const,
                    },
                  ]
                : []),
            ]}
          />
        </>
      ) : null}
      {data.view === "automations" ? (
        <>
          <Metrics
            items={[
              {
                label: "Monthly report preferences",
                value: data.properties.filter((property) => property.monthly && !property.paused)
                  .length,
                detail: "Properties enrolled for scheduled updates",
              },
              {
                label: "Paused report updates",
                value: data.properties.filter((property) => property.monthly && property.paused)
                  .length,
                detail: "Review these properties before resuming",
              },
            ]}
          />
          <Routing data={data} />
          <ReportRecords data={data} />
        </>
      ) : null}
      {data.view === "routing" ? <Routing data={data} /> : null}
      {data.view === "marketplace" ? (
        <>
          <ToolCards items={tools} />
          <p className={styles.note}>
            Opening a tool does not change a subscription or authorize paid lookups. Each connection
            is configured separately.
          </p>
        </>
      ) : null}
      {data.view === "team" ? (
        <>
          <Card className={styles.panel} padding="lg">
            <h2>Your workspace access</h2>
            <dl className={styles.details}>
              <div>
                <dt>Account</dt>
                <dd>{data.identity.name}</dd>
              </div>
              <div>
                <dt>Workspace</dt>
                <dd>{data.identity.company}</dd>
              </div>
              <div>
                <dt>Current role</dt>
                <dd>{data.identity.role}</dd>
              </div>
              <div>
                <dt>Personal report settings</dt>
                <dd>{data.canEdit ? "Can edit" : "Read-only"}</dd>
              </div>
            </dl>
            <p>
              This page shows your current access. Team membership and invitations are managed
              separately by the workspace owner; no invitations are sent here.
            </p>
            <Link href="/settings/account" variant="action">
              Manage account security
            </Link>
          </Card>
        </>
      ) : null}
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
