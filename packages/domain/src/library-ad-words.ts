import {
  LIBRARY_AD_INVISIBLE,
  isOrdinalToken,
  joinSpacedLetters,
  lettersAndDigitsOnly,
  libraryAdClosedUpText,
  libraryAdJoinedRuns,
  libraryAdReadings,
  libraryAdTokens,
  libraryAdWordText,
  normaliseLibraryAdText,
} from "./library-ad-text.js";

/**
 * PRD-009d D5 (with the Meta rules check's E3). The word checks of the library-ad ruleset.
 *
 * "Checked text" is the headline, the primary text, and every Brand text the ad prints or carries:
 * the name, title, company, disclosure line, and lead form wording. The detector is deterministic
 * (patterns, not a model) and conservative: refusing every digit, percent sign, and dollar sign in
 * the editable words is the default until counsel approves a narrower list.
 */

export const LIBRARY_AD_TEXT_FIELDS = [
  "headline",
  "primaryText",
  "name",
  "title",
  "company",
  "disclosureLine",
  "leadFormWording",
] as const;
export type LibraryAdTextField = (typeof LIBRARY_AD_TEXT_FIELDS)[number];
export type LibraryAdTexts = Readonly<Record<LibraryAdTextField, string>>;

/** Where each text lives in a library-ad manifest, which is what a finding's `affected` names. */
export const LIBRARY_AD_TEXT_PATHS: Readonly<Record<LibraryAdTextField, string>> = Object.freeze({
  headline: "content.headline",
  primaryText: "content.body",
  name: "advertiser.name",
  title: "advertiser.title",
  company: "advertiser.company",
  disclosureLine: "content.disclosureText",
  leadFormWording: "content.consentText",
});

/** The field as a plain fix names it. Brand texts say so, because Brand is where they are fixed. */
const FIELD_NAMES: Readonly<Record<LibraryAdTextField, string>> = Object.freeze({
  headline: "headline",
  primaryText: "ad text",
  name: "name in Brand",
  title: "title in Brand",
  company: "company name in Brand",
  disclosureLine: "disclosure line in Brand",
  leadFormWording: "lead form wording in Brand",
});

export const LIBRARY_AD_WORD_RULE_CODES = [
  "WORDS_RATE_PAYMENT_OR_TERM_CLAIM",
  "WORDS_INVALID_CHARACTERS",
  "WORDS_NUMBER",
  "WORDS_CO_BRAND",
  "WORDS_PRIVATE_INFO_REQUEST",
] as const;
export type LibraryAdWordRuleCode = (typeof LIBRARY_AD_WORD_RULE_CODES)[number];

export interface LibraryAdWordFinding {
  readonly severity: "blocking";
  readonly ruleCode: LibraryAdWordRuleCode;
  readonly description: string;
  readonly affected: string;
  readonly remediation: string;
}

const COUNT_WORDS =
  "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million";
/**
 * The number words the claim and number rules read. "dozen" and "dozens" count, and so does "score"
 * (twenty), but "score" only as a count: straight after "a", "an", or another number word ("a score
 * of years", "four score"), never as the noun in "credit score and payment history".
 */
const NUMBER_WORDS = `${COUNT_WORDS}|dozens?|(?<=\\b(?:a|an|${COUNT_WORDS}) )score`;
/** Fractions written as words: "half a percent", "three quarters of a point". */
const FRACTION_WORDS =
  "half|halves|quarter|quarters|third|thirds|fourth|fourths|fifth|fifths|eighth|eighths|tenth|tenths|hundredth|hundredths";
/**
 * A run of number words, which need not stand beside the unit they count: "thirty", "two dozen",
 * "ten and a half", "dozens of", "a score of". It starts on a number word and goes on through more
 * number words, fraction words, "a", "an", "of", and an "and" that leads into another number word
 * or "a" ("a score and payment history" is not a run).
 */
const NUMBER_RUN = `(?:${NUMBER_WORDS})(?: (?:${NUMBER_WORDS}|${FRACTION_WORDS}|a|an|of|and(?= (?:${NUMBER_WORDS}|${FRACTION_WORDS}|a|an)\\b)))*`;

type ClaimKind = "rate" | "payment" | "term";

/**
 * A run of number words, then one or two ordinary words, then a unit: "fifteen short years", "thirty
 * whole years", "thirty-plus years", "twelve-ish years", "a dozen or so years" (PRD-009 security delta
 * pass, SEC-009-07). The units are a length of time, a payment count, and percent; "points" and
 * "monthly" are left out, because "three key points" and "two monthly check-ins" are ordinary English.
 *
 * A run that starts on "one" is not read, because "one" is the ordinary word of "one home, many
 * years" and "one of your best years". A filler word is never "and", which joins two things and counts
 * nothing ("a score and payment history" is not a length of time). The window is two words: any fixed
 * window can be beaten by one more word, which is the open vocabulary the delta pass grades Low, and
 * a person approves every version. One pattern serves the claim list and the number rule.
 */
const NUMBER_WORDS_APART = `\\b(?!one\\b)${NUMBER_RUN}(?: (?!and\\b)\\p{L}+){1,2} (?:years?|yrs?|months?|mos?|payments?|percent|per cent|percentage|pct)\\b`;

/** What a match of `NUMBER_WORDS_APART` claims, from the unit it ends on. */
function numberWordsApartKind(matched: string): ClaimKind {
  if (/\bpayments?$/u.test(matched)) return "payment";
  return /\b(?:percent|cent|percentage|pct)$/u.test(matched) ? "rate" : "term";
}

const NUMBER_WORD_UNIT = new RegExp(
  `\\b${NUMBER_RUN} (?:percent|per cent|percentage|pct|years?|yrs?|months?|mos?|monthly|payments?|points?)\\b|${NUMBER_WORDS_APART}`,
  "u",
);
/** A quantity written in words: at least one number or fraction word, with "a", "and", "of" between. */
const QUANTITY_IN_WORDS = `(?:(?:a|an|and|of) )*(?:${NUMBER_WORDS}|${FRACTION_WORDS})(?: (?:and|a|an|of|${NUMBER_WORDS}|${FRACTION_WORDS}))*`;
/** What can stand between "fixed" and the length of time it is fixed for. */
const FIXED_SPAN = `(?: rate)?(?: (?:for|over|through|until|till))?(?: (?:a|an|the|full|whole|next|entire|first|several|many|\\d+|${NUMBER_WORDS}))*`;

/** A claim pattern's kind is fixed, or read from what it matched when one pattern covers several. */
interface ClaimPattern {
  readonly kind: ClaimKind | ((matched: string) => ClaimKind);
  readonly pattern: RegExp;
}

/**
 * The claim vocabulary, read on the word text (single spaces between words, "%" and "$" as words of
 * their own). Each pattern names what kind of claim it is, so the plain fix says rate, payment, or
 * loan term. "Down payment help" states no amount and passes; "payment" alone is not a claim.
 */
const CLAIM_PATTERNS: readonly ClaimPattern[] = [
  { kind: "rate", pattern: /\b(?:low|lower|lowest|great|best|record low) rates?\b/u },
  { kind: "rate", pattern: /\brates? as low as\b/u },
  { kind: "rate", pattern: /\brates?\b/u },
  { kind: "rate", pattern: /\bapr\b/u },
  { kind: "rate", pattern: /\bannual percentage\b/u },
  { kind: "rate", pattern: /\b(?:interest only|no interest)\b/u },
  {
    kind: "rate",
    pattern:
      /\b(?:low|lower|lowest|great|better|best|record low|reduced|cheap|cheaper|cheapest|competitive|attractive|minimal|small|tiny|zero|discounted) interest\b/u,
  },
  { kind: "rate", pattern: /\binterest free\b/u },
  { kind: "rate", pattern: /\b(?:per cents?|percent|pct)\b/u },
  { kind: "rate", pattern: /\b(?:basis points?|bps)\b/u },
  {
    kind: "rate",
    pattern: new RegExp(
      `\\b${QUANTITY_IN_WORDS} (?:percent|per cent|percentage|pct|points?|basis points?)\\b`,
      "u",
    ),
  },
  { kind: "rate", pattern: /\d+ (?:\d+ )?%/u },
  {
    kind: "rate",
    pattern: new RegExp(`\\b(?:\\d+|${NUMBER_WORDS}) (?:percent|percentage|pct)\\b`, "u"),
  },
  { kind: "rate", pattern: /\b(?:\d+|no|zero|discount) points?\b/u },
  { kind: "rate", pattern: new RegExp(`\\b(?:${NUMBER_WORDS}) points?\\b`, "u") },
  // "A couple of points off", "a few points lower": points taken off a rate, whatever the count.
  { kind: "rate", pattern: /\bpoints? (?:off|lower|less|cheaper)\b/u },
  {
    kind: "payment",
    pattern: /\$ \d+(?: \d+)*(?: (?:a|per|each|every) (?:month|mo|week|year))?/u,
  },
  {
    kind: "payment",
    pattern: /\b(?:low|lower|lowest|small|affordable|reduced) (?:monthly )?payments?\b/u,
  },
  { kind: "payment", pattern: /\bpayments? (?:as low as|of|from|under|starting)\b/u },
  {
    kind: "payment",
    pattern: /\b(?:dollars?|bucks|usd)(?: (?:a|per|each|every))? (?:month|mo|week|year)\b/u,
  },
  { kind: "payment", pattern: new RegExp(`\\b(?:${NUMBER_WORDS}) (?:dollars?|bucks)\\b`, "u") },
  {
    kind: "payment",
    pattern: new RegExp(`\\b(?:${NUMBER_WORDS}) (?:a|per|each|every) (?:month|mo|week)\\b`, "u"),
  },
  { kind: "payment", pattern: /\b\d+ (?:\d+ )?(?:a|per|each|every)? ?(?:month|mo|week)\b/u },
  { kind: "payment", pattern: /\b(?:zero|no|nothing|\d+) (?:money )?down\b/u },
  { kind: "payment", pattern: /\bdown payment of\b/u },
  { kind: "payment", pattern: /\bno closing costs?\b/u },
  // Closing costs with an amount or "off": "half off closing", "closing costs paid", "two closing
  // costs". Closing costs named with no amount ("understand your closing costs") state nothing, and
  // neither does "take the stress off closing day".
  {
    kind: "payment",
    pattern: new RegExp(
      `\\b(?:${NUMBER_WORDS}|${FRACTION_WORDS}|money|cash|extra|more) off (?:of )?(?:your |the |our )?closing\\b`,
      "u",
    ),
  },
  {
    kind: "payment",
    pattern: /\bclosing costs? (?:off|paid|covered|credits?|waived|free|reduced)\b/u,
  },
  // The other word order ("free closing costs", "lender paid closing costs"): PRD-009 security delta
  // pass, SEC-009-10. The list is the reviewer's; counsel extends it (009F-AC-014 part c).
  { kind: "payment", pattern: /\b(?:free|paid|lender paid|waived|covered) closing costs?\b/u },
  {
    kind: "payment",
    pattern: new RegExp(
      `\\b(?:${NUMBER_WORDS}|${FRACTION_WORDS}) (?:of )?(?:your |the )?closing costs?\\b`,
      "u",
    ),
  },
  { kind: "payment", pattern: /\bas low as\b/u },
  { kind: "payment", pattern: /\bbelow market\b/u },
  { kind: "term", pattern: /\b\d+ (?:years?|yrs?|months?|mos?)(?: fixed)?\b/u },
  // A length of time in words, with the number words beside it or apart from it: "twelve years",
  // "a dozen years", "two dozen months", "ten and a half years", "a score of years".
  {
    kind: "term",
    pattern: new RegExp(`\\b${NUMBER_RUN} (?:years?|yrs?|months?|mos?)\\b`, "u"),
  },
  // The same number words with one or two ordinary words before the unit ("fifteen short years",
  // "thirty-plus years", "a dozen or so years", "twelve-ish years"): SEC-009-07.
  { kind: numberWordsApartKind, pattern: new RegExp(NUMBER_WORDS_APART, "u") },
  { kind: "term", pattern: /\b(?:year|yr) fixed\b/u },
  {
    kind: "term",
    pattern: new RegExp(
      `\\b(?:fixed|locked(?: in)?)${FIXED_SPAN} (?:decades?|years?|yrs?|months?)\\b`,
      "u",
    ),
  },
  { kind: "term", pattern: /\bdecades? (?:fixed|loans?|mortgages?|term)\b/u },
  // "A decade and a half" is fifteen years said without a number word.
  { kind: "term", pattern: /\bdecades? and a half\b/u },
  { kind: "term", pattern: /\b\d+ \d+ arm\b/u },
  { kind: "term", pattern: /\badjustable\b/u },
];

/**
 * Signatures the closed-up copy is searched for. Each is anchored by a digit, so no run of ordinary
 * words can produce one ("apreapproval" closed up from "a pre-approval" cannot).
 */
const CLOSED_UP_SIGNATURES: readonly Readonly<{ kind: ClaimKind; pattern: RegExp }>[] = [
  { kind: "rate", pattern: /\d%/u },
  { kind: "rate", pattern: /\d(?:percent|pct|apr)|apr\d/u },
  { kind: "payment", pattern: /\$\d/u },
  { kind: "term", pattern: /\d(?:years?|yrs?)(?:fixed|term|loan|mortgage|arm)/u },
];

/** A claim's vocabulary as substrings of one closed-up run of single characters ("r a t e s"). */
const RUN_SIGNATURES: readonly Readonly<{ kind: ClaimKind; pattern: RegExp }>[] = [
  { kind: "rate", pattern: /rates?|apr|percent/u },
  { kind: "rate", pattern: /\d%/u },
  { kind: "payment", pattern: /\$\d|payments?/u },
];

/**
 * The first rate, payment, or loan term claim in `text`, as the words that state it, or `undefined`.
 * It reads the normalised text and then the closed-up copy (D5: "so '3 . 5 %' and 'r a t e s' are
 * caught").
 */
export function findRatePaymentOrTermClaim(text: string): string | undefined {
  return firstInReadings(libraryAdReadings(text), findClaim)?.term;
}

/** The first answer `find` gives on any reading of a text, in reading order. */
function firstInReadings<T>(
  readings: readonly string[],
  find: (normalised: string) => T | undefined,
): T | undefined {
  for (const reading of readings) {
    const found = find(reading);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * The words a claim was found in, as the normalised text spells them: the word text puts a space
 * where "3.5%" has a dot, so the fix would otherwise quote "3 5 %" back to the person.
 */
function spelledAsWritten(normalised: string, wordTerm: string): string {
  const gap = "[^\\p{L}\\p{N}%$]*";
  const pattern = wordTerm
    .split(" ")
    .map((word) => word.replace(/\$/gu, "\\$"))
    .join(gap);
  return new RegExp(pattern, "u").exec(normalised)?.[0] ?? wordTerm;
}

function findClaim(normalised: string): Readonly<{ kind: ClaimKind; term: string }> | undefined {
  const words = libraryAdWordText(normalised);
  for (const { kind, pattern } of CLAIM_PATTERNS) {
    const match = pattern.exec(words);
    if (match === null) continue;
    return {
      kind: typeof kind === "function" ? kind(match[0]) : kind,
      term: spelledAsWritten(normalised, match[0]),
    };
  }
  const closedUp = libraryAdClosedUpText(normalised);
  for (const { kind, pattern } of CLOSED_UP_SIGNATURES) {
    const match = pattern.exec(closedUp);
    if (match !== null) return { kind, term: match[0] };
  }
  for (const run of libraryAdJoinedRuns(normalised)) {
    for (const { kind, pattern } of RUN_SIGNATURES) {
      const match = pattern.exec(run);
      if (match !== null) return { kind, term: match[0] };
    }
  }
  return undefined;
}

const CLAIM_FIX: Readonly<Record<ClaimKind, string>> = Object.freeze({
  rate: "Ads can't state rate claims.",
  payment: "Ads can't state payment claims.",
  term: "Ads can't state loan terms.",
});

/**
 * Unicode control and format characters (which include U+200B to U+200F, U+202A to U+202E, U+2060
 * to U+2069, and U+FEFF), the line and paragraph separators, and angle brackets. The primary text
 * may hold a plain line break and nothing else here.
 *
 * Every default-ignorable code point is refused as well. Most are format characters already, but
 * some are nonspacing marks or unassigned, which the categories above miss: the combining grapheme
 * joiner U+034F, the Mongolian free variation selectors U+180B to U+180D and U+180F, the variation
 * selectors U+FE00 to U+FE0F and U+E0100 to U+E01EF, and the unassigned U+2065, U+FFF0 to U+FFF8,
 * U+E0000, U+E0002 to U+E001F, and U+E01F0 to U+E0FFF. They draw nothing, so a person and an
 * approver cannot see them (PRD-009 security review, SEC-009-06).
 *
 * The delta pass (SEC-009-09) adds every unassigned code point (`\p{Cn}`), which draws a missing-glyph
 * box or nothing and can split a claim word, and two blank marks that are not default-ignorable:
 * U+1D159 (musical symbol null notehead, a symbol) and U+16FE4 (Khitan small script filler, a
 * nonspacing mark). Which code points are unassigned is the running engine's Unicode version, so a
 * code point assigned after that version is refused until the runtime knows it, which errs on the
 * side of refusing. The readings strip U+16FE4 with the other marks and do not strip U+1D159 or an
 * unassigned code point; the text is refused here either way, so it cannot be saved.
 */
const INVALID_CHARACTER =
  /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Co}\p{Cs}\p{Cn}\p{Default_Ignorable_Code_Point}\u{1D159}\u{16FE4}<>]/u;

/**
 * U+FE0F straight after a pictograph only picks the colour picture of a heart, a telephone, or a
 * check mark. It draws, so it stays legal there, and it is the only default-ignorable mark that does.
 */
const EMOJI_SELECTOR = /(?<=\p{Extended_Pictographic})\uFE0F/gu;

function hasInvalidCharacter(field: LibraryAdTextField, text: string): boolean {
  const checked = field === "primaryText" ? text.replaceAll("\n", " ") : text;
  // The blank fillers too (Hangul, Braille, Khmer), which Unicode counts as letters or symbols.
  const invisible = new RegExp(LIBRARY_AD_INVISIBLE.source, "u");
  return [checked, checked.normalize("NFKC")].some((form) => {
    const drawn = form.replace(EMOJI_SELECTOR, "");
    return INVALID_CHARACTER.test(drawn) || invisible.test(drawn);
  });
}

/**
 * A license reference (D5): 4 to 12 digits directly after "nmls", "nmls id", "license", "lic", or
 * "lic.", each optionally followed by "#" or ":". A bare "#" is not a keyword. The digits run
 * together, or form the one hyphenated shape the PRD names for a state license ("Lic. 12-3456"):
 * two groups joined by one hyphen that are not a phone number's "555-1212". Digits spaced into
 * groups, dotted, or hyphenated into a phone number ("NMLS 800-555-1212") are not a license
 * reference, so they are a number like any other.
 */
const LICENSE_REFERENCE =
  /(?<![\p{L}\p{N}])(?:nmls(?: id)?|license|lic\.?) ?[#:]? ?([0-9]+(?:-[0-9]+)?)(?![ .-]?\p{N})/gu;

/**
 * The digits of a license reference, when they are 4 to 12 and not shaped like a phone number. The
 * digits are ASCII only: a run in another script's digits is no license reference, so it falls to
 * `WORDS_NUMBER` like any other digit (PRD-009 security delta pass, SEC-009-08).
 */
function isLicenseDigits(digits: string): boolean {
  const count = [...digits.matchAll(/[0-9]/gu)].length;
  return count >= 4 && count <= 12 && !/^[0-9]{3}-[0-9]{4}$/u.test(digits);
}

const TERM_WORDS: ReadonlySet<string> = new Set([
  "year",
  "years",
  "yr",
  "yrs",
  "month",
  "months",
  "mo",
  "mos",
  "monthly",
  "payment",
  "payments",
  "pmt",
  "percent",
  "pct",
  "down",
  "fixed",
  "arm",
  "apr",
  "rate",
  "rates",
  "points",
]);

/** The digits a name, company, or disclosure line may hold: license references and, in the name and company only, ordinals, each clear of a term word by more than two tokens. */
function hasUnlicensedDigit(normalised: string, allowOrdinals: boolean): boolean {
  const tokens = libraryAdTokens(normalised);
  const allowed = new Set<number>();
  const nearTermWord = (first: number, last: number) =>
    tokens.slice(Math.max(0, first - 2), last + 3).some((token, offset) => {
      const index = Math.max(0, first - 2) + offset;
      return (index < first || index > last) && TERM_WORDS.has(token.text);
    });
  for (const match of normalised.matchAll(LICENSE_REFERENCE)) {
    const digits = match[1] ?? "";
    if (!isLicenseDigits(digits)) continue;
    const start = match.index + match[0].length - digits.length;
    const end = match.index + match[0].length;
    const inside = tokens
      .map((token, index) => ({ token, index }))
      .filter(({ token }) => token.start >= start && token.end <= end);
    const first = inside[0]?.index;
    const last = inside.at(-1)?.index;
    if (first === undefined || last === undefined || nearTermWord(first, last)) continue;
    for (const { index } of inside) allowed.add(index);
  }
  return tokens.some((token, index) => {
    if (!/\p{N}/u.test(token.text) || allowed.has(index)) return false;
    return !(allowOrdinals && isOrdinalToken(token.text) && !nearTermWord(index, index));
  });
}

function hasNumber(field: LibraryAdTextField, normalised: string): boolean {
  if (/[%$]/u.test(normalised) || NUMBER_WORD_UNIT.test(libraryAdWordText(normalised))) return true;
  if (field === "name" || field === "company") return hasUnlicensedDigit(normalised, true);
  if (field === "disclosureLine") return hasUnlicensedDigit(normalised, false);
  return /\p{N}/u.test(normalised);
}

/**
 * "with" as the co-brand phrases read it: the word, or "w" (the word text of "w/" and "w."), as a
 * whole word (PRD-009 security delta pass, SEC-009-10: "Partnered w/ Keller Williams").
 */
const WITH = "(?:with|w)\\b";

const CO_BRAND_TERMS: readonly RegExp[] = [
  /\brealtors?\b/u,
  /\bbrokerages?\b/u,
  /\breal estate agents?\b/u,
  /\blisted by\b/u,
  /\blisting agents?\b/u,
  new RegExp(`\\bin partnership ${WITH}`, "u"),
  /\bpresented by\b/u,
  /\bcourtesy of\b/u,
  /\bsponsored by\b/u,
  // The PRD-009 security review, SEC-009-04: more ways to name someone else, and the word a
  // brokerage is named with. "Real-tor" is "real tor" once the hyphen reads as a space.
  /\brealty\b/u,
  /\breal tors?\b/u,
  // "partnered with you" and "partnering with first-time buyers" name no one else.
  new RegExp(
    `\\bpartner(?:ed|ing) ${WITH}(?! (?:you|your|me|us|them|families|buyers|homebuyers|first time|clients|borrowers)\\b)`,
    "u",
  ),
  new RegExp(`\\baffiliated ${WITH}`, "u"),
  new RegExp(`\\bin (?:association|collaboration|affiliation) ${WITH}`, "u"),
  /\bbrought to you by\b/u,
];

/**
 * Words that name a brokerage only in the company name: "real estate" is ordinary in the ad text
 * ("Buying real estate? Start here."), and in a company name it names a real estate business.
 */
const COMPANY_CO_BRAND_TERMS: readonly RegExp[] = [/\breal estate\b/u];

/** "broker" and "brokers", except the whole phrase "mortgage broker" (D5's one phrase exception). */
const BROKER = /(?<!\p{L})brokers?(?!\p{L})/gu;
const MORTGAGE_BROKER_BEFORE = /(?:^|[^\p{L}])mortgage[^\p{L}]+$/u;

function brokerTerm(normalised: string): string | undefined {
  for (const match of normalised.matchAll(BROKER)) {
    const exception =
      match[0] === "broker" && MORTGAGE_BROKER_BEFORE.test(normalised.slice(0, match.index));
    if (!exception) return match[0];
  }
  return undefined;
}

/**
 * A web address: an optional scheme, optional user information, a host with a dot and a letter
 * top-level domain, an optional port, and anything after a path, query, or fragment separator.
 */
const WEB_ADDRESS =
  /(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^\s/?#@]+@)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d*)?(?:[/?#][^\s]*)?/gu;
/** D5's one host exception: exactly this host, host only, and only in the disclosure line. */
const NMLS_HOST_ONLY = /^(?:https?:\/\/)?(?:www\.)?nmlsconsumeraccess\.org\/?$/u;

function webAddressTerm(field: LibraryAdTextField, normalised: string): string | undefined {
  const addresses = [...normalised.matchAll(WEB_ADDRESS)].map((match) =>
    match[0].replace(/[.,;:!)]+$/u, (tail) => (tail.startsWith(":") ? tail : "")),
  );
  if (addresses.length === 0) return undefined;
  const allowed =
    field === "disclosureLine" && addresses.length === 1 && NMLS_HOST_ONLY.test(addresses[0] ?? "");
  return allowed ? undefined : "the web address";
}

const PHONE_NUMBER =
  /(?<!\p{N})(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\p{N})|(?<![\p{N}-])\d{3}[\s.-]\d{4}(?!\p{N})/gu;

/**
 * Seven digit words in a row, which is how a local number is spoken ("five five five, one two one
 * two"). Whatever is not a letter or a digit may stand between them, so commas and hyphens do not
 * break the run, and "eight hundred" does (PRD-009 security delta pass, SEC-009-08).
 */
const DIGIT_WORD = "(?:zero|one|two|three|four|five|six|seven|eight|nine|oh)";
const SPOKEN_PHONE_NUMBER = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${DIGIT_WORD}[^\\p{L}\\p{N}]+){6}${DIGIT_WORD}(?![\\p{L}\\p{N}])`,
  "u",
);

/**
 * A phone number anywhere in the text, a license reference included. A license reference is 4 to 12
 * digits, and the only runs of that length a phone number's pattern matches are ten digits (or
 * eleven after a 1, or ten with one hyphen), so a license keyword in front of one does not make it
 * a license: "NMLS 8005551212" prints a phone number (PRD-009 security review, SEC-009-03). The text
 * is read with every digit as an ASCII digit and with spoken digits too (`foldDecimalDigits`,
 * `SPOKEN_PHONE_NUMBER`).
 */
function phoneTerm(normalised: string): string | undefined {
  return normalised.search(PHONE_NUMBER) >= 0 || SPOKEN_PHONE_NUMBER.test(normalised)
    ? "the phone number"
    : undefined;
}

const DECIMAL_DIGIT = /^\p{Nd}$/u;

/**
 * The value of a decimal digit of any script. Unicode encodes every `Nd` code point in a run made of
 * whole sets of ten, zero first, so a digit's value is its distance from the start of its run, modulo
 * ten (U+0668 and U+096E are both eight). A unit test holds every run in the engine to that.
 */
function decimalDigitValue(digit: string): number {
  const codePoint = digit.codePointAt(0) ?? 0;
  let first = codePoint;
  while (first > 0 && DECIMAL_DIGIT.test(String.fromCodePoint(first - 1))) first -= 1;
  return (codePoint - first) % 10;
}

/**
 * The text with every decimal digit of every script written as its ASCII digit. NFKC has already done
 * this for full-width and mathematical digits, and leaves Arabic-Indic, Devanagari, and the rest, which
 * the digit rules (`\d`) do not read as digits (PRD-009 security delta pass, SEC-009-08). The number
 * rule reads the text as typed instead, so it refuses these digits outright.
 */
function foldDecimalDigits(text: string): string {
  return text.replace(/\p{Nd}/gu, (digit) =>
    /^[0-9]$/u.test(digit) ? digit : String(decimalDigitValue(digit)),
  );
}

/** Co-brand words as substrings of a run of single characters closed up ("r e a l t o r"). */
const CO_BRAND_RUN =
  /realtors?|realty|brokerages?|brokers?|listedby|courtesyof|presentedby|sponsoredby/u;

function coBrandTerm(
  field: LibraryAdTextField,
  normalised: string,
  partners: readonly SavedPartner[],
  own: ReadonlySet<string>,
): string | undefined {
  for (const words of [
    libraryAdWordText(normalised),
    libraryAdWordText(joinSpacedLetters(normalised)),
  ]) {
    for (const term of field === "company"
      ? [...CO_BRAND_TERMS, ...COMPANY_CO_BRAND_TERMS]
      : CO_BRAND_TERMS) {
      const match = term.exec(words);
      if (match !== null) return match[0];
    }
  }
  for (const run of libraryAdJoinedRuns(normalised)) {
    const match = CO_BRAND_RUN.exec(run);
    if (match !== null) return match[0];
  }
  const broker = brokerTerm(normalised) ?? brokerTerm(joinSpacedLetters(normalised));
  if (broker !== undefined) return broker;
  if (normalised.includes("®")) return "the registered mark";
  if (normalised.includes("@")) return "the at sign";
  const address = webAddressTerm(field, normalised);
  if (address !== undefined) return address;
  const phone = phoneTerm(normalised);
  if (phone !== undefined) return phone;
  return partnerTerm(normalised, partners, own);
}

/**
 * PRD-009d D5, compliance control 9. A saved Realtor partner, as the checks compare it:
 *
 * - the whole saved name, letters and digits only, anywhere in the text ("PRIYA  NADEEM");
 * - for a brokerage (a name ending in a corporate word such as Realty, Inc, or LLC), the name
 *   without that ending, as whole words ("Keller Williams Realty" refuses "Keller Williams");
 * - for a person, each given and family name of three letters or more, as a whole word ("Priya",
 *   "Nadeem").
 *
 * A word on `PARTNER_WORDS_NOT_COMPARED` is never compared alone (a partner named "Home" would
 * otherwise refuse every ad), and neither is a word the person's own Brand name or company carries
 * (a loan officer named Alex with a partner named Alex is still allowed to say their own name).
 */
interface SavedPartner {
  readonly saved: string;
  readonly compared: string;
  readonly phrases: readonly Readonly<{ shown: string; pattern: RegExp }>[];
}

const CORPORATE_ENDING =
  /(?: (?:realty|realtors?|real estate|properties|property|group|team|brokerage|brokers?|associates|partners|holdings|company|co|corp|corporation|inc|incorporated|llc|l l c|ltd|limited|pllc|lp|llp|plc))+$/u;

const PARTNER_WORDS_NOT_COMPARED: ReadonlySet<string> = new Set([
  "the",
  "and",
  "for",
  "with",
  "your",
  "home",
  "homes",
  "house",
  "houses",
  "loan",
  "loans",
  "lending",
  "lender",
  "mortgage",
  "mortgages",
  "first",
  "buyer",
  "buyers",
  "team",
  "group",
  "real",
  "estate",
  "realty",
  "best",
  "new",
  "top",
  "city",
  "state",
  "national",
  "american",
  "united",
  "family",
  "help",
]);

function wholeWords(words: readonly string[]): RegExp {
  const escaped = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"));
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped.join("[^\\p{L}\\p{N}]+")}(?![\\p{L}\\p{N}])`,
    "u",
  );
}

function savedPartner(saved: string): SavedPartner {
  const normalised = foldDecimalDigits(normaliseLibraryAdText(saved));
  const words = libraryAdWordText(normalised).split(" ").filter(Boolean);
  const phrases: { shown: string; pattern: RegExp }[] = [];
  const spoken = words.join(" ");
  const withoutEnding = spoken.replace(CORPORATE_ENDING, "").trim();
  if (withoutEnding !== spoken && withoutEnding !== "") {
    const brokerage = withoutEnding.split(" ");
    const single = brokerage.length === 1 ? (brokerage[0] ?? "") : "";
    if (single === "" || (single.length >= 3 && !PARTNER_WORDS_NOT_COMPARED.has(single))) {
      phrases.push({ shown: brokerage.join(" "), pattern: wholeWords(brokerage) });
    }
  } else {
    for (const word of words) {
      if (!/^\p{L}{3,}$/u.test(word) || PARTNER_WORDS_NOT_COMPARED.has(word)) continue;
      phrases.push({ shown: word, pattern: wholeWords([word]) });
    }
  }
  return { saved: saved.trim(), compared: lettersAndDigitsOnly(normalised), phrases };
}

function partnerTerm(
  normalised: string,
  partners: readonly SavedPartner[],
  own: ReadonlySet<string>,
): string | undefined {
  const compared = lettersAndDigitsOnly(normalised);
  const whole = partners.find(
    (partner) => [...partner.compared].length >= 4 && compared.includes(partner.compared),
  );
  if (whole !== undefined) return whole.saved;
  for (const partner of partners) {
    for (const phrase of partner.phrases) {
      if (own.has(phrase.shown)) continue;
      const match =
        phrase.pattern.exec(normalised) ?? phrase.pattern.exec(joinSpacedLetters(normalised));
      if (match !== null) return phrase.shown;
    }
  }
  return undefined;
}

/**
 * The private details a person could be asked to type in (D5, from Meta's rule that ads must not
 * directly request personal or certain financial information). A word that names a benefit or a
 * product is not on the list, so "Social Security income" and "ITIN loans" pass, and words match
 * only whole, so "Pin Oak Lending" passes.
 */
const SEPARATOR = "[\\s\\p{P}]+";
const PRIVATE_DETAILS: readonly string[] = [
  "social security number",
  "ssn",
  "date of birth",
  "birth date",
  "birthdate",
  "dob",
  "driver(?:'?s)? license",
  "passport number",
  "tax id",
  "taxpayer id",
  "itin number",
  "account number",
  "routing number",
  "card number",
  "cvv",
  "security code",
  "pin number",
  "pin code",
  "password",
  "maiden name",
  "acct",
  // A PIN asked for: after a word that asks for it or says whose it is.
  "(?:your|my|their|his|her|our|enter|share|send|give|provide|type|text|tell|need|with|bank|atm|debit|card) pin",
];
const PRIVATE_DETAIL_PATTERNS: readonly RegExp[] = PRIVATE_DETAILS.map(
  (phrase) =>
    new RegExp(
      `(?<![\\p{L}\\p{N}])${phrase.replaceAll(" ", SEPARATOR)}(?:'?s)?(?![\\p{L}\\p{N}])`,
      "u",
    ),
);

/** "PIN" in capitals is the code, whatever surrounds it; "Pin Oak Lending" is not. */
const PIN_IN_CAPITALS = /(?<![\p{L}\p{N}])PINS?(?![\p{L}\p{N}])/u;

function privateDetailTerm(raw: string, normalised: string): string | undefined {
  const joined = joinSpacedLetters(normalised);
  for (const pattern of PRIVATE_DETAIL_PATTERNS) {
    const match = pattern.exec(joined);
    if (match !== null) return match[0].replace(/[\s\p{P}]+/gu, (gap) => (gap === "'" ? "'" : " "));
  }
  const capitals = joinSpacedLetters(
    raw.normalize("NFKC").replace(new RegExp(LIBRARY_AD_INVISIBLE.source, "gu"), ""),
  );
  return PIN_IN_CAPITALS.test(capitals) ? "PIN" : undefined;
}

function quoted(term: string): string {
  return term.startsWith("the ") ? term : `'${term.slice(0, 60)}'`;
}

function wordFinding(
  ruleCode: LibraryAdWordRuleCode,
  field: LibraryAdTextField,
  description: string,
  remediation: string,
): LibraryAdWordFinding {
  return Object.freeze({
    severity: "blocking" as const,
    ruleCode,
    description,
    affected: LIBRARY_AD_TEXT_PATHS[field],
    remediation,
  });
}

/**
 * Every word finding for the texts of one library ad, in field order, at most one per rule and
 * field. `partnerNames` are the person's saved Realtor partners' names and companies; each is
 * compared after normalising, and one shorter than three characters is not compared at all.
 */
export function evaluateLibraryAdWords(
  texts: LibraryAdTexts,
  partnerNames: readonly string[],
): readonly LibraryAdWordFinding[] {
  const partners = partnerNames
    .map((saved) => savedPartner(saved))
    .filter((partner) => [...partner.compared].length >= 3);
  const own = new Set(
    [texts.name, texts.company].flatMap((text) =>
      libraryAdWordText(foldDecimalDigits(normaliseLibraryAdText(text)))
        .split(" ")
        .filter(Boolean),
    ),
  );
  const findings: LibraryAdWordFinding[] = [];
  for (const field of LIBRARY_AD_TEXT_FIELDS) {
    const raw = texts[field];
    const name = FIELD_NAMES[field];
    // The readings as typed, for the number rule, which refuses a digit of any script outside the
    // ASCII ones; and the same readings with every digit written as ASCII, for the other rules, so a
    // claim or a phone number written in Arabic-Indic or Devanagari digits is read as one.
    const typed = libraryAdReadings(raw);
    const readings = typed.map(foldDecimalDigits);
    const claim = firstInReadings(readings, findClaim);
    if (claim !== undefined) {
      findings.push(
        wordFinding(
          "WORDS_RATE_PAYMENT_OR_TERM_CLAIM",
          field,
          `The ${name} states a rate, payment or loan term.`,
          `Take ${quoted(claim.term)} out of the ${name}. ${CLAIM_FIX[claim.kind]}`,
        ),
      );
    }
    if (hasInvalidCharacter(field, raw)) {
      findings.push(
        wordFinding(
          "WORDS_INVALID_CHARACTERS",
          field,
          `The ${name} has hidden or special characters.`,
          `Take out the hidden or special characters in the ${name}.`,
        ),
      );
    }
    if (hasNumber(field, typed[0] ?? "")) {
      findings.push(
        wordFinding(
          "WORDS_NUMBER",
          field,
          `The ${name} has a number.`,
          `Take the number out of the ${name}. Ads can't state rates, payments or terms.`,
        ),
      );
    }
    const coBrand = firstInReadings(readings, (reading) =>
      coBrandTerm(field, reading, partners, own),
    );
    if (coBrand !== undefined) {
      findings.push(
        wordFinding(
          "WORDS_CO_BRAND",
          field,
          `The ${name} names someone other than you.`,
          `Take ${quoted(coBrand)} out of the ${name}. Paid ads show only you.`,
        ),
      );
    }
    const privateDetail = firstInReadings(readings, (reading) => privateDetailTerm(raw, reading));
    if (privateDetail !== undefined) {
      findings.push(
        wordFinding(
          "WORDS_PRIVATE_INFO_REQUEST",
          field,
          `The ${name} asks for a private detail.`,
          `Take ${quoted(privateDetail)} out of the ${name}. Ads can't ask for private details.`,
        ),
      );
    }
  }
  return Object.freeze(findings);
}
