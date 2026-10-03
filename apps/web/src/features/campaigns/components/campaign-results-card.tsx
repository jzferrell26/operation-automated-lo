import type { ReportingMetric } from "@oalo/contracts";
import { Badge, Surface } from "@oalo/ui";

import {
  RESULTS,
  RESULT_SOURCE_NAMES,
  RESULT_UPDATED_UNKNOWN,
  resultSourceLine,
  resultUpdatedLine,
} from "../../../copy/campaign-page-messages.js";
import type { CampaignResultsInput } from "../campaign-page-model.js";
import styles from "./campaign-page.module.css";
import { TextWithDays } from "./text-with-days.js";

/**
 * PRD-009e D1, 009E-AC-002 and MTK-009. The results card: Spend, Leads sent to HighLevel, and Cost
 * per lead, read from the campaign's reporting record, and no other figure.
 *
 * A figure with no value shows "Not live yet" in words, never 0 and never a dash, because a zero
 * would be a claim that something was counted. When every figure is without a value the card says so
 * once, in a chip and a sentence. When a value exists (from a future source) the figure shows it
 * with its source and when it was last updated, as `metric-source-and-freshness.md` requires.
 */

function dollarsFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function UpdatedWords({ updatedAt }: Readonly<{ updatedAt: string | null }>) {
  const when = updatedAt === null ? undefined : new Date(updatedAt);
  if (updatedAt === null || when === undefined || Number.isNaN(when.getTime())) {
    return RESULT_UPDATED_UNKNOWN;
  }
  const written = `${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(when)} UTC`;
  return (
    <TextWithDays
      days={[{ dateTime: when.toISOString(), text: written }]}
      text={resultUpdatedLine(written)}
    />
  );
}

interface Figure {
  readonly id: string;
  readonly label: string;
  readonly metric: ReportingMetric;
  readonly format: (value: number) => string;
}

function figuresOf(results: CampaignResultsInput): readonly Figure[] {
  return [
    {
      id: "spend",
      label: RESULTS.spend,
      metric: results.spendCents,
      format: dollarsFromCents,
    },
    {
      id: "leads",
      label: RESULTS.leads,
      metric: results.leads,
      format: (value) => String(value),
    },
    {
      id: "cost-per-lead",
      label: RESULTS.costPerLead,
      metric: results.costPerLeadCents,
      format: dollarsFromCents,
    },
  ];
}

export function CampaignResultsCard({ results }: Readonly<{ results: CampaignResultsInput }>) {
  const figures = figuresOf(results);
  const anyValue = figures.some((figure) => figure.metric.value !== null);
  return (
    <Surface
      aria-labelledby="campaign-results-title"
      data-results-card=""
      padding="lg"
      role="region"
    >
      <div className={styles.body}>
        <div className={styles.cardHead}>
          <h2 id="campaign-results-title">{RESULTS.title}</h2>
          {anyValue ? null : <Badge tone="neutral">{RESULTS.chip}</Badge>}
        </div>
        {anyValue ? null : <p className={styles.small}>{RESULTS.notLiveSentence}</p>}
        <ul className={styles.metrics}>
          {figures.map((figure) => {
            const value = figure.metric.value;
            return (
              <li
                className={styles.metric}
                data-figure={figure.id}
                data-has-value={value !== null}
                key={figure.id}
              >
                <span className={styles.metricLabel}>{figure.label}</span>
                <span className={styles.metricValue}>
                  {value === null ? RESULTS.figureNotLive : figure.format(value)}
                </span>
                {value === null ? null : (
                  <span className={styles.metricMeta}>
                    {resultSourceLine(RESULT_SOURCE_NAMES[figure.metric.source])}
                    {". "}
                    <UpdatedWords updatedAt={figure.metric.updatedAt} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Surface>
  );
}
