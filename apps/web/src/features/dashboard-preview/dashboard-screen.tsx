"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  FormField,
  Icon,
  Link,
  LiveRegion,
  TextArea,
  TextField,
} from "@oalo/ui";
import {
  dollars,
  leadStages,
  sampleLeads,
  type PreviewCampaign,
  type PreviewView,
} from "./model.js";
import { useRequiredDashboardPreview } from "./preview-provider.js";
import styles from "./dashboard.module.css";

const sampleCampaignHref = "/marketing/campaigns/synthetic-open-house-001";
const samplePageHref = "/public/synthetic-open-house-v3";

function Tag({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "critical" | "neutral";
}) {
  return (
    <span className={styles.tag} data-tone={tone}>
      {children}
    </span>
  );
}
function Header({
  title,
  description,
  children,
  eyebrow = "Your workspace",
}: {
  title: string;
  description: string;
  children?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className={styles.header}>
      <div>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className={styles.actions}>{children}</div>
    </header>
  );
}
function Stats({
  items,
}: {
  items: readonly { label: string; value: string | number; detail: string }[];
}) {
  return (
    <div className={styles.stats}>
      {items.map((item) => (
        <Card key={item.label} className={styles.stat} padding="md">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.detail}</small>
        </Card>
      ))}
    </div>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <FormField label={label} className={styles.selectField}>
      {(control) => (
        <select {...control} value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      )}
    </FormField>
  );
}
function CampaignTag({ campaign }: { campaign: PreviewCampaign }) {
  return campaign.blocking ? (
    <Tag tone="critical">Changes needed</Tag>
  ) : campaign.state === "approved" ? (
    <Tag tone="success">Test approved</Tag>
  ) : (
    <Tag tone="warning">Ready for test approval</Tag>
  );
}
function ConnectionsCard() {
  return (
    <Card className={styles.card} padding="md">
      <div className={styles.sectionHead}>
        <h2>Connection readiness</h2>
        <Icon name="external-link" decorative size="sm" />
      </div>
      {[
        ["HighLevel", "Contacts, opportunities, and lead routing"],
        ["Meta", "Ad accounts and campaign delivery"],
        ["Billing", "Subscription and campaign allowances"],
      ].map(([name, detail]) => (
        <div className={styles.connection} key={name}>
          <div className={styles.row}>
            <strong>{name}</strong>
            <Tag tone="neutral">Not connected</Tag>
          </div>
          <p>{detail}</p>
        </div>
      ))}
      <Link href="/settings/connections" variant="action">
        Review connections
      </Link>
    </Card>
  );
}
function CampaignRows({ campaigns }: { campaigns: readonly PreviewCampaign[] }) {
  return (
    <div className={styles.tableRegion} role="region" aria-label="Campaign list" tabIndex={0}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Campaign / property</th>
            <th scope="col">Status</th>
            <th scope="col">Budget</th>
            <th scope="col">Next step</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.campaignRef}>
              <td>
                <div>
                  <strong>{campaign.headline}</strong>
                  <small className={styles.muted}>{campaign.propertyAddress}</small>
                </div>
              </td>
              <td>
                <CampaignTag campaign={campaign} />
              </td>
              <td>
                {dollars(campaign.totalBudgetMinor)}
                <small className={styles.muted}> planned</small>
              </td>
              <td>
                <Link href={campaign.detailHref}>Review campaign</Link>
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <div>
                <strong>Cedar Street Open House Boost</strong>
                <small className={styles.muted}>214 Cedar Street · Included sample</small>
              </div>
            </td>
            <td>
              <Tag>Sample package</Tag>
            </td>
            <td>
              {dollars(7500)}
              <small className={styles.muted}> example</small>
            </td>
            <td>
              <Link href={sampleCampaignHref}>Explore sample</Link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Overview() {
  const { state } = useRequiredDashboardPreview();
  const stages = sampleLeads.map((lead) => state.leadStages[lead.id] ?? lead.stage);
  return (
    <>
      <Header
        title="Your business, at a glance"
        description={`${state.profile.company} · Explore your daily workspace with sample data.`}
      >
        <Link href="/onboarding" variant="action">
          Quick start
        </Link>
        <Link href="/marketing/campaigns/new" variant="action">
          Create a campaign
        </Link>
      </Header>
      <div className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Start with Open House Boost</span>
          <h2>One property. One complete marketing package.</h2>
          <p>
            Create a test campaign, check the content, and walk through approval. Then explore the
            property page, creative, and lead experience.
          </p>
        </div>
        <Link href="/marketing/campaigns/new" variant="action">
          Build your first test campaign
        </Link>
      </div>
      <Stats
        items={[
          {
            label: "New leads",
            value: stages.filter((stage) => stage === "New").length,
            detail: "Sample pipeline · updated in this browser",
          },
          {
            label: "Appointments",
            value: stages.filter((stage) => stage === "Appointment").length,
            detail: "Sample pipeline · updated in this browser",
          },
          {
            label: "Partner relationships",
            value: state.partners.length,
            detail: "Sample partners and your test entries",
          },
          {
            label: "Needs approval",
            value: state.campaigns.filter(
              (campaign) => !campaign.blocking && campaign.state !== "approved",
            ).length,
            detail: "Your browser's checked test campaigns",
          },
        ]}
      />
      <div className={styles.columns}>
        <div className={styles.stack}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Campaigns in progress</h2>
              <p>Your test drafts and a complete sample package.</p>
            </div>
            <Link href="/marketing/campaigns">View all campaigns</Link>
          </div>
          <CampaignRows campaigns={state.campaigns.slice(0, 4)} />
          <div className={styles.two}>
            <Card className={styles.card} padding="md">
              <Icon name="circle-dot" decorative />
              <h3>Keep your partners close</h3>
              <p>Explore Realtor profiles and add a sample relationship.</p>
              <Link href="/partners" variant="action">
                Open partners
              </Link>
            </Card>
            <Card className={styles.card} padding="md">
              <Icon name="circle-dot" decorative />
              <h3>See where every lead stands</h3>
              <p>Move sample leads through your pipeline and see the totals update.</p>
              <Link href="/leads/pipeline" variant="action">
                Open pipeline
              </Link>
            </Card>
          </div>
        </div>
        <div className={styles.stack}>
          <ConnectionsCard />
          <Card className={styles.card} padding="md">
            <h2>Recent activity</h2>
            <ul className={styles.timeline}>
              {state.campaigns.slice(0, 3).map((campaign) => (
                <li key={campaign.campaignRef}>
                  <Icon name="check" decorative size="sm" />
                  <div>
                    <strong>{campaign.headline}</strong>
                    <small className={styles.muted}>
                      Test campaign saved {new Date(campaign.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                </li>
              ))}
              <li>
                <Icon name="circle-dot" decorative size="sm" />
                <div>
                  <strong>Cedar Street package is ready to explore</strong>
                  <small className={styles.muted}>Included sample content</small>
                </div>
              </li>
              <li>
                <Icon name="circle-dot" decorative size="sm" />
                <div>
                  <strong>Meet your sample partner network</strong>
                  <small className={styles.muted}>Fictional contacts for testing</small>
                </div>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function Campaigns({ marketing = false }: { marketing?: boolean }) {
  const { state } = useRequiredDashboardPreview();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const filtered = state.campaigns.filter(
    (campaign) =>
      `${campaign.headline} ${campaign.propertyAddress} ${campaign.realtorDisplayName}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "All statuses" ||
        (status === "Changes needed"
          ? campaign.blocking
          : status === "Test approved"
            ? campaign.state === "approved"
            : !campaign.blocking && campaign.state !== "approved")),
  );
  return (
    <>
      <Header
        title={marketing ? "Marketing Suite" : "Your campaigns"}
        eyebrow="Open House Boost"
        description="Plan the campaign, review the package, and follow the next step."
      >
        <Link href="/marketing/campaigns/new" variant="action">
          Create a campaign
        </Link>
      </Header>
      <Stats
        items={[
          {
            label: "Test campaigns",
            value: state.campaigns.length,
            detail: "Saved in this browser",
          },
          {
            label: "Ready for approval",
            value: state.campaigns.filter((c) => !c.blocking && c.state !== "approved").length,
            detail: "Checks completed on sample inputs",
          },
          {
            label: "Test approved",
            value: state.campaigns.filter((c) => c.state === "approved").length,
            detail: "No publishing authority",
          },
          { label: "Published campaigns", value: "Not connected", detail: "Meta is not connected" },
        ]}
      />
      <div className={styles.filters}>
        <TextField
          label="Search campaigns"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Campaign, address, or partner"
        />
        <Select
          label="Campaign status"
          value={status}
          onChange={setStatus}
          options={["All statuses", "Ready for approval", "Changes needed", "Test approved"]}
        />
      </div>
      {filtered.length === 0 && (query || status !== "All statuses") ? (
        <EmptyState
          title="No test campaigns match"
          description="Try another search or choose All statuses. The included sample package is available below."
        />
      ) : (
        <CampaignRows campaigns={filtered} />
      )}
      <div className={styles.grid}>
        {[
          [
            "Property sites",
            "Explore the mobile-friendly single-property page.",
            "/marketing/property-sites",
          ],
          [
            "PDFs and creative",
            "See the feed, story, and print package experience.",
            "/marketing/creative",
          ],
          [
            "Ads Manager",
            "Review the launch checklist and connection requirements.",
            "/marketing/ads",
          ],
        ].map(([title, detail, href]) => (
          <Card key={title} className={styles.card} padding="md">
            <h2>{title}</h2>
            <p>{detail}</p>
            <Link href={href ?? "/marketing"} variant="action">
              Explore {title?.toLowerCase()}
            </Link>
          </Card>
        ))}
      </div>
      <p className={styles.notice}>
        Your test drafts are stored in this browser. Nothing here launches an ad, sends a message,
        or spends money.
      </p>
    </>
  );
}

function Leads({ pipeline = false }: { pipeline?: boolean }) {
  const { state, save } = useRequiredDashboardPreview();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("All stages");
  const [selected, setSelected] = useState<(typeof sampleLeads)[number] | null>(null);
  const leads = sampleLeads.filter(
    (lead) =>
      `${lead.name} ${lead.email} ${lead.partner}`.toLowerCase().includes(query.toLowerCase()) &&
      (stage === "All stages" || (state.leadStages[lead.id] ?? lead.stage) === stage),
  );
  const stageControl = (lead: (typeof sampleLeads)[number]) => (
    <Select
      label={`Stage for ${lead.name}`}
      value={state.leadStages[lead.id] ?? lead.stage}
      options={leadStages}
      onChange={(value) => {
        const next = leadStages.find((item) => item === value);
        if (next)
          save((current) => ({
            ...current,
            leadStages: { ...current.leadStages, [lead.id]: next },
          }));
      }}
    />
  );
  return (
    <>
      <Header
        title={pipeline ? "Your lead pipeline" : "Leads and relationships"}
        description="Follow sample leads from their first interest to their next milestone."
      >
        <Link href={pipeline ? "/leads" : "/leads/pipeline"} variant="action">
          {pipeline ? "List view" : "Pipeline view"}
        </Link>
        <Link href="/settings/routing" variant="action">
          Routing settings
        </Link>
      </Header>
      <div className={styles.filters}>
        <TextField
          label="Search leads"
          placeholder="Name, email, or partner"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          label="Filter by stage"
          value={stage}
          onChange={setStage}
          options={["All stages", ...leadStages]}
        />
      </div>
      {pipeline ? (
        <div
          className={styles.board}
          role="region"
          aria-label="Lead pipeline, scroll horizontally for more stages"
          tabIndex={0}
        >
          {leadStages.map((lane) => (
            <section className={styles.lane} key={lane}>
              <div className={styles.row}>
                <h2>{lane}</h2>
                <Tag tone="neutral">
                  {
                    leads.filter((lead) => (state.leadStages[lead.id] ?? lead.stage) === lane)
                      .length
                  }
                </Tag>
              </div>
              {leads
                .filter((lead) => (state.leadStages[lead.id] ?? lead.stage) === lane)
                .map((lead) => (
                  <Card className={styles.card} padding="sm" key={lead.id}>
                    <Button variant="ghost" onClick={() => setSelected(lead)}>
                      {lead.name}
                    </Button>
                    <p>{lead.source}</p>
                    <small className={styles.muted}>{lead.partner} · Sample lead</small>
                    {stageControl(lead)}
                  </Card>
                ))}
            </section>
          ))}
        </div>
      ) : (
        <div className={styles.tableRegion} role="region" aria-label="Sample leads" tabIndex={0}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Lead</th>
                <th scope="col">Source</th>
                <th scope="col">Partner</th>
                <th scope="col">Stage</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Button variant="ghost" onClick={() => setSelected(lead)}>
                      {lead.name}
                    </Button>
                    <p>{lead.email}</p>
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
      {leads.length === 0 ? (
        <EmptyState
          title="No leads match"
          description="Try a different name or reset the stage filter."
        />
      ) : null}
      <p className={styles.notice}>
        These are fictional leads. Stage changes stay in this browser and never update HighLevel or
        contact anyone.
      </p>
      <Dialog
        title={selected?.name ?? "Lead details"}
        open={selected !== null}
        onClose={() => setSelected(null)}
        description="Sample contact for product testing"
      >
        {selected ? (
          <div className={styles.stack}>
            <p>{selected.email}</p>
            <p>Source: {selected.source}</p>
            <p>Partner: {selected.partner}</p>
            {stageControl(selected)}
            <p className={styles.notice}>
              Messaging and CRM sync become available after the live integrations are connected.
            </p>
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
  const [message, setMessage] = useState("");
  const partners = state.partners.filter((partner) =>
    `${partner.name} ${partner.company}`.toLowerCase().includes(query.toLowerCase()),
  );
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const partner = {
      id: `preview-partner-${crypto.randomUUID()}`,
      name: String(form.get("name") ?? ""),
      company: String(form.get("company") ?? ""),
      email: String(form.get("email") ?? ""),
    };
    if (save((current) => ({ ...current, partners: [...current.partners, partner] }))) {
      setOpen(false);
      setMessage(`${partner.name} was saved in this browser.`);
    }
  }
  return (
    <>
      <Header
        title="Your Realtor partners"
        description="Keep the people behind your business in one place."
      >
        <Button onClick={() => setOpen(true)}>Add a test partner</Button>
      </Header>
      <TextField
        label="Search partners"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Name or brokerage"
      />
      {message ? <LiveRegion visible message={message} /> : null}
      <div className={styles.grid}>
        {partners.map((partner) => (
          <Card className={styles.card} padding="md" key={partner.id}>
            <div className={styles.row}>
              <Icon name="circle-dot" decorative />
              <Tag tone="neutral">
                {partner.id.startsWith("sample-") ? "Sample partner" : "Test partner"}
              </Tag>
            </div>
            <h2>{partner.name}</h2>
            <p>{partner.company}</p>
            <p>{partner.email || "No email added"}</p>
            <Link href="/marketing/campaigns/new" variant="action">
              Create an Open House Boost
            </Link>
          </Card>
        ))}
      </div>
      {partners.length === 0 ? (
        <EmptyState
          title="No partners match"
          description="Try a different name or add a test partner."
        />
      ) : null}
      <Dialog
        title="Add a test partner"
        description="Use fictional details. This saves a profile in this browser and sends no invitation."
        open={open}
        onClose={() => setOpen(false)}
      >
        <form className={styles.form} onSubmit={add}>
          <TextField
            name="name"
            label="Partner name"
            requirement="required"
            minLength={2}
            maxLength={120}
          />
          <TextField
            name="company"
            label="Brokerage"
            requirement="required"
            minLength={2}
            maxLength={160}
          />
          <TextField
            name="email"
            label="Sample email"
            type="email"
            placeholder="partner@example.test"
            maxLength={200}
          />
          <Button type="submit">Save test partner</Button>
        </form>
      </Dialog>
    </>
  );
}

function Brand({ account = false }: { account?: boolean }) {
  const { state, save } = useRequiredDashboardPreview();
  const [message, setMessage] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const profile = {
      name: String(form.get("name")),
      company: String(form.get("company")),
      email: String(form.get("email")),
      region: String(form.get("region")),
      tagline: String(form.get("tagline")),
    };
    if (save((current) => ({ ...current, profile })))
      setMessage("Your preview profile was saved in this browser.");
  }
  return (
    <>
      <Header
        title={account ? "Your preview profile" : "Brand Engine"}
        description="Give every campaign a consistent voice and a recognizable identity."
      />
      <div className={styles.columns}>
        <Card className={styles.card} padding="md">
          <h2>Workspace details</h2>
          <p>These values are for visual testing. Use sample details.</p>
          <form className={styles.form} onSubmit={submit}>
            <div className={styles.two}>
              <TextField
                label="Display name"
                name="name"
                defaultValue={state.profile.name}
                requirement="required"
                minLength={2}
                maxLength={120}
              />
              <TextField
                label="Company name"
                name="company"
                defaultValue={state.profile.company}
                requirement="required"
                minLength={2}
                maxLength={160}
              />
              <TextField
                label="Sample email"
                name="email"
                type="email"
                defaultValue={state.profile.email}
                maxLength={200}
              />
              <TextField
                label="Market area"
                name="region"
                defaultValue={state.profile.region}
                maxLength={120}
              />
            </div>
            <TextArea
              label="Brand tagline"
              name="tagline"
              defaultValue={state.profile.tagline}
              maxLength={300}
            />
            <Button type="submit">Save preview profile</Button>
            {message ? <LiveRegion message={message} visible /> : null}
          </form>
        </Card>
        <div className={styles.stack}>
          <Card className={styles.card} padding="md">
            <Tag>Brand preview</Tag>
            <h2>{state.profile.company}</h2>
            <p>{state.profile.tagline}</p>
            <strong>{state.profile.name}</strong>
            <p>{state.profile.region}</p>
            <p>{state.profile.email}</p>
          </Card>
          <Card className={styles.card} padding="md">
            <h2>Compliance details</h2>
            <Tag tone="warning">Verification required before launch</Tag>
            <p>
              Licenses, company identity, disclosures, and approved assets need verification in the
              connected system. This preview does not verify or approve them.
            </p>
            <Link href="/marketing/campaigns/new" variant="action">
              Try the campaign checks
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}

function Reports() {
  const { state } = useRequiredDashboardPreview();
  const stages = sampleLeads.map((lead) => state.leadStages[lead.id] ?? lead.stage);
  return (
    <>
      <Header
        title="Performance and outcomes"
        eyebrow="Reports"
        description="See how marketing, partners, and your pipeline fit together."
      >
        <Link href="/marketing/campaigns" variant="action">
          Review campaigns
        </Link>
      </Header>
      <Stats
        items={[
          {
            label: "Sample leads",
            value: sampleLeads.length,
            detail: "Fictional dataset · not live CRM data",
          },
          {
            label: "Appointments",
            value: stages.filter((stage) => stage === "Appointment").length,
            detail: "Sample stages in this browser",
          },
          {
            label: "Applications",
            value: stages.filter((stage) => stage === "Application").length,
            detail: "Sample stages in this browser",
          },
          { label: "Ad spend", value: "Not connected", detail: "No ad account or live spend data" },
        ]}
      />
      <div className={styles.two}>
        <Card className={styles.card} padding="md">
          <h2>Sample leads by stage</h2>
          <p>Change a stage in the pipeline to see this report update.</p>
          <div className={styles.bars}>
            {leadStages.map((stage) => {
              const count = stages.filter((value) => value === stage).length;
              return (
                <div className={styles.barRow} key={stage}>
                  <span>{stage}</span>
                  <progress
                    aria-label={`${stage} sample leads`}
                    value={count}
                    max={sampleLeads.length}
                  />
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
          <Link href="/leads/pipeline" variant="action">
            Open pipeline
          </Link>
        </Card>
        <Card className={styles.card} padding="md">
          <h2>Campaign readiness</h2>
          <p>{state.campaigns.length} test campaigns have been saved in this browser.</p>
          {[
            ["Needs changes", state.campaigns.filter((c) => c.blocking).length],
            [
              "Ready for approval",
              state.campaigns.filter((c) => !c.blocking && c.state !== "approved").length,
            ],
            ["Test approved", state.campaigns.filter((c) => c.state === "approved").length],
          ].map(([label, value]) => (
            <div key={label} className={styles.connection}>
              <div className={styles.row}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            </div>
          ))}
          <p className={styles.notice}>
            Funded volume, cost per lead, and live attribution remain unavailable until their data
            sources are connected.
          </p>
        </Card>
      </div>
    </>
  );
}

function Assets({ creative = false }: { creative?: boolean }) {
  return (
    <>
      <Header
        title={creative ? "PDFs and creative" : "Property sites"}
        eyebrow="Marketing Suite"
        description={
          creative
            ? "Explore the assets that belong to a property marketing package."
            : "A focused home for every property and every interested buyer."
        }
      >
        <Link href="/marketing/campaigns/new" variant="action">
          Create a campaign
        </Link>
      </Header>
      <Tag>Included sample package · 214 Cedar Street</Tag>
      {creative ? (
        <div className={styles.grid}>
          {[
            ["Feed creative", "1080 × 1080", "/synthetic-assets/open-house-feed-v3.svg"],
            ["Story creative", "1080 × 1920", "/synthetic-assets/open-house-story-v3.svg"],
          ].map(([title, size, href]) => (
            <Card className={styles.card} key={title} padding="md">
              <img className={styles.asset} src={href} alt={`${title} sample for Cedar Street`} />
              <h2>{title}</h2>
              <p>{size} · Sample SVG</p>
              <Link href={href ?? sampleCampaignHref} download variant="action">
                Download sample
              </Link>
            </Card>
          ))}
          <Card className={styles.card} padding="md">
            <Icon name="monitor" decorative />
            <h2>Print package</h2>
            <p>
              Review the package structure and approved version history in the sample campaign. New
              PDF rendering is part of the connected generation flow.
            </p>
            <Link href={sampleCampaignHref} variant="action">
              Review sample package
            </Link>
          </Card>
        </div>
      ) : (
        <div className={styles.two}>
          <Card className={styles.card} padding="md">
            <img
              className={styles.asset}
              src="/synthetic-assets/open-house-feed-v3.svg"
              alt="Cedar Street property campaign sample"
            />
            <h2>214 Cedar Street</h2>
            <p>Open House Boost · Sample landing page</p>
            <div className={styles.actions}>
              <Link href={samplePageHref} external variant="action">
                Open sample property page
              </Link>
              <Link href={sampleCampaignHref}>View package</Link>
            </div>
          </Card>
          <Card className={styles.card} padding="md">
            <h2>Your next property starts here</h2>
            <p>
              Create a test campaign to try the content checks and approval experience. Publishing a
              new property website needs connected storage and a verified brand.
            </p>
            <Link href="/marketing/campaigns/new" variant="action">
              Build a test campaign
            </Link>
            <Tag tone="neutral">New site publishing not connected</Tag>
          </Card>
        </div>
      )}
    </>
  );
}

function Connections({ ads = false }: { ads?: boolean }) {
  return (
    <>
      <Header
        title={ads ? "Ads Manager" : "Workspace connections"}
        description={
          ads
            ? "Review the steps between a great campaign and a safe launch."
            : "See what connects your workspace to the systems you already use."
        }
      />
      <div className={styles.columns}>
        <div className={styles.stack}>
          <ConnectionsCard />
          <Card className={styles.card} padding="md">
            <h2>Launch checklist</h2>
            <ul className={styles.timeline}>
              {[
                "Verify the company and brand",
                "Connect the HighLevel location and lead destination",
                "Verify Meta account and page permissions",
                "Check and approve the exact campaign version",
              ].map((step, index) => (
                <li key={step}>
                  <span className={styles.stepNumber}>{index + 1}</span>
                  <div>
                    <strong>{step}</strong>
                    <small className={styles.muted}>Required for a live campaign</small>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card className={styles.card} padding="md">
          <Tag tone="warning">Live launch unavailable</Tag>
          <h2>Test the workflow today</h2>
          <p>
            Campaign creation and checks work in this preview. Account connections, live
            advertising, billing, and messaging are the next integration phase.
          </p>
          <Link href="/marketing/campaigns/new" variant="action">
            Create a test campaign
          </Link>
          <Button disabled>Publish live campaign</Button>
          <p>No ad account is connected, so this action cannot spend or publish.</p>
        </Card>
      </div>
    </>
  );
}

function Routing() {
  const { state, save } = useRequiredDashboardPreview();
  const [stage, setStage] = useState<string>(state.routing.stage);
  const [owner, setOwner] = useState<string>(state.routing.owner);
  const [message, setMessage] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextStage = leadStages.find((value) => value === stage);
    if (
      nextStage &&
      (owner === "Preview owner" || owner === "Unassigned") &&
      save((current) => ({ ...current, routing: { stage: nextStage, owner } }))
    )
      setMessage("Routing preferences saved for this preview. HighLevel has not been changed.");
  }
  return (
    <>
      <Header
        title="Lead routing"
        description="Choose what the destination setup will look like for new leads."
      />
      <div className={styles.two}>
        <Card className={styles.card} padding="md">
          <h2>Preview destination</h2>
          <form className={styles.form} onSubmit={submit}>
            <Select label="Starting stage" value={stage} onChange={setStage} options={leadStages} />
            <Select
              label="Assigned owner"
              value={owner}
              onChange={setOwner}
              options={["Preview owner", "Unassigned"]}
            />
            <Button type="submit">Save preview routing</Button>
            {message ? <LiveRegion message={message} visible /> : null}
          </form>
        </Card>
        <Card className={styles.card} padding="md">
          <h2>Before leads can flow</h2>
          <Tag tone="warning">HighLevel not connected</Tag>
          <p>
            The live pipeline and stage must be read from your authorized HighLevel location. These
            preview choices are not a live routing configuration.
          </p>
          <Link href="/leads/pipeline" variant="action">
            Explore the sample pipeline
          </Link>
        </Card>
      </div>
    </>
  );
}

function Settings() {
  const { reset } = useRequiredDashboardPreview();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <>
      <Header
        title="Workspace settings"
        description="Make the workspace yours and see what still needs connecting."
      />
      <div className={styles.grid}>
        {[
          ["Profile and brand", "Company details and your market area.", "/brand"],
          ["Connections", "HighLevel, Meta, and billing readiness.", "/settings/connections"],
          ["Lead routing", "Preview the starting stage and assigned owner.", "/settings/routing"],
          ["Team and access", "Understand who can create, review, and publish.", "/settings/team"],
          ["Account", "Edit your browser's preview profile.", "/settings/account"],
          [
            "Plan and billing",
            "Subscription status and live billing availability.",
            "/settings/billing",
          ],
        ].map(([title, detail, href]) => (
          <Card className={styles.card} key={title} padding="md">
            <h2>{title}</h2>
            <p>{detail}</p>
            <Link href={href ?? "/settings"} variant="action">
              Open {title?.toLowerCase()}
            </Link>
          </Card>
        ))}
      </div>
      <Card className={styles.card} padding="md">
        <h2>Preview storage</h2>
        <p>
          Test campaigns, partners, lead stages, and profile edits stay in this browser. A different
          browser starts with the original samples.
        </p>
        <div className={styles.actions}>
          <Button variant="outline" onClick={() => setOpen(true)}>
            Reset preview data
          </Button>
          <Link href="/onboarding">Open quick start</Link>
        </div>
        {message ? <LiveRegion visible message={message} /> : null}
      </Card>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Reset this browser's preview?"
        description="This removes only your local test campaigns, added partners, stage changes, and preview settings. It does not affect another browser or any connected system."
        footer={
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep my test data
            </Button>
            <Button
              onClick={() => {
                if (reset()) {
                  setOpen(false);
                  setMessage("The original sample workspace has been restored.");
                }
              }}
            >
              Reset preview
            </Button>
          </div>
        }
      >
        <p>You can create fresh test records afterward.</p>
      </Dialog>
    </>
  );
}

function Onboarding() {
  const { state } = useRequiredDashboardPreview();
  const steps = [
    {
      title: "Make the brand familiar",
      detail: "Edit the preview company, contact, and market area.",
      href: "/brand",
      complete: state.profile.company !== "Prairie Home Lending",
    },
    {
      title: "Build a test campaign",
      detail: "Use sample property details, save, and run the campaign checks.",
      href: "/marketing/campaigns/new",
      complete: state.campaigns.length > 0,
    },
    {
      title: "Review the result",
      detail: "See findings, then try a test approval on a campaign that passes.",
      href: "/marketing/campaigns",
      complete: state.campaigns.some((campaign) => campaign.state === "approved"),
    },
    {
      title: "Explore the lead experience",
      detail: "Move a sample lead to a new stage and check the report.",
      href: "/leads/pipeline",
      complete: Object.keys(state.leadStages).length > 0,
    },
  ];
  return (
    <>
      <Header
        title="Take your first look around"
        eyebrow="Quick start"
        description="Four short tasks to test the product from campaign creation to the pipeline."
      />
      <div className={styles.two}>
        {steps.map((step, index) => (
          <Card className={styles.card} key={step.title} padding="md">
            <div className={styles.row}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <Tag tone={step.complete ? "success" : "neutral"}>
                {step.complete ? "Tried in this browser" : "Ready to explore"}
              </Tag>
            </div>
            <h2>{step.title}</h2>
            <p>{step.detail}</p>
            <Link href={step.href} variant="action">
              {step.complete ? "Explore again" : "Start this step"}
            </Link>
          </Card>
        ))}
      </div>
      <p className={styles.notice}>
        This checklist tracks your preview activity only. It does not verify your identity, connect
        accounts, or establish readiness to publish.
      </p>
    </>
  );
}

function Planned({ view }: { view: PreviewView }) {
  const content: Record<
    string,
    { title: string; detail: string; cards: readonly [string, string][] }
  > = {
    automations: {
      title: "Automations",
      detail: "The next layer of your operating workspace.",
      cards: [
        [
          "Campaign follow-up",
          "Future workflows will coordinate follow-up with your HighLevel location.",
        ],
        ["Readiness alerts", "See missing connections and the next action to take."],
        [
          "Partner touchpoints",
          "Keep partner activity connected to the campaign and lead journey.",
        ],
      ],
    },
    marketplace: {
      title: "Marketplace",
      detail: "Future extensions for the Automated LO workspace.",
      cards: [
        ["Blueprint packs", "Additional campaign types will appear here when they are available."],
        ["Homeowner intelligence", "A future module, not included in this testing release."],
        [
          "Financing tools",
          "Future tools will need their own qualification and approved data sources.",
        ],
      ],
    },
    messaging: {
      title: "Email and SMS",
      detail: "Communication belongs with the campaign, the partner, and the lead.",
      cards: [
        [
          "Campaign messaging",
          "Message generation and delivery need connected messaging accounts and approved content.",
        ],
        [
          "Contact consent",
          "The live workflow will use verified contact consent and sending rules.",
        ],
      ],
    },
    blueprints: {
      title: "Blueprint templates",
      detail: "Start with a workflow that matches the job.",
      cards: [
        ["Open House Boost", "Available to test now through the campaign builder."],
        ["More blueprint packs", "Additional campaign templates are planned."],
      ],
    },
    team: {
      title: "Team and access",
      detail: "Clear responsibilities for campaign creation, review, and publishing.",
      cards: [
        ["Workspace owner", "Manages the workspace and assigns access in the connected system."],
        ["Campaign creator", "Prepares a campaign and runs the checks."],
        ["Approver", "Reviews the exact campaign version before a separate publish step."],
      ],
    },
    billing: {
      title: "Plan and billing",
      detail: "Live billing is not connected to this preview.",
      cards: [
        [
          "Subscription",
          "This demo does not represent a paid subscription or access to a purchased plan.",
        ],
        [
          "Campaign allowances",
          "Usage and purchase controls become available with the billing integration.",
        ],
      ],
    },
  };
  const item = content[view] ?? content["automations"]!;
  return (
    <>
      <Header title={item.title} description={item.detail} />
      <Tag tone="neutral">
        {view === "team" ? "Role preview · No invitations sent" : "Live integration not available"}
      </Tag>
      <div className={styles.grid}>
        {item.cards.map(([title, detail]) => (
          <Card className={styles.card} key={title} padding="md">
            <h2>{title}</h2>
            <p>{detail}</p>
            {title === "Open House Boost" ? (
              <Link href="/marketing/campaigns/new" variant="action">
                Try Open House Boost
              </Link>
            ) : (
              <Tag tone="neutral">
                {view === "team" ? "Connected access required" : "Coming later"}
              </Tag>
            )}
          </Card>
        ))}
      </div>
      <Link href="/overview" variant="action">
        Return to overview
      </Link>
    </>
  );
}

export function DashboardPreviewScreen({ view }: { view: PreviewView }) {
  const { ready } = useRequiredDashboardPreview();
  if (!ready)
    return (
      <div className={styles.page}>
        <p role="status">Opening your browser's preview workspace…</p>
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
    case "brand":
      content = <Brand />;
      break;
    case "account":
      content = <Brand account />;
      break;
    case "reports":
      content = <Reports />;
      break;
    case "property-sites":
      content = <Assets />;
      break;
    case "creative":
      content = <Assets creative />;
      break;
    case "connections":
      content = <Connections />;
      break;
    case "ads":
      content = <Connections ads />;
      break;
    case "routing":
      content = <Routing />;
      break;
    case "settings":
      content = <Settings />;
      break;
    case "onboarding":
      content = <Onboarding />;
      break;
    default:
      content = <Planned view={view} />;
  }
  return <div className={styles.page}>{content}</div>;
}

export function DashboardPreviewCampaign({ campaignRef }: { campaignRef: string }) {
  const { state, ready, save } = useRequiredDashboardPreview();
  const [confirm, setConfirm] = useState(false);
  const campaign = state.campaigns.find((item) => item.campaignRef === campaignRef);
  if (!ready) return <p role="status">Opening your test campaign…</p>;
  if (!campaign)
    return (
      <div className={styles.page}>
        <Header
          title="This test campaign is not in this browser"
          description="Preview drafts belong to the browser that created them. They are not shared accounts."
        />
        <Link href="/marketing/campaigns" variant="action">
          Back to campaigns
        </Link>
      </div>
    );
  return (
    <div className={styles.page}>
      <Header
        title={campaign.headline}
        eyebrow="Test campaign"
        description={campaign.propertyAddress}
      >
        <Link href="/marketing/campaigns" variant="action">
          All campaigns
        </Link>
      </Header>
      <div className={styles.row}>
        <CampaignTag campaign={campaign} />
        <span className={styles.muted}>
          Saved in this browser · {new Date(campaign.createdAt).toLocaleString()}
        </span>
      </div>
      <Stats
        items={[
          { label: "Partner", value: campaign.realtorDisplayName, detail: "Test campaign input" },
          {
            label: "Daily budget",
            value: dollars(campaign.dailyBudgetMinor),
            detail: "Planned only · no spend",
          },
          {
            label: "Total budget",
            value: dollars(campaign.totalBudgetMinor),
            detail: "Planned only · no spend",
          },
          {
            label: "Ad category",
            value: campaign.specialAdCategory,
            detail: "Open House Boost policy",
          },
        ]}
      />
      <div className={styles.columns}>
        <div className={styles.stack}>
          <Card className={styles.card} padding="md">
            <h2>
              {campaign.blocking
                ? "Changes are needed before approval"
                : "The sample content checks passed"}
            </h2>
            <p>
              These checks assess the test inputs. They do not verify live accounts, permissions,
              licenses, or generated artifacts.
            </p>
            {campaign.findings.length ? (
              campaign.findings.map((finding, index) => (
                <div className={styles.connection} key={`${finding.ruleCode}-${index}`}>
                  <Tag tone={finding.severity === "blocking" ? "critical" : "warning"}>
                    {finding.severity === "blocking" ? "Must fix" : "Review"}
                  </Tag>
                  <strong>{finding.description}</strong>
                  <p>{finding.remediation}</p>
                </div>
              ))
            ) : (
              <Tag tone="success">No content findings</Tag>
            )}
          </Card>
          <Card className={styles.card} padding="md">
            <h2>Package experience</h2>
            <p>
              Explore the included sample assets. Your new campaign's live website, PDF, and
              creative generation require the connected generation service.
            </p>
            <div className={styles.actions}>
              <Link href="/marketing/property-sites" variant="action">
                Sample property site
              </Link>
              <Link href="/marketing/creative" variant="action">
                Sample creative
              </Link>
            </div>
          </Card>
        </div>
        <Card className={styles.card} padding="md">
          <h2>Approval and launch</h2>
          <p>A test approval records this browser's review step only.</p>
          <Button
            disabled={campaign.blocking || campaign.state === "approved"}
            onClick={() => setConfirm(true)}
          >
            {campaign.state === "approved" ? "Test approval recorded" : "Approve test campaign"}
          </Button>
          {campaign.blocking ? (
            <p>Correct the findings in a new test draft before approving.</p>
          ) : null}
          <Link href="/marketing/campaigns/new">Create another draft</Link>
          <Button disabled>Publish campaign</Button>
          <p>Publishing is unavailable. No live ad account is connected.</p>
        </Card>
      </div>
      <Dialog
        title="Approve this test campaign?"
        description="This marks the current test draft approved in this browser. It does not authorize publishing, spend, or a real compliance approval."
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
              Confirm test approval
            </Button>
          </div>
        }
      >
        <p>{campaign.headline}</p>
      </Dialog>
    </div>
  );
}
