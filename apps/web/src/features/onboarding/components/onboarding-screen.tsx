import { Card, Icon, OnboardingChecklist, type OnboardingChecklistItemModel } from "@oalo/ui";

import type {
  DeepReadonly,
  Onboarding,
  OnboardingItem,
  SyntheticSession,
} from "../../ui-foundation/model/synthetic-ui.js";
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
          <p className={styles.eyebrow}>Self-onboarding command center</p>
          <h1>Connect and verify {session.location.displayName}</h1>
          <p>
            Progress is a read-only server-shaped projection for {session.user.displayName} (
            {session.user.roleLabel}).
          </p>
        </div>
        <span className={styles.readinessStatus}>
          <Icon decorative name="alert-triangle" size="sm" tone="warning" />
          Attention Required
        </span>
      </header>

      <Card className={styles.safetyNotice} padding="md">
        <Icon decorative name="lock" size="sm" tone="info" />
        <div>
          <strong>Read-only synthetic readiness evidence</strong>
          <p>{onboarding.safety.disclosure}</p>
          <p>
            Dismissing guidance cannot complete an item. The browser cannot record approval,
            readiness, publication, provider access, or customer data.
          </p>
        </div>
      </Card>

      <OnboardingGuidance guidance={onboarding.guidance} />

      <OnboardingChecklist
        data-tour="onboarding-get-connected"
        description="Complete these five outcomes with current server-verified evidence."
        items={getConnected}
        title="Get Connected"
      />

      <OnboardingChecklist
        data-tour="onboarding-launch-readiness"
        description={
          launchReadinessLocked
            ? "Locked until every Get Connected outcome has current complete evidence."
            : "Complete these four server-verified readiness outcomes."
        }
        items={launchReadiness}
        locked={launchReadinessLocked}
        title="Launch Readiness"
      />

      <section aria-labelledby="readiness-evidence-title" className={styles.evidenceSummary}>
        <h2 id="readiness-evidence-title">Readiness evidence policy</h2>
        <div className={styles.policyGrid}>
          <Card padding="sm">
            <strong>Verification</strong>
            <p>
              Completion includes verifier version, verification time, safe evidence, and permitted
              synthetic provider references.
            </p>
          </Card>
          <Card padding="sm">
            <strong>Invalidation</strong>
            <p>A dependency change can move complete evidence to stale and revoke readiness.</p>
          </Card>
          <Card padding="sm">
            <strong>Authority</strong>
            <p>
              Only validated provider reads, saved configuration, and safe test results can complete
              a step.
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
        <strong>Evidence freshness:</strong> {item.freshness}
      </p>
    </div>
  );
  const action = (
    <a
      className="oalo-action-link"
      data-tour={`onboarding-${item.id}`}
      href={item.completionHref}
      tabIndex={locked ? -1 : undefined}
    >
      {item.state === "complete" ? "Review completion evidence" : "Open completion surface"}
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
