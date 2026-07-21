import { loadSyntheticUiFixture } from "../../../features/ui-foundation/data/load-synthetic-ui.js";
import { OverviewScreen } from "../../../features/overview/components/overview-screen.js";

export default async function OverviewPage() {
  const fixture = await Promise.resolve(loadSyntheticUiFixture());
  return <OverviewScreen overview={fixture.overview} session={fixture.session} />;
}
