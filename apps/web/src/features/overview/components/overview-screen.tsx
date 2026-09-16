import { Card, EmptyState, Icon, Metric, Stack, Surface } from "@oalo/ui";

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
          <p className={styles.eyebrow}>Platform Overview</p>
          <h1>{overview.heading}</h1>
          <p>
            {session.location.displayName} · {session.user.roleLabel}
          </p>
          <p>
            {workspaceMode === "review" ? (
              "Last system verification: none. The review surface performs no live verification."
            ) : (
              <>
                Last system verification:{" "}
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
            {overview.readiness === "launch_ready" ? "Launch Ready" : "Attention Required"}
          </span>
          <ProjectedSafeAction label="Create" />
        </div>
      </header>

      <section aria-labelledby="health-strip-title" className={styles.healthSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Last safe server-shaped evidence</p>
            <h2 id="health-strip-title">Workspace health</h2>
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
            <p className={styles.eyebrow}>Authority-aware shortcuts</p>
            <h2 id="quick-actions-title">Quick actions</h2>
          </div>
        </div>
        <div className={styles.quickActions}>
          <a className="oalo-action-link" href="/marketing/campaigns/new">
            Create marketing campaign
          </a>
          <a className="oalo-action-link" href="/settings/routing">
            Resolve highest-priority connection issue
          </a>
        </div>
      </section>

      <MetricSection
        className={styles.priorityMetricsSection ?? ""}
        description="Synthetic leads are excluded. Every value carries source, freshness, and truth state."
        metrics={priorityMetrics}
        title="Business Pulse"
      />

      <AttentionQueue attention={overview.attention} />

      <section aria-labelledby="more-actions-title" className={styles.secondaryActionsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Additional authorized shortcuts</p>
            <h2 id="more-actions-title">More quick actions</h2>
          </div>
        </div>
        <div className={styles.quickActions}>
          <ProjectedSafeAction label="Build property site" />
          <ProjectedSafeAction label="Generate PDF and creative" />
          <ProjectedSafeAction label="Add Realtor partner" />
          <a className="oalo-action-link" href="/leads">
            Review leads
          </a>
          <a className="oalo-action-link" href="/leads/pipeline">
            Open HighLevel pipeline
          </a>
        </div>
      </section>

      <MetricSection
        className={styles.secondaryMetricsSection ?? ""}
        description="Lower-priority outcomes remain distinct from the primary mobile pulse."
        metrics={secondaryMetrics}
        title="Additional Business Pulse"
      />

      <section
        aria-labelledby="active-work-title"
        className={`${styles.section} ${styles.activeWorkSection}`}
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Cross-module work</p>
            <h2 id="active-work-title">Active Work</h2>
          </div>
        </div>
        <div className={styles.listGrid}>
          {workspaceCampaigns?.length === 0 ? (
            <Card padding="md">
              <p className={styles.itemMeta}>Campaign</p>
              <h3>No campaigns in this location yet</h3>
              <p>Create an Open House Boost to persist a tenant-backed campaign.</p>
              <p>
                <strong>Next safe action:</strong> Create marketing campaign
              </p>
            </Card>
          ) : null}
          {workspaceCampaigns?.map((campaign) => (
            <Card key={campaign.campaignRef} padding="md">
              <p className={styles.itemMeta}>Campaign</p>
              <h3>{campaign.headline}</h3>
              <p>{stateLabel(campaign.state)}</p>
              <p>
                <strong>Next safe action:</strong>{" "}
                {campaign.nextActions.find((action) => action.available)?.label ??
                  "Review persisted version evidence."}
              </p>
              <a className="oalo-action-link" href={campaign.detailHref}>
                Open persisted campaign
              </a>
            </Card>
          ))}
          {otherWork.map((item) => (
            <Card key={item.id} padding="md">
              <p className={styles.itemMeta}>{workTypeLabel(item.type)}</p>
              <h3>{item.title}</h3>
              <p>{item.status}</p>
              <p>
                <strong>Next safe action:</strong> {item.nextAction}
              </p>
            </Card>
          ))}
          {workspaceCampaigns === undefined && otherWork.length === 0 ? (
            <EmptyState
              description="No connected source reports work in progress for this workspace. Nothing is inferred."
              title="No active work to show"
            />
          ) : null}
        </div>
      </section>

      <ActivityFeed activity={overview.recentActivity} />

      <section aria-labelledby="workspace-status-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Entitlement and readiness</p>
            <h2 id="workspace-status-title">Workspace Status</h2>
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
          <p className={styles.eyebrow}>Source-bearing metrics</p>
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
          <p className={styles.eyebrow}>Highest-priority blockers first</p>
          <h2 id="attention-title">Attention Queue</h2>
        </div>
      </div>
      <Stack gap="3">
        {attention.length === 0 ? (
          <EmptyState
            description="No connected source has reported a blocker. Nothing here is inferred or invented."
            title="No attention items to show"
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
                <dt>Affected module</dt>
                <dd>{item.affectedModule}</dd>
              </div>
              <div>
                <dt>Responsible party</dt>
                <dd>{item.responsibleParty}</dd>
              </div>
              <div>
                <dt>Remediation</dt>
                <dd>{item.remediation}</dd>
              </div>
              <div>
                <dt>Next safe action</dt>
                <dd>{item.nextAction}</dd>
              </div>
              <div>
                <dt>Last attempt</dt>
                <dd>{formatTimestamp(item.lastAttempt)}</dd>
              </div>
              <div>
                <dt>Exception code</dt>
                <dd>{item.exceptionCode}</dd>
              </div>
              <div>
                <dt>Correlation ID</dt>
                <dd>{item.correlationId}</dd>
              </div>
            </dl>
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
      return "Plan or role restricted";
    case "planned":
      return "Planned, unavailable";
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
      return "AI suggestion requiring human confirmation";
    case "system":
      return "System";
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
