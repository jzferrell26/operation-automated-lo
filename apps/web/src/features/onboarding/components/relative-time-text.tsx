import type { ReactNode } from "react";

import styles from "./permission-screen.module.css";

/** A time said as an age: "8 minutes ago", "1 hour ago", "3 days ago". */
const RELATIVE_TIME = /\b\d+ (?:second|minute|hour|day|week|month|year)s? ago\b/gu;

/**
 * A relative time stays on one line.
 *
 * A sentence that says when it was checked ("... verified 8 minutes ago.") is one string in the
 * copy, and a browser may break it between any two words, which left "8" at the end of a line and
 * "minutes ago." at the start of the next (scored review pass 4, R3 N-9). Each relative time in the
 * text is drawn as one span that does not wrap, so it moves to the next line whole when it does not
 * fit. The words are not changed, and text with no relative time in it is drawn as it was.
 */
export function RelativeTimeText({ text }: Readonly<{ text: string }>): ReactNode {
  const parts: ReactNode[] = [];
  let from = 0;
  for (const match of text.matchAll(RELATIVE_TIME)) {
    if (match.index > from) parts.push(text.slice(from, match.index));
    parts.push(
      <span className={styles.relativeTime} data-relative-time="" key={match.index}>
        {match[0]}
      </span>,
    );
    from = match.index + match[0].length;
  }
  if (from < text.length) parts.push(text.slice(from));
  return <>{parts}</>;
}
