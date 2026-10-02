import { Button, Card, Icon, Link } from "@oalo/ui";
import { useId } from "react";

import {
  LAUNCH_ON_FACEBOOK,
  LAUNCH_SENTENCES,
  LAUNCH_TITLE,
  launchRetiredSentence,
} from "../../../copy/launch-messages.js";
import { launchSentenceFor, type LaunchState } from "../launch-model.js";
import styles from "./launch.module.css";

/**
 * PRD-009d D7, 009D-AC-016 and 009D-AC-017. "Launch on Facebook", a button of its own, separate
 * from Approve, and always disabled in PRD-009.
 *
 * It is disabled by construction: it renders the `disabled` attribute and is given no `onClick`, no
 * `formAction`, and no `href`, because no launch route exists for it to reach. Exactly one sentence
 * from D7's function is tied to it through `aria-describedby`; the Meta sentence links to the
 * connections page, where connecting Meta is explained.
 */
export function LaunchOnFacebook({ state }: Readonly<{ state: LaunchState }>) {
  const sentenceId = useId();
  const sentence = launchSentenceFor(state);
  return (
    <Card className={styles.launchCard} data-launch-card="" padding="md">
      <h2 className={styles.cardTitle}>{LAUNCH_TITLE}</h2>
      <Button aria-describedby={sentenceId} disabled type="button" variant="outline">
        <Icon decorative name="megaphone" size="sm" /> {LAUNCH_ON_FACEBOOK}
      </Button>
      <p className={styles.note} id={sentenceId}>
        {sentence.kind === "meta-not-connected" ? (
          <>
            {LAUNCH_SENTENCES.metaNotConnected.before}
            <Link href="/settings/connections">{LAUNCH_SENTENCES.metaNotConnected.link}</Link>
            {LAUNCH_SENTENCES.metaNotConnected.after}
          </>
        ) : sentence.kind === "retired" ? (
          launchRetiredSentence(sentence.retiredOn)
        ) : sentence.kind === "not-approved" ? (
          LAUNCH_SENTENCES.notApproved
        ) : (
          LAUNCH_SENTENCES.notTurnedOn
        )}
      </p>
    </Card>
  );
}
