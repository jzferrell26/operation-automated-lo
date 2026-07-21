"use client";

import { Button, Card, Icon, Stack } from "@oalo/ui";
import { useState } from "react";

import type { DeepReadonly } from "../../ui-foundation/model/synthetic-ui.js";
import type { SyntheticBrandProfile } from "../model/synthetic-brand-profile.js";
import styles from "./brand-profile.module.css";

type BrandProfileScreenProps = Readonly<{
  profile: DeepReadonly<SyntheticBrandProfile>;
}>;

export function BrandProfileScreen({ profile }: BrandProfileScreenProps) {
  const [acceptedSuggestionIds, setAcceptedSuggestionIds] = useState<readonly string[]>([]);
  const missingFields = profile.canonicalProfile.requiredFields.filter(
    (field) => field.state === "missing",
  );

  function acceptSuggestion(suggestionId: string) {
    setAcceptedSuggestionIds((current) =>
      current.includes(suggestionId) ? current : [...current, suggestionId],
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Canonical profile</p>
          <h1>Brand and compliance profile</h1>
          <p>
            One current profile supplies reusable Open House Boost values for{" "}
            {profile.activeLocation.displayName}.
          </p>
        </div>
        <span className={styles.versionBadge}>{profile.canonicalProfile.version}, current</span>
      </header>

      <Card className={styles.safetyNotice} padding="md">
        <Icon decorative name="lock" size="sm" tone="info" />
        <div>
          <strong>Suggestion-only synthetic assistance</strong>
          <p>{profile.safety.disclosure}</p>
        </div>
      </Card>

      <section aria-labelledby="canonical-profile-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="canonical-profile-title">Current canonical profile</h2>
            <p>{profile.canonicalProfile.source}</p>
          </div>
          <span>{profile.canonicalProfile.id}</span>
        </div>
        <div className={styles.fieldGrid}>
          {profile.canonicalProfile.fields.map((field) => (
            <Card key={field.id} padding="sm">
              <h3>{field.label}</h3>
              <p>{field.value}</p>
              <small>{field.source}</small>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="required-fields-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="required-fields-title">Open House Boost required fields</h2>
            <p>Required by the selected blueprint, state, lender policy, and channels.</p>
          </div>
          <span>{missingFields.length} missing</span>
        </div>
        <Stack gap="3">
          {profile.canonicalProfile.requiredFields.map((field) => (
            <Card data-profile-field-state={field.state} key={field.id} padding="sm">
              <div className={styles.fieldStatusHeading}>
                <h3>{field.label}</h3>
                <span>{field.state}</span>
              </div>
              {field.state === "confirmed" ? (
                <p>{field.evidence}</p>
              ) : (
                <>
                  <p>{field.reason}</p>
                  <p>
                    <strong>Next safe action:</strong> {field.nextAction}
                  </p>
                </>
              )}
            </Card>
          ))}
        </Stack>
      </section>

      <section aria-labelledby="ai-profile-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="ai-profile-title">AI-assisted profile draft</h2>
            <p>Suggestions come only from the approved synthetic samples listed below.</p>
          </div>
          <span>Human acceptance required</span>
        </div>

        <ul className={styles.sampleList} aria-label="Approved marketing samples">
          {profile.aiAssistance.approvedSamples.map((sample) => (
            <li key={sample.id}>
              <strong>{sample.displayName}</strong>
              <span>{sample.permission.replaceAll("_", " ")}</span>
            </li>
          ))}
        </ul>

        <div className={styles.suggestionGrid}>
          {profile.aiAssistance.suggestions.map((suggestion) => {
            const accepted = acceptedSuggestionIds.includes(suggestion.id);

            return (
              <Card
                data-suggestion-state={accepted ? "accepted_local" : suggestion.state}
                key={suggestion.id}
                padding="md"
              >
                <div className={styles.fieldStatusHeading}>
                  <h3>{suggestion.label}</h3>
                  <span>{accepted ? "accepted locally" : suggestion.confidenceLabel}</span>
                </div>
                <p>{suggestion.proposedValue}</p>
                <p className={styles.sourceText}>
                  Sources: {suggestion.sourceSampleIds.join(", ")}
                </p>
                <Button
                  disabled={accepted}
                  onClick={() => acceptSuggestion(suggestion.id)}
                  variant="secondary"
                >
                  {accepted ? "Accepted into local draft" : `Accept ${suggestion.label} suggestion`}
                </Button>
              </Card>
            );
          })}
        </div>

        <p className={styles.acceptanceStatus} role="status">
          {acceptedSuggestionIds.length === 0
            ? "No AI suggestion has been accepted. The current canonical profile is unchanged."
            : `${acceptedSuggestionIds.length} suggestion${acceptedSuggestionIds.length === 1 ? "" : "s"} accepted into the local profile draft. The current canonical profile is unchanged.`}
        </p>
      </section>

      <Card className={styles.protectedFields} padding="md">
        <h2>Never accepted from AI</h2>
        <ul>
          {profile.aiAssistance.protectedFieldGroups.map((group) => (
            <li key={group}>{group}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
