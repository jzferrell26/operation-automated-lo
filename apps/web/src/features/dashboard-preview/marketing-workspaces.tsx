"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  Icon,
  Link,
  LiveRegion,
  TextArea,
  TextField,
  type IconName,
} from "@oalo/ui";
import { dollars, sampleLeads } from "./model.js";
import { useRequiredDashboardPreview } from "./preview-provider.js";
import {
  ActionLink,
  Badge,
  CampaignBadge,
  exampleCampaignHref,
  MarketingTabs,
  PageHeader,
  personName,
  QuietNote,
  SectionTitle,
  SelectField,
  StatCards,
} from "./product-components.js";
import styles from "./workspace.module.css";
import pageStyles from "./module-pages.module.css";

function ConnectionNote({ title, detail }: { title: string; detail: string }) {
  return (
    <div className={pageStyles.connectionNote}>
      <span className={styles.iconTile}>
        <Icon name="globe" decorative />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <ActionLink href="/settings/connections" secondary>
        View connections <Icon name="arrow-right" decorative size="sm" />
      </ActionLink>
    </div>
  );
}

export function AdsWorkspace() {
  const { state } = useRequiredDashboardPreview();
  const [status, setStatus] = useState("All campaigns");
  const [query, setQuery] = useState("");
  const approved = state.campaigns.filter(
    (campaign) => campaign.state === "approved" && !campaign.blocking,
  );
  const campaigns = state.campaigns.filter((campaign) => {
    const label = campaign.blocking
      ? "Needs changes"
      : campaign.state === "approved"
        ? "Approved"
        : "Awaiting approval";
    return (
      (status === "All campaigns" || status === label) &&
      `${campaign.headline} ${campaign.propertyAddress}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    );
  });
  return (
    <>
      <PageHeader
        title="Ads Manager"
        eyebrow="Marketing"
        description="Prepare the campaign. Review the details. Know what is ready to launch."
      >
        <ActionLink href="/marketing/campaigns/new">
          <Icon name="plus" decorative size="sm" /> Create campaign
        </ActionLink>
      </PageHeader>
      <MarketingTabs />
      <ConnectionNote
        title="Connect your ad account before publishing"
        detail="Campaign review is available here. Live delivery, spend and results require Meta through HighLevel."
      />
      <StatCards
        items={[
          {
            label: "In preparation",
            value: state.campaigns.length,
            detail: "Saved campaign drafts",
            icon: "file-text",
          },
          {
            label: "Approved",
            value: approved.length,
            detail: "Demo approvals, awaiting connection",
            icon: "shield",
          },
          {
            label: "Planned budget",
            value: dollars(
              state.campaigns.reduce((sum, campaign) => sum + campaign.totalBudgetMinor, 0),
            ),
            detail: "Budget plans, no money spent",
            icon: "credit-card",
          },
          {
            label: "Live ad spend",
            value: "Unavailable",
            detail: "No connected reporting source",
            icon: "chart",
          },
        ]}
      />
      <div className={pageStyles.mainAside}>
        <Card className={styles.panel} padding="none">
          <SectionTitle
            title="Campaign launch queue"
            detail="Open a campaign to review its content and approval status."
          />
          <div className={pageStyles.toolbar} data-product-guide="ad-queue">
            <TextField
              label="Search ad campaigns"
              placeholder="Property or campaign name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <SelectField
              label="Ad campaign status"
              value={status}
              onChange={setStatus}
              options={["All campaigns", "Awaiting approval", "Needs changes", "Approved"]}
            />
          </div>
          {campaigns.length ? (
            <div className={pageStyles.queue}>
              {campaigns.map((campaign) => (
                <Link
                  className={pageStyles.queueRow}
                  key={campaign.campaignRef}
                  href={campaign.detailHref}
                >
                  <span className={styles.iconTile}>
                    <Icon name="home" decorative />
                  </span>
                  <span>
                    <strong>{campaign.headline}</strong>
                    <small>{campaign.propertyAddress}</small>
                    <small>
                      {dollars(campaign.dailyBudgetMinor)} daily ·{" "}
                      {dollars(campaign.totalBudgetMinor)} total planned
                    </small>
                  </span>
                  <CampaignBadge campaign={campaign} />
                  <Icon name="arrow-up-right" decorative size="sm" />
                </Link>
              ))}
            </div>
          ) : (
            <div className={pageStyles.empty}>
              <EmptyState
                title={
                  state.campaigns.length
                    ? "No campaigns match these filters"
                    : "Your launch queue starts with a campaign"
                }
                description={
                  state.campaigns.length
                    ? "Clear the search and status to see all of your saved campaigns."
                    : "Create an Open House Boost to prepare the property, creative and planned budget."
                }
              />
              {state.campaigns.length ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setStatus("All campaigns");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <ActionLink href="/marketing/campaigns/new">Create your first campaign</ActionLink>
              )}
            </div>
          )}
          <div className={styles.panelFoot}>
            <span>{campaigns.length} saved campaigns</span>
            <Badge tone="info">Demo workspace</Badge>
          </div>
        </Card>
        <Card className={pageStyles.asideCard} padding="md">
          <span className={styles.eyebrow}>Before launch</span>
          <h2>Every step has a purpose.</h2>
          <ol className={pageStyles.steps}>
            <li>
              <span>1</span>
              <div>
                <strong>Prepare your campaign</strong>
                <p>Confirm the property, lender identity and planned budget.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Review and approve</strong>
                <p>Resolve content findings and approve the exact campaign version.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Connect and confirm</strong>
                <p>With a live account, verify the ad draft before a separate publish decision.</p>
              </div>
            </li>
          </ol>
          <ActionLink href={exampleCampaignHref} secondary>
            Explore an example
          </ActionLink>
        </Card>
      </div>
    </>
  );
}

const messageTemplates = [
  {
    id: "invitation",
    title: "Open house invitation",
    detail: "Give buyers a reason to visit.",
    icon: "home",
  },
  {
    id: "follow-up",
    title: "After the open house",
    detail: "Keep the conversation going.",
    icon: "mail",
  },
  {
    id: "partner-update",
    title: "Realtor partner update",
    detail: "Keep your collaborator informed.",
    icon: "users",
  },
] as const;
type MessageTemplate = (typeof messageTemplates)[number];
type Channel = "email" | "sms";

function MessageComposer({
  template,
  channel,
  onDirtyChange,
}: {
  template: MessageTemplate;
  channel: Channel;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { state, save } = useRequiredDashboardPreview();
  const id = `${template.id}:${channel}`;
  const saved = state.messageDrafts.find((draft) => draft.id === id);
  const author = personName(state.profile.name);
  const defaults = {
    invitation: {
      subject: "You're invited: [property address]",
      body: `Hi [first name],\n\nJoin us at [property address] on [date and time]. Take a look around and bring your questions about your next home.\n\nView the property: [property link]\n\n${author}\n${state.profile.company}`,
    },
    "follow-up": {
      subject: "Thanks for stopping by [property address]",
      body: `Hi [first name],\n\nThanks for visiting [property address]. What stood out to you? I'd be glad to talk through your questions and help you plan a next step.\n\n${author}\n${state.profile.company}`,
    },
    "partner-update": {
      subject: "Your open house campaign update",
      body: `Hi [partner name],\n\nHere is the latest on our campaign for [property address]:\n\n[Add verified campaign results and next steps.]\n\nLet's connect to plan our follow-up.\n\n${author}`,
    },
  };
  const initial = defaults[template.id];
  const initialBody =
    channel === "sms"
      ? `Hi [first name], ${template.id === "invitation" ? "you're invited to the open house at [property address] on [date and time]. Details: [property link]" : template.id === "follow-up" ? "thanks for visiting [property address]. What questions can I help with?" : "here is our update for [property address]: [verified results and next steps]."} ${author}, ${state.profile.company}`
      : initial.body;
  const [subject, setSubject] = useState(
    saved?.subject ?? (channel === "email" ? initial.subject : ""),
  );
  const [body, setBody] = useState(saved?.body ?? initialBody);
  const [message, setMessage] = useState("");
  const [copyError, setCopyError] = useState(false);
  const dirty =
    subject !== (saved?.subject ?? (channel === "email" ? initial.subject : "")) ||
    body !== (saved?.body ?? initialBody);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      save((current) => ({
        ...current,
        messageDrafts: [
          ...current.messageDrafts.filter((draft) => draft.id !== id),
          { id, subject, body },
        ],
      }))
    ) {
      setCopyError(false);
      setBody(body.trim());
      setMessage("Draft saved on this device.");
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(channel === "email" ? `${subject}\n\n${body}` : body);
      setCopyError(false);
      setMessage("Message copied. Replace bracketed details before use.");
    } catch {
      setCopyError(true);
      setMessage("Clipboard access is unavailable. Select the message text to copy it manually.");
    }
  }
  return (
    <div className={pageStyles.composerLayout}>
      <Card className={styles.panel} padding="none">
        <SectionTitle
          title={template.title}
          detail="Make the message yours, then save or copy the draft."
        />
        <form className={styles.settingsForm} onSubmit={submit} data-product-guide="message-editor">
          {channel === "email" ? (
            <TextField
              label="Email subject"
              value={subject}
              maxLength={160}
              onChange={(event) => {
                setSubject(event.target.value);
                setMessage("");
              }}
            />
          ) : null}
          <TextArea
            label={channel === "email" ? "Email message" : "SMS message"}
            value={body}
            maxLength={5000}
            rows={12}
            requirement="required"
            onChange={(event) => {
              setBody(event.target.value);
              setMessage("");
            }}
          />
          <div className={pageStyles.editorMeta}>
            <span>{body.length.toLocaleString()} / 5,000 characters</span>
            <span>{dirty ? "Unsaved changes" : saved ? "Saved draft" : "Template draft"}</span>
          </div>
          <QuietNote>
            Replace bracketed details and review the copy before using it in HighLevel. Delivery and
            consent checks happen in your connected messaging workflow.
          </QuietNote>
          <div className={styles.formFooter}>
            <Button type="button" variant="outline" onClick={() => void copy()}>
              Copy message
            </Button>
            <Button type="submit" disabled={!body.trim()}>
              Save draft
            </Button>
          </div>
          {message ? (
            <LiveRegion message={message} urgency={copyError ? "alert" : "status"} visible />
          ) : null}
        </form>
      </Card>
      <aside className={pageStyles.messagePreview} aria-label="Message preview">
        <span className={styles.eyebrow}>
          {channel === "email" ? "Email preview" : "SMS preview"}
        </span>
        <div className={pageStyles.previewIdentity}>
          <span className={styles.iconTile}>
            <Icon name="mail" decorative />
          </span>
          <div>
            <strong>{author}</strong>
            <small>{state.profile.company}</small>
          </div>
        </div>
        {channel === "email" ? <h2>{subject || "Your subject line"}</h2> : null}
        <p className={pageStyles.messageBody}>{body || "Your draft appears here as you type."}</p>
        <Badge tone="info">Draft only</Badge>
        <p className={pageStyles.caption}>Saving and copying do not send a message.</p>
      </aside>
    </div>
  );
}

export function MessagingWorkspace() {
  const [template, setTemplate] = useState<MessageTemplate>(messageTemplates[0]);
  const [channel, setChannel] = useState<Channel>("email");
  const [pending, setPending] = useState<{ template: MessageTemplate; channel: Channel } | null>(
    null,
  );
  const [dirty, setDirty] = useState(false);
  function change(nextTemplate: MessageTemplate, nextChannel: Channel) {
    if (nextTemplate.id === template.id && nextChannel === channel) return;
    if (dirty) setPending({ template: nextTemplate, channel: nextChannel });
    else {
      setTemplate(nextTemplate);
      setChannel(nextChannel);
    }
  }
  return (
    <>
      <PageHeader
        title="Email & SMS"
        eyebrow="Marketing"
        description="A thoughtful starting point for every property conversation."
      >
        <ActionLink href="/settings/connections" secondary>
          Messaging connections
        </ActionLink>
      </PageHeader>
      <MarketingTabs />
      <div className={pageStyles.messageToolbar}>
        <div className={styles.viewToggle} role="group" aria-label="Message channel">
          {(["email", "sms"] as const).map((item) => (
            <Button
              key={item}
              variant="ghost"
              aria-pressed={channel === item}
              onClick={() => change(template, item)}
            >
              {item === "email" ? "Email" : "SMS"}
            </Button>
          ))}
        </div>
        <Badge tone="info">Draft workspace · no sending</Badge>
      </div>
      <div className={pageStyles.templatePicker} role="group" aria-label="Message templates">
        {messageTemplates.map((item) => (
          <Button
            type="button"
            variant="ghost"
            className={pageStyles.templateChoice}
            key={item.id}
            aria-pressed={template.id === item.id}
            onClick={() => change(item, channel)}
          >
            <Icon name={item.icon} decorative />
            <span className={pageStyles.choiceText}>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </span>
            <Icon name="arrow-right" decorative size="sm" />
          </Button>
        ))}
      </div>
      <MessageComposer
        key={`${template.id}:${channel}`}
        template={template}
        channel={channel}
        onDirtyChange={setDirty}
      />
      <Dialog
        title="Discard unsaved changes?"
        description="Save your draft before switching to keep these edits."
        open={pending !== null}
        onClose={() => setPending(null)}
        footer={
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => setPending(null)}>
              Keep editing
            </Button>
            <Button
              onClick={() => {
                if (pending) {
                  setTemplate(pending.template);
                  setChannel(pending.channel);
                  setDirty(false);
                  setPending(null);
                }
              }}
            >
              Discard changes
            </Button>
          </div>
        }
      >
        <p>Your last saved version will still be available.</p>
      </Dialog>
    </>
  );
}

export function AutomationsWorkspace() {
  const { state } = useRequiredDashboardPreview();
  const [leadName, setLeadName] = useState<string>(sampleLeads[0].name);
  const [result, setResult] = useState<{ name: string; stage: string; owner: string } | null>(null);
  const owner =
    state.routing.owner === "Preview owner" ? personName(state.profile.name) : "Unassigned";
  return (
    <>
      <PageHeader
        title="Automations"
        description="Give every new conversation a consistent next step."
      >
        <ActionLink href="/settings/routing">
          Edit lead routing <Icon name="arrow-right" decorative size="sm" />
        </ActionLink>
      </PageHeader>
      <ConnectionNote
        title="Your follow-up starts with HighLevel"
        detail="Preview the handoff below. Live automation and message delivery require a connected location."
      />
      <div className={pageStyles.mainAside}>
        <Card className={styles.panel} padding="none">
          <SectionTitle
            title="New lead handoff"
            detail="Your current routing preferences, from property inquiry to follow-up."
          />
          <div className={pageStyles.workflow} data-product-guide="routing-preview">
            {[
              {
                title: "Property inquiry",
                detail: "A buyer submits your campaign form.",
                icon: "home",
              },
              {
                title: `Start in ${state.routing.stage}`,
                detail: "Place the new conversation in your chosen stage.",
                icon: "layers",
              },
              {
                title: `Assign to ${owner}`,
                detail:
                  owner === "Unassigned"
                    ? "Choose an owner in Lead routing before going live."
                    : "Make responsibility for the next step clear.",
                icon: "users",
              },
              {
                title: "Hand off to HighLevel",
                detail: "Your connected CRM handles contact, opportunity and follow-up actions.",
                icon: "bolt",
              },
            ].map((step, index) => (
              <div key={step.title} className={pageStyles.workflowStep}>
                <span className={styles.iconTile}>
                  <Icon name={step.icon as IconName} decorative />
                </span>
                <span>
                  <small>STEP {index + 1}</small>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </span>
                <Badge tone={index === 3 ? "warning" : "neutral"}>
                  {index === 3 ? "Connection needed" : "Preview"}
                </Badge>
              </div>
            ))}
          </div>
          <div className={styles.panelFoot}>
            <span>Preferences saved in this demo workspace</span>
            <Link href="/settings/routing">Manage routing</Link>
          </div>
        </Card>
        <Card className={pageStyles.asideCard} padding="md">
          <span className={styles.eyebrow}>Try the handoff</span>
          <h2>Follow a sample lead.</h2>
          <p>See the destination without creating a contact or triggering a message.</p>
          <SelectField
            label="Sample lead"
            value={leadName}
            options={sampleLeads.map((lead) => lead.name)}
            onChange={(value) => {
              setLeadName(value);
              setResult(null);
            }}
          />
          <Button onClick={() => setResult({ name: leadName, stage: state.routing.stage, owner })}>
            Preview handoff <Icon name="arrow-right" decorative size="sm" />
          </Button>
          {result ? (
            <div className={pageStyles.simulationResult} role="status">
              <Badge tone="info">Simulation complete</Badge>
              <strong>{result.name}</strong>
              <p>
                Starting stage: {result.stage}
                <br />
                Assigned owner: {result.owner}
              </p>
              <small>No contact was created and no workflow was triggered.</small>
            </div>
          ) : (
            <p className={pageStyles.caption}>Uses the latest saved lead-routing preferences.</p>
          )}
        </Card>
      </div>
      <Card className={styles.panel} padding="none">
        <SectionTitle title="Keep the next step close" />
        <div className={pageStyles.relatedLinks}>
          <Link href="/leads/pipeline">
            <Icon name="layers" decorative />
            <span>
              <strong>Lead pipeline</strong>
              <small>Follow each conversation through its stages.</small>
            </span>
            <Icon name="arrow-right" decorative />
          </Link>
          <Link href="/marketing/messaging">
            <Icon name="mail" decorative />
            <span>
              <strong>Follow-up drafts</strong>
              <small>Prepare the message for your next conversation.</small>
            </span>
            <Icon name="arrow-right" decorative />
          </Link>
        </div>
      </Card>
    </>
  );
}

export function TemplatesWorkspace() {
  const [selected, setSelected] = useState("Property page");
  const outputs = [
    {
      title: "Property page",
      icon: "globe",
      detail:
        "A focused listing experience with property details, your approved branding and a clear next step for interested buyers.",
      href: "/marketing/property-sites",
      link: "Explore property sites",
    },
    {
      title: "Social creative",
      icon: "image",
      detail:
        "Coordinated feed and story formats. Explore the example assets before preparing your own campaign.",
      href: "/marketing/creative",
      link: "Explore creative",
    },
    {
      title: "Campaign review",
      icon: "shield",
      detail:
        "Check the campaign content, review findings and record approval before any separate publishing decision.",
      href: exampleCampaignHref,
      link: "Explore campaign review",
    },
  ] as const;
  const output = outputs.find((item) => item.title === selected) ?? outputs[0];
  return (
    <>
      <PageHeader
        title="Campaign templates"
        description="Start with a complete plan for your next property."
      >
        <ActionLink href="/marketing/campaigns/new">
          Use Open House Boost <Icon name="arrow-right" decorative size="sm" />
        </ActionLink>
      </PageHeader>
      <MarketingTabs />
      <section className={pageStyles.templateHero}>
        <div>
          <Badge tone="info">Available to explore</Badge>
          <span className={styles.eyebrow}>Featured template</span>
          <h2>Open House Boost</h2>
          <p>
            One property. One partner. A coordinated package that gives buyers a clear way to
            connect.
          </p>
          <div className={pageStyles.featurePills}>
            <span>
              <Icon name="globe" decorative size="sm" /> Property page
            </span>
            <span>
              <Icon name="image" decorative size="sm" /> Social creative
            </span>
            <span>
              <Icon name="shield" decorative size="sm" /> Content review
            </span>
          </div>
          <ActionLink href="/marketing/campaigns/new">
            Use this template <Icon name="arrow-right" decorative size="sm" />
          </ActionLink>
        </div>
        <div className={pageStyles.templateArtwork}>
          <img
            src="/synthetic-assets/open-house-feed-v3.svg"
            alt="Example social creative included in Open House Boost"
          />
          <span>Example package · Cedar Street</span>
        </div>
      </section>
      <div className={pageStyles.mainAside}>
        <Card className={styles.panel} padding="none">
          <SectionTitle
            title="Inside the package"
            detail="Explore how the property experience fits together."
          />
          <div className={pageStyles.packageTabs} role="group" aria-label="Template package">
            {outputs.map((item) => (
              <Button
                key={item.title}
                variant="ghost"
                aria-pressed={selected === item.title}
                onClick={() => setSelected(item.title)}
              >
                <Icon name={item.icon} decorative size="sm" />
                {item.title}
              </Button>
            ))}
          </div>
          <div className={pageStyles.packageDetail}>
            <span className={styles.iconTile}>
              <Icon name={output.icon} decorative />
            </span>
            <h3>{output.title}</h3>
            <p>{output.detail}</p>
            <ActionLink href={output.href} secondary>
              {output.link}
            </ActionLink>
          </div>
        </Card>
        <Card className={pageStyles.asideCard} padding="md">
          <span className={styles.eyebrow}>Have these ready</span>
          <h2>A smooth start.</h2>
          <ol className={pageStyles.steps}>
            {[
              "The property and open-house dates",
              "Your Realtor partner and brand details",
              "Approved copy and planned budget",
            ].map((item, index) => (
              <li key={item}>
                <span>{index + 1}</span>
                <strong>{item}</strong>
              </li>
            ))}
          </ol>
          <Link href="/onboarding">Complete your guided setup</Link>
        </Card>
      </div>
      <QuietNote>
        Additional templates are planned. Open House Boost is the available campaign workflow.
      </QuietNote>
    </>
  );
}

export function ExploreWorkspace() {
  const modules: readonly {
    title: string;
    detail: string;
    href: string;
    icon: IconName;
    label: string;
  }[] = [
    {
      title: "Open House Boost",
      detail: "Bring a property, partner and marketing package together.",
      href: "/marketing/blueprints",
      icon: "home",
      label: "Explore template",
    },
    {
      title: "Your Realtor network",
      detail: "Keep the profiles behind your strongest collaborations close.",
      href: "/partners",
      icon: "users",
      label: "Open partners",
    },
    {
      title: "Property marketing",
      detail: "Browse example property sites and creative formats.",
      href: "/marketing/property-sites",
      icon: "globe",
      label: "Explore property sites",
    },
    {
      title: "Lead follow-up",
      detail: "See your conversations, stages and saved routing preferences.",
      href: "/leads/pipeline",
      icon: "layers",
      label: "Open pipeline",
    },
    {
      title: "Messaging drafts",
      detail: "Prepare invitations, buyer follow-up and partner updates.",
      href: "/marketing/messaging",
      icon: "mail",
      label: "Prepare a message",
    },
    {
      title: "Business reporting",
      detail: "Understand your pipeline and take the details with you.",
      href: "/reports",
      icon: "chart",
      label: "View reports",
    },
    {
      title: "Homeowner value & equity",
      detail: "Create branded property reports, review loan assumptions and keep report history.",
      href: "/homeowners",
      icon: "home",
      label: "Open homeowner reports",
    },
  ];
  return (
    <>
      <PageHeader
        title="Explore AutomatedLO"
        description="Find the right tool for the work in front of you."
      >
        <ActionLink href="/onboarding" secondary>
          Guided setup <Icon name="arrow-right" decorative size="sm" />
        </ActionLink>
      </PageHeader>
      <div className={pageStyles.exploreIntro}>
        <span className={styles.iconTile}>
          <Icon name="sparkles" decorative />
        </span>
        <div>
          <h2>Your next step, all in one place.</h2>
          <p>
            Explore the available demo workflows below. Your profile, partners and saved campaign
            drafts stay together in this workspace.
          </p>
        </div>
      </div>
      <div className={pageStyles.moduleGrid}>
        {modules.map((item) => (
          <Card key={item.href} className={pageStyles.moduleCard} padding="md">
            <span className={styles.iconTile}>
              <Icon name={item.icon} decorative />
            </span>
            <h2>{item.title}</h2>
            <p>{item.detail}</p>
            <ActionLink href={item.href} secondary>
              {item.label}
              <Icon name="arrow-up-right" decorative size="sm" />
            </ActionLink>
          </Card>
        ))}
      </div>
      <Card className={styles.panel} padding="none">
        <SectionTitle
          title="On the horizon"
          detail="Future ideas, separate from the tools you can use today."
        />
        <div className={pageStyles.roadmap}>
          {["Financing tools", "Additional campaign templates"].map((title) => (
            <div key={title}>
              <strong>{title}</strong>
              <Badge>Planned</Badge>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
