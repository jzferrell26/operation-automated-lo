import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KeepWordsWhole } from "./keep-words-whole.js";

/**
 * The scored baseline review of 2026-10-03, pass 2, R2 F-8. A hard hyphen is a place a browser may
 * break a line, and a narrow cell read "Pre-" and then "approval". Each hyphenated word is one
 * unbreakable unit; the text is never changed or cut.
 */

/** The unit the component draws round a hyphenated word: the element whose class names `whole`. */
function wholes(container: HTMLElement): string[] {
  return [...container.querySelectorAll("span")]
    .filter((element) => element.className.split(/\s+/u).some((name) => name.includes("whole")))
    .map((element) => element.textContent ?? "");
}

describe("KeepWordsWhole (review pass 2, R2 F-8)", () => {
  it.each([
    ["Pre-approval", ["Pre-approval"]],
    ["Sample: Get pre-approved before you shop", ["pre-approved"]],
    ["First-time buyers", ["First-time"]],
    ["Pre-approval. Dates: Oct 6 to Oct 20", ["Pre-approval."]],
    ["A first-time, low-cost start", ["first-time,", "low-cost"]],
  ] as const)("wraps only the hyphenated words of %s", (text, expected) => {
    const { container } = render(<KeepWordsWhole text={text} />);

    expect(wholes(container)).toEqual(expected);
  });

  it.each([
    "Pre-approval",
    "Sample: Get pre-approved before you shop",
    "A first-time, low-cost start",
    "Refinance",
    "VA loans",
    "",
  ])("reads exactly as written, with no word changed, shortened or dropped: %j", (text) => {
    const { container } = render(<KeepWordsWhole text={text} />);

    expect(container.textContent).toBe(text);
  });

  it("wraps nothing in a phrase with no hyphen, and treats a lone or edge hyphen as no word", () => {
    for (const text of ["Down payment help", "a - b", "-leading", "trailing-"]) {
      const { container, unmount } = render(<KeepWordsWhole text={text} />);

      expect(wholes(container), text).toEqual([]);
      unmount();
    }
  });

  it("is one element, so it is one item when it sits in a link that is a flex row", () => {
    const { container } = render(
      <KeepWordsWhole text="Sample: Get pre-approved before you shop" />,
    );

    expect(container.children).toHaveLength(1);
  });
});
