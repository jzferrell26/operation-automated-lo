import { Card, Icon, Metric } from "@oalo/ui";

import { ReportsScreen } from "../../../features/reporting/components/reports-screen.js";
import {
  loadAuthenticatedWorkspace,
  notConnectedReviewMetric,
  REVIEW_SURFACE_DISCLOSURE,
} from "../../../server/authenticated-workspace-data.js";

/**
 * The synthetic reporting projection carries invented spend and lead values. They are legitimate
 * local demo data but would read as live tenant outcomes on the review URL, so review mode gets a
 * not-connected projection of the same measures instead.
 */
const reviewReportingMeasures = Object.freeze([
  ["spend", "Spend"],
  ["leads", "Leads"],
  ["cost_per_lead", "Cost per lead"],
  ["appointments", "Appointments"],
  ["applications", "Applications"],
  ["funded", "Funded"],
] as const satisfies readonly (readonly [string, string])[]);

export default function ReportsPage() {
  const workspace = loadAuthenticatedWorkspace();

  if (workspace.mode === "review") {
    return <ReviewReports />;
  }

  return <ReportsScreen reporting={workspace.reporting} />;
}

function ReviewReports() {
  return (
    <div>
      <header>
        <p>Review surface</p>
        <h1>Reporting is not connected</h1>
        <p>
          No HighLevel, Meta, or Stripe reporting source is attached to this deployment, so no
          spend, lead, or outcome value can be reported here.
        </p>
      </header>

      <Card padding="md">
        <Icon decorative name="alert-triangle" size="sm" tone="warning" />
        <div>
          <strong>REVIEW / DEMO / NOT CONNECTED</strong>
          <p>{REVIEW_SURFACE_DISCLOSURE}</p>
        </div>
      </Card>

      <section aria-labelledby="review-reporting-title">
        <h2 id="review-reporting-title">Reporting measures</h2>
        {reviewReportingMeasures.map(([id, label]) => {
          const { id: metricId, ...metric } = notConnectedReviewMetric(id, label);
          return <Metric key={metricId} {...metric} />;
        })}
      </section>
    </div>
  );
}
