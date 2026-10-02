import type { ReactNode } from "react";

/** A day named in a sentence: how the sentence writes it, and the machine value that says which day. */
export type DayInText = Readonly<{ dateTime: string; text: string }>;

/**
 * PRD-009e, and the design rule that every date is a `time` element (PRD-008d, 009a): the global
 * stylesheet gives `time` tabular figures in the interface face, so dates line up wherever they
 * are written.
 *
 * Copy functions say a whole sentence as one string ("Saved on Oct 2, 2026 by you"), and the
 * sentence is the copy's to word. This draws that string with each day in `days` as its own `time`
 * element, in the order the days appear, and everything around them as the text it was. A day the
 * sentence does not hold is left out, so the sentence is never changed by being drawn.
 */
export function TextWithDays({
  text,
  days,
}: Readonly<{ text: string; days: readonly DayInText[] }>): ReactNode {
  const parts: ReactNode[] = [];
  let rest = text;
  for (const day of days) {
    const at = rest.indexOf(day.text);
    if (at < 0) continue;
    if (at > 0) parts.push(rest.slice(0, at));
    parts.push(
      <time dateTime={day.dateTime} key={`${day.dateTime}-${String(parts.length)}`}>
        {day.text}
      </time>,
    );
    rest = rest.slice(at + day.text.length);
  }
  if (rest !== "") parts.push(rest);
  return <>{parts}</>;
}
