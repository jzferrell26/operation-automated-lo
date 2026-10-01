import { notFound } from "next/navigation.js";

import { Card } from "@oalo/ui";

import { loadSyntheticReporting } from "../../../features/reporting/model/synthetic-reporting.js";
import { canRenderSyntheticDemo } from "../../../server/authenticated-workspace-data.js";
import styles from "./synthetic-open-house.module.css";

/**
 * The one unauthenticated page in the product, and the only one whose reader is a passer-by.
 *
 * The authenticated review routes collapse onto `ReviewNotConnectedScreen` because a Marketplace
 * reviewer is looking at them. This page has no such reader: it stands in for the page an approved
 * campaign would publish for one property, and it renders only where `canRenderSyntheticDemo` is
 * true, which is a local or preview build. Everywhere else it answers 404, which is what a real
 * deployment answers for a listing it never published.
 *
 * PRD-006b D6 scans this file like every other screen, so the words below are written for whoever
 * lands on the URL rather than for whoever built it: they say what the page is, in plain words, and
 * that none of it is live.
 *
 * It is a `<main>` because it is the whole page and nothing wraps it, which is also what axe's
 * `landmark-one-main` asks of a document. The measure and the page padding live in
 * `synthetic-open-house.module.css`, beside the reason each one is what it is.
 */
export default function SyntheticPublicArtifactPage() {
  if (!canRenderSyntheticDemo()) {
    notFound();
  }

  const reporting = loadSyntheticReporting();
  const approved = reporting.campaign.artifacts.find((artifact) => artifact.status === "approved");

  if (!approved) {
    return (
      <main className={styles.page}>
        <p>This is a sample open house page. There is nothing to show on it.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section aria-labelledby="public-artifact-title" className={styles.column}>
        <p>A sample open house page. Nothing on it is live, and nothing here was published.</p>
        <Card className={styles.card} padding="lg">
          <h1 id="public-artifact-title">{approved.previewTitle}</h1>
          <p>{approved.previewSummary}</p>
          <p>
            {reporting.campaign.propertyLabel}, sample version {approved.version}
          </p>
        </Card>
      </section>
    </main>
  );
}
