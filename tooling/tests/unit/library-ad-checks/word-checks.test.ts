import { describe, expect, it } from "vitest";

import { evaluateLibraryAdWords, findRatePaymentOrTermClaim } from "@oalo/domain";

import { CLEAN_TEXTS, codesFor, findingsFor } from "./word-checks-test-support.js";

/**
 * PRD-009d D5 and 009D-AC-010. The word checks of the library-ad ruleset, as tables.
 *
 * Every rule reads the normalised text D5 describes: NFKC, lower case, format characters taken out,
 * look-alike letters from other scripts folded to Latin. The claim detector runs twice, on that
 * text and on a copy with whitespace and punctuation closed up, so a claim cannot hide behind
 * spacing. The tables are the criterion's own cases first, then the ones this lane added to show
 * that ordinary words which merely contain "rate" or "apr" stay legal.
 */

/**
 * The tests that scan every code point run in a few seconds alone and several times that when the
 * whole suite runs in parallel with coverage, so they carry their own limit.
 */
const SCAN_TIMEOUT = 60_000;

/** Each scan of all 1.1 million code points runs once, however many tests read its ranges. */
const RANGES_BY_PROPERTY = new Map<string, [first: number, last: number][]>();

/**
 * The code points a `\p{...}` property holds, grouped into runs of consecutive code points. The
 * property is read from the engine, so a range the listed characters miss still fails.
 */
function codePointRanges(property: RegExp): [first: number, last: number][] {
  const known = RANGES_BY_PROPERTY.get(property.source);
  if (known !== undefined) return known;
  const ranges: [first: number, last: number][] = [];
  for (let codePoint = 0; codePoint <= 0x10ffff; codePoint += 1) {
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) continue;
    if (!property.test(String.fromCodePoint(codePoint))) continue;
    const last = ranges.at(-1);
    if (last !== undefined && last[1] === codePoint - 1) last[1] = codePoint;
    else ranges.push([codePoint, codePoint]);
  }
  RANGES_BY_PROPERTY.set(property.source, ranges);
  return ranges;
}

/** The two ends and the middle of a run, which is how a run of code points is tried. */
function endsAndMiddle([first, last]: readonly [number, number]): number[] {
  return [...new Set([first, Math.floor((first + last) / 2), last])];
}

/** ASCII digits written in another script, from that script's zero: "800" in Arabic-Indic digits. */
function digitsIn(zero: number, digits: string): string {
  return [...digits].map((digit) => String.fromCodePoint(zero + Number(digit))).join("");
}

const ARABIC_INDIC_ZERO = 0x0660;
const DEVANAGARI_ZERO = 0x0966;

/**
 * The PRD-009 security delta pass, SEC-009-07: a number word with an ordinary word between it and its
 * unit. The first nine each produced no finding at all; the last nine are the controls that must keep
 * passing, because number words are ordinary English ("one" most of all).
 */
const NUMBER_WORD_APART_REFUSED: readonly string[] = [
  "Pay it off in fifteen short years",
  "Thirty whole years",
  "Thirty-plus years",
  "Fifteen or more years",
  "Twenty-odd years",
  "A dozen or so years",
  "Twelve-ish years",
  "Two doz. months",
  "A decade and a half, fixed",
];
const NUMBER_WORD_APART_PASSED: readonly string[] = [
  "One home, many years of memories",
  "Make this one of your best years",
  "One loan officer, many happy years",
  "Credit score and payment history",
  "Down payment help",
  "Dozens of families helped",
  "Ask me about first-time buyer programs",
  "Serving our community for generations",
  "A decade of helping first-time buyers",
];

const CLAIMS: readonly string[] = [
  // The criterion's named cases.
  "low rates",
  "3.5% down",
  "$1,200 a month",
  "30-year fixed",
  "APR",
  "rates as low as",
  // More of what compliance-and-risk.md:48 controls: rates, APR, payments, down payment amounts,
  // loan terms, and teasers.
  "Today's rates are here",
  "Lock in a great rate",
  "Fixed rate loans for every budget",
  "Adjustable rate options",
  "Ask about a 15 year mortgage",
  "A 5/1 ARM could fit",
  "Low monthly payments",
  "Payments as low as you want",
  "Get the lowest possible rate",
  "Rates at a record low",
  "Zero down to get started",
  "No money down",
  "Nothing down on a new home",
  "As low as it gets",
  "Annual percentage yield explained",
  "Pay 1,200 per month",
  "Ten percent down",
  "Thirty year loans",
  "No closing costs",
  "Below market pricing",
  "Interest only options",
  "Pay no points",
  "Two points off",
  "Down payment of a few thousand",
  // The independent verifier's bypasses of 2026-10-02: claims written in words.
  "Low interest loans",
  "Lower interest this spring",
  "Interest-free for a year",
  "Five per cent down",
  "Just a few per cent down",
  "Save fifty basis points",
  "Fifty bps off",
  "Three hundred dollars a month",
  "Only a few dollars per month",
  "Drop half a percent",
  "A quarter point lower",
  "Three quarters of a percent off",
  "One and a half percent down",
  "Fixed for a decade",
  "Fixed for years",
  "Fixed for the next ten years",
  // The PRD-009 security review, SEC-009-02: number words that are not beside their unit, and
  // "dozen", "dozens", and "score", each a loan term or payment period said in words.
  "A dozen years, fixed",
  "Fixed for a dozen years",
  "Two dozen months to pay",
  "Dozens of months to pay",
  "Thirty and a half years",
  "Ten and a half years to pay",
  "A score of years, fixed",
  "Four score years to pay",
  // SEC-009-04: the claim vocabulary the review found open.
  "Locked in for a decade and a half",
  "Your payment, locked for a decade",
  "A couple of points off",
  "Teaser: half off closing",
  "Half off closing costs",
  "Ask about closing costs paid",
  "All closing costs covered",
  "Two closing costs on us",
  "Money off closing costs",
  // SEC-009-07: number words with an ordinary word before the unit (nine strings, each of which
  // produced no finding at all before the filler-word pattern).
  ...NUMBER_WORD_APART_REFUSED,
  // SEC-009-10: the closing-costs wording the delta pass found open. The lists are not exhaustive.
  "Free closing costs",
  "Lender-paid closing costs",
  // SEC-009-08: a loan term in digits from another script (Arabic-Indic "30") is the same term.
  `${digitsIn(ARABIC_INDIC_ZERO, "30")} year fixed`,
];

const CLEAN: readonly string[] = [
  "Ask me about first-time buyer programs",
  "Down payment help",
  "Down payment help may be closer than you think.",
  "Thinking about your first home? Start here.",
  "Sellers take a pre-approved buyer seriously.",
  "A pre-approval helps you know where you stand before you make an offer.",
  "Life changes, and your home loan can change with it.",
  "Let's celebrate your new home",
  "We operate across the whole state",
  "Separate fact from fiction about buying",
  "An accurate picture of your budget",
  "Served our country? Let's talk home loans.",
  "VA loans can help eligible veterans and service members buy a home.",
  "Interested in buying this spring?",
  "Equal Housing Opportunity.",
  // What the new claim words must leave alone.
  "A decade of helping first-time buyers",
  "Your interest in owning a home starts here",
  "We fixed the hardest part: the paperwork",
  // What the number-word, "decade", "locked", "points", and "closing costs" fixes must leave alone
  // (SEC-009-02 and 04): "score" is a count only after "a" or a number word, never the noun.
  "Serving our community for generations",
  "Serving the area for a decade",
  "Know your credit score and payment history",
  "A higher credit score can open more doors",
  "A dozen reasons to start today",
  "Dozens of families helped, one home at a time",
  "Here are a few points to consider",
  "Understand your closing costs",
  "Know what is due at closing",
  "We're locked in on your goals",
  "Closing day is a big day",
  "Take the stress off closing day",
  "I will explain all your closing costs",
  "Buying real estate? Start here.",
  // SEC-009-07's nine controls: number words that count nothing, and "one" in "one home".
  ...NUMBER_WORD_APART_PASSED,
];

describe("the rate, payment, and term claim detector (009D-AC-010)", () => {
  it("has at least 30 plain cases, counting claims and clean sentences", () => {
    expect(CLAIMS.length + CLEAN.length).toBeGreaterThanOrEqual(30);
    expect(CLAIMS.length).toBeGreaterThanOrEqual(30);
  });

  it.each(CLAIMS)("finds a claim in %j", (text) => {
    expect(findRatePaymentOrTermClaim(text)).toBeDefined();
    expect(codesFor("headline", text)).toContain("WORDS_RATE_PAYMENT_OR_TERM_CLAIM");
  });

  it.each(CLEAN)("finds no claim in %j", (text) => {
    expect(findRatePaymentOrTermClaim(text)).toBeUndefined();
    expect(codesFor("primaryText", text)).toEqual([]);
  });

  it("names what it found in the plain fix, with the field", () => {
    const [finding] = findingsFor("headline", "Ask about low rates");
    expect(finding).toMatchObject({
      ruleCode: "WORDS_RATE_PAYMENT_OR_TERM_CLAIM",
      affected: "content.headline",
      remediation: "Take 'low rates' out of the headline. Ads can't state rate claims.",
    });
  });

  it("reads every checked text, including each Brand text", () => {
    for (const field of [
      "name",
      "title",
      "company",
      "disclosureLine",
      "leadFormWording",
    ] as const) {
      expect(codesFor(field, "Low rates Lending"), field).toContain(
        "WORDS_RATE_PAYMENT_OR_TERM_CLAIM",
      );
    }
  });

  it("reads a long run of number words in linear time, at every field's length (SEC-009-02)", () => {
    // The unit pattern takes a run of number words with "and", "a", "an", and "of" between. A run
    // that ends in no unit must not backtrack catastrophically.
    const run = "one and a of two ".repeat(400);
    for (const text of [`${run}x`, `${run}yearsx`, `${run} years`]) {
      const started = performance.now();
      findRatePaymentOrTermClaim(text);
      codesFor("primaryText", text);
      expect(performance.now() - started).toBeLessThan(1500);
    }
  });

  it("reads a number word and its filler words in linear time (SEC-009-07)", () => {
    // The filler pattern takes one or two ordinary words between a run of number words and the unit.
    // Long runs with filler words and no unit, or a unit one word too far, must not backtrack. The
    // longest checked text is 600 characters; these are about five times that, which is far more
    // than a catastrophic pattern survives and keeps the test steady when the suite runs in parallel.
    const run = "one and a of two ".repeat(180);
    const spread = "two short ".repeat(300);
    for (const text of [
      `${run}short short`,
      `${run}short short short years`,
      `${spread}x`,
      `${spread}short short years`,
      `${"two ".repeat(700)}years`,
    ]) {
      const started = performance.now();
      findRatePaymentOrTermClaim(text);
      codesFor("primaryText", text);
      expect(performance.now() - started).toBeLessThan(1500);
    }
  });

  it("scores 'score' as a count only after 'a' or a number word", () => {
    for (const text of ["A score of years", "Four score years", "Two score months"]) {
      expect(findRatePaymentOrTermClaim(text), text).toBeDefined();
    }
    for (const text of [
      "Your credit score and payment history",
      "Know your score, payment history, and more",
      "The score points to a good start",
      "A score and payment history are both reviewed",
      "Number one and payment history matter",
    ]) {
      expect(findRatePaymentOrTermClaim(text), text).toBeUndefined();
    }
  });
});

/**
 * The evasions: each is caught by at least one rule, and the claim ones by the claim rule itself
 * where the words still say a claim once the disguise is taken off.
 */
const EVASIONS: readonly Readonly<{
  label: string;
  field: "headline" | "primaryText";
  text: string;
  expected: readonly string[];
}>[] = [
  {
    label: "a zero-width character inside rates",
    field: "primaryText",
    text: "Great ra​tes this week",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "full-width digits",
    field: "headline",
    text: "Only ３.５％ down",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_NUMBER"],
  },
  {
    label: "spaced digits and percent",
    field: "headline",
    text: "Just 3 . 5 % down",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_NUMBER"],
  },
  {
    label: "spaced letters",
    field: "primaryText",
    text: "Ask about our r a t e s today",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM"],
  },
  {
    label: "a number word next to percent",
    field: "primaryText",
    text: "Put three percent down",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_NUMBER"],
  },
  {
    label: "a number word next to year",
    field: "headline",
    text: "A thirty year plan",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_NUMBER"],
  },
  {
    label: "a Cyrillic look-alike in rate",
    field: "headline",
    text: "The best rаte in town",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM"],
  },
  {
    label: "a bidirectional override",
    field: "primaryText",
    text: "Call me ‮setar wol‬ today",
    expected: ["WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "a line break in the headline",
    field: "headline",
    text: "Your first home\nstarts here",
    expected: ["WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "an angle bracket",
    field: "headline",
    text: "Your first home <starts> here",
    expected: ["WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "spaced and dotted letters for APR",
    field: "headline",
    text: "Ask about our A.P.R.",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM"],
  },
  {
    label: "a Greek look-alike in APR",
    field: "primaryText",
    text: "Our ΑΡR is here",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM"],
  },
  // The independent verifier's bypasses of 2026-10-02: fillers and look-alikes.
  {
    label: "a Hangul filler (U+3164) inside rates",
    field: "headline",
    text: "Great ra\u3164tes this week",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "a Hangul choseong filler (U+115F) inside rates",
    field: "headline",
    text: "Great ra\u115Ftes this week",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "a Hangul jungseong filler (U+1160) inside rates",
    field: "headline",
    text: "Great ra\u1160tes this week",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "a Braille blank (U+2800) inside rates",
    field: "headline",
    text: "Great ra\u2800tes this week",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "a filler standing in for a space",
    field: "headline",
    text: "Low\u3164rates this week",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "small capitals",
    field: "headline",
    text: "The best ʀᴀᴛᴇs in town",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM"],
  },
  {
    label: "Cherokee look-alikes",
    field: "headline",
    text: "The best ᏒᎪᎢᎬs in town",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM"],
  },
  {
    label: "an Armenian look-alike (U+0578) inside a word",
    field: "primaryText",
    text: "Put five perce\u0578t down",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_NUMBER"],
  },
  {
    label: "Lisu look-alikes",
    field: "headline",
    text: "Ask about our ꓮꓑꓣ",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM"],
  },
  // The PRD-009 security review, SEC-009-06: default-ignorable marks that are not format
  // characters. They draw nothing, the readings strip them, and the stored text must not hold them.
  {
    label: "a combining grapheme joiner (U+034F) inside rates",
    field: "headline",
    text: "Great ra\u034Ftes this week",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "a variation selector (U+FE0F) inside rates",
    field: "headline",
    text: "Great ra\uFE0Ftes this week",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "a variation selector supplement (U+E0100) inside rates",
    field: "headline",
    text: "Great ra\u{E0100}tes this week",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "a Mongolian free variation selector (U+180B) inside rates",
    field: "headline",
    text: "Great ra\u180Btes this week",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "a combining grapheme joiner standing between two words",
    field: "headline",
    text: "Your first\u034Fhome starts here",
    expected: ["WORDS_INVALID_CHARACTERS"],
  },
  // The PRD-009 security delta pass, SEC-009-09: two blank marks that Node does not class as
  // default-ignorable, and unassigned code points, which draw a missing-glyph box and split a word.
  {
    // U+1D159 is a symbol (So), not a nonspacing mark, in Unicode 16 (Node 24.18.0): the readings do
    // not strip it, so the claim reading does not see through it. The text is refused as hidden
    // characters and cannot be saved, so no claim hides in a saved version.
    label: "a musical null notehead (U+1D159) inside rates",
    field: "headline",
    text: "Great ra\u{1D159}tes this week",
    expected: ["WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "a musical null notehead (U+1D159) between two words",
    field: "headline",
    text: "Homes\u{1D159} for you",
    expected: ["WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "a Khitan small script filler (U+16FE4) between two words",
    field: "headline",
    text: "Homes\u{16FE4} for you",
    expected: ["WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "a Khitan small script filler (U+16FE4) inside rates",
    field: "headline",
    text: "Great ra\u{16FE4}tes this week",
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "an unassigned code point (U+0378) between two words",
    field: "headline",
    text: "Homes\u0378 for you",
    expected: ["WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "an unassigned pictograph (U+1FC00) between two words",
    field: "headline",
    text: "Homes\u{1FC00} for you",
    expected: ["WORDS_INVALID_CHARACTERS"],
  },
  {
    // The claim reading does not see through an unassigned code point, so the text is refused as
    // hidden characters and cannot be saved until the person takes it out.
    label: "an unassigned pictograph (U+1FC00) splitting a claim word",
    field: "headline",
    text: "R\u{1FC00}ates down",
    expected: ["WORDS_INVALID_CHARACTERS"],
  },
  {
    label: "an unassigned pictograph (U+1FC00) with a colour selector after it",
    field: "headline",
    text: "Homes \u{1FC00}\uFE0F for you",
    expected: ["WORDS_INVALID_CHARACTERS"],
  },
  // SEC-009-08: digits from another script are digits to the claim rules too.
  {
    label: "Arabic-Indic digits in a loan term",
    field: "headline",
    text: `${digitsIn(ARABIC_INDIC_ZERO, "30")} year fixed`,
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_NUMBER"],
  },
  {
    label: "Devanagari digits in a payment",
    field: "headline",
    text: `Pay ${digitsIn(DEVANAGARI_ZERO, "1200")} per month`,
    expected: ["WORDS_RATE_PAYMENT_OR_TERM_CLAIM", "WORDS_NUMBER"],
  },
];

describe("evasions (009D-AC-010)", () => {
  it("has at least 10", () => {
    expect(EVASIONS.length).toBeGreaterThanOrEqual(10);
  });

  it.each(EVASIONS)("catches $label", ({ field, text, expected }) => {
    expect([...codesFor(field, text)].sort()).toEqual([...expected].sort());
  });

  it("allows a line break in the ad text, and only there", () => {
    expect(codesFor("primaryText", "Your first home\nstarts here")).toEqual([]);
    for (const field of ["headline", "name", "title", "company", "disclosureLine"] as const) {
      expect(codesFor(field, "Line one\nLine two"), field).toEqual(["WORDS_INVALID_CHARACTERS"]);
    }
  });

  it("refuses every listed invisible range", () => {
    for (const character of [
      "​",
      "‏",
      "‪",
      "‮",
      "⁠",
      "⁩",
      "﻿",
      "\u0007",
      "\u3164",
      "\u115F",
      "\u1160",
      "\u2800",
      "\uFFA0",
      // SEC-009-06: the default-ignorable code points that are nonspacing marks, not format
      // characters: U+034F, U+180B to U+180D and U+180F, U+FE00 to U+FE0F, and U+E0100 to U+E01EF.
      "\u034F",
      "\u180B",
      "\u180C",
      "\u180D",
      "\u180F",
      "\uFE00",
      "\uFE0E",
      "\uFE0F",
      "\u{E0100}",
      "\u{E01EF}",
      // And the unassigned default-ignorable code points: U+2065, U+FFF0 to U+FFF8, U+E0000,
      // U+E0002 to U+E001F, and U+E01F0 to U+E0FFF.
      "\u2065",
      "\uFFF0",
      "\uFFF8",
      "\u{E0002}",
      "\u{E01F0}",
      // SEC-009-09: two blank marks (nonspacing marks, not default-ignorable) and two unassigned
      // code points, one of them in a reserved pictographic range.
      "\u{1D159}",
      "\u{16FE4}",
      "͸",
      "\u{1FC00}",
    ]) {
      expect(
        codesFor("title", `Loan${character} officer`),
        character.codePointAt(0)?.toString(16),
      ).toEqual(["WORDS_INVALID_CHARACTERS"]);
    }
  });

  it("refuses every default-ignorable code point, whatever its category (SEC-009-06)", () => {
    // The property is read from the engine, grouped into its ranges, and the two ends and the
    // middle of each range are tried, so a range the listed characters above miss still fails.
    const ranges = codePointRanges(/^\p{Default_Ignorable_Code_Point}$/u);
    expect(ranges.length).toBeGreaterThanOrEqual(15);
    for (const range of ranges) {
      for (const codePoint of endsAndMiddle(range)) {
        // U+FE0F after a pictograph is the one allowed use (below); here it follows a letter.
        expect(
          codesFor("title", `Loan${String.fromCodePoint(codePoint)} officer`),
          `U+${codePoint.toString(16).toUpperCase()}`,
        ).toEqual(["WORDS_INVALID_CHARACTERS"]);
      }
    }
  });

  it(
    "refuses every unassigned code point, in every plane (SEC-009-09)",
    () => {
      // An unassigned code point draws a missing-glyph box or nothing, and it splits a claim word,
      // so the stored text must not hold one. The noncharacters (U+FFFE, U+FFFF, U+FDD0 to U+FDEF and
      // the last two code points of each plane) are unassigned too.
      const ranges = codePointRanges(/^\p{Cn}$/u);
      expect(ranges.length).toBeGreaterThanOrEqual(100);
      for (const range of ranges) {
        for (const codePoint of endsAndMiddle(range)) {
          expect(
            codesFor("title", `Loan${String.fromCodePoint(codePoint)} officer`),
            `U+${codePoint.toString(16).toUpperCase()}`,
          ).toEqual(["WORDS_INVALID_CHARACTERS"]);
        }
      }
    },
    SCAN_TIMEOUT,
  );

  it("allows an emoji's colour selector (U+FE0F) only straight after a pictograph", () => {
    // A heart, a telephone, and a check mark, each with U+FE0F: they draw, and are common in ad copy.
    // SEC-009-09 closes unassigned code points, and the colour selector stays legal after the
    // assigned pictographs: a thumbs-up and a house with garden, and a flag, which needs no selector.
    for (const text of [
      "Your first home \u2764\uFE0F starts here",
      "Call me \u260E\uFE0F",
      "\u2714\uFE0F",
      "Welcome home \u{1F44D}\uFE0F",
      "Welcome home \u{1F3E1}\uFE0F",
      "Welcome home \u{1F1FA}\u{1F1F8}",
    ]) {
      expect(codesFor("headline", text), text).toEqual([]);
    }
    // After a letter, a digit, a space, or another selector it is hidden text.
    for (const text of [
      "Rates\uFE0F",
      "Home 5\uFE0F",
      "Your \uFE0F home",
      "\u2764\uFE0F\uFE0F home",
      // After an unassigned pictograph it is hidden text too: the unassigned code point is refused.
      "Welcome home \u{1FC00}\uFE0F",
    ]) {
      expect(codesFor("headline", text), text).toContain("WORDS_INVALID_CHARACTERS");
    }
  });

  it("names the field in the plain fix", () => {
    expect(findingsFor("headline", "A <b>bold</b> start")[0]).toMatchObject({
      ruleCode: "WORDS_INVALID_CHARACTERS",
      remediation: "Take out the hidden or special characters in the headline.",
    });
    expect(findingsFor("company", "Prairie​ Home Lending")[0]).toMatchObject({
      ruleCode: "WORDS_INVALID_CHARACTERS",
      affected: "advertiser.company",
      remediation: "Take out the hidden or special characters in the company name in Brand.",
    });
  });
});

describe("the number rule (009D-AC-010)", () => {
  const refused: readonly Readonly<[field: Parameters<typeof codesFor>[0], text: string]>[] = [
    ["leadFormWording", "Rates starting at 3.9"],
    ["leadFormWording", "Call in the next 2 days"],
    ["disclosureLine", "Equal Housing Opportunity. 5% down."],
    ["disclosureLine", "Equal Housing Opportunity. $0 down."],
    ["disclosureLine", "Equal Housing Opportunity. NMLS 123"],
    ["company", "Acme #1200 monthly Lending"],
    ["company", "Acme #5000 Grant Lending"],
    ["company", "NMLS 1200 monthly Lending"],
    ["company", "Acme #30yr Lending"],
    ["company", "30th Year Fixed Lending"],
    ["company", "1st Payment Free Mortgage"],
    ["company", "1st 30yr"],
    ["company", "3.5% Lending"],
    ["company", "100 Percent Home Loans"],
    ["title", "1st choice loan officer"],
    ["headline", "Your 1st home starts here"],
    ["disclosureLine", "Equal Housing Opportunity. 1st Lender."],
    ["title", "Top 1% Loan Officer"],
    ["name", "Alex Morgan 2"],
    ["primaryText", "Call 4 details"],
    ["headline", "Save one hundred percent of the hassle"],
    // The independent verifier's bypasses of 2026-10-02: a license reference is 4 to 12
    // consecutive digits, or the PRD's one hyphenated shape ("12-3456"), never a phone shape.
    ["disclosureLine", "Equal Housing Opportunity. NMLS 800-555-1212"],
    ["disclosureLine", "Equal Housing Opportunity. NMLS 555-1212"],
    ["disclosureLine", "Equal Housing Opportunity. License 1234 5678"],
    ["name", "Alex Morgan, NMLS 800 555 1212"],
    ["company", "Prairie Home Lending NMLS 800.555.1212"],
    // SEC-009-02: a number word that is not beside its unit, or is "dozen", "dozens", or "score".
    // A time in business is refused like any other number word beside "years": "twelve years" is
    // refused today, so "a dozen years" is too (D5: "a number word next to ... year").
    ["headline", "A dozen years, fixed"],
    ["primaryText", "Two dozen months to pay"],
    ["headline", "Dozens of months to pay"],
    ["headline", "A dozen payments"],
    ["headline", "Thirty and a half years"],
    ["headline", "A score of years"],
    ["primaryText", "Serving our community for a dozen years"],
    ["primaryText", "Serving our community for twelve years"],
    ["company", "A Dozen Years Lending"],
    ["title", "Two dozen percent"],
    // SEC-009-07: a number word with an ordinary word before its unit is a number all the same.
    ["headline", "Pay it off in fifteen short years"],
    ["headline", "Thirty whole years"],
    ["headline", "Thirty-plus years"],
    ["headline", "Fifteen or more years"],
    ["headline", "Twenty-odd years"],
    ["primaryText", "A dozen or so years"],
    ["headline", "Twelve-ish years"],
    ["primaryText", "Two doz. months"],
    ["company", "Thirty Whole Years Lending"],
    // SEC-009-08: digits from another script are digits. They are no license reference (the run is
    // refused as a number, even a license-shaped one), and a ten-digit run is a phone number.
    ["disclosureLine", `NMLS ${digitsIn(ARABIC_INDIC_ZERO, "8005551212")}. Equal Housing Lender.`],
    ["disclosureLine", `NMLS ${digitsIn(DEVANAGARI_ZERO, "8005551212")}. Equal Housing Lender.`],
    ["company", `Acme NMLS ${digitsIn(ARABIC_INDIC_ZERO, "8005551212")} Lending`],
    ["disclosureLine", `Equal Housing Opportunity. NMLS ${digitsIn(ARABIC_INDIC_ZERO, "1234567")}`],
    ["name", `Alex Morgan, NMLS ${digitsIn(DEVANAGARI_ZERO, "1234567")}`],
    ["title", `Loan officer ${digitsIn(ARABIC_INDIC_ZERO, "5")}`],
  ];
  const passed: readonly Readonly<[field: Parameters<typeof codesFor>[0], text: string]>[] = [
    ["primaryText", "Know your credit score and payment history"],
    ["headline", "A dozen reasons to start today"],
    ["primaryText", "Dozens of families helped, one home at a time"],
    ["disclosureLine", "Equal Housing Opportunity. NMLS 0000000"],
    ["disclosureLine", "Equal Housing Opportunity. NMLS 1234567"],
    ["disclosureLine", "Equal Housing Opportunity. Lic. 12-3456"],
    ["disclosureLine", "Equal Housing Opportunity. NMLS #1234567"],
    ["disclosureLine", "Equal Housing Opportunity. Lic #12-3456"],
    ["disclosureLine", "Equal Housing Opportunity. NMLS ID: 1234567"],
    ["disclosureLine", "NMLS 1234567. Equal Housing Lender"],
    ["company", "1st Choice Mortgage"],
    ["company", "21st Century Lending"],
    ["company", "Prairie Home Lending NMLS 0000000"],
    ["name", "Alex Morgan, NMLS 1234567"],
    // SEC-009-07's controls, as a number rule: a number word beside no unit, or "one" in "one home".
    ["headline", "One home, many years of memories"],
    ["headline", "Make this one of your best years"],
    ["headline", "One loan officer, many happy years"],
    ["primaryText", "Serving our community for generations"],
    ["primaryText", "A decade of helping first-time buyers"],
  ];

  it.each(refused)("refuses %s %j", (field, text) => {
    expect(codesFor(field, text)).toContain("WORDS_NUMBER");
  });

  it.each(passed)("passes %s %j", (field, text) => {
    expect(codesFor(field, text)).not.toContain("WORDS_NUMBER");
  });

  it("refuses an ordinal or a license reference within two tokens of a term word", () => {
    for (const company of [
      "21st Monthly Lending",
      "Acme NMLS 1234567 Rates",
      "Fixed 1st Lending",
      "Down Home 1st Lending",
    ]) {
      expect(codesFor("company", company), company).toContain("WORDS_NUMBER");
    }
    // Three tokens away is outside the window.
    expect(codesFor("company", "21st Century Home Payment Lending")).not.toContain("WORDS_NUMBER");
  });

  it("refuses a license reference longer than twelve digits", () => {
    expect(codesFor("disclosureLine", "Equal Housing Opportunity. NMLS 1234567890123")).toContain(
      "WORDS_NUMBER",
    );
  });

  it(
    "refuses a decimal digit of any script outside the ASCII ones (SEC-009-08)",
    () => {
      // Every Nd code point, except the ASCII digits and the ones NFKC already writes as ASCII
      // (full-width and mathematical digits, which pass as a license reference like the ASCII ones).
      const ranges = codePointRanges(/^\p{Nd}$/u);
      expect(ranges.length).toBeGreaterThanOrEqual(60);
      let tried = 0;
      for (const [first, last] of ranges) {
        for (let codePoint = first; codePoint <= last; codePoint += 1) {
          const digit = String.fromCodePoint(codePoint);
          if (/^[0-9]$/u.test(digit.normalize("NFKC"))) continue;
          tried += 1;
          expect(
            codesFor("disclosureLine", `Equal Housing Opportunity. NMLS 123456${digit}`),
            `U+${codePoint.toString(16).toUpperCase()}`,
          ).toContain("WORDS_NUMBER");
        }
      }
      expect(tried).toBeGreaterThanOrEqual(400);
      // The ASCII license reference beside them still passes.
      expect(codesFor("disclosureLine", "Equal Housing Opportunity. NMLS 1234567")).toEqual([]);
    },
    SCAN_TIMEOUT,
  );

  it("names the field in the plain fix", () => {
    expect(findingsFor("company", "Acme #5000 Grant Lending")[0]).toMatchObject({
      ruleCode: "WORDS_NUMBER",
      affected: "advertiser.company",
      remediation:
        "Take the number out of the company name in Brand. Ads can't state rates, payments or terms.",
    });
  });
});

describe("a phone number in another script's digits (SEC-009-08)", () => {
  it(
    "is a phone number in every script, whatever keyword stands before it",
    () => {
      // Each run of Nd code points is a whole number of sets of ten digits, from zero to nine, so
      // every set is tried: the ten digits of "800 555 1212" written in that script.
      const ranges = codePointRanges(/^\p{Nd}$/u);
      let sets = 0;
      for (const [first, last] of ranges) {
        expect((last - first + 1) % 10, `U+${first.toString(16).toUpperCase()}`).toBe(0);
        for (let zero = first; zero < last; zero += 10) {
          sets += 1;
          const phone = digitsIn(zero, "8005551212");
          for (const [field, text] of [
            ["disclosureLine", `NMLS ${phone}. Equal Housing Lender.`],
            ["company", `Acme NMLS ${phone} Lending`],
            ["headline", `Call ${phone} today`],
          ] as const) {
            expect(
              codesFor(field, text),
              `U+${zero.toString(16).toUpperCase()} ${field}`,
            ).toContain("WORDS_CO_BRAND");
          }
        }
      }
      expect(sets).toBeGreaterThanOrEqual(60);
    },
    SCAN_TIMEOUT,
  );

  it(
    "reads every digit of every script at its own value",
    () => {
      // The plain fix quotes the text the rules read, so the digits it quotes are the digits folded to
      // ASCII: "0123456789" written in each script's ten digits must come back as "0123456789".
      for (const [first, last] of codePointRanges(/^\p{Nd}$/u)) {
        for (let zero = first; zero < last; zero += 10) {
          const typed = digitsIn(zero, "0123456789");
          expect(
            findingsFor("headline", `${typed} years`)[0]?.remediation,
            `U+${zero.toString(16)}`,
          ).toBe("Take '0123456789 years' out of the headline. Ads can't state loan terms.");
        }
      }
    },
    SCAN_TIMEOUT,
  );

  it("is a phone number spelled in number words, seven or more digit words in a row", () => {
    for (const text of [
      "Call eight hundred, five five five, one two one two",
      "Text me: five five five one two one two",
      "Ring eight zero zero five five five one two one two",
      "Dial five-five-five-oh-one-two-one",
      "Count with me: one two three four five six seven",
    ]) {
      expect(codesFor("headline", text), text).toContain("WORDS_CO_BRAND");
      expect(findingsFor("primaryText", text)[0]?.remediation, text).toContain("the phone number");
    }
    for (const text of [
      "Count with me: one two three four five six, then ask your questions",
      "Three easy steps: one, two, three",
      "Zero stress, one call, two minutes to talk, three ways to start",
      "Oh, the places a home can take you",
    ]) {
      expect(codesFor("headline", text), text).not.toContain("WORDS_CO_BRAND");
    }
  });
});

describe("the number rule, number words and fillers (SEC-009-07)", () => {
  it("has the delta pass's nine refusals and nine controls", () => {
    expect(NUMBER_WORD_APART_REFUSED).toHaveLength(9);
    expect(NUMBER_WORD_APART_PASSED).toHaveLength(9);
  });

  it.each(NUMBER_WORD_APART_REFUSED)("names a claim in %j, in the plain fix too", (text) => {
    expect(findingsFor("headline", text)[0]).toMatchObject({
      ruleCode: "WORDS_RATE_PAYMENT_OR_TERM_CLAIM",
      affected: "content.headline",
    });
  });

  it("calls a year, month, or payment count a loan term, and a percent a rate", () => {
    expect(findingsFor("headline", "Thirty whole years")[0]?.remediation).toContain(
      "Ads can't state loan terms.",
    );
    expect(findingsFor("headline", "Two short percent")[0]?.remediation).toContain(
      "Ads can't state rate claims.",
    );
    expect(findingsFor("headline", "Twelve easy payments")[0]?.remediation).toContain(
      "Ads can't state payment claims.",
    );
  });

  it.each(NUMBER_WORD_APART_PASSED)("finds no finding at all in %j", (text) => {
    expect(codesFor("headline", text)).toEqual([]);
    expect(codesFor("primaryText", text)).toEqual([]);
  });

  it("reads one or two filler words between the number word and the unit", () => {
    // The window is two words. Any fixed window can be beaten by one more word, which is the open
    // vocabulary the delta pass grades Low (R-4); a person approves every version, and every digit
    // is refused wherever it stands.
    for (const text of ["Thirty long years", "Thirty very long years", "Twelve easy payments"]) {
      expect(codesFor("headline", text), text).toContain("WORDS_NUMBER");
    }
  });
});

describe("the co-brand rule (009D-AC-010, compliance control 9)", () => {
  const refused: readonly Readonly<[field: Parameters<typeof codesFor>[0], text: string]>[] = [
    ["headline", "Meet my favorite Realtor"],
    ["primaryText", "Listed by the best team in town"],
    ["primaryText", "Courtesy of a local agent"],
    ["primaryText", "In partnership with Oak Street Homes"],
    ["primaryText", "Presented by the neighborhood team"],
    ["primaryText", "Sponsored by a friend"],
    ["primaryText", "Ask your real estate agent"],
    ["primaryText", "Your listing agent knows me"],
    ["headline", "Email me at alex@example.com"],
    ["headline", "Find me at example.com"],
    ["primaryText", "Visit https://example.com/homes"],
    ["primaryText", "Call (512) 555-0134 today"],
    ["company", "Prairie Home Lending®"],
    ["title", "Loan officer with Priya Nadeem"],
    ["company", "Mortgage brokerage"],
    ["title", "Mortgage brokers association member"],
    ["title", "Broker partner"],
    ["title", "Real estate broker"],
    ["disclosureLine", "Equal Housing Opportunity. x.nmlsconsumeraccess.org.example.com"],
    ["disclosureLine", "Equal Housing Opportunity. nmlsconsumeraccess.org.example.com"],
    ["disclosureLine", "Equal Housing Opportunity. example.com/nmlsconsumeraccess.org"],
    ["disclosureLine", "Equal Housing Opportunity. nmlsconsumeraccess.org@example.com"],
    ["disclosureLine", "Equal Housing Opportunity. nmlsconsumeraccess.org:8080"],
    ["disclosureLine", "Equal Housing Opportunity. nmlsconsumer-access.org"],
    ["headline", "Look me up at nmlsconsumeraccess.org"],
    ["primaryText", "Look me up at nmlsconsumeraccess.org"],
    ["title", "nmlsconsumeraccess.org"],
    ["company", "nmlsconsumeraccess.org"],
    ["leadFormWording", "Learn more at nmlsconsumeraccess.org"],
    ["disclosureLine", "Equal Housing Opportunity. nmlsconsumeraccess.org/lookup"],
    ["disclosureLine", "Equal Housing Opportunity. nmlsconsumeraccess.org?id=1"],
    ["disclosureLine", "Equal Housing Opportunity. nmlsconsumeraccess.org#x"],
    ["disclosureLine", "Equal Housing Opportunity. nmlsconsumeraccess.org and example.com"],
    // The independent verifier's bypasses of 2026-10-02.
    ["headline", "Ask my R E A L T O R"],
    ["headline", "Ask my R.E.A.L.T.O.R"],
    ["primaryText", "Your R-E-A-L-T-O-R and I"],
    ["primaryText", "A B R O K E R A G E near you"],
    ["headline", "Ask my Re\u3164altor"],
    ["headline", "Find me at example\u3002com"],
    ["headline", "Find me at example\uFF61com"],
    ["disclosureLine", "Equal Housing Opportunity. nmlsconsumeraccess\u3002org/lookup"],
    ["disclosureLine", "Equal Housing Opportunity. NMLS 1234567. Call 800-555-1212"],
    // The PRD-009 security review, SEC-009-03: ten digits (or eleven after a 1) after a license
    // keyword are a phone number, not a license reference, and print as one.
    ["disclosureLine", "Equal Housing Opportunity. NMLS 8005551212"],
    ["disclosureLine", "License 2125550199 Equal Housing"],
    ["disclosureLine", "Equal Housing Opportunity. NMLS 18005551212"],
    ["disclosureLine", "Equal Housing Opportunity. Lic. 800-5551212"],
    ["company", "Acme NMLS 8005551212 Lending"],
    ["name", "Alex Morgan, Lic. 2125550199"],
    // SEC-009-04: the co-brand vocabulary the review found open.
    ["company", "Mortgage broker & realty partners"],
    ["company", "Prairie Realty"],
    ["title", "Loan officer at Oak Realty"],
    ["company", "Prairie Real Estate Lending"],
    ["title", "Partnered with Keller Williams"],
    ["primaryText", "We are partnering with a local team"],
    ["primaryText", "Affiliated with Oak Street Homes"],
    ["primaryText", "In association with Oak Street Homes"],
    ["primaryText", "In collaboration with a neighborhood team"],
    ["primaryText", "Partnered with Oak Street Homes for years"],
    ["title", "Partnering with Coldwell Banker"],
    ["primaryText", "Brought to you by a friend"],
    ["headline", "Real-tor approved"],
    ["company", "Prairie R E A L T Y"],
    // SEC-009-10: "w/" is "with" in the phrases that name someone else.
    ["title", "Partnered w/ Keller Williams"],
    ["primaryText", "Affiliated w/ Oak Street Homes"],
    ["primaryText", "In partnership w/ Oak Street Homes"],
    ["primaryText", "In association w/ Oak Street Homes"],
    ["primaryText", "Partnering w Oak Street Homes"],
    // SEC-009-08: a ten-digit run in another script's digits prints a phone number all the same,
    // and so does a phone number spelled in number words (seven or more digit words in a row).
    [
      "disclosureLine",
      `Equal Housing Opportunity. NMLS ${digitsIn(ARABIC_INDIC_ZERO, "8005551212")}`,
    ],
    [
      "disclosureLine",
      `Equal Housing Opportunity. NMLS ${digitsIn(DEVANAGARI_ZERO, "8005551212")}`,
    ],
    ["company", `Acme NMLS ${digitsIn(ARABIC_INDIC_ZERO, "8005551212")} Lending`],
    ["headline", "Call eight hundred, five five five, one two one two"],
  ];
  const passed: readonly Readonly<[field: Parameters<typeof codesFor>[0], text: string]>[] = [
    ["title", "Mortgage Broker"],
    ["headline", "Buying real estate? Start here."],
    ["primaryText", "Partner with me to start your home search"],
    ["primaryText", "I enjoy partnering with first-time buyers"],
    ["primaryText", "We have partnered with families across the state"],
    ["primaryText", "Partnered with you every step of the way"],
    ["primaryText", "Partnered w/ you every step of the way"],
    ["primaryText", "I enjoy partnering w/ first-time buyers"],
    ["primaryText", "Real talk about your first home"],
    ["disclosureLine", "Equal Housing Opportunity. NMLS 1234567"],
    ["disclosureLine", "Equal Housing Opportunity. NMLS 123456789012"],
    ["disclosureLine", "Equal Housing Opportunity. Lic. 12-3456"],
    ["title", "Licensed mortgage broker"],
    ["disclosureLine", "Equal Housing Opportunity. www.nmlsconsumeraccess.org"],
    ["disclosureLine", "Equal Housing Opportunity. nmlsconsumeraccess.org/"],
    ["disclosureLine", "Equal Housing Opportunity. nmlsconsumeraccess.org"],
    ["company", "Prairie Home Lending"],
  ];

  it("has at least 15 cases", () => {
    expect(refused.length + passed.length).toBeGreaterThanOrEqual(15);
  });

  it.each(refused)("refuses %s %j", (field, text) => {
    expect(codesFor(field, text, ["Priya Nadeem", "Oakline Realty"])).toContain("WORDS_CO_BRAND");
  });

  it.each(passed)("passes %s %j", (field, text) => {
    expect(codesFor(field, text, ["Priya Nadeem", "Oakline Realty"])).not.toContain(
      "WORDS_CO_BRAND",
    );
  });

  it("refuses a saved partner's name or company, normalised, and ignores one under four characters", () => {
    const partners = ["Priya Nadeem", "Oakline Realty", "Bo"];
    expect(codesFor("title", "Working with PRIYA  NADEEM", partners)).toContain("WORDS_CO_BRAND");
    expect(codesFor("primaryText", "Ask about Oakline-Realty homes", partners)).toContain(
      "WORDS_CO_BRAND",
    );
    expect(codesFor("primaryText", "Bo knows homes", partners)).not.toContain("WORDS_CO_BRAND");
  });

  it("refuses each saved partner's given and family name and the brokerage without its suffix (verifier, 2026-10-02)", () => {
    const partners = ["Priya Nadeem", "Keller Williams Realty"];
    for (const text of [
      "Ask Priya about it",
      "Nadeem and I can help",
      "Keller Williams agents welcome",
      "keller-williams buyers",
    ]) {
      expect(codesFor("primaryText", text, partners), text).toContain("WORDS_CO_BRAND");
    }
    for (const company of ["Acme Holdings LLC", "Oak Street Realty Inc.", "Brightway Group"]) {
      expect(codesFor("primaryText", "Ask about Acme", [company]), company).toEqual(
        company.startsWith("Acme") ? ["WORDS_CO_BRAND"] : [],
      );
    }
    expect(
      codesFor("primaryText", "Ask about Oak Street homes", ["Oak Street Realty Inc."]),
    ).toContain("WORDS_CO_BRAND");
    // A token shorter than three letters, or one the person's own Brand name carries, is not one.
    expect(codesFor("primaryText", "Al can help", ["Al Brooks"])).toEqual([]);
    expect(codesFor("primaryText", "Alex can help", ["Alex Rivera"])).toEqual([]);
    expect(codesFor("primaryText", "Rivera can help", ["Alex Rivera"])).toContain("WORDS_CO_BRAND");
    // Whole words only.
    expect(codesFor("primaryText", "Priyanka can help", partners)).toEqual([]);
  });

  it("names the term and the field in the plain fix", () => {
    expect(findingsFor("primaryText", "Meet my Realtor")[0]).toMatchObject({
      ruleCode: "WORDS_CO_BRAND",
      affected: "content.body",
      remediation: "Take 'realtor' out of the ad text. Paid ads show only you.",
    });
    expect(
      findingsFor("title", "Loan officer with Priya Nadeem", ["Priya Nadeem"])[0],
    ).toMatchObject({
      ruleCode: "WORDS_CO_BRAND",
      affected: "advertiser.title",
      remediation: "Take 'Priya Nadeem' out of the title in Brand. Paid ads show only you.",
    });
  });
});

describe("the private-details rule (009D-AC-010, Meta rules check E3)", () => {
  const refused: readonly Readonly<[field: Parameters<typeof codesFor>[0], text: string]>[] = [
    ["headline", "Send me your SSN"],
    ["headline", "S.S.N. needed"],
    ["primaryText", "Have your Social Security number ready"],
    ["primaryText", "What's your DOB?"],
    ["primaryText", "Share your routing number"],
    ["primaryText", "Send your ЅЅN to start"],
    ["leadFormWording", "Enter your date of birth"],
    ["leadFormWording", "Tell us your bank account number"],
    ["leadFormWording", "Add your driver's license"],
    ["leadFormWording", "Card number and security code"],
    ["primaryText", "Add your drivers license"],
    ["primaryText", "Your s s n please"],
    ["primaryText", "Your mother’s maiden name"],
    ["title", "Tax ID helper"],
    // The independent verifier's bypasses of 2026-10-02.
    ["headline", "Send me your S-S-N"],
    ["headline", "Your S/S/N please"],
    ["primaryText", "Send your SSNs"],
    ["primaryText", "Share your passwords"],
    ["primaryText", "Enter your PIN"],
    ["primaryText", "Text me your pin"],
    ["leadFormWording", "Your PIN code to start"],
    ["leadFormWording", "Your acct number"],
    ["leadFormWording", "Send acct details"],
    ["primaryText", "Your D.O.B. please"],
  ];
  const passed: readonly Readonly<[field: Parameters<typeof codesFor>[0], text: string]>[] = [
    ["primaryText", "We accept Social Security income"],
    ["headline", "ITIN loans available"],
    ["company", "Pin Oak Lending"],
    ["disclosureLine", "NMLS 1234567. Equal Housing Lender"],
    ["primaryText", "Pin down your budget with me"],
    ["primaryText", "Social Security income counts"],
  ];

  it("has at least 14 cases", () => {
    expect(refused.length + passed.length).toBeGreaterThanOrEqual(14);
  });

  it.each(refused)("refuses %s %j", (field, text) => {
    expect(codesFor(field, text)).toContain("WORDS_PRIVATE_INFO_REQUEST");
  });

  it.each(passed)("passes %s %j", (field, text) => {
    expect(codesFor(field, text)).not.toContain("WORDS_PRIVATE_INFO_REQUEST");
  });

  it("names the term and the field in the plain fix", () => {
    expect(findingsFor("leadFormWording", "Enter your date of birth")[0]).toMatchObject({
      ruleCode: "WORDS_PRIVATE_INFO_REQUEST",
      affected: "content.consentText",
      remediation:
        "Take 'date of birth' out of the lead form wording in Brand. Ads can't ask for private details.",
    });
  });
});

describe("the clean sample identity", () => {
  it("passes every word rule", () => {
    expect(evaluateLibraryAdWords(CLEAN_TEXTS, ["Priya Nadeem"])).toEqual([]);
  });
});
