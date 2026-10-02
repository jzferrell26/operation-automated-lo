import { Button, Icon, Link } from "@oalo/ui";
import { useId } from "react";

import {
  LAUNCH_ON_FACEBOOK,
  LAUNCH_SENTENCES,
  MAKE_A_NEW_VERSION,
  launchRetiredSentence,
} from "../../../copy/launch-messages.js";
import { launchSentenceFor, type LaunchState } from "../launch-model.js";
import styles from "./campaign-page.module.css";

/**
 * PRD-009e 009E-AC-001. The campaign page's two actions: "Make a new version" (secondary, 009D-AC-020)
 * and "Launch on Facebook" (primary and disabled), with the launch button's one sentence directly
 * under the buttons. The sentence comes from 009d's function (`launchSentenceFor`), so this page and
 * step 3 can never say two different things.
 *
 * Like 009d's own button, "Launch on Facebook" is disabled by construction: it renders the
 * `disabled` attribute and is given no `onClick`, no `formAction`, and no `href`, because no launch
 * route exists for it to reach. The sentence is tied to it with `aria-describedby`.
 */
export function CampaignHeaderActions({
  launch,
  makeNewVersionHref,
}: Readonly<{ launch: LaunchState; makeNewVersionHref: string | undefined }>) {
  const reasonId = useId();
  const sentence = launchSentenceFor(launch);
  return (
    <div className={styles.headActions} data-header-actions="">
      <div className={styles.actions}>
        {makeNewVersionHref === undefined ? null : (
          <Link href={makeNewVersionHref} variant="action">
            {MAKE_A_NEW_VERSION}
          </Link>
        )}
        <Button aria-describedby={reasonId} disabled type="button" variant="primary">
          <span className={styles.buttonLabel}>
            <Icon decorative name="megaphone" size="sm" />
            {LAUNCH_ON_FACEBOOK}
          </span>
        </Button>
      </div>
      <p className={styles.reason} id={reasonId}>
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
    </div>
  );
}
