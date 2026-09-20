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
export type Viewport = Readonly<{
  width: number;
  height: number;
  /**
   * PRD-006c D7, "the panel never obscures the focused element or the shell's sticky header".
   *
   * The block-start space the shell's sticky topbar occupies, which the anchored element has to
   * end up below. It is optional and defaults to zero, because the arithmetic here is about a
   * viewport rather than about one product's shell, and every case that does not involve the
   * workspace chrome answers the same as before.
   *
   * Measured on 2026-09-20 in the review browser run, once Wave 7r asked whether a tap at the
   * centre of the anchored element reaches it: "Dark 1180x900 1. Welcome: a tap at the centre of
   * the element does not reach it ... Received: header.app-shell-module__topbar". The overview's
   * quick actions are taller than the space above the panel, so the scroll keeps their top rather
   * than their end, and with the floor at `VIEWPORT_MARGIN` that top went under the sticky
   * topbar, taking the first control inside it with it.
   */
  blockStart?: number;
}>;

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
      ? dockedSheetBlockSize(panel, viewport)
      : panelBlockSize(panel ?? { height: 0, width: 0 }, viewport);
  const ceiling = viewport.height - panelHeight - PANEL_GAP - VIEWPORT_MARGIN;
  /**
   * The lowest the element's top may go. The panel owns the end of the viewport and the shell's
   * sticky topbar owns the start of it, so the space the element has is between them. Before the
   * floor took the topbar into account, an element taller than that space had its top put at the
   * margin, which is underneath the topbar, and the first control inside it was unreachable.
   */
  const floor = (viewport.blockStart ?? 0) + VIEWPORT_MARGIN;

  if (anchor.height > ceiling - floor) return anchor.top - floor;
  if (anchor.top < floor) return anchor.top - floor;
  return anchor.top + anchor.height > ceiling ? anchor.top + anchor.height - ceiling : 0;
}

/**
 * The block size the docked bottom sheet is placed against, on the frames where the stylesheet
 * owns the placement.
 *
 * The same doctrine as `panelBlockSize`, for the same reason: the stylesheet caps the sheet at
 * `BOTTOM_SHEET_VIEWPORT_SHARE` of the viewport, so the cap is a height the sheet can never exceed
 * and is therefore always safe to place against, measured or not. A measurement is used only when
 * it is somehow larger, which would mean the cap had not applied.
 *
 * It is its own function so that the scroll above and the room below cannot answer with two
 * different numbers. Wave 7q recorded what that costs on the wide frames: the scroll left the
 * element where the placement would not put the panel, and the panel covered the thing it was
 * pointing at.
 */
export function dockedSheetBlockSize(panel: Size | undefined, viewport: Viewport): number {
  return Math.max(panel?.height ?? 0, viewport.height * BOTTOM_SHEET_VIEWPORT_SHARE);
}

/**
 * PRD-006c D7, Wave 7r. How much room the document needs at its end while a step is open, so that
 * `resolveAnchorScroll` can actually be obeyed.
 *
 * **The rule.** While a guided-setup step is open, the document gains room at its end equal to the
 * block size the panel is placed against at this frame, plus the gap and the margin the scroll's
 * own ceiling subtracts. It is exactly the space the panel can occupy at the viewport's block end,
 * reserved once, at the end of the page.
 *
 * **Why it is needed.** `resolveAnchorScroll` can only ask the page to scroll, and a page already
 * at its maximum scroll has nothing left to give. An element within this distance of the page's
 * end therefore cannot be lifted clear of the panel, however correct the arithmetic is. Measured
 * twice in the review browser run on 2026-09-20. Wave 7p, at 390: the pointer press on the create
 * screen's "Save and run the checks" resolved to the button, found it visible, enabled, and
 * stable, and was intercepted by the panel's footer inside `[data-guided-setup-layer]` on every
 * attempt, and "Light 390x844 6. Approve, or hand it to an approver" overlapped the approve
 * control. Wave 7r, at 1180, once the clearance assertion was put at every step rather than at two
 * of them: "Light 1180x900 6. Approve, or hand it to an approver: the panel covers the field it is
 * pointing at". The campaign page's approve control sits above a support block and the page's own
 * end padding, some 330px short of where the scroll wants it, and there was no scroll left to
 * give. The defect is not the mobile sheet; it is the end of a page, and it reaches every frame
 * where the panel has to go below the element rather than beside it.
 *
 * **Why it is not narrowed to the frames below `SIDE_ANCHOR_MIN_WIDTH`.** That was the first shape
 * of this fix and the browser refused it, in the sentence quoted above. Narrowing it instead to
 * the placements whose side is `block-end` would make the room depend on the anchored element,
 * which changes on every scroll event the step listens to, and the room has to be in place before
 * the scroll runs rather than one commit behind it. A number that depends only on the frame and
 * the panel is knowable on the first render of a step and cannot drift; the cost is end padding on
 * a page whose panel happened to fit beside its element, for as long as one step is open.
 *
 * **Why the gap and the margin are in it.** The ceiling the scroll aims for is
 * `viewport.height - panel - PANEL_GAP - VIEWPORT_MARGIN`, so room that covered only the panel
 * would still leave the last control those two apart from clear. With them included, the room is
 * the whole distance between where the last control can already reach and where the scroll wants
 * it, less whatever trailing space the page already has, which is the invariant
 * `panel-placement.unit.test.ts` asserts.
 *
 * **Why it does not shrink.** Both branches answer the stylesheet's cap whether or not the panel
 * has been measured, so the room is at full size from the first render of a step. Room that
 * narrowed once the panel was measured would shorten the document, the browser would clamp the
 * scroll back down, and the control would slide under the panel again after the scroll had already
 * cleared it.
 *
 * Nothing here counts the sticky footer twice: the footer is inside the panel and is part of the
 * block size this measures, and the room is added once, at the end of the document.
 */
export function panelEndRoom(panel: Size | undefined, viewport: Viewport): number {
  const blockSize =
    viewport.width < SIDE_ANCHOR_MIN_WIDTH
      ? dockedSheetBlockSize(panel, viewport)
      : panelBlockSize(panel ?? { height: 0, width: 0 }, viewport);
  return blockSize + PANEL_GAP + VIEWPORT_MARGIN;
}

function clamp(value: number, lowest: number, highest: number): number {
  if (highest < lowest) return lowest;
  return Math.min(Math.max(value, lowest), highest);
}
