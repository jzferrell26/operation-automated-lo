import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { readCssRules } from "../../../testing/css-rules.js";

/**
 * The scored baseline review of 2026-10-03 (PRD-009 009G-AC-006), part R3, on the Connections page.
 * jsdom has no layout, so these read the stylesheet; the pictures are the review's own.
 *
 * - F-08: a group's description kept the browser's 1em margin inside a grid that already had a gap,
 *   so each heading read as the caption of the card above it. The rubric's D-009 ruling says such a
 *   gap is a `--space-*` token in the module.
 * - F-10: the notice asks for the informational surface and, being a plain element, gets it.
 */

const { source, declarationsOf } = await readCssRules(
  join(resolve(import.meta.dirname), "permission-screen.module.css"),
);

describe("F-08: the groups' rhythm", () => {
  it("takes the browser's margin off a group's description", () => {
    expect(declarationsOf(".permissionGroups p")["margin"]).toBe("0");
  });

  it("puts the groups --space-8 apart and the two columns --space-6 apart", () => {
    expect(declarationsOf(".permissionGroups")["gap"]).toBe("var(--space-8) var(--space-6)");
  });

  it("keeps what is inside one group closer than the groups are to each other", () => {
    expect(declarationsOf(".permissionGroups section")["gap"]).toBe("var(--space-3)");
  });
});

describe("F-10: the notice", () => {
  it("sets only its row, because the Surface primitive's info variant owns the tint, radius, padding, and ink", () => {
    const notice = declarationsOf(".safetyNotice");

    expect(notice["display"]).toBe("flex");
    expect(notice["align-items"]).toBe("flex-start");
    expect(notice["gap"]).toBe("var(--space-3)");
    for (const property of ["background", "color", "border-radius", "padding"]) {
      expect(notice[property], `${property} comes from the Surface variant`).toBeUndefined();
    }
  });

  it("keeps its title in the informational tone, the one colour the module still sets", () => {
    expect(declarationsOf(".safetyNotice strong")["color"]).toBe("var(--st-info-fg)");
    // The tint is the Surface variant's; the module never paints it again.
    expect(source).not.toMatch(/--st-info-bg/u);
  });
});

describe("F-09: no hand-built pill is left", () => {
  it("styles no span as a pill, because the group's state is the shared Badge", () => {
    expect(source).not.toMatch(/\.permissionHeading\s+span/u);
    expect(source).not.toMatch(/text-transform:\s*capitalize/u);
  });
});
