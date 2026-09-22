"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Button,
  Card,
  Dialog,
  Icon,
  Link,
  LiveRegion,
  TextArea,
  TextField,
  type IconName,
} from "@oalo/ui";
import { leadStages, type PreviewView } from "./model.js";
import { useRequiredDashboardPreview } from "./preview-provider.js";
import {
  ActionLink,
  Badge,
  PageHeader,
  personName,
  ProfileAvatar,
  QuietNote,
  SectionTitle,
  SelectField,
} from "./product-components.js";
import { ThemeControl } from "../../theme/ThemeControl.js";
import styles from "./workspace.module.css";

const settingsNavigation: readonly { label: string; href: string; view: string; icon: IconName }[] =
  [
    { label: "Profile & company", href: "/settings", view: "settings", icon: "building" },
    { label: "Brand kit", href: "/brand", view: "brand", icon: "sparkles" },
    { label: "Connections", href: "/settings/connections", view: "connections", icon: "globe" },
    { label: "Lead routing", href: "/settings/routing", view: "routing", icon: "layers" },
    { label: "Team & access", href: "/settings/team", view: "team", icon: "users" },
    { label: "Account", href: "/settings/account", view: "account", icon: "shield" },
    { label: "Plan & billing", href: "/settings/billing", view: "billing", icon: "credit-card" },
  ];

function ProfileSettings({
  brand = false,
  account = false,
}: {
  brand?: boolean;
  account?: boolean;
}) {
  const { state, save } = useRequiredDashboardPreview();
  const [draft, setDraft] = useState({ ...state.profile, name: personName(state.profile.name) });
  const [message, setMessage] = useState("");
  const savedProfile = JSON.stringify(state.profile);
  useEffect(() => {
    const profile = JSON.parse(savedProfile) as typeof state.profile;
    setDraft({ ...profile, name: personName(profile.name) });
  }, [savedProfile]);
  const update = (name: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [name]: value }));
    setMessage("");
  };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save((current) => ({ ...current, profile: draft }))) setMessage("Your changes are saved.");
  }
  return (
    <div className={styles.settingsColumns}>
      <div className={styles.stack}>
        <Card className={styles.panel} padding="none">
          <SectionTitle
            title={
              brand
                ? "Your brand, consistently you."
                : account
                  ? "Your profile"
                  : "Profile & company"
            }
            detail={
              brand
                ? "The details and voice behind every campaign."
                : "Let people know who they're working with."
            }
          />
          <form className={styles.settingsForm} onSubmit={submit}>
            <div className={styles.profileIntro}>
              <ProfileAvatar name={draft.name} />
              <div>
                <strong>{draft.name || "Your name"}</strong>
                <span>Loan officer · {draft.company || "Your company"}</span>
              </div>
            </div>
            <div className={styles.divider} />
            <div className={styles.formHeading}>
              <h3>About your business</h3>
              <p>Your identity across the workspace.</p>
            </div>
            <div className={styles.two}>
              <TextField
                label="Display name"
                name="name"
                value={draft.name}
                onChange={(event) => update("name", event.target.value)}
                requirement="required"
                minLength={2}
                maxLength={120}
              />
              <TextField
                label="Company name"
                name="company"
                value={draft.company}
                onChange={(event) => update("company", event.target.value)}
                requirement="required"
                minLength={2}
                maxLength={160}
              />
              <TextField
                label="Email address"
                name="email"
                value={draft.email}
                onChange={(event) => update("email", event.target.value)}
                type="email"
                maxLength={200}
              />
              <TextField
                label="Market area"
                name="region"
                value={draft.region}
                onChange={(event) => update("region", event.target.value)}
                maxLength={120}
              />
            </div>
            <div className={styles.formHeading}>
              <h3>Your voice</h3>
              <p>A short line that sounds like you.</p>
            </div>
            <TextArea
              label="Brand tagline"
              name="tagline"
              value={draft.tagline}
              onChange={(event) => update("tagline", event.target.value)}
              maxLength={300}
            />
            <div className={styles.formFooter}>
              {message ? (
                <LiveRegion message={message} visible />
              ) : (
                <span>Use demo details while you explore.</span>
              )}
              <Button type="submit">
                Save changes <Icon name="check" decorative size="sm" />
              </Button>
            </div>
          </form>
        </Card>
        {account ? (
          <Card className={styles.panel} padding="none">
            <SectionTitle
              title="Your preferred view"
              detail="Light, dark, or whatever your device prefers."
            />
            <div className={styles.panelInset}>
              <ThemeControl />
            </div>
          </Card>
        ) : null}
        {brand ? (
          <Card className={styles.panel} padding="none">
            <SectionTitle
              title="Before your brand goes live"
              detail="The details that help buyers know and trust you."
            />
            <div className={styles.settingsRows}>
              {[
                [
                  "Company & license details",
                  "Confirm the company and license information used in your campaigns.",
                ],
                ["Approved disclosures", "Review required language before anything is published."],
              ].map(([title, detail]) => (
                <div key={title}>
                  <Icon name="shield" decorative />
                  <span>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </span>
                  <Badge tone="warning">Needs verification</Badge>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
      <div className={styles.stack}>
        <Card className={styles.brandPreview} padding="none">
          <div className={styles.brandPreviewTop}>
            <span>YOUR BRAND</span>
            <Icon name="sparkles" decorative />
            <h2>{draft.company || "Your company"}</h2>
            <p>{draft.tagline || "Your next chapter starts here."}</p>
          </div>
          <div className={styles.brandPreviewBottom}>
            <ProfileAvatar name={draft.name || "Your name"} />
            <strong>{draft.name || "Your name"}</strong>
            <span>{draft.region || "Your market"}</span>
            <small>{draft.email}</small>
          </div>
          <div className={styles.panelFoot}>
            <Icon name="eye" decorative size="sm" />
            <span>Brand preview</span>
          </div>
        </Card>
        <Card className={styles.tipCard} padding="md">
          <span className={styles.iconTile}>
            <Icon name="sparkles" decorative />
          </span>
          <h3>Familiar looks good on you.</h3>
          <p>
            Consistent details make it easier for buyers and partners to recognize your business.
          </p>
          <Link href="/marketing/campaigns/new" className={styles.textLink}>
            Create a campaign <Icon name="arrow-right" decorative size="sm" />
          </Link>
        </Card>
      </div>
    </div>
  );
}

function ConnectionSettings() {
  const [selected, setSelected] = useState<string | null>(null);
  const apps: readonly {
    name: string;
    initials: string;
    description: string;
    icon: IconName;
    purpose: string;
    items: readonly string[];
  }[] = [
    {
      name: "HighLevel",
      initials: "HL",
      description: "Keep leads, conversations, and opportunities in sync.",
      icon: "layers",
      purpose: "Your CRM, connected to every campaign.",
      items: [
        "Choose your HighLevel location",
        "Confirm contact and pipeline access",
        "Select the destination for new leads",
      ],
    },
    {
      name: "Meta",
      initials: "m",
      description: "Reach your next buyers on Facebook and Instagram.",
      icon: "megaphone",
      purpose: "A bigger audience for your property marketing.",
      items: [
        "Choose an ad account and Facebook page",
        "Confirm the campaign budget",
        "Review the approved campaign before launch",
      ],
    },
    {
      name: "Stripe",
      initials: "S",
      description: "Manage your subscription and payment details.",
      icon: "credit-card",
      purpose: "A clear view of your plan and payments.",
      items: ["Choose your plan", "Add a payment method", "Review your subscription details"],
    },
  ];
  const app = apps.find((item) => item.name === selected);
  return (
    <>
      <Card className={styles.panel} padding="none">
        <SectionTitle
          title="Bring your tools together."
          detail="Your existing systems, working alongside AutomatedLO."
        />
        <div className={styles.integrationList} data-product-guide="connections">
          {apps.map((item, index) => (
            <div key={item.name}>
              <span className={styles.appLogo} data-accent={index}>
                {item.initials}
              </span>
              <span>
                <strong>{item.name}</strong>
                <p>{item.description}</p>
                <Badge>Not connected</Badge>
              </span>
              <Button variant="outline" onClick={() => setSelected(item.name)}>
                View setup <Icon name="arrow-up-right" decorative size="sm" />
              </Button>
            </div>
          ))}
        </div>
        <QuietNote>
          Live connections are not enabled in this demo. No account access is requested.
        </QuietNote>
      </Card>
      <Dialog
        title={app ? `${app.name} connection` : "Connect an app"}
        open={app !== undefined}
        onClose={() => setSelected(null)}
        description={app?.purpose}
      >
        {app ? (
          <div className={styles.stack}>
            <Badge>Coming soon</Badge>
            <ol className={styles.simpleSteps}>
              {app.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <p>
              You'll be able to connect your account here when the live integration is available.
            </p>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Got it
            </Button>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

function RoutingSettings() {
  const { state, save } = useRequiredDashboardPreview();
  const [stage, setStage] = useState<string>(state.routing.stage);
  const [owner, setOwner] = useState<string>(
    state.routing.owner === "Preview owner" ? "Workspace owner" : state.routing.owner,
  );
  const [message, setMessage] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = leadStages.find((item) => item === stage);
    if (
      next &&
      (owner === "Workspace owner" || owner === "Unassigned") &&
      save((current) => ({
        ...current,
        routing: {
          stage: next,
          owner: owner === "Workspace owner" ? "Preview owner" : "Unassigned",
        },
      }))
    )
      setMessage("Your routing preferences are saved for this demo.");
  }
  return (
    <div className={styles.stack}>
      <Card className={styles.panel} padding="none">
        <SectionTitle
          title="Give every lead a clear destination."
          detail="Choose who follows up and where the conversation begins."
        />
        <form className={styles.settingsForm} onSubmit={submit}>
          <div className={styles.routingFlow}>
            <span>
              <Icon name="users" decorative /> New lead
            </span>
            <Icon name="arrow-right" decorative />
            <span>
              <Icon name="layers" decorative /> {stage}
            </span>
            <Icon name="arrow-right" decorative />
            <span>
              <Icon name="shield" decorative /> {owner}
            </span>
          </div>
          <div className={styles.two}>
            <SelectField
              label="Starting stage"
              value={stage}
              options={leadStages}
              onChange={setStage}
            />
            <SelectField
              label="Assigned owner"
              value={owner}
              options={["Workspace owner", "Unassigned"]}
              onChange={setOwner}
            />
          </div>
          <QuietNote>
            These preferences apply to the demo only. Connect HighLevel to set up live lead routing.
          </QuietNote>
          <div className={styles.formFooter}>
            {message ? (
              <LiveRegion message={message} visible />
            ) : (
              <span>You can revisit these choices anytime.</span>
            )}
            <Button type="submit">Save routing</Button>
          </div>
        </form>
      </Card>
      <ActionLink href="/leads/pipeline" secondary>
        Open your pipeline <Icon name="arrow-right" decorative size="sm" />
      </ActionLink>
    </div>
  );
}

function TeamSettings() {
  const { state } = useRequiredDashboardPreview();
  return (
    <div className={styles.stack}>
      <Card className={styles.panel} padding="none">
        <SectionTitle
          title="Good work happens together."
          detail="Clear access for the people who help your business grow."
        />
        <div className={styles.teamRow}>
          <ProfileAvatar name={personName(state.profile.name)} />
          <span>
            <strong>{personName(state.profile.name)}</strong>
            <small>{state.profile.email}</small>
          </span>
          <Badge tone="info">Owner · Demo</Badge>
        </div>
        <div className={styles.panelInset}>
          <Button disabled>
            <Icon name="plus" decorative size="sm" /> Invite teammate
          </Button>
          <QuietNote>Invitations become available with a live account.</QuietNote>
        </div>
      </Card>
      <Card className={styles.panel} padding="none">
        <SectionTitle title="A role for each responsibility" />
        <div className={styles.settingsRows}>
          {[
            ["Owner", "Manage the company, team, and workspace."],
            ["Creator", "Build campaigns and prepare them for review."],
            ["Approver", "Review campaign details before publication."],
          ].map(([name, detail]) => (
            <div key={name}>
              <span className={styles.iconTile}>
                <Icon name="shield" decorative />
              </span>
              <span>
                <strong>{name}</strong>
                <small>{detail}</small>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function BillingSettings() {
  const { state } = useRequiredDashboardPreview();
  return (
    <div className={styles.stack}>
      <section className={styles.billingHero}>
        <span className={styles.eyebrow}>Your workspace</span>
        <h2>Explore what's possible.</h2>
        <p>
          You're using the AutomatedLO demo. No subscription, payment method, or charges are
          attached.
        </p>
        <Badge tone="info">Demo access</Badge>
      </section>
      <div className={styles.two}>
        <Card className={styles.card} padding="md">
          <span className={styles.iconTile}>
            <Icon name="credit-card" decorative />
          </span>
          <h2>Plan & payments</h2>
          <p>Choose a plan and manage billing when the live product is ready.</p>
          <Badge>Not connected</Badge>
        </Card>
        <Card className={styles.card} padding="md">
          <span className={styles.iconTile}>
            <Icon name="chart" decorative />
          </span>
          <h2>Your activity</h2>
          <div className={styles.detailRows}>
            <div>
              <span>Campaigns created</span>
              <strong>{state.campaigns.length}</strong>
            </div>
            <div>
              <span>Realtor partners</span>
              <strong>{state.partners.length}</strong>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DemoOptions() {
  const { reset } = useRequiredDashboardPreview();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <>
      <details className={styles.demoOptions}>
        <summary>Demo workspace options</summary>
        <div>
          <p>
            Start fresh with the original sample data. This removes the demo changes saved on this
            device.
          </p>
          <Button variant="outline" onClick={() => setOpen(true)}>
            Reset demo data
          </Button>
          {message ? <LiveRegion message={message} visible /> : null}
        </div>
      </details>
      <Dialog
        title="Start fresh?"
        open={open}
        onClose={() => setOpen(false)}
        description="Your demo campaigns, added partners, and saved preferences on this device will be removed. Other devices are not affected."
        footer={
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep my changes
            </Button>
            <Button
              onClick={() => {
                if (reset()) {
                  setOpen(false);
                  setMessage("Your demo is ready for a fresh start.");
                }
              }}
            >
              Reset demo
            </Button>
          </div>
        }
      >
        <p>The original sample workspace will be restored.</p>
      </Dialog>
    </>
  );
}

export function SettingsWorkspace({ view }: { view: PreviewView }) {
  let content: ReactNode;
  switch (view) {
    case "brand":
      content = <ProfileSettings brand />;
      break;
    case "account":
      content = <ProfileSettings account />;
      break;
    case "connections":
      content = <ConnectionSettings />;
      break;
    case "routing":
      content = <RoutingSettings />;
      break;
    case "team":
      content = <TeamSettings />;
      break;
    case "billing":
      content = <BillingSettings />;
      break;
    default:
      content = <ProfileSettings />;
  }
  return (
    <>
      <PageHeader
        title={view === "brand" ? "Your brand. Your signature." : "Settings"}
        description={
          view === "brand"
            ? "Show up consistently, wherever the conversation starts."
            : "A workspace that feels like you."
        }
      />
      <div className={styles.settingsLayout}>
        <nav className={styles.settingsNav} aria-label="Settings categories">
          {settingsNavigation.map((item) => (
            <Link
              key={item.view}
              href={item.href}
              aria-current={view === item.view ? "page" : undefined}
            >
              <Icon name={item.icon} decorative size="sm" />
              <span>{item.label}</span>
              {view === item.view ? <Icon name="chevron-down" decorative size="sm" /> : null}
            </Link>
          ))}
          <div className={styles.settingsHelp}>
            <Icon name="help" decorative />
            <strong>Find your way around.</strong>
            <p>A quick walkthrough of your workspace.</p>
            <Link href="/onboarding">
              Getting started <Icon name="arrow-right" decorative size="sm" />
            </Link>
          </div>
        </nav>
        <div className={styles.stack}>
          {content}
          {view === "settings" ? <DemoOptions /> : null}
        </div>
      </div>
    </>
  );
}
