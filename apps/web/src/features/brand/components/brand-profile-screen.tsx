"use client";

import { Button, Card, Icon, Stack } from "@oalo/ui";
import { useState } from "react";

import { BRAND_FIELD_STATE_LABELS, SUPPORT_DETAILS_LABELS } from "../../../copy/user-language.js";
import { SupportDetails } from "../../shell/components/support-details.js";
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
          <p className={styles.eyebrow}>Your brand</p>
          <h1>Brand and compliance details</h1>
          <p>
            Fill these in once and every Open House Boost for {profile.activeLocation.displayName}{" "}
            uses them.
          </p>
        </div>
        <span className={styles.versionBadge}>Current</span>
      </header>

      <Card className={styles.safetyNotice} padding="md">
        <Icon decorative name="lock" size="sm" tone="info" />
        <div>
          <strong>Suggestions only. You decide what&apos;s saved.</strong>
          <p>{profile.safety.disclosure}</p>
        </div>
      </Card>

      <section aria-labelledby="canonical-profile-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="canonical-profile-title">Your current details</h2>
            <p>{profile.canonicalProfile.source}</p>
          </div>
          <SupportDetails
            rows={[[SUPPORT_DETAILS_LABELS.versionId, profile.canonicalProfile.version]]}
          />
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
            <h2 id="required-fields-title">What every Open House Boost needs</h2>
            <p>Your state, your lender&apos;s policy, and where the ad runs all ask for these.</p>
          </div>
          <span>{missingFields.length} still to add</span>
        </div>
        <Stack gap="3">
          {profile.canonicalProfile.requiredFields.map((field) => (
            <Card data-profile-field-state={field.state} key={field.id} padding="sm">
              <div className={styles.fieldStatusHeading}>
                <h3>{field.label}</h3>
                <span>{BRAND_FIELD_STATE_LABELS[field.state]}</span>
              </div>
              {field.state === "confirmed" ? (
                <p>{field.evidence}</p>
              ) : (
                <>
                  <p>{field.reason}</p>
                  <p>
                    <strong>What to do next:</strong> {field.nextAction}
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
            <h2 id="ai-profile-title">Suggested from your approved samples</h2>
            <p>Every suggestion comes from the marketing you approved below. Nothing else.</p>
          </div>
          <span>You decide what&apos;s saved</span>
        </div>

        <ul className={styles.sampleList} aria-label="Your approved marketing samples">
          {profile.aiAssistance.approvedSamples.map((sample) => (
            <li key={sample.id}>
              <strong>{sample.displayName}</strong>
              <span>You approved this for suggestions</span>
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
                  <span>{accepted ? "Added to your draft" : suggestion.confidenceLabel}</span>
                </div>
                <p>{suggestion.proposedValue}</p>
                <p className={styles.sourceText}>
                  Based on {suggestion.sourceSampleIds.length} of your samples
                </p>
                <Button
                  disabled={accepted}
                  onClick={() => acceptSuggestion(suggestion.id)}
                  variant="secondary"
                >
                  {accepted ? "Added to your draft" : `Use this for ${suggestion.label}`}
                </Button>
              </Card>
            );
          })}
        </div>

        <p className={styles.acceptanceStatus} role="status">
          {acceptedSuggestionIds.length === 0
            ? "Nothing saved from a suggestion yet."
            : `${acceptedSuggestionIds.length} suggestion${acceptedSuggestionIds.length === 1 ? "" : "s"} added to your draft. Your saved details haven't changed.`}
        </p>
      </section>

      <Card className={styles.protectedFields} padding="md">
        <h2>We never suggest these</h2>
        <ul>
          {profile.aiAssistance.protectedFieldGroups.map((group) => (
            <li key={group}>{group}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
