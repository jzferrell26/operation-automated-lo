import type { ReactNode } from "react";

import styles from "./campaign-list.module.css";

/** A word with a hyphen inside it: "Pre-approval", "pre-approved", "First-time". */
const HYPHENATED_WORD = /\S+-\S+/gu;

/**
 * Words with a hyphen in them stay on one line.
 *
 * A hard hyphen is a place a browser may break a line, and nothing in CSS removes it, so a narrow
 * cell read "Pre-" and then "approval" on the next line (scored review pass 2, R2 F-8). Each
 * hyphenated word is drawn as one unbreakable unit, so it moves to the next line whole when it does
 * not fit. The text is not changed, shortened or cut, and a word with no hyphen wraps as it did.
 *
 * It draws one `span`, so it is also one item when it sits in a link that is a flex row, rather than
 * a run of text pieces each laid out as an item of its own.
 */
export function KeepWordsWhole({ text }: Readonly<{ text: string }>): ReactNode {
  const parts: ReactNode[] = [];
  let from = 0;
  for (const match of text.matchAll(HYPHENATED_WORD)) {
    if (match.index > from) parts.push(text.slice(from, match.index));
    parts.push(
      <span className={styles.whole} key={match.index}>
        {match[0]}
      </span>,
    );
    from = match.index + match[0].length;
  }
  if (from < text.length) parts.push(text.slice(from));
  return <span>{parts}</span>;
}
