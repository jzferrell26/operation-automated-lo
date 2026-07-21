"use client";

import { Button, Card, Stack } from "@oalo/ui";
import { useState } from "react";

import type { DeepReadonly } from "../../ui-foundation/model/synthetic-ui.js";
import type { SyntheticCampaign } from "../model/synthetic-reporting.js";
import styles from "./reporting.module.css";

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
    return <p>No synthetic artifact versions are available.</p>;
  }

  return (
    <Stack gap="4">
      <div aria-label="Artifact version previews" className={styles.versionPicker} role="group">
        {campaign.artifacts.map((artifact) => (
          <Button
            aria-pressed={artifact.id === selectedArtifact.id}
            key={artifact.id}
            onClick={() => setSelectedArtifactId(artifact.id)}
            size="sm"
            variant={artifact.id === selectedArtifact.id ? "primary" : "secondary"}
          >
            Preview version {artifact.version}
          </Button>
        ))}
      </div>

      <Card aria-live="polite" className={styles.preview} padding="lg">
        <div className={styles.previewMeta}>
          <span>Version {selectedArtifact.version}</span>
          <span data-artifact-status={selectedArtifact.status}>{selectedArtifact.status}</span>
        </div>
        <h2>{selectedArtifact.previewTitle}</h2>
        <p>{selectedArtifact.previewSummary}</p>
        <dl className={styles.inlineDetails}>
          <div>
            <dt>Artifact</dt>
            <dd>{selectedArtifact.label}</dd>
          </div>
          <div>
            <dt>Source profile</dt>
            <dd>{selectedArtifact.sourceProfileVersion}</dd>
          </div>
        </dl>
      </Card>

      <div className={styles.artifactActions}>
        <a
          className="oalo-action-link"
          href={approvedArtifact.publicHref}
          rel="noreferrer"
          target="_blank"
        >
          Open approved public link
        </a>
        <Button onClick={() => setDraftSourceVersion(selectedArtifact.version)} variant="secondary">
          Duplicate as new draft
        </Button>
      </div>

      {draftSourceVersion === null ? null : (
        <Card className={styles.localProjection} padding="sm" role="status">
          <strong>Local draft projection staged from version {draftSourceVersion}</strong>
          <p>No campaign history, provider record, approval, or public artifact was changed.</p>
        </Card>
      )}

      <section aria-labelledby="creative-originals-title" className={styles.creativeSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="creative-originals-title">Creative previews and originals</h2>
            <p>
              Each preview and download points to the same immutable synthetic creative version.
            </p>
          </div>
          <span>{campaign.creatives.length} approved sizes</span>
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
                <span>{creative.placement}</span>
              </div>
              <dl className={styles.inlineDetails}>
                <div>
                  <dt>Version</dt>
                  <dd>{creative.version}</dd>
                </div>
                <div>
                  <dt>Original</dt>
                  <dd>
                    {creative.dimensions}, {creative.mimeType}
                  </dd>
                </div>
              </dl>
              <a
                className="oalo-action-link"
                download={creative.downloadFileName}
                href={creative.downloadHref}
              >
                Download original {creative.label}
              </a>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="campaign-history-title" className={styles.history}>
        <div className={styles.sectionHeading}>
          <h2 id="campaign-history-title">Campaign history</h2>
          <span>Immutable history: {campaign.history.length} versions</span>
        </div>
        <ol>
          {campaign.history.map((entry) => (
            <li key={entry.version}>
              <strong>Version {entry.version}</strong>
              <span>{entry.status}</span>
              <p>{entry.summary}</p>
            </li>
          ))}
        </ol>
      </section>
    </Stack>
  );
}
