import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { contrastRatio } from "./tenant-accent.js";

/**
 * PRD-006d, 006D-AC-010. The design brief section 18 requires WCAG AA in both
 * themes. This test measures every text-on-surface pair the product actually
 * renders, straight from the shipped token file, so a token edit that would
 * drop a pair below the floor fails `pnpm test:unit` before it reaches a screen.
 *
 * The thresholds are the WCAG 2.2 floors: 4.5 for body text, 3.0 for a large
 * text step or a user interface component boundary (SC 1.4.3 and SC 1.4.11).
 */
const BODY_TEXT_MINIMUM = 4.5;
const UI_COMPONENT_MINIMUM = 3;

const tokenSource = readFileSync(resolve("packages/ui/src/tokens.css"), "utf8");

function tokensInBlock(startMarker: string, endMarker: string): ReadonlyMap<string, string> {
  const start = tokenSource.indexOf(startMarker);
  const end = tokenSource.indexOf(endMarker, start + startMarker.length);
  const block = tokenSource.slice(start, end === -1 ? undefined : end);
  const tokens = new Map<string, string>();

  for (const match of block.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gu)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) {
      tokens.set(name, value);
    }
  }

  return tokens;
}

const lightTokens = tokensInBlock(":root {", '[data-theme="dark"]');
const darkOverrides = tokensInBlock('[data-theme="dark"]', "@media");
const darkTokens = new Map([...lightTokens, ...darkOverrides]);

const themes = [
  { name: "Light", tokens: lightTokens },
  { name: "Dark", tokens: darkTokens },
] as const;

/**
 * Text pairs. `--tx-on-nav` is the only foreground the deep navy surface ever
 * carries: `app-shell.module.css` pairs `--sf-nav` with `--tx-on-nav` at every
 * one of its call sites, so the generic body and faint tokens are deliberately
 * not measured against it.
 */
const textPairs: ReadonlyArray<readonly [string, string]> = [
  ["--tx-strong", "--sf-canvas"],
  ["--tx-strong", "--sf-card"],
  ["--tx-strong", "--sf-sunken"],
  ["--tx-body", "--sf-canvas"],
  ["--tx-body", "--sf-card"],
  ["--tx-body", "--sf-sunken"],
  ["--tx-faint", "--sf-canvas"],
  ["--tx-faint", "--sf-card"],
  ["--tx-faint", "--sf-sunken"],
  ["--tx-on-nav", "--sf-nav"],
  ["--tx-on-action", "--ac-primary"],
  ["--tx-on-action", "--ac-primary-hover"],
  ["--tx-on-action", "--ac-primary-active"],
  ["--st-success-fg", "--st-success-bg"],
  ["--st-warning-fg", "--st-warning-bg"],
  ["--st-critical-fg", "--st-critical-bg"],
  ["--st-info-fg", "--st-info-bg"],
  ["--st-neutral-fg", "--st-neutral-bg"],
  ["--st-uncertain-fg", "--st-uncertain-bg"],
  /* Status text also renders directly on a surface: the inline field error, the
   * `AsyncState` body, and the `Link` foreground all do.
   */
  ...(["success", "warning", "critical", "info", "neutral", "uncertain"] as const).flatMap((role) =>
    (["--sf-canvas", "--sf-card", "--sf-sunken"] as const).map(
      (surface) => [`--st-${role}-fg`, surface] as const,
    ),
  ),
];

/**
 * User interface component pairs: the primary action fill has to be
 * distinguishable from the surface it sits on, in both themes.
 */
const uiComponentPairs: ReadonlyArray<readonly [string, string]> = [
  ["--ac-primary", "--sf-canvas"],
  ["--ac-primary", "--sf-card"],
  ["--ac-secondary", "--sf-card"],
];

/**
 * Every surface a focus ring can land on. The ring is drawn at
 * `--focus-offset`, so it sits on whatever is behind the focused element, not
 * on the element itself: a card, the canvas, a form well, the navigation rail,
 * or a status surface that carries a focusable control.
 *
 * `design-system-guardian` ruled rubric delta D-001 on 2026-09-20. Until then
 * `--focus-color` was `var(--ac-primary)`, so the ring followed the tenant
 * accent, and the Dark default accent fell below SC 1.4.11's 3.0 on five of
 * these ten surfaces. The ring is now its own token per theme, and this sweep
 * is what keeps it that way.
 */
const focusRingSurfaces: ReadonlyArray<string> = [
  "--sf-canvas",
  "--sf-card",
  "--sf-sunken",
  "--sf-nav",
  "--st-success-bg",
  "--st-warning-bg",
  "--st-critical-bg",
  "--st-info-bg",
  "--st-neutral-bg",
  "--st-uncertain-bg",
];

function ratioFor(
  tokens: ReadonlyMap<string, string>,
  foreground: string,
  background: string,
): number {
  const foregroundValue = tokens.get(foreground);
  const backgroundValue = tokens.get(background);

  expect(foregroundValue, `${foreground} is missing from the token file`).toBeDefined();
  expect(backgroundValue, `${background} is missing from the token file`).toBeDefined();

  return contrastRatio(foregroundValue ?? "#000000", backgroundValue ?? "#ffffff");
}

describe("semantic token contrast", () => {
  it("parses both themes out of the shipped token file", () => {
    expect(lightTokens.size).toBeGreaterThan(20);
    expect(darkOverrides.size).toBeGreaterThan(20);
    expect(lightTokens.get("--sf-card")).toBe("#ffffff");
    expect(darkTokens.get("--sf-card")).not.toBe(lightTokens.get("--sf-card"));
  });

  for (const theme of themes) {
    for (const [foreground, background] of textPairs) {
      it(`${theme.name}: ${foreground} on ${background} meets AA body text`, () => {
        const ratio = ratioFor(theme.tokens, foreground, background);
        expect(
          Number(ratio.toFixed(2)),
          `${foreground} on ${background} in ${theme.name} is ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(BODY_TEXT_MINIMUM);
      });
    }

    for (const [foreground, background] of uiComponentPairs) {
      it(`${theme.name}: ${foreground} on ${background} meets the component floor`, () => {
        const ratio = ratioFor(theme.tokens, foreground, background);
        expect(
          Number(ratio.toFixed(2)),
          `${foreground} on ${background} in ${theme.name} is ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(UI_COMPONENT_MINIMUM);
      });
    }

    for (const surface of focusRingSurfaces) {
      it(`${theme.name}: the focus ring stays visible on ${surface}`, () => {
        const ratio = ratioFor(theme.tokens, "--focus-color", surface);
        expect(
          Number(ratio.toFixed(2)),
          `the focus ring on ${surface} in ${theme.name} is ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(UI_COMPONENT_MINIMUM);
      });
    }
  }

  /**
   * The sweep above only measures what it can read, and it reads hex literals.
   * If `--focus-color` were pointed back at `--ac-primary`, the token would
   * vanish from the parsed map, the sweep would fail on a missing token rather
   * than on a ratio, and a tenant accent could move the ring again. This states
   * the rule directly so the failure names the actual mistake.
   */
  it("keeps the focus ring off the tenant-overridable accent", () => {
    for (const theme of themes) {
      const ring = theme.tokens.get("--focus-color");
      expect(ring, `${theme.name} must define --focus-color as its own value`).toMatch(
        /^#[0-9a-f]{6}$/u,
      );
    }

    expect(tokenSource).not.toContain("--focus-color: var(");

    const tenantOverrides = readFileSync(resolve("apps/web/src/app/globals.css"), "utf8");
    expect(tenantOverrides).not.toContain("--focus-color:");
  });

  it("keeps the link foreground off the primary action token", () => {
    // `--ac-primary` is a 3.20:1 foreground on the Dark card surface, so it can
    // carry a fill but never link or body text. The `Link` primitive uses
    // `--st-info-fg`, which is measured above against all three surfaces.
    const linkCss = readFileSync(resolve("packages/ui/src/components/link.module.css"), "utf8");
    const linkColor = /\.link\s*\{[^}]*?color:\s*var\((--[a-z0-9-]+)\)/u.exec(linkCss)?.[1];

    expect(linkColor).toBe("--st-info-fg");
  });
});
