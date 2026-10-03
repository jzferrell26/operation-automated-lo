import { Link } from "@oalo/ui";

import { LAUNCH_SENTENCES, launchRetiredSentence } from "../../../copy/launch-messages.js";
import type { LaunchSentence } from "../launch-model.js";
import { TextWithDays } from "./text-with-days.js";

/**
 * The words of the one sentence tied to "Launch on Facebook" (PRD-009d D7, 009D-AC-016).
 *
 * Step 3's "Launch" card and the campaign page's header each draw this sentence, and each used to
 * keep its own copy of the markup, so the link's words could drift between the two. Writing review
 * pass 2 (MTK-008, W-25) puts the markup here, once. The Meta sentence links to the connections
 * page, where what each account needs is explained; the retired sentence writes its date as a
 * `time` element, which is why it needs the day as `YYYY-MM-DD` as well as the words.
 *
 * The link is a 44px target set inside a running sentence, so it is the link primitive's `sentence`
 * variant: it takes the sentence's size, weight and leading and does not stretch its line (scored
 * review R1-15 and R2 F-4; `03-components/link.md`, "A link inside a sentence").
 */
export function LaunchSentenceWords({
  sentence,
  retiredOnDay,
}: Readonly<{
  sentence: LaunchSentence;
  /** The day the library took the ad out (`YYYY-MM-DD`), or `null` when it is not retired. */
  retiredOnDay: string | null;
}>) {
  switch (sentence.kind) {
    case "meta-not-connected": {
      const words = LAUNCH_SENTENCES.metaNotConnected;
      return (
        <>
          {words.before}
          <Link href="/settings/connections" variant="sentence">
            {words.link}
          </Link>
          {words.after}
        </>
      );
    }
    case "retired":
      return (
        <TextWithDays
          days={retiredOnDay === null ? [] : [{ dateTime: retiredOnDay, text: sentence.retiredOn }]}
          text={launchRetiredSentence(sentence.retiredOn)}
        />
      );
    case "not-approved":
      return <>{LAUNCH_SENTENCES.notApproved}</>;
    case "not-turned-on":
      return <>{LAUNCH_SENTENCES.notTurnedOn}</>;
  }
}
