import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { readCssRules } from "../../testing/css-rules.js";

/**
 * The scored baseline review of 2026-10-03 (PRD-009 009G-AC-006), part R3, F-11.
 *
 * Three pages each drew their own eyebrow: Settings, Brand and Realtor partners ("NORTHGATE
 * LENDING", uppercase, tracked 0.12em, weight 650), Connections ("CONNECTIONS", uppercase, tracked
 * 0.04em), and the Brand profile ("YOUR BRAND", the same). The mockup has one: sentence case at the
 * secondary step, semibold, no tracking, in body ink (`design/mockups/home-first-run.html:183`), and
 * 650 is no token (`--weight-semibold` is 600, 009A-AC-002).
 *
 * No unit test refused a raw `font-weight` or `letter-spacing` in a delivered stylesheet, so each of
 * the sheets below is also scanned for one. A number there is a weight the brief does not have, and
 * a tracking other than `--tracking-page` is one it does not set.
 */

const features = resolve(import.meta.dirname, "..");
const SHEETS = [
  join(features, "workspace", "workspace.module.css"),
  join(features, "onboarding", "components", "permission-screen.module.css"),
] as const;

const sheets = await Promise.all(SHEETS.map((path) => readCssRules(path)));

describe("one eyebrow across Settings, Brand, Realtor partners and Connections", () => {
  it.each(SHEETS.map((path, index) => [path.split(/[\\/]/u).at(-1), index] as const))(
    "%s sets the mockup's eyebrow",
    (_name, index) => {
      const eyebrow = sheets[index]?.declarationsOf(".eyebrow");

      expect(eyebrow?.["font-size"]).toBe("var(--text-secondary-size)");
      expect(eyebrow?.["font-weight"]).toBe("var(--weight-semibold)");
      expect(eyebrow?.["color"]).toBe("var(--tx-body)");
      expect(eyebrow).not.toHaveProperty("text-transform");
      expect(eyebrow).not.toHaveProperty("letter-spacing");
    },
  );
});

describe("no raw weight or tracking in these sheets", () => {
  it.each(SHEETS.map((path, index) => [path.split(/[\\/]/u).at(-1), index] as const))(
    "%s takes every weight and tracking from a token",
    (_name, index) => {
      const source = sheets[index]?.source ?? "";
      const literals = (property: string): string[] =>
        [...source.matchAll(new RegExp(`${property}:\\s*([^;]+);`, "gu"))]
          .map((match) => (match[1] ?? "").trim())
          .filter((value) => !value.startsWith("var("));

      expect(literals("font-weight")).toEqual([]);
      expect(literals("letter-spacing")).toEqual([]);
    },
  );
});
