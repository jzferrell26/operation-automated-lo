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
 *
 * Each button carries the glyph the mockup draws before its words (`campaign-detail.html`): a pencil
 * on "Make a new version" and a rocket on "Launch on Facebook" (scored review pass 2, R2 N-2). The
 * `Button` and the `action` link are both rows, so a glyph sits on the line of its words.
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
            <Icon decorative name="pencil" size="sm" />
            {MAKE_A_NEW_VERSION}
          </Link>
        )}
        <Button aria-describedby={reasonId} disabled type="button" variant="primary">
          <Icon decorative name="rocket" size="sm" />
          {LAUNCH_ON_FACEBOOK}
        </Button>
      </div>
      <p className={styles.reason} id={reasonId}>
        <LaunchSentenceWords retiredOnDay={retiredOnDay} sentence={sentence} />
      </p>
    </div>
  );
}
