/**
 * PRD-009d D5. How the library-ad rules read a piece of text.
 *
 * Every rule reads the same normalised form, so a disguise that defeats one rule defeats none:
 *
 * 1. NFKC, which turns full-width and other compatibility forms into their plain letters and digits
 *    ("３.５％" reads "3.5%");
 * 2. lower case;
 * 3. format characters taken out (zero-width spaces and joiners, bidirectional controls, the byte
 *    order mark), so "rates" with a zero-width space inside reads "rates" here while `WORDS_INVALID_CHARACTERS` still
 *    refuses the raw text;
 * 4. accents taken off, and look-alike letters from the Cyrillic and Greek scripts folded to the
 *    Latin letter they imitate ("rаte" with a Cyrillic "а" reads "rate");
 * 5. curly apostrophes made straight, and every run of whitespace made one space.
 *
 * This module is pure: no `node:` import and no dependency, like the rest of the domain package.
 */

/**
 * Look-alike letters, lower case, folded to the Latin letter they are drawn like. Upper case forms
 * are lower-cased first, so a lower-case letter is listed under the Latin letter its upper case form
 * imitates where the two differ (Cyrillic "в" is drawn "B" in upper case, Greek "ν" is drawn "N").
 */
const CONFUSABLES: Readonly<Record<string, string>> = Object.freeze({
  // Cyrillic
  а: "a",
  в: "b",
  с: "c",
  ԁ: "d",
  е: "e",
  ё: "e",
  һ: "h",
  н: "h",
  і: "i",
  ї: "i",
  ӏ: "l",
  ј: "j",
  к: "k",
  м: "m",
  о: "o",
  р: "p",
  ԛ: "q",
  ѕ: "s",
  т: "t",
  у: "y",
  ү: "y",
  ѵ: "v",
  ԝ: "w",
  х: "x",
  // Greek
  α: "a",
  β: "b",
  ε: "e",
  ζ: "z",
  η: "h",
  ι: "i",
  κ: "k",
  μ: "m",
  ν: "n",
  ο: "o",
  ρ: "p",
  τ: "t",
  υ: "y",
  χ: "x",
  // Latin letters drawn like another Latin letter
  ı: "i",
  ȷ: "j",
  ɑ: "a",
  ɡ: "g",
  ʀ: "r",
});

const FORMAT_CHARACTERS = /\p{Cf}/gu;
const COMBINING_MARKS = /\p{M}/gu;
const CURLY_APOSTROPHES = /[‘’‛ʼ＇]/gu;
const WHITESPACE_RUN = /\s+/gu;

/** The normalised form every library-ad rule reads (D5). */
export function normaliseLibraryAdText(text: string): string {
  const lowered = text.normalize("NFKC").toLocaleLowerCase("en").replace(FORMAT_CHARACTERS, "");
  const unaccented = lowered.normalize("NFKD").replace(COMBINING_MARKS, "");
  let folded = "";
  for (const character of unaccented) folded += CONFUSABLES[character] ?? character;
  return folded
    .normalize("NFKC")
    .replace(CURLY_APOSTROPHES, "'")
    .replace(WHITESPACE_RUN, " ")
    .trim();
}

/**
 * The normalised text as words, separated by single spaces. Every run of characters that is not a
 * letter, a digit, a percent sign, or a dollar sign separates two words, and a percent or dollar
 * sign is a word of its own, so "3.5%" reads "3 5 %" and "$1,200" reads "$ 1 200".
 */
export function libraryAdWordText(normalised: string): string {
  return normalised
    .replace(/[%$]/gu, " $& ")
    .replace(/[^\p{L}\p{N}%$]+/gu, " ")
    .trim();
}

/**
 * The second reading the claim rule takes (D5: "a copy with all whitespace and punctuation
 * removed"), split in two because a fully closed-up copy is not safe to search for words.
 *
 * Closed up completely, ordinary words run together and hide the words the rule looks for: "a
 * pre-approval" closes up to "apreapproval", which contains "apr", and "celebrate" and "separate"
 * contain "rate". So the closed-up copy is searched only for signatures a digit anchors ("35%",
 * "$1"), which no run of ordinary words can produce. The disguise that spaces a word out letter by
 * letter ("r a t e s", "A.P.R.", "3 . 5 %") is undone the other way: each run of single characters
 * separated by spaces or punctuation is closed up into one word ("rates", "apr", "35%"), and that
 * word is searched like any other.
 */
export function libraryAdClosedUpText(normalised: string): string {
  return normalised.replace(/[^\p{L}\p{N}%$]+/gu, "");
}

export function libraryAdJoinedRuns(normalised: string): readonly string[] {
  const tokens = libraryAdWordText(normalised).split(" ").filter(Boolean);
  const runs: string[] = [];
  let current = "";
  for (const token of tokens) {
    if ([...token].length === 1) {
      current += token;
      continue;
    }
    if ([...current].length >= 2) runs.push(current);
    current = "";
  }
  if ([...current].length >= 2) runs.push(current);
  return runs;
}

/**
 * The normalised text with each run of two or more single letters separated by dots or spaces
 * joined into one word (D5's private-details rule: "S.S.N." and "s s n" read "ssn").
 */
export function joinSpacedLetters(normalised: string): string {
  return normalised.replace(/(?<![\p{L}\p{N}])\p{L}(?:[.\s]+\p{L}(?![\p{L}\p{N}]))+\.?/gu, (run) =>
    run.replace(/[.\s]+/gu, ""),
  );
}

/** Letters and digits only: how a saved partner's name is compared (D5, `WORDS_CO_BRAND`). */
export function lettersAndDigitsOnly(normalised: string): string {
  return normalised.replace(/[^\p{L}\p{N}]+/gu, "");
}

export interface LibraryAdToken {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

const ORDINAL_TOKEN = /^\d{1,3}(?:st|nd|rd|th)$/u;

/**
 * D5's tokens for the license-reference and ordinal window: split at whitespace, punctuation, and
 * every boundary between digits and letters, except that an ordinal keeps its suffix, so "#30yr"
 * yields "30" and "yr" and "21st" stays one token.
 */
export function libraryAdTokens(normalised: string): readonly LibraryAdToken[] {
  const tokens: LibraryAdToken[] = [];
  for (const chunk of normalised.matchAll(/[\p{L}\p{N}]+/gu)) {
    const start = chunk.index;
    const text = chunk[0];
    if (ORDINAL_TOKEN.test(text)) {
      tokens.push({ text, start, end: start + text.length });
      continue;
    }
    for (const part of text.matchAll(/\p{N}+|\p{L}+/gu)) {
      tokens.push({
        text: part[0],
        start: start + part.index,
        end: start + part.index + part[0].length,
      });
    }
  }
  return tokens;
}

export function isOrdinalToken(token: string): boolean {
  return ORDINAL_TOKEN.test(token);
}
