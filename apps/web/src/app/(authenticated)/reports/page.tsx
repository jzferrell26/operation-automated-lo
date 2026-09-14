import { ReportsScreen } from "../../../features/reporting/components/reports-screen.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";

export default function ReportsPage() {
  return <ReportsScreen reporting={loadAuthenticatedWorkspace().reporting} />;
}
