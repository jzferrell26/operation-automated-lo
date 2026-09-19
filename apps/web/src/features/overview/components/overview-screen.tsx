import { Card, EmptyState, Icon, Metric, Stack, Surface } from "@oalo/ui";

import {
  NOT_CONNECTED_NEXT_STEP,
  NOT_CONNECTED_SOURCE,
  SUPPORT_DETAILS_LABELS,
} from "../../../copy/user-language.js";
import { GUIDED_SETUP_ANCHORS } from "../../guided-setup/anchor-registry.js";
import { SupportDetails } from "../../shell/components/support-details.js";
import type {
  DeepReadonly,
  Overview,
  SyntheticSession,
} from "../../ui-foundation/model/synthetic-ui.js";
import type { OverviewMetricView, OverviewView } from "../model/overview-view.js";
import type { CampaignWorkspaceProjection } from "@oalo/application";
import { ActivityFeed } from "./activity-feed.js";
import { OverviewEdgeStateMatrix } from "./overview-edge-state-matrix.js";
import styles from "./overview.module.css";
import { ProjectedSafeAction } from "./projected-safe-action.js";

type OverviewScreenProps = Readonly<{
  overview: OverviewView;
  session: DeepReadonly<SyntheticSession>;
  workspaceCampaigns?: readonly CampaignWorkspaceProjection[];
  workspaceMode?: "synthetic" | "review";
}>;

export function OverviewScreen({
  overview,
  session,
  workspaceCampaigns,
  workspaceMode = "synthetic",
}: OverviewScreenProps) {
  const priorityMetrics = overview.metrics.slice(0, 4);
  const secondaryMetrics = overview.metrics.slice(4);
  const otherWork =
    workspaceCampaigns === undefined
      ? overview.activeWork
      : overview.activeWork.filter((item) => item.type !== "campaign");

  return (
    <div className={styles.overview}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{session.location.displayName}</p>
          <h1>{overview.heading}</h1>
          <p>
            {workspaceMode === "review"
              ? NOT_CONNECTED_SOURCE
              : `${session.user.displayName}, ${session.user.roleLabel}`}
          </p>
          <p>
            {workspaceMode === "review" ? (
              NOT_CONNECTED_NEXT_STEP
            ) : (
              <>
                Checked on{" "}
                <time dateTime={overview.lastVerifiedAt}>
                  {formatTimestamp(overview.lastVerifiedAt)}
                </time>
              </>
            )}
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.readiness} data-status={overview.readiness}>
            <Icon
              decorative
              name={overview.readiness === "launch_ready" ? "check" : "alert-triangle"}
              size="sm"
              tone={overview.readiness === "launch_ready" ? "success" : "warning"}
            />
            {overview.readiness === "launch_ready" ? "Ready to launch" : "Still to do"}
          </span>
          <ProjectedSafeAction label="Create a campaign" />
        </div>
      </header>

      <section aria-labelledby="health-strip-title" className={styles.healthSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>What we last checked</p>
            <h2 id="health-strip-title">How things stand</h2>
          </div>
        </div>
        <div className={styles.healthStrip}>
          {overview.health.map((item) => (
            <Surface className={styles.healthItem} key={item.id} padding="sm" variant="sunken">
              <StatusBadge item={item} />
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
              <small>{item.source}</small>
              <small>{item.freshness}</small>
            </Surface>
          ))}
        </div>
      </section>

      <section aria-labelledby="quick-actions-title" className={styles.quickActionsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Things you can do now</p>
            <h2 id="quick-actions-title">Quick actions</h2>
          </div>
        </div>
        <div className={styles.quickActions} data-tour={GUIDED_SETUP_ANCHORS.setupWelcome}>
          <a className="oalo-action-link" href="/marketing/campaigns/new">
            Create an Open House Boost
          </a>
          <a className="oalo-action-link" href="/settings/routing">
            Fix the connection that needs attention first
          </a>
        </div>
      </section>

      <MetricSection
        className={styles.priorityMetricsSection ?? ""}
        description="Every number here says where it came from and when we last checked."
        metrics={priorityMetrics}
        title="Your numbers"
      />

      <AttentionQueue attention={overview.attention} />

      <section aria-labelledby="more-actions-title" className={styles.secondaryActionsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Coming later</p>
            <h2 id="more-actions-title">More quick actions</h2>
          </div>
        </div>
        <div className={styles.quickActions}>
          <ProjectedSafeAction label="Build property site" />
          <ProjectedSafeAction label="Generate PDF and creative" />
          <ProjectedSafeAction label="Add Realtor partner" />
          <a className="oalo-action-link" href="/leads">
            See your leads
          </a>
          <a className="oalo-action-link" href="/leads/pipeline">
            Open your HighLevel pipeline
          </a>
        </div>
      </section>

      <MetricSection
        className={styles.secondaryMetricsSection ?? ""}
        description="Useful to know, but not what you check first."
        metrics={secondaryMetrics}
        title="More numbers"
      />

      <section
        aria-labelledby="active-work-title"
        className={`${styles.section} ${styles.activeWorkSection}`}
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Across the product</p>
            <h2 id="active-work-title">What you have going on</h2>
          </div>
        </div>
        <div className={styles.listGrid}>
          {workspaceCampaigns?.length === 0 ? (
            <Card padding="md">
              <p className={styles.itemMeta}>Campaign</p>
              <h3>No campaigns yet</h3>
              <p>Create your first Open House Boost. It's saved as you go.</p>
              <p>
                <strong>What to do next:</strong> Create an Open House Boost
              </p>
            </Card>
          ) : null}
          {workspaceCampaigns?.map((campaign) => (
            <Card key={campaign.campaignRef} padding="md">
              <p className={styles.itemMeta}>Campaign</p>
              <h3>{campaign.headline}</h3>
              <p>{stateLabel(campaign.state)}</p>
              <p>
                <strong>What to do next:</strong>{" "}
                {campaign.nextActions.find((action) => action.available)?.label ??
                  "Open it and see where it stands."}
              </p>
              <a className="oalo-action-link" href={campaign.detailHref}>
                Open campaign
              </a>
            </Card>
          ))}
          {otherWork.map((item) => (
            <Card key={item.id} padding="md">
              <p className={styles.itemMeta}>{workTypeLabel(item.type)}</p>
              <h3>{item.title}</h3>
              <p>{item.status}</p>
              <p>
                <strong>What to do next:</strong> {item.nextAction}
              </p>
            </Card>
          ))}
          {workspaceCampaigns === undefined && otherWork.length === 0 ? (
            <EmptyState
              description="Nothing is in progress right now. We don't guess at what might be."
              title="Nothing in progress"
            />
          ) : null}
        </div>
      </section>

      <ActivityFeed activity={overview.recentActivity} />

      <section aria-labelledby="workspace-status-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>What's in your plan, and what's ready</p>
            <h2 id="workspace-status-title">Your workspace</h2>
          </div>
        </div>
        <div className={styles.workspaceGrid}>
          {overview.workspaceStatus.map((item) => (
            <Card key={item.id} padding="sm">
              <StatusBadge item={item} />
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
              <small>{item.source}</small>
              <small>{item.freshness}</small>
            </Card>
          ))}
        </div>
      </section>

      <OverviewEdgeStateMatrix states={overview.stateMatrix} />
    </div>
  );
}

function MetricSection({
  className,
  description,
  metrics,
  title,
}: Readonly<{
  className: string;
  description: string;
  metrics: readonly OverviewMetricView[];
  title: string;
}>) {
  const titleId = `${title.toLowerCase().replaceAll(" ", "-")}-title`;

  return (
    <section aria-labelledby={titleId} className={`${styles.section} ${className}`}>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Where each number comes from</p>
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className={styles.metricGrid}>
        {metrics.map(({ id, ...metric }) => (
          <Metric key={id} {...metric} />
        ))}
      </div>
    </section>
  );
}

function AttentionQueue({
  attention,
}: Readonly<{ attention: DeepReadonly<Overview["attention"]> }>) {
  return (
    <section
      aria-labelledby="attention-title"
      className={`${styles.section} ${styles.attentionSection}`}
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Most urgent first</p>
          <h2 id="attention-title">Needs your attention</h2>
        </div>
      </div>
      <Stack gap="3">
        {attention.length === 0 ? (
          <EmptyState
            description="Nothing is blocked right now. We only list what we've actually checked."
            title="Nothing needs your attention"
          />
        ) : null}
        {attention.map((item) => (
          <Card key={item.id} padding="md">
            <span className={styles.statusLabel} data-status={item.severity}>
              <Icon
                decorative
                name={item.severity === "uncertain" ? "loader" : "alert-triangle"}
                size="sm"
                tone={item.severity === "critical" ? "critical" : "warning"}
              />
              {item.severity === "uncertain" ? "Uncertain, reconciling" : item.severity}
            </span>
            <h3>{item.title}</h3>
            <dl className={styles.evidenceList}>
              <div>
                <dt>Where</dt>
                <dd>{item.affectedModule}</dd>
              </div>
              <div>
                <dt>Who can do this</dt>
                <dd>{item.responsibleParty}</dd>
              </div>
              <div>
                <dt>How to fix it</dt>
                <dd>{item.remediation}</dd>
              </div>
              <div>
                <dt>What to do next</dt>
                <dd>{item.nextAction}</dd>
              </div>
              <div>
                <dt>Last tried</dt>
                <dd>{formatTimestamp(item.lastAttempt)}</dd>
              </div>
            </dl>
            {/*
              The two references support asks for. PRD-006b D8 keeps them and moves them out of the
              card's prose, so a loan officer reads five plain rows and support still gets both.
            */}
            <SupportDetails
              rows={[
                [SUPPORT_DETAILS_LABELS.rule, item.exceptionCode],
                [SUPPORT_DETAILS_LABELS.supportReference, item.correlationId],
              ]}
            />
          </Card>
        ))}
      </Stack>
    </section>
  );
}

function StatusBadge({ item }: Readonly<{ item: DeepReadonly<Overview["health"][number]> }>) {
  return (
    <span className={styles.statusLabel} data-status={item.state}>
      <Icon decorative name={statusIcon(item.state)} size="sm" tone={statusTone(item.state)} />
      {statusText(item.state)}
    </span>
  );
}

function statusIcon(
  state: Overview["health"][number]["state"],
): "alert-triangle" | "check" | "circle-dot" | "clock" | "lock" {
  switch (state) {
    case "healthy":
      return "check";
    case "attention":
      return "alert-triangle";
    case "setup_required":
      return "clock";
    case "restricted":
      return "lock";
    case "planned":
      return "circle-dot";
  }
}

function statusTone(
  state: Overview["health"][number]["state"],
): "neutral" | "success" | "uncertain" | "warning" {
  switch (state) {
    case "healthy":
      return "success";
    case "attention":
    case "setup_required":
      return "warning";
    case "restricted":
      return "uncertain";
    case "planned":
      return "neutral";
  }
}

function statusText(state: Overview["health"][number]["state"]): string {
  switch (state) {
    case "healthy":
      return "Active";
    case "attention":
      return "Attention required";
    case "setup_required":
      return "Setup required";
    case "restricted":
      return "No access";
    case "planned":
      return "Coming later";
  }
}

function workTypeLabel(type: Overview["activeWork"][number]["type"]): string {
  switch (type) {
    case "campaign":
      return "Campaign";
    case "partner":
      return "Partner";
    case "property_site":
      return "Property site";
    case "ai_confirmation":
      return "AI suggestion waiting for you";
    case "system":
      return "Automated LO";
  }
}

function stateLabel(state: CampaignWorkspaceProjection["state"]): string {
  return state.replaceAll("_", " ").replace(/^./u, (value: string) => value.toUpperCase());
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}
