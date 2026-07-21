import { ReportsScreen } from "../../../features/reporting/components/reports-screen.js";
import { loadSyntheticReporting } from "../../../features/reporting/model/synthetic-reporting.js";

export default function ReportsPage() {
  return <ReportsScreen reporting={loadSyntheticReporting()} />;
}
