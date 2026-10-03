/**
 * PRD-009d D5. How the library-ad rules read a piece of text.
 *
 * Every rule reads the same normalised form, so a disguise that defeats one rule defeats none:
 *
 * 1. NFKC, which turns full-width and other compatibility forms into their plain letters and digits
 *    ("３.５％" reads "3.5%");
 * 2. lower case;
 * 3. format characters and blank fillers taken out (zero-width spaces and joiners, bidirectional
 *    controls, the byte order mark, the Hangul fillers U+115F, U+1160, U+3164 and U+FFA0, the
 *    Braille blank U+2800), so "rates" with one inside reads "rates" here while
 *    `WORDS_INVALID_CHARACTERS` still refuses the raw text;
 * 4. accents taken off, and look-alike letters folded to the Latin letter they imitate: Cyrillic,
 *    Greek, Armenian, Cherokee, Lisu, and Latin small capitals ("rаte" with a Cyrillic "а" and
 *    "ʀᴀᴛᴇ" both read "rate");
 * 5. every full stop from another script (the ideographic "。" and its half-width form, and the
 *    Arabic, Ethiopic, and Lisu stops) made a plain dot, so a web address written with one is still
 *    a web address;
 * 6. curly apostrophes made straight, and every run of whitespace made one space.
 *
 * An invisible character can stand inside a word or in place of a space, so the rules read the text
 * twice: once with each invisible character taken out ("ra" + U+3164 + "tes" reads "rates") and once
 * with each made a space ("low" + U+3164 + "rates" reads "low rates"). `libraryAdReadings` gives both.
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
  ѡ: "w",
  ϲ: "c",
  ϳ: "j",
  // Armenian, lower case (the capitals are lower-cased first)
  ա: "w",
  զ: "q",
  հ: "h",
  յ: "j",
  լ: "l",
  ո: "n",
  ռ: "n",
  ս: "u",
  տ: "s",
  ց: "g",
  ք: "p",
  օ: "o",
  // Lisu, which has no case
  ꓐ: "b",
  ꓑ: "p",
  ꓓ: "d",
  ꓔ: "t",
  ꓖ: "g",
  ꓗ: "k",
  ꓙ: "j",
  ꓚ: "c",
  ꓜ: "z",
  ꓝ: "f",
  ꓟ: "m",
  ꓠ: "n",
  ꓡ: "l",
  ꓢ: "s",
  ꓣ: "r",
  ꓦ: "v",
  ꓧ: "h",
  ꓪ: "w",
  ꓫ: "x",
  ꓬ: "y",
  ꓮ: "a",
  ꓰ: "e",
  ꓲ: "i",
  ꓳ: "o",
  ꓴ: "u",
  // Latin letters drawn like another Latin letter, and the small capitals
  ı: "i",
  ȷ: "j",
  ɑ: "a",
  ɡ: "g",
  ɩ: "i",
  ʋ: "v",
  ᴀ: "a",
  ʙ: "b",
  ᴄ: "c",
  ᴅ: "d",
  ᴇ: "e",
  ꜰ: "f",
  ɢ: "g",
  ʜ: "h",
  ɪ: "i",
  ᴊ: "j",
  ᴋ: "k",
  ʟ: "l",
  ᴍ: "m",
  ɴ: "n",
  ᴏ: "o",
  ᴘ: "p",
  ꞯ: "q",
  ʀ: "r",
  ꜱ: "s",
  ᴛ: "t",
  ᴜ: "u",
  ᴠ: "v",
  ᴡ: "w",
  ʏ: "y",
  ᴢ: "z",
  ...cherokeeLookAlikes(),
});

/**
 * Cherokee letters drawn like Latin capitals. Cherokee has case, so each is listed in both forms:
 * the capital, and the small letter it lower-cases to (U+AB70 onward, or U+13F8 onward for the last
 * six).
 */
function cherokeeLookAlikes(): Record<string, string> {
  const capitals: Readonly<Record<number, string>> = {
    0x13a0: "d",
    0x13a1: "r",
    0x13a2: "t",
    0x13a5: "i",
    0x13a9: "y",
    0x13aa: "a",
    0x13ab: "j",
    0x13ac: "e",
    0x13b3: "w",
    0x13b7: "m",
    0x13bb: "h",
    0x13bd: "y",
    0x13c0: "g",
    0x13c2: "h",
    0x13c3: "z",
    0x13cf: "b",
    0x13d2: "r",
    0x13d4: "w",
    0x13d5: "s",
    0x13d9: "v",
    0x13da: "s",
    0x13de: "l",
    0x13df: "c",
    0x13e2: "p",
    0x13e6: "k",
    0x13f3: "g",
    0x13f4: "b",
  };
  const folded: Record<string, string> = {};
  for (const [codePoint, latin] of Object.entries(capitals)) {
    const capital = Number(codePoint);
    const small = capital >= 0x13f0 ? capital + 8 : capital - 0x13a0 + 0xab70;
    folded[String.fromCodePoint(capital)] = latin;
    folded[String.fromCodePoint(small)] = latin;
  }
  return folded;
}

/**
 * Characters that draw nothing: the format characters, and the blank fillers that are letters or
 * symbols to Unicode but print as empty space (Hangul U+115F, U+1160, U+3164, U+FFA0; Braille
 * U+2800; Khmer U+17B4 and U+17B5).
 */
export const LIBRARY_AD_INVISIBLE = /[\p{Cf}\u115F\u1160\u3164\uFFA0\u2800\u17B4\u17B5]/gu;
const COMBINING_MARKS = /\p{M}/gu;
/** Full stops from other scripts. NFKC has already turned the half-width and small forms into these. */
const OTHER_FULL_STOPS = /[\u3002\u06D4\u0701\u0702\u1362\u166E\uA4FF\uA60E\uA6F3\u2E3C]/gu;
const CURLY_APOSTROPHES = /[‘’‛ʼ＇]/gu;
const WHITESPACE_RUN = /\s+/gu;

/**
 * The normalised form every library-ad rule reads (D5). `invisible` says what becomes of a
 * character that draws nothing: taken out (the default), or made a space.
 */
export function normaliseLibraryAdText(
  text: string,
  invisible: "removed" | "spaced" = "removed",
): string {
  const lowered = text
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(LIBRARY_AD_INVISIBLE, invisible === "removed" ? "" : " ");
  const unaccented = lowered.normalize("NFKD").replace(COMBINING_MARKS, "");
  let folded = "";
  for (const character of unaccented) folded += CONFUSABLES[character] ?? character;
  return folded
    .normalize("NFKC")
    .replace(LIBRARY_AD_INVISIBLE, invisible === "removed" ? "" : " ")
    .replace(OTHER_FULL_STOPS, ".")
    .replace(CURLY_APOSTROPHES, "'")
    .replace(WHITESPACE_RUN, " ")
    .trim();
}

/**
 * Both readings of a text: invisible characters taken out, then made spaces. One reading when the
 * two agree, which is whenever the text holds no invisible character.
 */
export function libraryAdReadings(text: string): readonly string[] {
  const removed = normaliseLibraryAdText(text, "removed");
  const spaced = normaliseLibraryAdText(text, "spaced");
  return removed === spaced ? [removed] : [removed, spaced];
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
 * The normalised text with each run of two or more single letters joined into one word, whatever
 * separates them: spaces, dots, hyphens, slashes, or other punctuation (D5's private-details and
 * co-brand rules: "S.S.N.", "s s n", "S-S-N", and "S/S/N" read "ssn", and "R E A L T O R" reads
 * "realtor").
 */
export function joinSpacedLetters(normalised: string): string {
  return normalised.replace(
    /(?<![\p{L}\p{N}])\p{L}(?:[\s\p{P}|]+\p{L}(?![\p{L}\p{N}]))+\.?/gu,
    (run) => run.replace(/[\s\p{P}|]+/gu, ""),
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
