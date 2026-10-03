import { describe, expect, it } from "vitest";

import { adFact, libraryVersion, setUpLead } from "./launch-messages.js";

/**
 * The scored baseline review of PRD-009, pass 3, R2 P3-4: on the retired page at 390 the "Library
 * ad" value broke before its number, "library version" on one line and "1" alone on the next. The
 * ad's version in the library is one unit, so its three words are joined with no-break spaces.
 */

/** U+00A0, built from its code so a reader of this file sees what it is. */
const NO_BREAK_SPACE = String.fromCharCode(0xa0);

describe("the ad's version in the library (pass 3, R2 P3-4)", () => {
  it("joins 'library', 'version' and the number with no-break spaces", () => {
    expect(libraryVersion(1)).toBe(["library", "version", "1"].join(NO_BREAK_SPACE));
    expect(libraryVersion(12)).toBe(["library", "version", "12"].join(NO_BREAK_SPACE));
  });

  it("ends the library ad fact, which step 3 and the campaign page both draw", () => {
    expect(adFact("Sample: Spring home search", 1)).toBe(
      `Sample: Spring home search, ${libraryVersion(1)}`,
    );
  });

  it("ends step 2's lead, so the same words never break apart there either", () => {
    expect(setUpLead("Sample: First home, start here", "First-time buyers", 2)).toBe(
      `Sample: First home, start here. First-time buyers, ${libraryVersion(2)}.`,
    );
  });

  it("leaves no ordinary space inside the three words, and an ordinary one before them, where a line may break", () => {
    const fact = adFact("Sample: Spring home search", 3);
    expect(fact).not.toMatch(/library version/u);
    expect(fact).not.toMatch(/version 3/u);
    expect(fact).toContain(", library");
  });

  it("reads as the same words with plain spaces once whitespace is collapsed", () => {
    // A screen reader says a no-break space as a space, and a search or a test that collapses
    // whitespace reads the sentence it always read.
    expect(adFact("Sample: First home, start here", 2).replaceAll(/\s+/gu, " ")).toBe(
      "Sample: First home, start here, library version 2",
    );
  });
});
