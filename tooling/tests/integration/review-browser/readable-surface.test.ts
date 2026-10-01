import { afterEach, describe, expect, it } from "vitest";

import { reviewSurfaceText } from "../../../../apps/web/src/app/(authenticated)/review-surface-sweep.js";
import { readableSurfaceOf } from "../../../../tests/browser/review/helpers/readable-surface.js";

/**
 * PRD-008c 008C-AC-006. The review browser run reads a live page with `readableSurfaceOf`, which
 * has to be a standalone copy of `reviewSurfaceText` because Playwright serialises the function it
 * evaluates and cannot import the original. A copy of an algorithm drifts, and a drifted reader
 * would sweep something other than what the component suites sweep while looking like the same
 * check. These cases run both against one document so that cannot happen quietly.
 */

const PAGE = `
  <main>
    <h1>Homeowner reports</h1>
    <p>Opening a saved report uses no new lookup.</p>
    <a href="/homeowners/this-property" title="Open this report">Pat Homeowner</a>
    <img alt="A map of the street" src="/map.png" />
    <input placeholder="Homeowner, street or city" aria-describedby="help outside inside" />
    <button type="button" aria-label="Share this report">Share</button>
    <code>214 Cedar Street</code>
    <details data-support-details>
      <summary>Details for support</summary>
      <p id="inside">Support reference: abc123</p>
      <code>RULE_CODE_FOR_SUPPORT</code>
    </details>
  </main>
  <p id="help">Search by name or address.</p>
  <p id="outside">This description lives outside the main region.</p>
`;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the review browser run's page reader", () => {
  it("reads exactly what the review-surface sweep reads from the same page", () => {
    document.body.innerHTML = PAGE;
    const main = document.querySelector("main")!;

    expect(readableSurfaceOf(main)).toBe(reviewSurfaceText(main));
  });

  it("reads the accessible names, the descriptions, and the code, and skips the support region", () => {
    document.body.innerHTML = PAGE;
    const surface = readableSurfaceOf(document.querySelector("main")!);

    for (const expected of [
      "Open this report",
      "A map of the street",
      "Homeowner, street or city",
      "Share this report",
      "Search by name or address.",
      "This description lives outside the main region.",
      "214 Cedar Street",
    ]) {
      expect(surface).toContain(expected);
    }
    expect(surface).not.toContain("RULE_CODE_FOR_SUPPORT");
    expect(surface).not.toContain("Support reference: abc123");
  });

  /** The one difference, on purpose: a real document carries scripts and styles nobody reads. */
  it("leaves out the script and style a real page carries and a component render does not", () => {
    document.body.innerHTML = `
      <main>
        <p>Your report is ready.</p>
        <script>self.__next_f.push([1, "provider route handler"])</script>
        <style>.report { content: "fixture" }</style>
      </main>`;
    const main = document.querySelector("main")!;

    expect(readableSurfaceOf(main)).not.toContain("provider");
    expect(readableSurfaceOf(main)).not.toContain("fixture");
    expect(readableSurfaceOf(main)).toContain("Your report is ready.");
  });
});
