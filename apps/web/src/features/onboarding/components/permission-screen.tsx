import { Card, Icon, Stack } from "@oalo/ui";

import { ACCESS_GROUP_STATE_LABELS } from "../../../copy/user-language.js";
import type { DeepReadonly, Onboarding } from "../../ui-foundation/model/synthetic-ui.js";
import styles from "./onboarding.module.css";

type PermissionScreenProps = Readonly<{
  onboarding: DeepReadonly<Onboarding>;
}>;

export function PermissionScreen({ onboarding }: PermissionScreenProps) {
  return (
    <div className={styles.onboarding}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Connections</p>
          <h1>What Automated LO asks for, and why</h1>
          <p>
            Each item says what the app needs from your accounts, what it does with it, and what
            happens if it&apos;s missing.
          </p>
        </div>
      </header>

      <Card className={styles.safetyNotice} padding="md">
        <Icon decorative name="lock" size="sm" tone="info" />
        <div>
          <strong>Nothing is connected from this page</strong>
          <p>{onboarding.safety.disclosure}</p>
        </div>
      </Card>

      <div className={styles.permissionGroups}>
        {onboarding.permissionGroups.map((group) => (
          <section aria-labelledby={`permission-${group.category}`} key={group.category}>
            <div className={styles.permissionHeading}>
              <h2 id={`permission-${group.category}`}>{group.label}</h2>
              <span data-permission-category={group.category}>
                {ACCESS_GROUP_STATE_LABELS[group.category]}
              </span>
            </div>
            <p>{group.description}</p>
            <Stack gap="3">
              {group.capabilities.map((capability) => (
                <Card key={capability.id} padding="sm">
                  <h3>{capability.label}</h3>
                  <dl className={styles.permissionDetails}>
                    <div>
                      <dt>Why it's needed</dt>
                      <dd>{capability.businessPurpose}</dd>
                    </div>
                    <div>
                      <dt>What we checked</dt>
                      <dd>{capability.evidence}</dd>
                    </div>
                    <div>
                      <dt>What it affects</dt>
                      <dd>{capability.impact}</dd>
                    </div>
                    <div>
                      <dt>What to do next</dt>
                      <dd>{capability.nextAction}</dd>
                    </div>
                  </dl>
                </Card>
              ))}
            </Stack>
          </section>
        ))}
      </div>

      <a className="oalo-action-link" href="/onboarding">
        Back to setup
      </a>
    </div>
  );
}
