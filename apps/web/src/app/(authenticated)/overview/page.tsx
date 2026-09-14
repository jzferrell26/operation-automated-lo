import { OverviewScreen } from "../../../features/overview/components/overview-screen.js";
import { loadAuthenticatedWorkspace } from "../../../server/authenticated-workspace-data.js";

export default async function OverviewPage() {
  const fixture = await Promise.resolve(loadAuthenticatedWorkspace().ui);
  return <OverviewScreen overview={fixture.overview} session={fixture.session} />;
}
