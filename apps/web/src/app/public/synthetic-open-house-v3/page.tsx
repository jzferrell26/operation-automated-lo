import { notFound } from "next/navigation.js";

import { Card } from "@oalo/ui";

import { loadSyntheticReporting } from "../../../features/reporting/model/synthetic-reporting.js";
import { canRenderSyntheticDemo } from "../../../server/authenticated-workspace-data.js";

/**
 * The authenticated review routes collapse onto `ReviewNotConnectedScreen` because a Marketplace
 * reviewer is looking at them and the product stays legible when its regions are named. This route
 * has no such reader. It is unauthenticated, and it is not a product surface at all: it is one
 * published artifact for one property. Naming its regions would describe a marketing page that was
 * published for a listing that does not exist, on a URL any crawler can reach. Nothing has been
 * published on a deployment with no provider link, so the honest response is the one a real
 * deployment gives for an unpublished slug, and the one the sibling campaign route already gives
 * for an unknown reference: the artifact is not there.
 */
export default function SyntheticPublicArtifactPage() {
  if (!canRenderSyntheticDemo()) {
    notFound();
  }

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
