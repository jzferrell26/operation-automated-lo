"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Card, Dialog, EmptyState, Icon, Link, LiveRegion, TextField } from "@oalo/ui";
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
  PageHeader,
  PipelineVisual,
  ProfileAvatar,
  SectionTitle,
  SelectField,
  StatCards,
} from "./product-components.js";
import { SettingsWorkspace } from "./workspace-settings.js";
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
                    <strong>Cedar Street open house</strong>
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
      <span className={styles.eyebrow}>Launch an ad</span>
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
          },
          {
            label: "Appointments",
            value: sampleLeads.filter((lead) => stageOf(lead) === "Appointment").length,
            detail: "The next step toward home",
            icon: "calendar",
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
          <SectionTitle title="Pipeline at a glance" detail="Every conversation has a next step." />
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

function Campaigns() {
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
    "cedar street open house 214 jordan avery example".includes(query.toLowerCase());
  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Create, review, and manage your property marketing."
      >
        <ActionLink href="/marketing/campaigns/new">
          <Icon name="plus" decorative size="sm" /> Create campaign
        </ActionLink>
      </PageHeader>
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
                <h2>Cedar Street open house</h2>
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
        </div>
      </Card>
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
    case "campaigns":
      content = <Campaigns />;
      break;
    case "partners":
      content = <Partners />;
      break;
    case "settings":
    case "brand":
    case "account":
    case "connections":
    case "routing":
    case "billing":
      content = <SettingsWorkspace view={view} />;
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
          { label: "Ad category", value: "Housing", detail: "Special ad category", icon: "home" },
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
