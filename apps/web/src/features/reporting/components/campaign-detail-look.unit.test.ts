import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { readCssRules } from "../../../testing/css-rules.js";
import { declarationsIn, mediaBody } from "../../campaigns/components/css-blocks.test-support.js";

/**
 * The scored baseline review of 2026-10-03, pass 2, part R2, N-5. The synthetic demo campaign page is
 * exempt from axis 10 (consistency with the PRD-009 mockups) by the rubric's section 5 entry of
 * 2026-10-03, and still held to axes 1 to 9. jsdom has no layout, so each rule is pinned in the
 * stylesheet that draws it; the pictures are the browser run's.
 */

const REPORTING = resolve(import.meta.dirname, "reporting.module.css");

describe("the demo campaign page's eyebrow (review pass 2, R2 N-5b)", () => {
  it("is the one eyebrow of the light look: sentence case, the secondary step, semibold, no tracking, in body ink", async () => {
    const css = await readCssRules(REPORTING);

    const eyebrow = css.declarationsOf(".eyebrow");
    expect(eyebrow["font-size"]).toBe("var(--text-secondary-size)");
    expect(eyebrow["font-weight"]).toBe("var(--weight-semibold)");
    expect(eyebrow.color).toBe("var(--tx-body)");
    expect(eyebrow).not.toHaveProperty("text-transform");
    expect(eyebrow).not.toHaveProperty("letter-spacing");
  });

  it("takes every weight and tracking in the sheet from a token", async () => {
    const css = await readCssRules(REPORTING);

    const literals = (property: string): string[] =>
      [...css.source.matchAll(new RegExp(`${property}:\\s*([^;]+);`, "gu"))]
        .map((match) => (match[1] ?? "").trim())
        .filter((value) => !value.startsWith("var("));
    expect(literals("font-weight")).toEqual([]);
    expect(literals("letter-spacing")).toEqual([]);
  });
});

describe("the demo campaign page's rhythm (review pass 2, R2 N-5a)", () => {
  it("spaces the page's blocks and sections one gap apart, and the version group one step closer", async () => {
    const css = await readCssRules(REPORTING);

    expect(css.declarationsOf(".page").gap).toBe("var(--space-8)");
    expect(css.declarationsOf(".versionGroup").gap).toBe("var(--space-4)");
    // A wide table scrolls inside its own region, so a section is held to the column's width.
    expect(css.declarationsOf(".page > *")["min-inline-size"]).toBe("0");
  });

  it("spaces the header's words and the preview's parts by a step, with no browser paragraph margin between them", async () => {
    const css = await readCssRules(REPORTING);

    const words = css.declarationsOf(".pageHeader > div");
    expect(words.display).toBe("grid");
    expect(words.gap).toBe("var(--space-2)");
    expect(css.declarationsOf(".pageHeader > div > *").margin).toBe("0");
    expect(css.declarationsOf(".preview > *").margin).toBe("0");
  });

  it("keeps a step between the version buttons, at every width", async () => {
    const css = await readCssRules(REPORTING);

    const picker = css.declarationsOf(".versionPicker");
    expect(picker.display).toBe("flex");
    expect(picker.gap).toBe("var(--space-2)");
    const narrow = mediaBody(css.source, "(max-width: 768px)");
    expect(declarationsIn(narrow, ".versionPicker").gap).toBe("var(--space-2)");
  });

  it("draws a label that is not a status as a caption, in the faint ink at the caption step", async () => {
    const css = await readCssRules(REPORTING);

    const caption = css.declarationsOf(".caption");
    expect(caption.color).toBe("var(--tx-faint)");
    expect(caption["font-size"]).toBe("var(--text-caption-size)");
  });

  it("no longer draws a hand-built neutral pill: a status is a Badge", async () => {
    const css = await readCssRules(REPORTING);

    expect(css.source).not.toMatch(/--st-neutral-bg/u);
    expect(css.source).not.toMatch(/\.currentVersion|\.permissionBadge/u);
  });
});

/**
 * Scored review pass 3, part R2. The demo campaign page stays exempt from axis 10 only, so it is held
 * to the composition at every frame (axis 7).
 */
describe("the demo campaign page at 768 and 390 (review pass 3, R2 P3-1 and P3-3)", () => {
  /**
   * P3-1. Below 768px a version's row is one column, and a grid item stretches across its track, so
   * the Badge ("Replaced", "Approved") drew as a bar as wide as its row. It keeps its own width.
   */
  it("keeps a version's chip its own width when its row is one column", async () => {
    const css = await readCssRules(REPORTING);
    const narrow = mediaBody(css.source, "(max-width: 768px)");
    const row = declarationsIn(narrow, ".history li");

    expect(row["grid-template-columns"]).toBe("minmax(0, 1fr)");
    expect(row["justify-items"]).toBe("start");
  });

  it("does not stretch the chip at any other width either", async () => {
    const css = await readCssRules(REPORTING);
    const wide = css.declarationsOf(".history li");

    // Three tracks (the version, the chip, the summary), each as wide as what is in it.
    expect(wide["grid-template-columns"]).toBe("auto auto minmax(0, 1fr)");
    expect(wide["align-items"]).toBe("start");
    expect(wide).not.toHaveProperty("justify-items", "stretch");
  });

  /**
   * P3-3. With `list-style-position: inside` the marker is part of the text box, so a wrapped line
   * began under the bullet at the browser's own marker width, which is no token. The marker is outside
   * and the list's start padding is the step, so a wrapped line returns to the text's edge.
   */
  it("hangs the summary list's marker outside a start padding that is a step", async () => {
    const css = await readCssRules(REPORTING);
    const list = css.declarationsOf(".launchSummaryGrid ul");

    expect(list["list-style-position"]).toBe("outside");
    expect(list["padding-inline-start"]).toBe("var(--space-5)");
    expect(css.source).not.toMatch(/list-style-position:\s*inside/u);
  });
});
