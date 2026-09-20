import { describe, expect, it } from "vitest";

import {
  BOTTOM_SHEET_VIEWPORT_SHARE,
  PANEL_GAP,
  PANEL_MAX_BLOCK_SIZE,
  PANEL_MAX_VIEWPORT_SHARE,
  SIDE_ANCHOR_MIN_WIDTH,
  VIEWPORT_MARGIN,
  panelEndRoom,
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

  /**
   * PRD-006c D7, Wave 7r, and 006C-AC-013's reopened half.
   *
   * The room the page is given at its end while a step is open. The walkthrough can only ask the
   * page to scroll, so an element within the panel's own block size of the page's end cannot be
   * lifted clear of it. These are the numbers of that room at the four frames the brief names and
   * at the frame just below the bottom-sheet boundary, each built from the same block size the
   * scroll is built from.
   */
  it("asks the page for the room the panel can occupy at the viewport's end", () => {
    const sheet: Size = { height: 300, width: 390 };

    // Below the boundary the sheet is docked and capped at 40 percent of the viewport, which at
    // 844 is 337.6, so the cap rather than this measurement is what the room is built from.
    expect(panelEndRoom(sheet, MOBILE), "390x844").toBeCloseTo(
      MOBILE.height * BOTTOM_SHEET_VIEWPORT_SHARE + PANEL_GAP + VIEWPORT_MARGIN,
      5,
    );
    const justBelowTheBoundary = { height: 1024, width: SIDE_ANCHOR_MIN_WIDTH - 0.02 } as const;
    expect(panelEndRoom(sheet, justBelowTheBoundary), "767.98x1024").toBeCloseTo(
      justBelowTheBoundary.height * BOTTOM_SHEET_VIEWPORT_SHARE + PANEL_GAP + VIEWPORT_MARGIN,
      5,
    );

    // At and above it the panel is the wide-frame one, capped at min(28rem, 60vh).
    for (const viewport of [TABLET, EMBEDDED, DESKTOP]) {
      expect(panelEndRoom(sheet, viewport), `${String(viewport.width)}`).toBe(
        panelBlockSize(sheet, viewport) + PANEL_GAP + VIEWPORT_MARGIN,
      );
    }
    expect(panelEndRoom(sheet, DESKTOP), "1440x900").toBe(
      PANEL_MAX_BLOCK_SIZE + PANEL_GAP + VIEWPORT_MARGIN,
    );
  });

  /**
   * The room is at its full size before anything has been measured, and never narrows.
   *
   * The scroll runs on the commit that attaches a step, which is a commit on which the panel has
   * not been measured yet. Room that arrived small and grew afterwards would be room the scroll
   * could not use; room that arrived large and shrank would shorten the document, and the browser
   * would clamp the scroll back down and slide the control under the panel again.
   */
  it("asks for the same room measured or not, and never for less", () => {
    for (const viewport of [MOBILE, TABLET, EMBEDDED, DESKTOP]) {
      const unmeasured = panelEndRoom(undefined, viewport);
      for (const panel of [
        { height: 0, width: 384 },
        { height: 120, width: 384 },
        { height: 300, width: 384 },
      ] as const) {
        expect(
          panelEndRoom(panel, viewport),
          `${String(viewport.width)} with a panel of ${String(panel.height)}`,
        ).toBe(unmeasured);
      }
    }
  });

  /**
   * The room is enough for the scroll the model asks for, which is the whole reason it exists.
   *
   * The page starts at its maximum scroll with the last control at the end of it, above whatever
   * trailing space the page already has: the shell's own content padding, `--space-4` at the
   * mobile frame and `--space-6` above it. The room is what lets `resolveAnchorScroll`'s answer be
   * obeyed rather than clamped, so the assertion is that the answer fits inside it.
   *
   * The wide frames are in here because the browser put them there. Measured on 2026-09-20 at
   * 1180, on the campaign page's approve control: "the panel covers the field it is pointing at".
   * The element is wide, so the panel goes below it, and the page had no scroll left to give.
   */
  it("gives the last control on a page enough room to rise clear of the panel", () => {
    for (const { viewport, trailing } of [
      { viewport: MOBILE, trailing: 16 },
      { viewport: TABLET, trailing: 24 },
      { viewport: EMBEDDED, trailing: 24 },
      { viewport: DESKTOP, trailing: 24 },
    ]) {
      // Wide enough that the panel has to go below it rather than beside it at every frame.
      const control = rect(16, viewport.height - trailing - 48, viewport.width - 32, 48);
      for (const panel of [undefined, { height: 300, width: 384 } as Size]) {
        const where = `${String(viewport.width)} ${panel === undefined ? "unmeasured" : "measured"}`;
        const delta = resolveAnchorScroll(control, panel, viewport);
        const room = panelEndRoom(panel, viewport);
        expect(
          delta,
          `${where}: the last control is under the panel and has to rise`,
        ).toBeGreaterThan(0);
        expect(delta, `${where}: the scroll fits in the room`).toBeLessThanOrEqual(room);
      }
    }
  });

  /**
   * PRD-006c D7, "the panel never obscures the focused element or the shell's sticky header".
   *
   * The space an element has is between the shell's sticky topbar and the panel, not between the
   * top of the viewport and the panel. Measured on 2026-09-20 in the review browser run, once the
   * clearance check started asking whether a tap at the element's centre reaches it: "Dark
   * 1180x900 1. Welcome: a tap at the centre of the element does not reach it ... Received:
   * header.app-shell-module__topbar". The overview's quick actions are taller than that space, so
   * the scroll keeps their top, and the top had been going to the margin rather than below the
   * topbar.
   */
  it("keeps an element clear of the shell's sticky header, not only of the viewport edge", () => {
    const stickyHeader = 72;
    const withHeader = { ...EMBEDDED, blockStart: stickyHeader } as const;
    const ceiling = EMBEDDED.height - PANEL.height - PANEL_GAP - VIEWPORT_MARGIN;

    // Taller than the space between the header and the panel, so its top is what is kept.
    const tall = rect(96, 400, 1000, ceiling);
    expect(tall.height, "the case is an element taller than the space it has").toBeGreaterThan(
      ceiling - stickyHeader - VIEWPORT_MARGIN,
    );
    expect(tall.top - resolveAnchorScroll(tall, PANEL, withHeader)).toBe(
      stickyHeader + VIEWPORT_MARGIN,
    );

    // An element already above the header is pulled back below it rather than to the margin.
    const high = rect(96, 20, 1000, 64);
    expect(high.top - resolveAnchorScroll(high, PANEL, withHeader)).toBe(
      stickyHeader + VIEWPORT_MARGIN,
    );

    // With no header declared the arithmetic is what it was, which is what keeps every other case
    // here and every caller that does not know about a shell answering the same as before.
    expect(resolveAnchorScroll(tall, PANEL, EMBEDDED)).toBe(tall.top - VIEWPORT_MARGIN);
  });

  it("scrolls a wide-frame element above a panel that had to go below it", () => {
    const anchor = rect(96, 700, 1000, 64);
    const delta = resolveAnchorScroll(anchor, PANEL, EMBEDDED);
    expect(delta).toBeGreaterThan(0);
    const ceiling = EMBEDDED.height - PANEL.height - PANEL_GAP - VIEWPORT_MARGIN;
    expect(anchor.top + anchor.height - delta).toBeLessThanOrEqual(ceiling + 1);
  });
});
