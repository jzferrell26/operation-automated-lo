import { Card, Icon, Metric } from "@oalo/ui";

import {
  notConnectedReviewMetric,
  REVIEW_SURFACE_DISCLOSURE,
} from "../../../server/authenticated-workspace-data.js";

/** A region the route would show once a provider is connected: a stable id and a visible name. */
export type ReviewNotConnectedRegion = readonly [id: string, label: string];

type ReviewNotConnectedScreenProps = Readonly<{
  eyebrow: string;
  heading: string;
  lead: string;
  regionsTitle: string;
  regionsTitleId: string;
  regions: readonly ReviewNotConnectedRegion[];
  /** Omit to use the default not-connected metric source, which names spend, leads, and the CRM. */
  regionSource?: string;
}>;

/**
 * The only shape a fixture-backed route may take in review mode. It names the regions the route
 * would carry, so the product stays legible to a Marketplace reviewer, and reports every one of
 * them as not connected, so none of them asserts an observation. No fixture value reaches it.
 */
export function ReviewNotConnectedScreen({
  eyebrow,
  heading,
  lead,
  regionsTitle,
  regionsTitleId,
  regions,
  regionSource,
}: ReviewNotConnectedScreenProps) {
  return (
    <div>
      <header>
        <p>{eyebrow}</p>
        <h1>{heading}</h1>
        <p>{lead}</p>
      </header>

      <Card padding="md">
        <Icon decorative name="alert-triangle" size="sm" tone="warning" />
        <div>
          <strong>REVIEW / DEMO / NOT CONNECTED</strong>
          <p>{REVIEW_SURFACE_DISCLOSURE}</p>
        </div>
      </Card>

      <section aria-labelledby={regionsTitleId}>
        <h2 id={regionsTitleId}>{regionsTitle}</h2>
        {regions.map(([id, label]) => {
          const { id: metricId, ...metric } = notConnectedReviewMetric(id, label, regionSource);
          return <Metric key={metricId} {...metric} />;
        })}
      </section>
    </div>
  );
}
