"use client";

import { Button, Card, Stack } from "@oalo/ui";
import { useMemo, useState } from "react";

import type { DeepReadonly } from "../../ui-foundation/model/synthetic-ui.js";
import {
  blueprintDimensionOptions,
  filterReportingCampaigns,
  groupBlueprintLearning,
  type BlueprintDimension,
  type ReportingAcceptanceProjection,
  type ReportingCampaign,
  type RealtorAuditEvent,
  type RealtorSharingAction,
} from "../model/reporting-acceptance.js";
import styles from "./reporting.module.css";

type Filters = Readonly<{
  query: string;
  realtor: string;
  property: string;
  status: string;
  eventDate: string;
  generationDate: string;
  publishDate: string;
}>;

const emptyFilters: Filters = {
  query: "",
  realtor: "",
  property: "",
  status: "",
  eventDate: "",
  generationDate: "",
  publishDate: "",
};

type LocalAuditRecord = Readonly<{
  id: string;
  event: RealtorAuditEvent;
  state: "staged locally";
  source: string;
  occurredAt: string;
  target: string;
}>;

export function ReportingAcceptanceSurface({
  projection,
}: Readonly<{ projection: DeepReadonly<ReportingAcceptanceProjection> }>) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [blueprintDimension, setBlueprintDimension] =
    useState<BlueprintDimension>("blueprintVersion");
  const [localAuditHistory, setLocalAuditHistory] = useState<readonly LocalAuditRecord[]>([]);
  const [auditStatus, setAuditStatus] = useState(
    "No sharing action has been staged in this read-only session.",
  );
  const visibleCampaigns = useMemo(
    () => filterReportingCampaigns(projection.campaigns, filters),
    [filters, projection.campaigns],
  );
  const blueprintGroups = useMemo(
    () => groupBlueprintLearning(projection.blueprintLearning, blueprintDimension),
    [blueprintDimension, projection.blueprintLearning],
  );

  function setFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function stageRealtorAudit(action: DeepReadonly<RealtorSharingAction>) {
    const record: LocalAuditRecord = {
      id: `local-${action.id}-${String(localAuditHistory.length + 1).padStart(2, "0")}`,
      event: action.event,
      state: "staged locally",
      source: "Realtor sharing control",
      occurredAt: new Date().toISOString(),
      target: action.target,
    };
    setLocalAuditHistory((current) => [...current, record]);
    setAuditStatus(`${action.event} recorded for ${action.target}. Nothing was sent anywhere.`);
  }

  return (
    <>
      <section aria-labelledby="campaign-history-title" className={styles.portfolio}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Loan officer campaign reporting</p>
            <h2 id="campaign-history-title">Campaign history</h2>
          </div>
          <span>{visibleCampaigns.length} matching campaigns</span>
        </div>

        <form className={styles.filterForm} onReset={() => setFilters(emptyFilters)}>
          <label>
            Search campaigns
            <input
              onChange={(event) => setFilter("query", event.target.value)}
              type="search"
              value={filters.query}
            />
          </label>
          <FilterSelect
            label="Realtor"
            onChange={(value) => setFilter("realtor", value)}
            options={unique(projection.campaigns.map((campaign) => campaign.realtor))}
            value={filters.realtor}
          />
          <FilterSelect
            label="Property"
            onChange={(value) => setFilter("property", value)}
            options={unique(projection.campaigns.map((campaign) => campaign.property))}
            value={filters.property}
          />
          <FilterSelect
            label="Status"
            onChange={(value) => setFilter("status", value)}
            options={unique(projection.campaigns.map((campaign) => campaign.status))}
            value={filters.status}
          />
          <DateFilter
            label="Event date"
            onChange={(value) => setFilter("eventDate", value)}
            value={filters.eventDate}
          />
          <DateFilter
            label="Generation date"
            onChange={(value) => setFilter("generationDate", value)}
            value={filters.generationDate}
          />
          <DateFilter
            label="Publish date"
            onChange={(value) => setFilter("publishDate", value)}
            value={filters.publishDate}
          />
          <Button type="reset" variant="secondary">
            Clear filters
          </Button>
        </form>

        {visibleCampaigns.length === 0 ? (
          <p role="status">No campaigns match the current filters.</p>
        ) : (
          <Stack gap="4">
            {visibleCampaigns.map((campaign) => (
              <CampaignReportingCard campaign={campaign} key={campaign.id} />
            ))}
          </Stack>
        )}
      </section>

      <section aria-labelledby="reporting-exceptions-title" className={styles.portfolio}>
        <h2 id="reporting-exceptions-title">Health and reporting exceptions</h2>
        <Stack gap="3">
          {projection.exceptions.map((exception) => (
            <Card data-exception-kind={exception.kind} key={exception.code} padding="md">
              <div className={styles.sectionHeading}>
                <div>
                  <h3>{exception.code}</h3>
                  <p>{exception.explanation}</p>
                </div>
                <span>{exception.kind.replaceAll("_", " ")}</span>
              </div>
              <dl className={styles.inlineDetails}>
                <Detail label="Last attempt" value={formatTimestamp(exception.lastAttempt)} />
                <Detail label="Support reference" value={exception.correlationId} />
                <Detail label="Next action" value={exception.nextAction} />
              </dl>
            </Card>
          ))}
        </Stack>
      </section>

      <section aria-labelledby="blueprint-learning-title" className={styles.portfolio}>
        <h2 id="blueprint-learning-title">Privacy-safe blueprint learning</h2>
        <Card padding="md">
          <label className={styles.fieldControl}>
            Group blueprint results by
            <select
              onChange={(event) => setBlueprintDimension(event.target.value as BlueprintDimension)}
              value={blueprintDimension}
            >
              {blueprintDimensionOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p>
            Sample {projection.blueprintLearning.sampleSize}, minimum sample{" "}
            {projection.blueprintLearning.minimumSampleSize}, minimum privacy buckets{" "}
            {projection.blueprintLearning.minimumTenantCount}.
          </p>
          <p>Small groups are hidden. No workspace is named. Nothing here changes a campaign.</p>
          <div
            aria-label="Blueprint grouping results"
            className={styles.tableRegion}
            role="region"
            tabIndex={0}
          >
            <table>
              <caption>Results grouped by {blueprintGroups[0]?.dimensionLabel}</caption>
              <thead>
                <tr>
                  <th scope="col">Group</th>
                  <th scope="col">State</th>
                  <th scope="col">Sample</th>
                  <th scope="col">Privacy buckets</th>
                  <th scope="col">Leads</th>
                  <th scope="col">Appointments</th>
                  <th scope="col">What we checked</th>
                </tr>
              </thead>
              <tbody>
                {blueprintGroups.map((group) => (
                  <tr key={group.value}>
                    <th scope="row">{group.value}</th>
                    <td>{group.state === "available" ? "Benchmark ready" : "Suppressed"}</td>
                    <td>{group.sampleSize}</td>
                    <td>{group.privacyBucketCount}</td>
                    <td>{group.leads ?? "Unavailable"}</td>
                    <td>{group.appointments ?? "Unavailable"}</td>
                    <td>
                      {group.source}, {formatTimestamp(group.lastUpdatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section aria-labelledby="cohort-reporting-title" className={styles.portfolio}>
        <h2 id="cohort-reporting-title">Founding-cohort milestones</h2>
        <Card padding="md">
          <p>{projection.cohort.gateSummary}</p>
          <div
            aria-label="Every founding-cohort milestone, in a table"
            className={styles.tableRegion}
            role="region"
            tabIndex={0}
          >
            <table>
              <caption>Where the founding cohort stands</caption>
              <thead>
                <tr>
                  <th scope="col">Milestone</th>
                  <th scope="col">Where it stands</th>
                  <th scope="col">What we checked</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {projection.cohort.milestones.map((milestone) => (
                  <tr key={milestone.label}>
                    <th scope="row">{milestone.label}</th>
                    <td>{milestone.state}</td>
                    <td>
                      {milestone.observedAt
                        ? formatTimestamp(milestone.observedAt)
                        : milestone.value}
                    </td>
                    <td>{milestone.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section aria-labelledby="realtor-projection-title" className={styles.portfolio}>
        <h2 id="realtor-projection-title">Your Realtor partner</h2>
        <Card data-realtor-identity={projection.realtor.identity} padding="md">
          <h3>{projection.realtor.identity}</h3>
          <p>{projection.realtor.assignmentSource}</p>
          <dl className={styles.inlineDetails}>
            <Detail label="Assigned campaign" value={projection.realtor.campaignTitle} />
            <Detail label="Status" value={projection.realtor.status} />
            <Detail label="Approval request" value={projection.realtor.approvalRequest} />
            <Detail
              label="Aggregate counts"
              value={`Disabled by default, minimum-data rule ${projection.realtor.minimumDataRule}`}
            />
          </dl>
          <p>Approved artifacts:</p>
          <div className={styles.inlineLinks}>
            {projection.realtor.approvedArtifacts.map((artifact) => (
              <a className="oalo-action-link" href={artifact.href} key={artifact.label}>
                Open {artifact.label}
              </a>
            ))}
          </div>
          <p>Read-only sharing controls:</p>
          <div className={styles.inlineLinks}>
            {projection.realtor.sharingActions.map((action) => (
              <Button key={action.id} onClick={() => stageRealtorAudit(action)} variant="secondary">
                {action.label}
              </Button>
            ))}
          </div>
          <p aria-live="polite">{auditStatus}</p>
          <section aria-labelledby="realtor-audit-title">
            <h4 id="realtor-audit-title">Realtor audit log</h4>
            <ol>
              {[...projection.realtor.auditHistory, ...localAuditHistory].map((audit) => (
                <li key={audit.id}>
                  <strong>{audit.event}</strong>, {audit.state}, {audit.source},{" "}
                  <time dateTime={audit.occurredAt}>{formatTimestamp(audit.occurredAt)}</time>
                  {"target" in audit ? `, ${audit.target}` : null}
                </li>
              ))}
            </ol>
          </section>
          <p>Excluded: {projection.realtor.excludedData.join(", ")}</p>
        </Card>
      </section>
    </>
  );
}

function CampaignReportingCard({
  campaign,
}: Readonly<{ campaign: DeepReadonly<ReportingCampaign> }>) {
  return (
    <Card data-campaign-id={campaign.id} padding="md">
      <div className={styles.sectionHeading}>
        <div>
          <h3>{campaign.title}</h3>
          <p>{campaign.property}</p>
        </div>
        <span>{campaign.status}</span>
      </div>
      <dl className={styles.inlineDetails}>
        <Detail label="Current version" value={String(campaign.currentVersion)} />
        <Detail label="Realtor" value={campaign.realtor} />
        <Detail label="Approvers" value={campaign.approvers.join(", ")} />
        <Detail
          label="Publish time"
          value={campaign.publishedAt ? formatTimestamp(campaign.publishedAt) : "Unavailable"}
        />
        <Detail label="Budget" value={campaign.budget} />
        <Detail label="Event date" value={campaign.eventDate} />
        <Detail label="Generation date" value={campaign.generationDate} />
        <Detail label="Publish date" value={campaign.publishDate ?? "Unavailable"} />
        <Detail label="Excluded test leads" value={String(campaign.excludedTestLeads)} />
      </dl>
      <div className={styles.metricGrid}>
        {campaign.metrics.map((metric) => (
          <Card key={metric.id} padding="sm">
            <strong>{metric.value ?? "Unavailable"}</strong>
            <span>{metric.label}</span>
            <small>{metric.source}</small>
            <time dateTime={metric.lastUpdatedAt}>{formatTimestamp(metric.lastUpdatedAt)}</time>
          </Card>
        ))}
      </div>
      <dl className={styles.inlineDetails}>
        {Object.entries(campaign.package).map(([key, value]) => (
          <Detail key={key} label={packageLabel(key)} value={String(value)} />
        ))}
      </dl>
      <div className={styles.inlineLinks}>
        {campaign.targets.map((target) =>
          target.state === "authorized" ? (
            <a className="oalo-action-link" href={target.href} key={target.label}>
              Open {target.label}, {target.authority}
            </a>
          ) : (
            <span key={target.label}>
              {target.label}: unavailable, {target.reason}
            </span>
          ),
        )}
      </div>
    </Card>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: Readonly<{
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}>) {
  return (
    <label>
      {label}
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateFilter({
  label,
  onChange,
  value,
}: Readonly<{ label: string; onChange: (value: string) => void; value: string }>) {
  return (
    <label>
      {label}
      <input onChange={(event) => onChange(event.target.value)} type="date" value={value} />
    </label>
  );
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function packageLabel(key: string): string {
  const labels: Readonly<Record<string, string>> = {
    page: "Page",
    pdf: "PDF",
    qrDestination: "QR destination",
    creative: "Creative",
    emailPackage: "Email package",
    smsPackage: "SMS package",
    approval: "Approval",
    metaState: "Meta state",
    leadCount: "Lead count",
    ghlOutcomeSummary: "GHL outcome summary",
  };
  return labels[key] ?? key;
}
