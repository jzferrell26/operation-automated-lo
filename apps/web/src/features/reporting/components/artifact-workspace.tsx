"use client";

import { Badge, Button, Card, Link } from "@oalo/ui";
import { useState } from "react";

import type { DeepReadonly } from "../../ui-foundation/model/synthetic-ui.js";
import type { SyntheticCampaign } from "../model/synthetic-reporting.js";
import styles from "./reporting.module.css";
import { labelForStatus, toneForStatus } from "./status-tone.js";

type ArtifactWorkspaceProps = Readonly<{
  campaign: DeepReadonly<SyntheticCampaign>;
}>;

export function ArtifactWorkspace({ campaign }: ArtifactWorkspaceProps) {
  const approvedArtifact = campaign.artifacts.find((artifact) => artifact.status === "approved");
  const [selectedArtifactId, setSelectedArtifactId] = useState(
    approvedArtifact?.id ?? campaign.artifacts[0]?.id ?? "",
  );
  const [draftSourceVersion, setDraftSourceVersion] = useState<number | null>(null);
  const selectedArtifact =
    campaign.artifacts.find((artifact) => artifact.id === selectedArtifactId) ??
    campaign.artifacts[0];

  if (!selectedArtifact || !approvedArtifact) {
    return <p>There are no versions to show yet.</p>;
  }

  /*
   * One page rhythm (scored review pass 2, R2 N-5a). The version picker, the preview, and the
   * actions belong together and keep `--space-4` apart; every section after them is a direct child
   * of the page, so each section title stands the page's one section gap below what comes before it.
   */
  return (
    <>
      <div className={styles.versionGroup}>
        <div aria-label="Preview a version" className={styles.versionPicker} role="group">
          {campaign.artifacts.map((artifact) => (
            <Button
              aria-pressed={artifact.id === selectedArtifact.id}
              key={artifact.id}
              onClick={() => setSelectedArtifactId(artifact.id)}
              size="sm"
              variant={artifact.id === selectedArtifact.id ? "primary" : "secondary"}
            >
              Version {artifact.version}
            </Button>
          ))}
        </div>

        <Card aria-live="polite" className={styles.preview} padding="lg">
          <div className={styles.previewMeta}>
            <span className={styles.caption}>Version {selectedArtifact.version}</span>
            <Badge
              data-artifact-status={selectedArtifact.status}
              tone={toneForStatus(selectedArtifact.status)}
            >
              {labelForStatus(selectedArtifact.status)}
            </Badge>
          </div>
          <h2>{selectedArtifact.previewTitle}</h2>
          <p>{selectedArtifact.previewSummary}</p>
          <dl className={styles.inlineDetails}>
            <div>
              <dt>What this is</dt>
              <dd>{selectedArtifact.label}</dd>
            </div>
            <div>
              <dt>Built from your brand details</dt>
              <dd>{selectedArtifact.sourceProfileVersion}</dd>
            </div>
          </dl>
        </Card>

        <div className={styles.artifactActions}>
          <Link external href={approvedArtifact.publicHref} variant="action">
            Open the approved page
          </Link>
          <Button
            onClick={() => setDraftSourceVersion(selectedArtifact.version)}
            variant="secondary"
          >
            Start a new draft from this
          </Button>
        </div>

        {draftSourceVersion === null ? null : (
          <Card className={styles.localProjection} padding="md" role="status">
            <strong>New draft started from version {draftSourceVersion}</strong>
            <p>Nothing that already exists was changed, and nothing was published.</p>
          </Card>
        )}
      </div>

      <section aria-labelledby="creative-originals-title" className={styles.creativeSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="creative-originals-title">Artwork and downloads</h2>
            <p>What you see here and what you download are the same version.</p>
          </div>
          <span className={styles.caption}>{campaign.creatives.length} approved sizes</span>
        </div>
        <div className={styles.creativeGrid}>
          {campaign.creatives.map((creative) => (
            <Card key={creative.id} padding="md">
              <img
                alt={`${creative.label} preview`}
                className={styles.creativePreview}
                src={creative.previewHref}
              />
              <div className={styles.fieldStatusHeading}>
                <h3>{creative.label}</h3>
                <span className={styles.caption}>{creative.placement}</span>
              </div>
              <dl className={styles.inlineDetails}>
                <div>
                  <dt>Version</dt>
                  <dd>{creative.version}</dd>
                </div>
                <div>
                  <dt>File</dt>
                  <dd>
                    {creative.dimensions}, {creative.mimeType}
                  </dd>
                </div>
              </dl>
              <Link
                download={creative.downloadFileName}
                href={creative.downloadHref}
                variant="action"
              >
                Download {creative.label}
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="campaign-history-title" className={styles.history}>
        <div className={styles.sectionHeading}>
          <h2 id="campaign-history-title">What changed, and when</h2>
          <span className={styles.caption}>
            {campaign.history.length} versions, none of them edited after the fact
          </span>
        </div>
        <ol>
          {campaign.history.map((entry) => (
            <li key={entry.version}>
              <strong>Version {entry.version}</strong>
              <Badge tone={toneForStatus(entry.status)}>{labelForStatus(entry.status)}</Badge>
              <p>{entry.summary}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
