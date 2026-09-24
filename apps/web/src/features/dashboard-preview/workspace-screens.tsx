"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  Icon,
  Link,
  LiveRegion,
  TextField,
  type IconName,
} from "@oalo/ui";
import {
  dollars,
  leadStages,
  sampleLeads,
  type PreviewCampaign,
  type PreviewPartner,
  type PreviewView,
} from "./model.js";
import { useRequiredDashboardPreview } from "./preview-provider.js";
import {
  ActionLink,
  Badge,
  CampaignBadge,
  exampleCampaignHref,
  MarketingTabs,
  PageHeader,
  PipelineVisual,
  ProfileAvatar,
  QuietNote,
  SectionTitle,
  SelectField,
  StatCards,
} from "./product-components.js";
import { SetupWizard } from "./setup-wizard.js";
import { SettingsWorkspace } from "./workspace-settings.js";
import {
  AdsWorkspace,
  AutomationsWorkspace,
  ExploreWorkspace,
  MessagingWorkspace,
  TemplatesWorkspace,
} from "./marketing-workspaces.js";
import { AssetWorkspace } from "./asset-workspace.js";
import { buildWorkspaceReport, type ReportView } from "./workspace-report.js";
import styles from "./workspace.module.css";

function CampaignRows({
  campaigns,
  example = true,
}: {
  campaigns: readonly PreviewCampaign[];
  example?: boolean;
}) {
  return (
    <div className={styles.tableRegion} role="region" aria-label="Campaign list" tabIndex={0}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Campaign</th>
            <th scope="col">Partner</th>
            <th scope="col">Status</th>
            <th scope="col">Budget</th>
            <th scope="col">
              <span className={styles.srOnly}>Open campaign</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.campaignRef}>
              <td>
                <div className={styles.propertyCell}>
                  <span className={styles.propertyThumb}>
                    <Icon name="home" decorative />
                  </span>
                  <div>
                    <strong>{campaign.headline}</strong>
                    <small>{campaign.propertyAddress}</small>
                  </div>
                </div>
              </td>
              <td>{campaign.realtorDisplayName}</td>
              <td>
                <CampaignBadge campaign={campaign} />
              </td>
              <td>
                {dollars(campaign.totalBudgetMinor)}
                <small className={styles.below}>Planned</small>
              </td>
              <td>
                <Link
                  className={styles.roundLink}
                  href={campaign.detailHref}
                  aria-label={`Review ${campaign.headline}`}
                >
                  <Icon name="arrow-up-right" decorative />
                </Link>
              </td>
            </tr>
          ))}
          {example ? (
            <tr>
              <td>
                <div className={styles.propertyCell}>
                  <span className={styles.propertyThumb}>
                    <Icon name="home" decorative />
                  </span>
                  <div>
                    <strong>Cedar Street Open House Boost</strong>
                    <small>214 Cedar Street · Example campaign</small>
                  </div>
                </div>
              </td>
              <td>Jordan Avery</td>
              <td>
                <Badge tone="info">Example</Badge>
              </td>
              <td>
                {dollars(7500)}
                <small className={styles.below}>Planned</small>
              </td>
              <td>
                <Link
                  href={exampleCampaignHref}
                  className={styles.roundLink}
                  aria-label="Explore Cedar Street campaign"
                >
                  <Icon name="arrow-up-right" decorative />
                </Link>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function BoostCard() {
  return (
    <section className={styles.boostCard}>
      <span className={styles.featureIcon}>
        <Icon name="sparkles" decorative />
      </span>
      <span className={styles.eyebrow}>Open House Boost</span>
      <h2>
        One property.
        <br />
        Your next opportunity.
      </h2>
      <p>Bring your partner, property, and marketing together.</p>
      <ActionLink href="/marketing/campaigns/new">
        Create a campaign <Icon name="arrow-right" decorative size="sm" />
      </ActionLink>
      <div className={styles.featureFoot}>
        <span>
          <Icon name="globe" decorative size="sm" /> Property page
        </span>
        <span>
          <Icon name="image" decorative size="sm" /> Creative
        </span>
      </div>
    </section>
  );
}

function Overview() {
  const { state } = useRequiredDashboardPreview();
  const stageOf = (lead: (typeof sampleLeads)[number]) => state.leadStages[lead.id] ?? lead.stage;
  const newLeads = sampleLeads.filter((lead) => stageOf(lead) === "New");
  const approvals = state.campaigns.filter(
    (campaign) => !campaign.blocking && campaign.state !== "approved",
  );
  return (
    <>
      <PageHeader
        title="Your business, in focus."
        description="The relationships, campaigns, and next steps that move you forward."
        eyebrow="Overview"
      >
        <ActionLink href="/leads/pipeline" secondary>
          View pipeline
        </ActionLink>
        <ActionLink href="/marketing/campaigns/new">
          <Icon name="plus" decorative size="sm" /> Create campaign
        </ActionLink>
      </PageHeader>
      <StatCards
        items={[
          {
            label: "New leads",
            value: newLeads.length,
            detail: "Ready for a conversation",
            icon: "users",
            href: "/leads",
          },
          {
            label: "Appointments",
            value: sampleLeads.filter((lead) => stageOf(lead) === "Appointment").length,
            detail: "The next step toward home",
            icon: "calendar",
            href: "/leads/pipeline",
          },
          {
            label: "Realtor partners",
            value: state.partners.length,
            detail: "Your referral network",
            icon: "building",
            href: "/partners",
          },
          {
            label: "Awaiting approval",
            value: approvals.length,
            detail: "Campaigns ready for review",
            icon: "shield",
            href: "/marketing/campaigns",
          },
        ]}
      />
      <div className={styles.columns}>
        <Card className={styles.panel} padding="none">
          <SectionTitle
            title="Pipeline at a glance"
            detail="Every conversation has a next step."
            href="/leads/pipeline"
            link="Open pipeline"
          />
          <PipelineVisual state={state} />
          <div className={styles.panelFoot}>
            <span>
              <Icon name="users" decorative size="sm" /> {sampleLeads.length} leads across{" "}
              {leadStages.length} stages
            </span>
            <Badge tone="info">Demo data</Badge>
          </div>
        </Card>
        <Card className={styles.panel} padding="none">
          <SectionTitle title="Your next moves" detail="A little focus goes a long way." />
          <div className={styles.nextMoves}>
            <Link href="/leads">
              <span className={styles.iconTile}>
                <Icon name="users" decorative />
              </span>
              <span>
                <strong>
                  {newLeads.length
                    ? `${newLeads.length} leads need a first touch`
                    : "Your leads are moving forward"}
                </strong>
                <small>
                  {newLeads.length
                    ? newLeads.map((lead) => lead.name.split(" ")[0]).join(" and ")
                    : "Review the next conversation"}
                </small>
              </span>
              <Icon name="arrow-right" decorative size="sm" />
            </Link>
            <Link href="/marketing/campaigns">
              <span className={styles.iconTile} data-accent="2">
                <Icon name="shield" decorative />
              </span>
              <span>
                <strong>
                  {approvals.length
                    ? `${approvals.length} campaigns ready to review`
                    : "Start your next campaign"}
                </strong>
                <small>
                  {approvals.length
                    ? "Review the content and approve"
                    : "Put a property in the spotlight"}
                </small>
              </span>
              <Icon name="arrow-right" decorative size="sm" />
            </Link>
            <Link href="/partners">
              <span className={styles.iconTile} data-accent="3">
                <Icon name="building" decorative />
              </span>
              <span>
                <strong>Keep your partners close</strong>
                <small>{state.partners.length} relationships to build on</small>
              </span>
              <Icon name="arrow-right" decorative size="sm" />
            </Link>
          </div>
          <div className={styles.panelFoot}>
            <Link href="/onboarding" className={styles.textLink}>
              Make the most of AutomatedLO <Icon name="arrow-right" decorative size="sm" />
            </Link>
          </div>
        </Card>
      </div>
      <div className={styles.columns}>
        <div className={styles.stack}>
          <Card className={styles.panel} padding="none">
            <SectionTitle
              title="Your campaigns"
              detail="From an idea to a complete property story."
              href="/marketing/campaigns"
            />
            <CampaignRows campaigns={state.campaigns.slice(0, 3)} />
          </Card>
          <Card className={styles.panel} padding="none">
            <SectionTitle title="Partners driving conversations" href="/partners" />
            <div className={styles.partnerStrip}>
              {state.partners.slice(0, 3).map((partner, index) => (
                <Link href="/partners" key={partner.id}>
                  <ProfileAvatar name={partner.name} index={index} />
                  <span>
                    <strong>{partner.name}</strong>
                    <small>{partner.company}</small>
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
        <BoostCard />
      </div>
      <Card className={styles.panel} padding="none">
        <SectionTitle title="Recent activity" detail="A clear view of what changed." />
        <div className={styles.activityGrid}>
          {state.campaigns.length ? (
            state.campaigns.slice(0, 3).map((campaign) => (
              <div key={campaign.campaignRef}>
                <Icon name="megaphone" decorative />
                <span>
                  <strong>{campaign.headline}</strong>
                  <small>Saved {new Date(campaign.createdAt).toLocaleDateString()}</small>
                </span>
                <CampaignBadge campaign={campaign} />
              </div>
            ))
          ) : (
            <>
              <div>
                <Icon name="home" decorative />
                <span>
                  <strong>Cedar Street is ready to explore</strong>
                  <small>Example campaign and property page</small>
                </span>
                <Link href={exampleCampaignHref}>View</Link>
              </div>
              <div>
                <Icon name="users" decorative />
                <span>
                  <strong>Your partner network is here</strong>
                  <small>Meet Jordan, Taylor, and Casey</small>
                </span>
                <Link href="/partners">View</Link>
              </div>
            </>
          )}
        </div>
      </Card>
    </>
  );
}

function Campaigns({ marketing = false }: { marketing?: boolean }) {
  const { state } = useRequiredDashboardPreview();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All campaigns");
  const [view, setView] = useState<"list" | "cards">("list");
  const filtered = state.campaigns.filter(
    (campaign) =>
      `${campaign.headline} ${campaign.propertyAddress} ${campaign.realtorDisplayName}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "All campaigns" ||
        (status === "Needs changes"
          ? campaign.blocking
          : status === "Approved"
            ? campaign.state === "approved"
            : !campaign.blocking && campaign.state !== "approved")),
  );
  const showExample =
    status === "All campaigns" &&
    "cedar street open house boost 214 jordan avery example".includes(query.toLowerCase());
  return (
    <>
      <PageHeader
        title={marketing ? "A bigger stage for your business." : "Campaigns"}
        eyebrow={marketing ? "Marketing studio" : undefined}
        description={
          marketing
            ? "Turn great properties and strong partnerships into your next conversation."
            : "Create, review, and manage your property marketing."
        }
      >
        <ActionLink href="/marketing/campaigns/new">
          <Icon name="plus" decorative size="sm" /> Create campaign
        </ActionLink>
      </PageHeader>
      <MarketingTabs />
      {marketing ? (
        <div className={styles.studioHero}>
          <div>
            <Badge tone="info">Your first campaign starts here</Badge>
            <h2>
              Make every open house
              <br />
              an opportunity.
            </h2>
            <p>A property page, creative, and a clear next step for every interested buyer.</p>
            <ActionLink href="/marketing/campaigns/new">
              Build an Open House Boost <Icon name="arrow-right" decorative size="sm" />
            </ActionLink>
          </div>
          <div className={styles.packageVisual} aria-label="Open House Boost package">
            <span className={styles.packageHouse}>
              <Icon name="home" decorative size="lg" />
            </span>
            <div>
              <Icon name="globe" decorative />
              <span>
                Property website<small>A home for the listing</small>
              </span>
              <Icon name="check" decorative size="sm" />
            </div>
            <div>
              <Icon name="image" decorative />
              <span>
                Social creative<small>A reason to stop scrolling</small>
              </span>
              <Icon name="check" decorative size="sm" />
            </div>
            <div>
              <Icon name="users" decorative />
              <span>
                Lead experience<small>A conversation worth starting</small>
              </span>
              <Icon name="check" decorative size="sm" />
            </div>
          </div>
        </div>
      ) : (
        <StatCards
          items={[
            {
              label: "Your drafts",
              value: state.campaigns.length,
              detail: "Created in this workspace",
              icon: "file-text",
            },
            {
              label: "Awaiting approval",
              value: state.campaigns.filter((c) => !c.blocking && c.state !== "approved").length,
              detail: "Ready for your review",
              icon: "shield",
            },
            {
              label: "Approved",
              value: state.campaigns.filter((c) => c.state === "approved").length,
              detail: "Demo approvals",
              icon: "check",
            },
            {
              label: "Needs changes",
              value: state.campaigns.filter((c) => c.blocking).length,
              detail: "A few details to revisit",
              icon: "file-text",
            },
          ]}
        />
      )}
      <Card className={styles.panel} padding="none">
        <div className={styles.listToolbar}>
          <TextField
            label="Search campaigns"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by property, campaign, or partner"
          />
          <SelectField
            label="Campaign status"
            value={status}
            onChange={setStatus}
            options={["All campaigns", "Awaiting approval", "Needs changes", "Approved"]}
          />
          <div className={styles.viewToggle} role="group" aria-label="Campaign view">
            <Button variant="ghost" aria-pressed={view === "list"} onClick={() => setView("list")}>
              <Icon name="menu" decorative size="sm" /> List
            </Button>
            <Button
              variant="ghost"
              aria-pressed={view === "cards"}
              onClick={() => setView("cards")}
            >
              <Icon name="layers" decorative size="sm" /> Cards
            </Button>
          </div>
        </div>
        {!filtered.length && !showExample ? (
          <EmptyState
            title="No campaigns found"
            description="Try another search or create a new campaign."
          />
        ) : view === "list" ? (
          <CampaignRows campaigns={filtered} example={showExample} />
        ) : (
          <div className={styles.campaignCards}>
            {filtered.map((campaign) => (
              <Card padding="md" className={styles.card} key={campaign.campaignRef}>
                <span className={styles.coverArt}>
                  <Icon name="home" decorative size="lg" />
                </span>
                <CampaignBadge campaign={campaign} />
                <h2>{campaign.headline}</h2>
                <p>{campaign.propertyAddress}</p>
                <div className={styles.row}>
                  <small>{campaign.realtorDisplayName}</small>
                  <strong>{dollars(campaign.totalBudgetMinor)}</strong>
                </div>
                <ActionLink href={campaign.detailHref} secondary>
                  Review campaign
                </ActionLink>
              </Card>
            ))}
            {showExample ? (
              <Card padding="md" className={styles.card}>
                <span className={styles.coverArt}>
                  <Icon name="home" decorative size="lg" />
                </span>
                <Badge tone="info">Example</Badge>
                <h2>Cedar Street Open House Boost</h2>
                <p>214 Cedar Street</p>
                <ActionLink href={exampleCampaignHref} secondary>
                  Explore campaign
                </ActionLink>
              </Card>
            ) : null}
          </div>
        )}
        <div className={styles.panelFoot}>
          <span>
            {filtered.length} saved campaigns{showExample ? " · 1 example" : ""}
          </span>
          <span>Open House Boost</span>
        </div>
      </Card>
    </>
  );
}

function Leads({ pipeline = false }: { pipeline?: boolean }) {
  const { state, save } = useRequiredDashboardPreview();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("All stages");
  const [source, setSource] = useState("All sources");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<(typeof sampleLeads)[number] | null>(null);
  const leads = sampleLeads.filter(
    (lead) =>
      `${lead.name} ${lead.email} ${lead.partner}`.toLowerCase().includes(query.toLowerCase()) &&
      (stage === "All stages" || (state.leadStages[lead.id] ?? lead.stage) === stage) &&
      (source === "All sources" || lead.source === source),
  );
  const stageControl = (lead: (typeof sampleLeads)[number]) => (
    <SelectField
      compact
      label={`Stage for ${lead.name}`}
      value={state.leadStages[lead.id] ?? lead.stage}
      options={leadStages}
      onChange={(value) => {
        const next = leadStages.find((item) => item === value);
        if (
          next &&
          save((current) => ({
            ...current,
            leadStages: { ...current.leadStages, [lead.id]: next },
          }))
        )
          setMessage(`${lead.name} moved to ${next}.`);
      }}
    />
  );
  return (
    <>
      <PageHeader
        title={pipeline ? "Every lead. A next step." : "Leads"}
        eyebrow={pipeline ? "Your pipeline" : undefined}
        description="Build a clear path from first conversation to closing."
      >
        <ActionLink href={pipeline ? "/leads" : "/leads/pipeline"} secondary>
          <Icon name={pipeline ? "menu" : "layers"} decorative size="sm" />
          {pipeline ? "List view" : "Pipeline view"}
        </ActionLink>
        <ActionLink href="/settings/routing" secondary>
          Lead routing
        </ActionLink>
      </PageHeader>
      <StatCards
        items={[
          {
            label: "New conversations",
            value: sampleLeads.filter((lead) => (state.leadStages[lead.id] ?? lead.stage) === "New")
              .length,
            detail: "Ready for a first touch",
            icon: "users",
          },
          {
            label: "Appointments",
            value: sampleLeads.filter(
              (lead) => (state.leadStages[lead.id] ?? lead.stage) === "Appointment",
            ).length,
            detail: "A chance to understand their goals",
            icon: "calendar",
          },
          {
            label: "Applications",
            value: sampleLeads.filter(
              (lead) => (state.leadStages[lead.id] ?? lead.stage) === "Application",
            ).length,
            detail: "Moving toward a decision",
            icon: "file-text",
          },
          {
            label: "Closed",
            value: sampleLeads.filter(
              (lead) => (state.leadStages[lead.id] ?? lead.stage) === "Closed",
            ).length,
            detail: "Completed conversations",
            icon: "check",
          },
        ]}
      />
      <div className={styles.listToolbar}>
        <TextField
          label="Search leads"
          placeholder="Name, email, or Realtor partner"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <SelectField
          label="Filter by stage"
          value={stage}
          onChange={setStage}
          options={["All stages", ...leadStages]}
        />
        <SelectField
          label="Filter by source"
          value={source}
          onChange={setSource}
          options={["All sources", "Cedar Street open house", "Partner referral"]}
        />
        <Badge tone="info">{leads.length} leads</Badge>
      </div>
      {query || stage !== "All stages" || source !== "All sources" ? (
        <div className={styles.row}>
          <span className={styles.muted}>
            Showing {leads.length} of {sampleLeads.length} demo leads
          </span>
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setStage("All stages");
              setSource("All sources");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : null}
      {message ? <LiveRegion message={message} visible /> : null}
      {pipeline ? (
        <div
          className={styles.board}
          role="region"
          aria-label="Lead pipeline, scroll horizontally for more stages"
          data-product-guide="lead-stages"
          tabIndex={0}
        >
          {leadStages.map((lane, index) => (
            <section className={styles.lane} key={lane}>
              <div className={styles.laneHeading}>
                <span className={styles.legendDot} data-stage={index} />
                <h2>{lane}</h2>
                <span>
                  {
                    leads.filter((lead) => (state.leadStages[lead.id] ?? lead.stage) === lane)
                      .length
                  }
                </span>
              </div>
              {leads
                .filter((lead) => (state.leadStages[lead.id] ?? lead.stage) === lane)
                .map((lead) => (
                  <Card className={styles.leadCard} padding="none" key={lead.id}>
                    <div className={styles.row}>
                      <ProfileAvatar name={lead.name} index={index} />
                      <Icon name="arrow-up-right" decorative size="sm" />
                    </div>
                    <Button
                      variant="ghost"
                      className={styles.nameButton}
                      onClick={() => setSelected(lead)}
                    >
                      {lead.name}
                    </Button>
                    <p>{lead.source}</p>
                    <span className={styles.leadPartner}>
                      <Icon name="building" decorative size="sm" />
                      {lead.partner}
                    </span>
                    {stageControl(lead)}
                  </Card>
                ))}
              {!leads.some((lead) => (state.leadStages[lead.id] ?? lead.stage) === lane) ? (
                <p className={styles.emptyLane}>
                  A new milestone
                  <br />
                  is waiting here.
                </p>
              ) : null}
            </section>
          ))}
        </div>
      ) : (
        <div className={styles.tableRegion} role="region" aria-label="Lead list" tabIndex={0}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Source</th>
                <th scope="col">Realtor partner</th>
                <th scope="col">Stage</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, index) => (
                <tr key={lead.id}>
                  <td>
                    <div className={styles.personCell}>
                      <ProfileAvatar name={lead.name} index={index} />
                      <div>
                        <Button
                          className={styles.nameButton}
                          variant="ghost"
                          onClick={() => setSelected(lead)}
                        >
                          {lead.name}
                        </Button>
                        <small>{lead.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>{lead.source}</td>
                  <td>{lead.partner}</td>
                  <td>{stageControl(lead)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!leads.length ? (
        <EmptyState
          title="No leads found"
          description="Try a different name or choose All stages."
        />
      ) : null}
      <Dialog
        title={selected?.name ?? "Lead details"}
        open={selected !== null}
        onClose={() => setSelected(null)}
        description="Keep the next conversation in view."
      >
        {selected ? (
          <div className={styles.stack}>
            <div className={styles.profileIntro}>
              <ProfileAvatar name={selected.name} />
              <div>
                <strong>{selected.name}</strong>
                <p>{selected.email}</p>
              </div>
            </div>
            <div className={styles.detailRows}>
              <div>
                <span>Source</span>
                <strong>{selected.source}</strong>
              </div>
              <div>
                <span>Realtor partner</span>
                <strong>{selected.partner}</strong>
              </div>
            </div>
            {stageControl(selected)}
            <Card padding="md" className={styles.card}>
              <h3>Suggested next step</h3>
              <p>
                {
                  {
                    New: "Introduce yourself and ask what they are looking for in their next home.",
                    Contacted: "Offer a time to discuss their questions and next steps.",
                    Appointment: "Confirm the conversation and prepare the details they need.",
                    Application: "Review outstanding items and keep the buyer informed.",
                    Closed:
                      "Thank them for working with you and stay available for future questions.",
                  }[state.leadStages[selected.id] ?? selected.stage]
                }
              </p>
              <ActionLink href="/marketing/messaging" secondary>
                Prepare a follow-up draft
              </ActionLink>
            </Card>
            <QuietNote>
              Calling and messaging become available when HighLevel is connected.
            </QuietNote>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

function Partners() {
  const { state, save } = useRequiredDashboardPreview();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PreviewPartner | null>(null);
  const [message, setMessage] = useState("");
  const partners = state.partners.filter((partner) =>
    `${partner.name} ${partner.company}`.toLowerCase().includes(query.toLowerCase()),
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const partner = {
      id: editing?.id ?? `preview-partner-${crypto.randomUUID()}`,
      name: String(form.get("name") ?? ""),
      company: String(form.get("company") ?? ""),
      email: String(form.get("email") ?? ""),
    };
    if (
      save((current) => ({
        ...current,
        partners: editing
          ? current.partners.map((item) => (item.id === editing.id ? partner : item))
          : [...current.partners, partner],
      }))
    ) {
      setOpen(false);
      setEditing(null);
      setMessage(`${partner.name} saved.`);
    }
  }
  return (
    <>
      <PageHeader
        title="Great business starts with relationships."
        eyebrow="Realtor partners"
        description="Your people, their properties, and the conversations you build together."
      >
        <Button
          data-product-guide="add-partner"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Icon name="plus" decorative size="sm" /> Add partner
        </Button>
      </PageHeader>
      <StatCards
        items={[
          {
            label: "Your network",
            value: state.partners.length,
            detail: "Realtor relationships",
            icon: "users",
          },
          {
            label: "Open house leads",
            value: sampleLeads.filter((lead) => lead.source.includes("open house")).length,
            detail: "Conversations from property marketing",
            icon: "home",
          },
          {
            label: "Partner referrals",
            value: sampleLeads.filter((lead) => lead.source === "Partner referral").length,
            detail: "Introductions worth following up",
            icon: "building",
          },
          {
            label: "Campaigns created",
            value: state.campaigns.length,
            detail: "Built around a property",
            icon: "megaphone",
          },
        ]}
      />
      <div className={styles.listToolbar} data-product-guide="partner-search">
        <TextField
          label="Search partners"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or brokerage"
        />
        <span className={styles.muted}>{partners.length} partners</span>
      </div>
      {message ? <LiveRegion visible message={message} /> : null}
      <div className={styles.partnerCards}>
        {partners.map((partner, index) => {
          const referrals = sampleLeads.filter((lead) => lead.partner === partner.name).length;
          return (
            <Card className={styles.partnerCard} padding="none" key={partner.id}>
              <div className={styles.partnerCover} data-accent={index % 4} />
              <div className={styles.partnerBody}>
                <div className={styles.row}>
                  <ProfileAvatar name={partner.name} index={index} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(partner);
                      setOpen(true);
                    }}
                    aria-label={`Edit ${partner.name}`}
                  >
                    Edit profile
                  </Button>
                </div>
                <h2>{partner.name}</h2>
                <p>{partner.company}</p>
                <span className={styles.emailLine}>
                  <Icon name="mail" decorative size="sm" />
                  {partner.email || "Add an email address"}
                </span>
                <div className={styles.partnerNumbers}>
                  <div>
                    <strong>{referrals}</strong>
                    <span>Leads</span>
                  </div>
                  <div>
                    <strong>
                      {
                        state.campaigns.filter(
                          (campaign) => campaign.realtorDisplayName === partner.name,
                        ).length
                      }
                    </strong>
                    <span>Campaigns</span>
                  </div>
                </div>
                <ActionLink href="/marketing/campaigns/new" secondary>
                  Create campaign <Icon name="arrow-up-right" decorative size="sm" />
                </ActionLink>
              </div>
            </Card>
          );
        })}
      </div>
      {!partners.length ? (
        <EmptyState
          title="No partners found"
          description="Try another search or add your first partner."
        />
      ) : null}
      <Dialog
        title={editing ? "Edit partner" : "Add a Realtor partner"}
        description="Build the profile for your next collaboration. Demo entries stay on this device."
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      >
        <form className={styles.form} onSubmit={submit} key={editing?.id ?? "new"}>
          <TextField
            name="name"
            label="Partner name"
            requirement="required"
            minLength={2}
            maxLength={120}
            defaultValue={editing?.name}
          />
          <TextField
            name="company"
            label="Brokerage"
            requirement="required"
            minLength={2}
            maxLength={160}
            defaultValue={editing?.company}
          />
          <TextField
            name="email"
            label="Email address"
            type="email"
            placeholder="partner@example.test"
            maxLength={200}
            defaultValue={editing?.email}
          />
          <Button type="submit">Save partner</Button>
        </form>
      </Dialog>
    </>
  );
}

function Reports() {
  const { state } = useRequiredDashboardPreview();
  const [view, setView] = useState<ReportView>("Pipeline");
  const [message, setMessage] = useState("");
  const stages = sampleLeads.map((lead) => state.leadStages[lead.id] ?? lead.stage);
  function exportReport() {
    try {
      const csv = buildWorkspaceReport(state, view);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `automatedlo-demo-${view.toLowerCase()}.csv`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(`Your ${view.toLowerCase()} report is ready.`);
    } catch {
      setMessage("The report could not be downloaded. Please try again.");
    }
  }
  return (
    <>
      <PageHeader
        title="See what moves your business."
        eyebrow="Reports"
        description="Follow the connection between your marketing, partners, and pipeline."
      >
        <Button variant="outline" onClick={exportReport} data-product-guide="download-report">
          <Icon name="download" decorative size="sm" /> Download report
        </Button>
      </PageHeader>
      <div className={styles.reportHeading}>
        <div className={styles.viewToggle} role="group" aria-label="Report view">
          {(["Pipeline", "Campaigns", "Partners"] as const).map((tab) => (
            <Button
              variant="ghost"
              key={tab}
              aria-pressed={view === tab}
              onClick={() => {
                setView(tab);
                setMessage("");
              }}
            >
              {tab}
            </Button>
          ))}
        </div>
        <Badge tone="info">Demo data</Badge>
      </div>
      {message ? <LiveRegion message={message} visible /> : null}
      <StatCards
        items={
          view === "Campaigns"
            ? [
                {
                  label: "Saved campaigns",
                  value: state.campaigns.length,
                  detail: "Included in this report",
                  icon: "megaphone",
                },
                {
                  label: "Approved",
                  value: state.campaigns.filter(
                    (campaign) => campaign.state === "approved" && !campaign.blocking,
                  ).length,
                  detail: "Demo approvals",
                  icon: "shield",
                },
                {
                  label: "Planned budget",
                  value: dollars(
                    state.campaigns.reduce(
                      (total, campaign) => total + campaign.totalBudgetMinor,
                      0,
                    ),
                  ),
                  detail: "Planned, not actual spend",
                  icon: "credit-card",
                },
                {
                  label: "Live results",
                  value: "Unavailable",
                  detail: "Requires connected reporting",
                  icon: "chart",
                },
              ]
            : [
                {
                  label: "Total leads",
                  value: sampleLeads.length,
                  detail: "Across your pipeline",
                  icon: "users",
                },
                {
                  label: "Appointments",
                  value: stages.filter((stage) => stage === "Appointment").length,
                  detail: "Conversations taking shape",
                  icon: "calendar",
                },
                {
                  label: "Applications",
                  value: stages.filter((stage) => stage === "Application").length,
                  detail: "The next step toward closing",
                  icon: "file-text",
                },
                {
                  label: "Ad spend",
                  value: "Unavailable",
                  detail: "Connect an ad account to see spend",
                  icon: "credit-card",
                },
              ]
        }
      />
      {view === "Pipeline" ? (
        <div className={styles.columns}>
          <Card className={styles.panel} padding="none">
            <SectionTitle title="Lead distribution" detail="A clear picture of every stage." />
            <PipelineVisual state={state} />
            <div className={styles.panelFoot}>
              <Link href="/leads/pipeline">Manage pipeline</Link>
              <span>{sampleLeads.length} demo leads</span>
            </div>
          </Card>
          <Card className={styles.panel} padding="none">
            <SectionTitle title="Where conversations begin" />
            <div className={styles.sourceRows}>
              {["Cedar Street open house", "Partner referral"].map((source, index) => (
                <div key={source}>
                  <span className={styles.iconTile} data-accent={index}>
                    <Icon name={index ? "users" : "home"} decorative />
                  </span>
                  <span>
                    <strong>{source}</strong>
                    <small>
                      {sampleLeads.filter((lead) => lead.source === source).length} leads
                    </small>
                  </span>
                  <strong>
                    {Math.round(
                      (sampleLeads.filter((lead) => lead.source === source).length /
                        sampleLeads.length) *
                        100,
                    )}
                    %
                  </strong>
                </div>
              ))}
            </div>
            <QuietNote>
              Live attribution and funded volume appear after HighLevel is connected.
            </QuietNote>
          </Card>
        </div>
      ) : view === "Campaigns" ? (
        <Card className={styles.panel} padding="none">
          <SectionTitle
            title="Campaign performance"
            detail="Review your campaign progress before launch."
          />
          {state.campaigns.length ? (
            <CampaignRows campaigns={state.campaigns} example={false} />
          ) : (
            <div className={styles.panelInset}>
              <EmptyState
                title="No saved campaigns to report yet"
                description="Create a campaign to review its status and planned budget here."
              />
              <ActionLink href="/marketing/campaigns/new">Create campaign</ActionLink>
            </div>
          )}
          <QuietNote>
            Spend and delivery results become available when an ad account is connected.
          </QuietNote>
        </Card>
      ) : (
        <Card className={styles.panel} padding="none">
          <SectionTitle
            title="Partner contributions"
            detail="Sample lead attribution alongside your saved campaign activity."
            href="/partners"
            link="Manage partners"
          />
          <div
            className={styles.tableRegion}
            role="region"
            aria-label="Partner report"
            tabIndex={0}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Partner</th>
                  <th scope="col">Brokerage</th>
                  <th scope="col">Demo leads</th>
                  <th scope="col">Saved campaigns</th>
                </tr>
              </thead>
              <tbody>
                {state.partners.map((partner, index) => (
                  <tr key={partner.id}>
                    <td>
                      <div className={styles.personCell}>
                        <ProfileAvatar name={partner.name} index={index} />
                        <strong>{partner.name}</strong>
                      </div>
                    </td>
                    <td>{partner.company}</td>
                    <td>{sampleLeads.filter((lead) => lead.partner === partner.name).length}</td>
                    <td>
                      {
                        state.campaigns.filter(
                          (campaign) => campaign.realtorDisplayName === partner.name,
                        ).length
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card className={styles.panel} padding="none">
        <SectionTitle title="Your partner network" href="/partners" />
        <div className={styles.partnerStrip}>
          {state.partners.map((partner, index) => (
            <div key={partner.id}>
              <ProfileAvatar name={partner.name} index={index} />
              <span>
                <strong>{partner.name}</strong>
                <small>
                  {sampleLeads.filter((lead) => lead.partner === partner.name).length} leads ·{" "}
                  {partner.company}
                </small>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

export function DashboardPreviewScreen({ view }: { view: PreviewView }) {
  const { ready } = useRequiredDashboardPreview();
  if (!ready)
    return (
      <div className={styles.page}>
        <p role="status">Opening your workspace…</p>
      </div>
    );
  let content: ReactNode;
  switch (view) {
    case "overview":
      content = <Overview />;
      break;
    case "marketing":
      content = <Campaigns marketing />;
      break;
    case "campaigns":
      content = <Campaigns />;
      break;
    case "partners":
      content = <Partners />;
      break;
    case "leads":
      content = <Leads />;
      break;
    case "pipeline":
      content = <Leads pipeline />;
      break;
    case "reports":
      content = <Reports />;
      break;
    case "property-sites":
      content = <AssetWorkspace />;
      break;
    case "creative":
      content = <AssetWorkspace creative />;
      break;
    case "onboarding":
      content = <SetupWizard />;
      break;
    case "settings":
    case "brand":
    case "account":
    case "connections":
    case "routing":
    case "team":
    case "billing":
      content = <SettingsWorkspace view={view} />;
      break;
    case "ads":
      content = <AdsWorkspace />;
      break;
    case "messaging":
      content = <MessagingWorkspace />;
      break;
    case "automations":
      content = <AutomationsWorkspace />;
      break;
    case "blueprints":
      content = <TemplatesWorkspace />;
      break;
    case "marketplace":
      content = <ExploreWorkspace />;
      break;
  }
  return <div className={styles.page}>{content}</div>;
}

export function DashboardPreviewCampaign({ campaignRef }: { campaignRef: string }) {
  const { state, ready, save } = useRequiredDashboardPreview();
  const [confirm, setConfirm] = useState(false);
  const campaign = state.campaigns.find((item) => item.campaignRef === campaignRef);
  if (!ready) return <p role="status">Opening your campaign…</p>;
  if (!campaign)
    return (
      <div className={styles.page}>
        <PageHeader
          title="We couldn't find this campaign."
          description="Demo campaigns are saved on the device where they were created."
        />
        <ActionLink href="/marketing/campaigns">Back to campaigns</ActionLink>
      </div>
    );
  return (
    <div className={styles.page}>
      <PageHeader
        title={campaign.headline}
        eyebrow="Campaign details"
        description={campaign.propertyAddress}
      >
        <ActionLink href="/marketing/campaigns" secondary>
          All campaigns
        </ActionLink>
      </PageHeader>
      <div className={styles.row}>
        <CampaignBadge campaign={campaign} />
        <span className={styles.muted}>
          Created {new Date(campaign.createdAt).toLocaleDateString()}
        </span>
      </div>
      <StatCards
        items={[
          {
            label: "Realtor partner",
            value: campaign.realtorDisplayName,
            detail: "Your campaign collaborator",
            icon: "users",
          },
          {
            label: "Daily budget",
            value: dollars(campaign.dailyBudgetMinor),
            detail: "Planned spend",
            icon: "calendar",
          },
          {
            label: "Total budget",
            value: dollars(campaign.totalBudgetMinor),
            detail: "Planned spend",
            icon: "credit-card",
          },
          { label: "Ad category", value: "Housing", detail: "Open House Boost", icon: "home" },
        ]}
      />
      <div className={styles.columns}>
        <div className={styles.stack}>
          <Card className={styles.panel} padding="none">
            <SectionTitle
              title={
                campaign.blocking
                  ? "A few details need your attention."
                  : "Your content checks are complete."
              }
              detail={
                campaign.blocking
                  ? "Review the notes below before approving."
                  : "Review your campaign, then give it the go-ahead."
              }
            />
            <div className={styles.checkFindings} data-product-guide="campaign-findings">
              {campaign.findings.length ? (
                campaign.findings.map((finding, index) => (
                  <div key={`${finding.ruleCode}-${index}`}>
                    <Icon
                      name={finding.severity === "blocking" ? "alert-triangle" : "info"}
                      decorative
                      tone={finding.severity === "blocking" ? "critical" : "info"}
                    />
                    <span>
                      <strong>{finding.description}</strong>
                      <p>{finding.remediation}</p>
                    </span>
                  </div>
                ))
              ) : (
                <div>
                  <Icon name="check" decorative tone="success" />
                  <span>
                    <strong>Looking good.</strong>
                    <p>No issues found in the campaign content.</p>
                  </span>
                </div>
              )}
            </div>
          </Card>
          <Card className={styles.panel} padding="none">
            <SectionTitle
              title="Your property marketing package"
              detail="See how the complete experience comes together."
            />
            <div className={styles.packageLinks}>
              {[
                ["Property website", "/marketing/property-sites", "globe"],
                ["Creative library", "/marketing/creative", "image"],
              ].map(([label, href, icon]) => (
                <Link key={href} href={href ?? "/marketing"}>
                  <Icon name={icon as IconName} decorative />
                  <span>
                    <strong>{label}</strong>
                    <small>Explore example assets</small>
                  </span>
                  <Icon name="arrow-up-right" decorative size="sm" />
                </Link>
              ))}
            </div>
            <QuietNote>
              New asset generation and publishing will be available with connected accounts.
            </QuietNote>
          </Card>
        </div>
        <Card className={styles.approvalPanel} padding="md" data-product-guide="campaign-approval">
          <span className={styles.iconTile}>
            <Icon name="shield" decorative />
          </span>
          <h2>Ready for the next step?</h2>
          <p>Give the campaign a final look before recording your approval.</p>
          <Badge tone="info">Demo approval</Badge>
          <Button
            disabled={campaign.blocking || campaign.state === "approved"}
            onClick={() => setConfirm(true)}
          >
            {campaign.state === "approved" ? "Approval recorded" : "Approve campaign"}
          </Button>
          {campaign.blocking ? <p>Resolve the content notes before approving.</p> : null}
          <Link href="/marketing/campaigns/new">Create another draft</Link>
          <div className={styles.divider} />
          <Button disabled>Publish campaign</Button>
          {state.setup.campaignRef === campaignRef ? (
            <Link href="/onboarding" variant="action">
              Continue my setup
            </Link>
          ) : null}
          <small>
            Connect an ad account to publish. This demo does not launch ads or spend money.
          </small>
        </Card>
      </div>
      <Dialog
        title="Approve this campaign?"
        description="This records a demo approval on this device. Nothing is published or charged."
        open={confirm}
        onClose={() => setConfirm(false)}
        footer={
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Keep reviewing
            </Button>
            <Button
              onClick={() => {
                if (
                  save((current) => ({
                    ...current,
                    campaigns: current.campaigns.map((item) =>
                      item.campaignRef === campaignRef && !item.blocking
                        ? { ...item, state: "approved" }
                        : item,
                    ),
                  }))
                )
                  setConfirm(false);
              }}
            >
              Confirm approval
            </Button>
          </div>
        }
      >
        <p>{campaign.headline}</p>
      </Dialog>
    </div>
  );
}
