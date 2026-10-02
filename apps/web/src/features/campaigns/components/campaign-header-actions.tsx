import { Button, Icon, Link } from "@oalo/ui";
import { useId } from "react";

import { LAUNCH_ON_FACEBOOK, MAKE_A_NEW_VERSION } from "../../../copy/launch-messages.js";
import { launchSentenceFor, type LaunchState } from "../launch-model.js";
import styles from "./campaign-page.module.css";
import { LaunchSentenceWords } from "./launch-sentence.js";

/**
 * PRD-009e 009E-AC-001. The campaign page's two actions: "Make a new version" (secondary, 009D-AC-020)
 * and "Launch on Facebook" (primary and disabled), with the launch button's one sentence directly
 * under the buttons. The sentence comes from 009d's function (`launchSentenceFor`) and is drawn by
 * 009d's `LaunchSentenceWords`, so this page and step 3 can never say two different things, in
 * words or in the link (writing review pass 2, W-25).
 *
 * Like 009d's own button, "Launch on Facebook" is disabled by construction: it renders the
 * `disabled` attribute and is given no `onClick`, no `formAction`, and no `href`, because no launch
 * route exists for it to reach. The sentence is tied to it with `aria-describedby`.
 */
export function CampaignHeaderActions({
  launch,
  makeNewVersionHref,
  retiredOnDay,
}: Readonly<{
  launch: LaunchState;
  makeNewVersionHref: string | undefined;
  /** The day the library took the ad out (`YYYY-MM-DD`), which the retired sentence writes as a date. */
  retiredOnDay: string | null;
}>) {
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
        <LaunchSentenceWords retiredOnDay={retiredOnDay} sentence={sentence} />
      </p>
    </div>
  );
}
