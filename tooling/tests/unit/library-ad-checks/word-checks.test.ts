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
    ]) {
      expect(
        codesFor("title", `Loan${character} officer`),
        character.codePointAt(0)?.toString(16),
      ).toEqual(["WORDS_INVALID_CHARACTERS"]);
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
  ];
  const passed: readonly Readonly<[field: Parameters<typeof codesFor>[0], text: string]>[] = [
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

  it("names the field in the plain fix", () => {
    expect(findingsFor("company", "Acme #5000 Grant Lending")[0]).toMatchObject({
      ruleCode: "WORDS_NUMBER",
      affected: "advertiser.company",
      remediation:
        "Take the number out of the company name in Brand. Ads can't state rates, payments or terms.",
    });
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
  ];
  const passed: readonly Readonly<[field: Parameters<typeof codesFor>[0], text: string]>[] = [
    ["title", "Mortgage Broker"],
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
