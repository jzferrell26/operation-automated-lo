import { Badge, Card, Icon, Stack, Surface } from "@oalo/ui";

import { ACCESS_GROUP_STATE_LABELS } from "../../../copy/user-language.js";
import type { DeepReadonly, Onboarding } from "../../ui-foundation/model/synthetic-ui.js";
import styles from "./permission-screen.module.css";

type PermissionScreenProps = Readonly<{
  onboarding: DeepReadonly<Onboarding>;
}>;

/**
 * PRD-009g D2 (009G-AC-009): a page says each connection sentence once. When every capability
 * shares one next step, as the review surface's do ("Connecting HighLevel and Meta isn't available
 * in the app yet..."), the page states it once under the notice instead of on every card.
 */
function sharedNextAction(onboarding: DeepReadonly<Onboarding>): string | undefined {
  const actions = new Set(
    onboarding.permissionGroups.flatMap((group) =>
      group.capabilities.map((capability) => capability.nextAction),
    ),
  );
  return actions.size === 1 ? [...actions][0] : undefined;
}

/**
 * The scored review's F-12. The group description is a state sentence ("You haven't connected
 * HighLevel yet, ..."), and on the review surface every group carries the same one, so the page
 * said "not connected" four times directly under a notice that says it already. The notice is where
 * the page states its connection fact, so a description that every group shares says no more than
 * the notice does and is left out, as the shared next step is. Groups with descriptions of their
 * own keep them, and one lone group is never "shared".
 */
function sharedGroupDescription(onboarding: DeepReadonly<Onboarding>): string | undefined {
  const descriptions = new Set(onboarding.permissionGroups.map((group) => group.description));
  return onboarding.permissionGroups.length > 1 && descriptions.size === 1
    ? [...descriptions][0]
    : undefined;
}

export function PermissionScreen({ onboarding }: PermissionScreenProps) {
  const sharedNext = sharedNextAction(onboarding);
  const sharedDescription = sharedGroupDescription(onboarding);
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

      {/* The scored review's F-10: the informational notice is the `Surface` primitive's `info`
          variant, which owns the tint, the radius, the padding, and the strong ink, so no module
          class has to win a cascade against a card's fill. The module keeps only the layout. */}
      <Surface className={styles.safetyNotice} padding="md" variant="info">
        <Icon decorative name="lock" size="sm" tone="info" />
        <div>
          <strong>Nothing is connected from this page</strong>
          <p>{onboarding.safety.disclosure}</p>
          {sharedNext === undefined ? null : (
            <p data-shared-next-action="">
              <strong>What to do next:</strong> {sharedNext}
            </p>
          )}
        </div>
      </Surface>

      <div className={styles.permissionGroups}>
        {onboarding.permissionGroups.map((group) => (
          <section aria-labelledby={`permission-${group.category}`} key={group.category}>
            <div className={styles.permissionHeading}>
              <h2 id={`permission-${group.category}`}>{group.label}</h2>
              {/* The scored review's F-09: the shared `Badge`, which pairs the words with a glyph.
                  Neutral on purpose: each names a kind of access, not a state of this workspace,
                  so a success or critical tone would claim a check that was never made. */}
              <Badge data-permission-category={group.category} tone="neutral">
                {ACCESS_GROUP_STATE_LABELS[group.category]}
              </Badge>
            </div>
            {sharedDescription === undefined ? <p>{group.description}</p> : null}
            <Stack gap="3">
              {group.capabilities.map((capability) => (
                <Card key={capability.id} padding="lg">
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
                    {sharedNext === undefined ? (
                      <div>
                        <dt>What to do next</dt>
                        <dd>{capability.nextAction}</dd>
                      </div>
                    ) : null}
                  </dl>
                </Card>
              ))}
            </Stack>
          </section>
        ))}
      </div>
    </div>
  );
}
