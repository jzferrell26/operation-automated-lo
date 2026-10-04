import { describe, expect, it, vi } from "vitest";

import { SITE_DESCRIPTION } from "../copy/page-titles.js";

/**
 * PRD-009 writing review pass 1, W-13. The root layout names the product in every tab: a page's own
 * title first, then "| Automated LO", and the product's own name when a page names nothing. It is an
 * integration test because the layout is a TSX module, which the unit project does not transform.
 */

vi.mock("next/headers.js", () => ({ headers: () => Promise.resolve(new Headers()) }));

describe("the root layout's title", () => {
  it("is the product's name by default and follows a page's own title with it", async () => {
    const { metadata } = await import("./layout.js");

    expect(metadata.title).toEqual({ default: "Automated LO", template: "%s | Automated LO" });
    expect(metadata.description).toBe(SITE_DESCRIPTION);
  });
});
