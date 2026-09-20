/**
 * PRD-006c D7. Where the step panel goes, as arithmetic rather than as CSS luck.
 *
 * The first attempt at this let the `Sheet` primitive's own `inset-inline-start: 100%` place the
 * panel beside the anchored element. That works when the element is narrow and high on the page,
 * and puts the panel off the screen when it is not: a wide element pushes the panel past the right
 * edge, and a low one pushes it past the bottom. A control the user cannot reach is worse than a
 * panel in the wrong place, so placement is computed here, clamped to the viewport, and proven by
 * `panel-placement.unit.test.ts` at every frame the brief names.
 *
 * Nothing in this module touches the DOM. It takes two rectangles and a viewport and returns a
 * position, which is what makes the awkward cases cheap to assert.
 */

/** Wide frames anchor the panel to the element; below this it is a bottom sheet the CSS owns. */
export const SIDE_ANCHOR_MIN_WIDTH = 768;
/** The brief's `--space-3`, between the element and the panel. */
export const PANEL_GAP = 12;
/** The brief's 16 px side gutter, kept between the panel and every viewport edge. */
export const VIEWPORT_MARGIN = 16;
/** D7's cap on the bottom sheet, matched to the stylesheet so the two cannot drift. */
export const BOTTOM_SHEET_VIEWPORT_SHARE = 0.4;
/**
 * D7's cap on the wide-frame panel, `min(28rem, 60vh)`, matched to
 * `guided-setup.module.css` so the two cannot drift. 28rem at the product's 16px root is 448px.
 */
export const PANEL_MAX_BLOCK_SIZE = 448;
export const PANEL_MAX_VIEWPORT_SHARE = 0.6;

/**
 * The block size the panel is placed against.
 *
 * Not simply the measured height. The panel is measured after it renders, so on the render that
 * first places a step the measurement still belongs to the step before it, and a measurement that
 * is one render behind is always a measurement of something smaller than what is about to be
 * drawn. Clamping against it put the step-1 panel's footer controls below the fold at 1440, which
 * is the defect PRD-006d's reopened row 2 names: a walkthrough whose Continue control is off the
 * screen is a walkthrough nobody can finish.
 *
 * The stylesheet caps the panel, so the cap is a height the panel can never exceed and is
 * therefore always safe to place against. The measured height is used only when it is somehow
 * larger, which would mean the cap had not applied.
 */
export function panelBlockSize(panel: Size, viewport: Viewport): number {
  const cap = Math.min(PANEL_MAX_BLOCK_SIZE, viewport.height * PANEL_MAX_VIEWPORT_SHARE);
  return Math.max(panel.height, cap);
}

export type Rect = Readonly<{ top: number; left: number; width: number; height: number }>;
export type Size = Readonly<{ width: number; height: number }>;
export type Viewport = Readonly<{ width: number; height: number }>;

export type PanelPlacement = Readonly<{
  top: number;
  left: number;
  /** Which side of the element the panel ended up on, for the tests and for the attribute. */
  side: "inline-end" | "block-end";
}>;

/**
 * `undefined` means the stylesheet owns the position: either the frame is narrow, so the panel is
 * a bottom sheet, or nothing has been measured yet and the panel sits in its resting corner.
 */
export function resolvePanelPlacement(
  anchor: Rect | undefined,
  panel: Size | undefined,
  viewport: Viewport,
): PanelPlacement | undefined {
  if (anchor === undefined || panel === undefined) return undefined;
  if (viewport.width < SIDE_ANCHOR_MIN_WIDTH) return undefined;

  const beside = anchor.left + anchor.width + PANEL_GAP;
  const fitsBeside = beside + panel.width <= viewport.width - VIEWPORT_MARGIN;
  const side = fitsBeside ? "inline-end" : "block-end";
  const left = fitsBeside ? beside : anchor.left;
  const top = fitsBeside ? anchor.top : anchor.top + anchor.height + PANEL_GAP;
  const blockSize = panelBlockSize(panel, viewport);

  return {
    left: clamp(left, VIEWPORT_MARGIN, viewport.width - panel.width - VIEWPORT_MARGIN),
    side,
    top: clamp(top, VIEWPORT_MARGIN, viewport.height - blockSize - VIEWPORT_MARGIN),
  };
}

/**
 * How far the page must scroll for the anchored element to sit clear of the panel.
 *
 * On a wide frame with room beside the element, nothing moves: the panel is not in the way. In
 * every other case the panel is below the element or across the bottom of the screen, so the
 * element has to end up above it. When the element is taller than the space that leaves, its top
 * is what stays visible: something has to go, and the first field is worth more than the last.
 *
 * **This has to use the same block size `resolvePanelPlacement` clamps against, measured or not.**
 * The scroll runs once, when the step attaches, and the placement is computed on every render
 * afterwards. If the two disagree, the scroll leaves the element where the placement will not put
 * the panel, the clamp pulls the panel up past the element's end, and the panel covers the thing
 * it is pointing at. Measured on 2026-09-20 in the review run: at 1180 on the welcome step, whose
 * element is the overview's quick actions, the scroll used the bottom sheet's share because the
 * panel had not been measured yet while the clamp used the wide-frame cap, and
 * `guided-setup.accessibility.spec.ts` reported "the panel covers the field it is pointing at".
 * On a wide frame the cap is the answer whether or not a measurement exists, so an unmeasured
 * panel asks `panelBlockSize` for it rather than falling back to the mobile share.
 */
export function resolveAnchorScroll(
  anchor: Rect,
  panel: Size | undefined,
  viewport: Viewport,
): number {
  const placement = resolvePanelPlacement(anchor, panel, viewport);
  if (placement?.side === "inline-end") return 0;

  const panelHeight =
    viewport.width < SIDE_ANCHOR_MIN_WIDTH
      ? viewport.height * BOTTOM_SHEET_VIEWPORT_SHARE
      : panelBlockSize(panel ?? { height: 0, width: 0 }, viewport);
  const ceiling = viewport.height - panelHeight - PANEL_GAP - VIEWPORT_MARGIN;

  if (anchor.height > ceiling - VIEWPORT_MARGIN) return anchor.top - VIEWPORT_MARGIN;
  if (anchor.top < VIEWPORT_MARGIN) return anchor.top - VIEWPORT_MARGIN;
  return anchor.top + anchor.height > ceiling ? anchor.top + anchor.height - ceiling : 0;
}

function clamp(value: number, lowest: number, highest: number): number {
  if (highest < lowest) return lowest;
  return Math.min(Math.max(value, lowest), highest);
}
