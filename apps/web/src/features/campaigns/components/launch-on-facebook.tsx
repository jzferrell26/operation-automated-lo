import { Button, Card, Icon } from "@oalo/ui";
import { useId } from "react";

import { LAUNCH_ON_FACEBOOK, LAUNCH_TITLE } from "../../../copy/launch-messages.js";
import { launchSentenceFor, type LaunchState } from "../launch-model.js";
import { LaunchSentenceWords } from "./launch-sentence.js";
import styles from "./launch.module.css";

/**
 * PRD-009d D7, 009D-AC-016 and 009D-AC-017. "Launch on Facebook", a button of its own, separate
 * from Approve, and always disabled in PRD-009.
 *
 * It is disabled by construction: it renders the `disabled` attribute and is given no `onClick`, no
 * `formAction`, and no `href`, because no launch route exists for it to reach. Exactly one sentence
 * from D7's function is tied to it through `aria-describedby`; the Meta sentence links to the
 * connections page, where what Meta needs is explained. The sentence is drawn by
 * `LaunchSentenceWords`, which the campaign page's header uses too (writing review W-25).
 */
export function LaunchOnFacebook({
  state,
  retiredDateTime,
}: Readonly<{ state: LaunchState; retiredDateTime?: string | undefined }>) {
  const sentenceId = useId();
  const sentence = launchSentenceFor(state);
  return (
    <Card className={styles.launchCard} data-launch-card="" padding="lg">
      <h2 className={styles.cardTitle}>{LAUNCH_TITLE}</h2>
      <Button aria-describedby={sentenceId} disabled type="button" variant="outline">
        <span className={styles.withIcon}>
          <Icon decorative name="megaphone" size="sm" /> {LAUNCH_ON_FACEBOOK}
        </span>
      </Button>
      <p className={styles.note} id={sentenceId}>
        <LaunchSentenceWords
          retiredOnDay={retiredDateTime === undefined ? null : retiredDateTime.slice(0, 10)}
          sentence={sentence}
        />
      </p>
    </Card>
  );
}
