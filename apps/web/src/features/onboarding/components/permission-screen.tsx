import { Card, Icon, Stack } from "@oalo/ui";

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
          <p className={styles.eyebrow}>Connection evidence</p>
          <h1>Permissions by business purpose</h1>
          <p>
            This synthetic read-only view separates required access from granted, missing, and
            optional capabilities.
          </p>
        </div>
      </header>

      <Card className={styles.safetyNotice} padding="md">
        <Icon decorative name="lock" size="sm" tone="info" />
        <div>
          <strong>No provider authorization occurs here</strong>
          <p>{onboarding.safety.disclosure}</p>
        </div>
      </Card>

      <div className={styles.permissionGroups}>
        {onboarding.permissionGroups.map((group) => (
          <section aria-labelledby={`permission-${group.category}`} key={group.category}>
            <div className={styles.permissionHeading}>
              <h2 id={`permission-${group.category}`}>{group.label}</h2>
              <span data-permission-category={group.category}>{group.category}</span>
            </div>
            <p>{group.description}</p>
            <Stack gap="3">
              {group.capabilities.map((capability) => (
                <Card key={capability.id} padding="sm">
                  <h3>{capability.label}</h3>
                  <dl className={styles.permissionDetails}>
                    <div>
                      <dt>Business purpose</dt>
                      <dd>{capability.businessPurpose}</dd>
                    </div>
                    <div>
                      <dt>Evidence</dt>
                      <dd>{capability.evidence}</dd>
                    </div>
                    <div>
                      <dt>Impact</dt>
                      <dd>{capability.impact}</dd>
                    </div>
                    <div>
                      <dt>Next safe action</dt>
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
        Return to setup checklist
      </a>
    </div>
  );
}
