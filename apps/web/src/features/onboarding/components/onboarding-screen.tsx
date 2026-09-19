import { Card, Icon, OnboardingChecklist, type OnboardingChecklistItemModel } from "@oalo/ui";

import type {
  DeepReadonly,
  Onboarding,
  OnboardingItem,
  SyntheticSession,
} from "../../ui-foundation/model/synthetic-ui.js";
import {
  GUIDED_SETUP_ANCHORS,
  onboardingChecklistAnchor,
} from "../../guided-setup/anchor-registry.js";
import { isLaunchReadinessLocked } from "../model/readiness.js";
import { OnboardingGuidance } from "./onboarding-guidance.js";
import styles from "./onboarding.module.css";

type OnboardingScreenProps = Readonly<{
  onboarding: DeepReadonly<Onboarding>;
  session: DeepReadonly<SyntheticSession>;
}>;

export function OnboardingScreen({ onboarding, session }: OnboardingScreenProps) {
  const launchReadinessLocked = isLaunchReadinessLocked(onboarding);
  const getConnected = onboarding.getConnected.map((item) => projectChecklistItem(item, false));
  const launchReadiness = onboarding.launchReadiness.map((item) =>
    projectChecklistItem(item, launchReadinessLocked),
  );

  return (
    <div className={styles.onboarding}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Setup</p>
          <h1>Get {session.location.displayName} ready</h1>
          <p>Here&apos;s what&apos;s connected and what&apos;s left.</p>
        </div>
        <span className={styles.readinessStatus}>
          <Icon decorative name="alert-triangle" size="sm" tone="warning" />
          Still to do
        </span>
      </header>

      <Card className={styles.safetyNotice} padding="md">
        <Icon decorative name="lock" size="sm" tone="info" />
        <div>
          <strong>We only mark a step done after we&apos;ve checked it.</strong>
          <p>{onboarding.safety.disclosure}</p>
          <p>Closing a tip doesn&apos;t finish a step, and nothing here publishes or sends.</p>
        </div>
      </Card>

      <OnboardingGuidance guidance={onboarding.guidance} />

      <OnboardingChecklist
        data-tour={GUIDED_SETUP_ANCHORS.onboardingGetConnected}
        description="Five things to connect"
        items={getConnected}
        title="Connect your accounts"
      />

      <OnboardingChecklist
        data-tour={GUIDED_SETUP_ANCHORS.onboardingLaunchReadiness}
        description={
          launchReadinessLocked
            ? "Locked until everything above is connected"
            : "Four things to confirm before you launch"
        }
        items={launchReadiness}
        locked={launchReadinessLocked}
        title="Ready to launch"
      />

      <section aria-labelledby="readiness-evidence-title" className={styles.evidenceSummary}>
        <h2 id="readiness-evidence-title">How we decide a step is done</h2>
        <div className={styles.policyGrid}>
          <Card padding="sm">
            <strong>We check, then we tick</strong>
            <p>
              A step is only done once we&apos;ve checked it for real, and we tell you when we
              checked.
            </p>
          </Card>
          <Card padding="sm">
            <strong>Things can come undone</strong>
            <p>
              If something you connected changes, a step can go back to needing a look. We&apos;ll
              say so.
            </p>
          </Card>
          <Card padding="sm">
            <strong>Nothing finishes itself</strong>
            <p>
              Only a real connection, something you saved, or a check that passed can finish a step.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}

function projectChecklistItem(
  item: DeepReadonly<OnboardingItem>,
  locked: boolean,
): OnboardingChecklistItemModel {
  const description = (
    <div className={styles.itemDescription}>
      <p>{item.description}</p>
      <p>
        <strong>Checked on:</strong> {item.freshness}
      </p>
    </div>
  );
  const action = (
    <a
      className="oalo-action-link"
      data-tour={onboardingChecklistAnchor(item.id)}
      href={item.completionHref}
      tabIndex={locked ? -1 : undefined}
    >
      {item.state === "complete" ? "See what we checked" : "Open this step"}
    </a>
  );

  if (item.state === "complete") {
    const evidence = item.evidence.providerIds
      ? { ...item.evidence, providerIds: item.evidence.providerIds }
      : {
          summary: item.evidence.summary,
          verifiedAt: item.evidence.verifiedAt,
          verifierVersion: item.evidence.verifierVersion,
        };

    return {
      id: item.id,
      title: item.title,
      description,
      state: item.state,
      evidence,
      action,
    };
  }

  return {
    id: item.id,
    title: item.title,
    description,
    state: item.state,
    reason: item.reason,
    responsibleParty: item.responsibleParty,
    nextAction: item.nextAction,
    action,
  };
}
