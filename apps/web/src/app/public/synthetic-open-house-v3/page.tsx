import { Card } from "@oalo/ui";

import { loadSyntheticReporting } from "../../../features/reporting/model/synthetic-reporting.js";

export default function SyntheticPublicArtifactPage() {
  const reporting = loadSyntheticReporting();
  const approved = reporting.campaign.artifacts.find((artifact) => artifact.status === "approved");

  if (!approved) {
    return <p>No approved synthetic artifact is available.</p>;
  }

  return (
    <section aria-labelledby="public-artifact-title">
      <p>Synthetic public artifact, no provider-backed behavior</p>
      <Card padding="lg">
        <h1 id="public-artifact-title">{approved.previewTitle}</h1>
        <p>{approved.previewSummary}</p>
        <p>
          {reporting.campaign.propertyLabel}, approved artifact version {approved.version}
        </p>
      </Card>
    </section>
  );
}
