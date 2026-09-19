import {
  ReviewNotConnectedScreen,
  type ReviewNotConnectedRegion,
} from "../../../features/shell/components/review-not-connected-screen.js";
import { ReportsScreen } from "../../../features/reporting/components/reports-screen.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";

/**
 * The synthetic reporting projection carries invented spend and lead values. They are legitimate
 * local demo data but would read as live tenant outcomes on the review URL, so review mode gets a
 * not-connected projection of the same measures instead.
 */
const reviewReportingMeasures: readonly ReviewNotConnectedRegion[] = Object.freeze([
  ["spend", "Spend"],
  ["leads", "Leads"],
  ["cost_per_lead", "Cost per lead"],
  ["appointments", "Appointments"],
  ["applications", "Applications"],
  ["funded", "Funded"],
] as const satisfies readonly ReviewNotConnectedRegion[]);

export default function ReportsPage() {
  const workspace = loadAuthenticatedWorkspace();

  if (workspace.mode === "review") {
    return (
      <ReviewNotConnectedScreen
        eyebrow="Reports"
        heading="Reports aren't live yet"
        lead="Once Meta and HighLevel are connected, spend, leads, and results show up here."
        regions={reviewReportingMeasures}
        regionsTitle="What you'll see here"
        regionsTitleId="review-reporting-title"
      />
    );
  }

  return <ReportsScreen reporting={workspace.reporting} />;
}
