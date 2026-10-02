import {
  isOrdinalToken,
  joinSpacedLetters,
  lettersAndDigitsOnly,
  libraryAdClosedUpText,
  libraryAdJoinedRuns,
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

const NUMBER_WORDS =
  "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million";
const NUMBER_WORD_UNIT = new RegExp(
  `\\b(?:${NUMBER_WORDS}) (?:percent|percentage|pct|years?|yrs?|months?|mos?|monthly|payments?|points?)\\b`,
  "u",
);

type ClaimKind = "rate" | "payment" | "term";

/**
 * The claim vocabulary, read on the word text (single spaces between words, "%" and "$" as words of
 * their own). Each pattern names what kind of claim it is, so the plain fix says rate, payment, or
 * loan term. "Down payment help" states no amount and passes; "payment" alone is not a claim.
 */
const CLAIM_PATTERNS: readonly Readonly<{ kind: ClaimKind; pattern: RegExp }>[] = [
  { kind: "rate", pattern: /\b(?:low|lower|lowest|great|best|record low) rates?\b/u },
  { kind: "rate", pattern: /\brates? as low as\b/u },
  { kind: "rate", pattern: /\brates?\b/u },
  { kind: "rate", pattern: /\bapr\b/u },
  { kind: "rate", pattern: /\bannual percentage\b/u },
  { kind: "rate", pattern: /\b(?:interest only|no interest)\b/u },
  { kind: "rate", pattern: /\d+ (?:\d+ )?%/u },
  {
    kind: "rate",
    pattern: new RegExp(`\\b(?:\\d+|${NUMBER_WORDS}) (?:percent|percentage|pct)\\b`, "u"),
  },
  { kind: "rate", pattern: /\b(?:\d+|no|zero|discount) points?\b/u },
  { kind: "rate", pattern: new RegExp(`\\b(?:${NUMBER_WORDS}) points?\\b`, "u") },
  {
    kind: "payment",
    pattern: /\$ \d+(?: \d+)*(?: (?:a|per|each|every) (?:month|mo|week|year))?/u,
  },
  {
    kind: "payment",
    pattern: /\b(?:low|lower|lowest|small|affordable|reduced) (?:monthly )?payments?\b/u,
  },
  { kind: "payment", pattern: /\bpayments? (?:as low as|of|from|under|starting)\b/u },
  { kind: "payment", pattern: /\b\d+ (?:\d+ )?(?:a|per|each|every)? ?(?:month|mo|week)\b/u },
  { kind: "payment", pattern: /\b(?:zero|no|nothing|\d+) (?:money )?down\b/u },
  { kind: "payment", pattern: /\bdown payment of\b/u },
  { kind: "payment", pattern: /\bno closing costs?\b/u },
  { kind: "payment", pattern: /\bas low as\b/u },
  { kind: "payment", pattern: /\bbelow market\b/u },
  { kind: "term", pattern: /\b\d+ (?:years?|yrs?|months?|mos?)(?: fixed)?\b/u },
  {
    kind: "term",
    pattern: new RegExp(`\\b(?:${NUMBER_WORDS}) (?:years?|yrs?|months?|mos?)\\b`, "u"),
  },
  { kind: "term", pattern: /\b(?:year|yr) fixed\b/u },
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
  return findClaim(normaliseLibraryAdText(text))?.term;
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
    if (match !== null) return { kind, term: spelledAsWritten(normalised, match[0]) };
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
 */
const INVALID_CHARACTER = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Co}\p{Cs}<>]/u;

function hasInvalidCharacter(field: LibraryAdTextField, text: string): boolean {
  const checked = field === "primaryText" ? text.replaceAll("\n", " ") : text;
  return INVALID_CHARACTER.test(checked) || INVALID_CHARACTER.test(checked.normalize("NFKC"));
}

/**
 * A license reference (D5): 4 to 12 digits, which single spaces or hyphens may separate, directly
 * after "nmls", "nmls id", "license", "lic", or "lic.", each optionally followed by "#" or ":". A
 * bare "#" is not a keyword.
 */
const LICENSE_REFERENCE =
  /(?<![\p{L}\p{N}])(?:nmls(?: id)?|license|lic\.?) ?[#:]? ?(\p{N}(?:[ -]?\p{N})*)(?![\p{N}])/gu;

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
    const count = [...digits.matchAll(/\p{N}/gu)].length;
    if (count < 4 || count > 12) continue;
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

const CO_BRAND_TERMS: readonly RegExp[] = [
  /\brealtors?\b/u,
  /\bbrokerages?\b/u,
  /\breal estate agents?\b/u,
  /\blisted by\b/u,
  /\blisting agents?\b/u,
  /\bin partnership with\b/u,
  /\bpresented by\b/u,
  /\bcourtesy of\b/u,
  /\bsponsored by\b/u,
];

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

function phoneTerm(normalised: string): string | undefined {
  const licenses = [...normalised.matchAll(LICENSE_REFERENCE)].map((match) => [
    match.index,
    match.index + match[0].length,
  ]);
  for (const match of normalised.matchAll(PHONE_NUMBER)) {
    const start = match.index;
    const end = start + match[0].length;
    if (!licenses.some(([from = 0, to = 0]) => start >= from && end <= to)) {
      return "the phone number";
    }
  }
  return undefined;
}

function coBrandTerm(
  field: LibraryAdTextField,
  normalised: string,
  partners: readonly Readonly<{ saved: string; compared: string }>[],
): string | undefined {
  const words = libraryAdWordText(normalised);
  for (const term of CO_BRAND_TERMS) {
    const match = term.exec(words);
    if (match !== null) return match[0];
  }
  const broker = brokerTerm(normalised);
  if (broker !== undefined) return broker;
  if (normalised.includes("®")) return "the registered mark";
  if (normalised.includes("@")) return "the at sign";
  const address = webAddressTerm(field, normalised);
  if (address !== undefined) return address;
  const phone = phoneTerm(normalised);
  if (phone !== undefined) return phone;
  const compared = lettersAndDigitsOnly(normalised);
  return partners.find((partner) => compared.includes(partner.compared))?.saved;
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
  "password",
  "maiden name",
];
const PRIVATE_DETAIL_PATTERNS: readonly RegExp[] = PRIVATE_DETAILS.map(
  (phrase) =>
    new RegExp(`(?<![\\p{L}\\p{N}])${phrase.replaceAll(" ", SEPARATOR)}(?![\\p{L}\\p{N}])`, "u"),
);

function privateDetailTerm(normalised: string): string | undefined {
  const joined = joinSpacedLetters(normalised);
  for (const pattern of PRIVATE_DETAIL_PATTERNS) {
    const match = pattern.exec(joined);
    if (match !== null) return match[0].replace(/[\s\p{P}]+/gu, (gap) => (gap === "'" ? "'" : " "));
  }
  return undefined;
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
 * compared after normalising, and one shorter than four characters is not compared at all.
 */
export function evaluateLibraryAdWords(
  texts: LibraryAdTexts,
  partnerNames: readonly string[],
): readonly LibraryAdWordFinding[] {
  const partners = partnerNames
    .map((saved) => ({
      saved: saved.trim(),
      compared: lettersAndDigitsOnly(normaliseLibraryAdText(saved)),
    }))
    .filter((partner) => [...partner.compared].length >= 4);
  const findings: LibraryAdWordFinding[] = [];
  for (const field of LIBRARY_AD_TEXT_FIELDS) {
    const raw = texts[field];
    const name = FIELD_NAMES[field];
    const normalised = normaliseLibraryAdText(raw);
    const claim = findClaim(normalised);
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
    if (hasNumber(field, normalised)) {
      findings.push(
        wordFinding(
          "WORDS_NUMBER",
          field,
          `The ${name} has a number.`,
          `Take the number out of the ${name}. Ads can't state rates, payments or terms.`,
        ),
      );
    }
    const coBrand = coBrandTerm(field, normalised, partners);
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
    const privateDetail = privateDetailTerm(normalised);
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
