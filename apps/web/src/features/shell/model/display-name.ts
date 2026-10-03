/**
 * PRD-009 writing review pass 1, W-23. The words of a person's display name, with a leading title
 * left out, so "Dr. Alex Morgan" greets as "Alex" and shows "AM" in the account button instead of
 * "Dr." and "DA". Home's greeting (`features/overview/model/home-view.ts`) and the top bar's account
 * button (`features/shell/components/app-shell.tsx`) both read their name from here, so the two
 * cannot disagree about which word is the first name.
 *
 * Only a title followed by another word is skipped, so a name that is only "Dr." is left as it is,
 * and nothing is guessed about a name that merely starts with the same letters ("Drew", "Msgr").
 */
const LEADING_TITLE = /^(?:mr|mrs|ms|mx|dr)\.?$/iu;

/** The words of a name, split on white space, with one leading title removed when a name follows it. */
export function nameWords(displayName: string): readonly string[] {
  const words = displayName.split(/\s+/u).filter((word) => word !== "");
  const [first] = words;
  return first !== undefined && words.length > 1 && LEADING_TITLE.test(first)
    ? words.slice(1)
    : words;
}

/** The first word of a name after any leading title, or the whole name when it has no words. */
export function firstNameOf(displayName: string): string {
  return nameWords(displayName)[0] ?? displayName;
}

/** Up to two capital letters, one from each of the first two words after any leading title. */
export function initialsOf(displayName: string): string {
  return nameWords(displayName)
    .map((word) => /\p{L}/u.exec(word)?.[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
