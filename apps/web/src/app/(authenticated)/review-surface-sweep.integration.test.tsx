import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  leakedReviewStrings,
  reviewSurfaceText,
  userLanguageForbiddenStrings,
} from "./review-surface-sweep.js";

/**
 * The rendered half of PRD-006b D6, tested on its own rather than only through the six review-route
 * suites.
 *
 * The two guards share one term list, so it was easy to believe they enforced the same rule. They
 * did not: the source guard matched a term's inflections and this one did not, which made the guard
 * closest to the reader the weaker of the two. Both sentences below are the shapes that slipped
 * through, and both now come from `forbiddenTermPattern` in the copy module, so the guards cannot
 * disagree again without this failing.
 */

function surfaceFor(text: string): string {
  const { container } = render(<p>{text}</p>);
  return reviewSurfaceText(container);
}

describe("the rendered user-language guard", () => {
  it("reports a banned term in the plural and in the verb form on a rendered page", () => {
    expect(
      leakedReviewStrings(surfaceFor("Demo fixtures only."), userLanguageForbiddenStrings()),
    ).toEqual(['user-language-contract:forbidden-vocabulary = "fixture"']);

    expect(
      leakedReviewStrings(
        surfaceFor("These providers are not connected"),
        userLanguageForbiddenStrings(),
      ),
    ).toEqual(['user-language-contract:forbidden-vocabulary = "provider"']);
  });

  it("reports a banned term inside a hyphenated compound and in another tense", () => {
    expect(
      leakedReviewStrings(
        surfaceFor("This page shows provider-backed numbers while the campaign is compiling."),
        userLanguageForbiddenStrings(),
      ),
    ).toEqual([
      'user-language-contract:forbidden-vocabulary = "provider"',
      'user-language-contract:forbidden-vocabulary = "compile"',
    ]);
  });

  it("leaves a sentence written in the contract's own voice alone", () => {
    expect(
      leakedReviewStrings(
        surfaceFor("HighLevel and Meta are not connected yet, so these numbers are not live."),
        userLanguageForbiddenStrings(),
      ),
    ).toEqual([]);
  });

  it("still reads an accessible attribute, not only the visible text", () => {
    const { container } = render(
      <button type="button" aria-label="Open the review surface">
        Open
      </button>,
    );

    expect(
      leakedReviewStrings(reviewSurfaceText(container), userLanguageForbiddenStrings()),
    ).toEqual(['user-language-contract:forbidden-vocabulary = "review surface"']);
  });
});
