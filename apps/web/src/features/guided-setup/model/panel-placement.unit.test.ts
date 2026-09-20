import { describe, expect, it } from "vitest";

import {
  BOTTOM_SHEET_VIEWPORT_SHARE,
  PANEL_GAP,
  PANEL_MAX_BLOCK_SIZE,
  PANEL_MAX_VIEWPORT_SHARE,
  VIEWPORT_MARGIN,
  panelBlockSize,
  resolveAnchorScroll,
  resolvePanelPlacement,
  type Rect,
  type Size,
} from "./panel-placement.js";

/**
 * PRD-006c D7, at the brief's four frames.
 *
 * Every case here is one the browser found or could find. The panel that landed past the right
 * edge, the panel that landed below the fold, and the bottom sheet that covered the field it was
 * pointing at are all the same defect from a user's side: the control they were told to use is not
 * on the screen. Proving the arithmetic costs milliseconds; proving it in a browser costs minutes.
 */

const DESKTOP = { height: 900, width: 1440 } as const;
const EMBEDDED = { height: 900, width: 1180 } as const;
const TABLET = { height: 1024, width: 768 } as const;
const MOBILE = { height: 844, width: 390 } as const;

const PANEL: Size = { height: 420, width: 384 };

function rect(left: number, top: number, width: number, height: number): Rect {
  return { height, left, top, width };
}

describe("panel placement", () => {
  it("sits beside a narrow element when there is room for it", () => {
    const anchor = rect(120, 200, 320, 64);
    const placement = resolvePanelPlacement(anchor, PANEL, DESKTOP);
    expect(placement?.side).toBe("inline-end");
    expect(placement?.left).toBe(anchor.left + anchor.width + PANEL_GAP);
    expect(placement?.top).toBe(anchor.top);
  });

  it("drops below a wide element rather than off the right edge", () => {
    // The overview's quick actions span nearly the whole content column, which is the case that
    // pushed the panel off the screen before placement was computed here.
    const anchor = rect(96, 240, 1000, 64);
    const placement = resolvePanelPlacement(anchor, PANEL, EMBEDDED);
    expect(placement?.side).toBe("block-end");
    expect(placement?.top).toBe(anchor.top + anchor.height + PANEL_GAP);
    expect(placement?.left).toBe(anchor.left);
  });

  it("never leaves the panel past any viewport edge", () => {
    for (const viewport of [DESKTOP, EMBEDDED, TABLET]) {
      for (const anchor of [
        rect(0, 0, 40, 40),
        rect(viewport.width - 60, 40, 40, 40),
        rect(40, viewport.height - 60, 300, 40),
        rect(40, viewport.height - 60, viewport.width - 80, 400),
      ]) {
        const placement = resolvePanelPlacement(anchor, PANEL, viewport);
        expect(placement).toBeDefined();
        expect(placement?.left, `${String(viewport.width)} left`).toBeGreaterThanOrEqual(
          VIEWPORT_MARGIN,
        );
        expect(placement?.top, `${String(viewport.width)} top`).toBeGreaterThanOrEqual(
          VIEWPORT_MARGIN,
        );
        expect(
          (placement?.left ?? 0) + PANEL.width,
          `${String(viewport.width)} right`,
        ).toBeLessThanOrEqual(viewport.width - VIEWPORT_MARGIN);
        expect(
          (placement?.top ?? 0) + PANEL.height,
          `${String(viewport.width)} bottom`,
        ).toBeLessThanOrEqual(viewport.height - VIEWPORT_MARGIN);
      }
    }
  });

  /**
   * PRD-006d's reopened row 2. The step-1 panel's footer controls were below the fold at 1440.
   *
   * The panel is measured after it renders, so the render that first places a step is placed
   * against the previous step's measurement, and that measurement is always of something smaller
   * than what is about to be drawn. Clamping against it let the panel start low enough that its
   * own capped height ran past the end of the viewport, taking Continue and "Not now" with it.
   *
   * These two cases are the arithmetic of that. The stale one is the regression; the honest one
   * proves the fix did not simply push every panel to the top of the screen.
   */
  it("keeps a panel on screen when the measurement is a render behind", () => {
    const stale: Size = { height: 120, width: 384 };
    const anchor = rect(120, 760, 320, 64);
    const placement = resolvePanelPlacement(anchor, stale, DESKTOP);
    expect(placement?.side).toBe("inline-end");
    expect(
      (placement?.top ?? 0) + panelBlockSize(stale, DESKTOP),
      "the panel the browser will actually draw ends inside the viewport",
    ).toBeLessThanOrEqual(DESKTOP.height - VIEWPORT_MARGIN);
  });

  it("still follows a high element down the page", () => {
    const anchor = rect(120, 200, 320, 64);
    expect(resolvePanelPlacement(anchor, PANEL, DESKTOP)?.top).toBe(anchor.top);
  });

  it("places against the stylesheet's cap, never against a smaller measurement", () => {
    expect(panelBlockSize({ height: 120, width: 384 }, DESKTOP)).toBe(
      Math.min(PANEL_MAX_BLOCK_SIZE, DESKTOP.height * PANEL_MAX_VIEWPORT_SHARE),
    );
    // A short viewport caps by share rather than by the absolute value.
    expect(panelBlockSize({ height: 120, width: 384 }, { height: 600, width: 1440 })).toBe(360);
    // A panel the cap somehow did not reach is still placed against what it measures.
    expect(panelBlockSize({ height: 700, width: 384 }, DESKTOP)).toBe(700);
  });

  /**
   * The scroll and the clamp have to answer with the same block size, measured or not.
   *
   * The scroll runs once, when a step attaches; the placement is computed on every render after
   * it. When the two disagreed the scroll left the element where the placement would not put the
   * panel, the clamp pulled the panel up past the element's end, and the panel covered the thing
   * it was pointing at. Measured in the review run on 2026-09-20 at 1180 on the welcome step,
   * whose element is the overview's quick actions, and reported by
   * `guided-setup.accessibility.spec.ts` as "the panel covers the field it is pointing at". The
   * case is an unmeasured panel on a wide frame, which is the state every step attaches in.
   */
  it("scrolls an element clear of where the panel will actually land, measured or not", () => {
    // Low enough that the panel has to go below it and the clamp has something to do.
    const anchor = rect(96, 520, 1000, 180);

    for (const panel of [undefined, PANEL, { height: 120, width: 384 } as Size]) {
      for (const viewport of [DESKTOP, EMBEDDED, TABLET]) {
        const delta = resolveAnchorScroll(anchor, panel, viewport);
        const scrolled = rect(anchor.left, anchor.top - delta, anchor.width, anchor.height);
        const placement = resolvePanelPlacement(
          scrolled,
          panel ?? { height: 0, width: 384 },
          viewport,
        );
        expect(placement?.side, `${String(viewport.width)} side`).toBe("block-end");
        expect(
          placement?.top,
          `${String(viewport.width)} with ${panel === undefined ? "no" : "a"} measurement: the panel starts below the element`,
        ).toBeGreaterThanOrEqual(scrolled.top + scrolled.height);
      }
    }
  });

  it("leaves the mobile frame to the stylesheet's bottom sheet", () => {
    expect(resolvePanelPlacement(rect(16, 200, 358, 64), PANEL, MOBILE)).toBeUndefined();
  });

  it("places nothing until both rectangles are known", () => {
    expect(resolvePanelPlacement(undefined, PANEL, DESKTOP)).toBeUndefined();
    expect(resolvePanelPlacement(rect(0, 0, 10, 10), undefined, DESKTOP)).toBeUndefined();
  });

  it("does not scroll the page when the panel sits beside the element", () => {
    expect(resolveAnchorScroll(rect(120, 200, 320, 64), PANEL, DESKTOP)).toBe(0);
  });

  it("scrolls a mobile field clear of the bottom sheet", () => {
    const sheetTop = MOBILE.height * (1 - BOTTOM_SHEET_VIEWPORT_SHARE);
    const anchor = rect(16, sheetTop - 10, 358, 120);
    const delta = resolveAnchorScroll(anchor, PANEL, MOBILE);
    expect(delta).toBeGreaterThan(0);
    const moved = anchor.top + anchor.height - delta;
    expect(moved).toBeLessThanOrEqual(sheetTop - PANEL_GAP - VIEWPORT_MARGIN + 1);
  });

  it("keeps the top of a field that is taller than the space above the sheet", () => {
    const anchor = rect(16, 300, 358, 700);
    const delta = resolveAnchorScroll(anchor, PANEL, MOBILE);
    expect(anchor.top - delta).toBe(VIEWPORT_MARGIN);
  });

  it("pulls an element that is above the viewport back into it", () => {
    expect(resolveAnchorScroll(rect(16, -120, 358, 64), PANEL, MOBILE)).toBe(
      -120 - VIEWPORT_MARGIN,
    );
  });

  it("scrolls a wide-frame element above a panel that had to go below it", () => {
    const anchor = rect(96, 700, 1000, 64);
    const delta = resolveAnchorScroll(anchor, PANEL, EMBEDDED);
    expect(delta).toBeGreaterThan(0);
    const ceiling = EMBEDDED.height - PANEL.height - PANEL_GAP - VIEWPORT_MARGIN;
    expect(anchor.top + anchor.height - delta).toBeLessThanOrEqual(ceiling + 1);
  });
});
