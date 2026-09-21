# Sheet and Dialog

## Governing sections

Implements [Design Brief §8](../00-design-brief.md#8-surface-metaphor-and-depth),
[§11](../00-design-brief.md#11-radius-spacing-and-iconography),
[§12](../00-design-brief.md#12-motion),
[§14](../00-design-brief.md#14-responsive-and-embedded-behavior), and
[§18](../00-design-brief.md#18-accessibility-baseline), in particular
"Provide keyboard and screen-reader behavior for ... dialogs, drawers".

## Canonical exports

Feature code imports `Dialog`, `Sheet`, and `SheetAnchor` from `@oalo/ui`. It
does not build a layer out of a positioned `<div>` and it does not repeat a focus
trap. Both layers are one implementation, so their focus behaviour cannot drift.

```tsx
<Dialog
  open={open}
  onClose={close}
  size="sm"
  urgent
  title="Pause this campaign"
  description="Campaign version 3, Open House Boost."
  footer={<><Button onClick={confirm}>Confirm pause</Button><Button variant="secondary" onClick={close}>Cancel</Button></>}
>
  <p>Pausing stops new sends. Delivery already in flight is not recalled.</p>
</Dialog>

<SheetAnchor>
  <Button onClick={open}>HighLevel routing</Button>
  <Sheet open={open} onClose={close} anchor="block-end" title="HighLevel routing">
    …
  </Sheet>
</SheetAnchor>
```

## Which layer

| | `Dialog` | `Sheet` |
| --- | --- | --- |
| Modality | Modal. `aria-modal="true"`. | Non-modal. No `aria-modal`. |
| The page behind | Unreachable. Tab cycles inside the panel. Background scroll is locked. A scrim at `--sf-overlay` covers the canvas. | Fully operable. Tab leaves the panel normally. Scroll is not locked. No scrim. |
| Use for | A consequential confirmation, a decision that must be made before anything else, a destructive action. `urgent` switches the role to `alertdialog`. | The guided-setup panel anchored to the control it explains, and any side panel that annotates the work rather than blocking it. |
| Surface | `--sf-card` on `--bd-hairline` at `--radius-panel` with `--shadow-raised`, `padding: var(--space-6)`, `inline-size: min(100%, 44rem)`, or `min(100%, 28rem)` at `size="sm"`. | The same surface at `padding: var(--space-5)` and `inline-size: min(100vw - var(--space-8), 24rem)`. |
| Frames | Centred at every frame, capped at `calc(100vh - var(--space-8))` with its own scroll, unless `placement="inline-start"` puts it against the inline-start edge (see below). | Anchored beside (`inline-end`) or below (`block-end`) its `SheetAnchor` at 768px and above. Below 768px it becomes a bottom sheet: fixed to the inline edges and the block end, up to `80vh`, with `env(safe-area-inset-bottom)` added to its end padding so it never covers the safe-area inset. |

## `placement`, and the navigation drawer

`Dialog` takes `placement`, either `center` (the default, the confirmation
surface the table describes) or `inline-start`.

`inline-start` is the drawer: the identical modal contract, laid out against the
inline-start edge and filling the block axis rather than floating as a centred
card. The scrim sets `align-items: stretch`, `justify-content: flex-start`, and
no padding; the panel's own surface, radius, and inline size are the calling
screen's to override, because a drawer carries the navigation surface
(`--sf-nav` and `--tx-on-nav`, per
[application shell and navigation](application-shell-and-navigation.md)) rather
than the card surface.

It exists for one reason. PRD-006d D4 line 88 names "the drawer's trap in
`app-shell.tsx`" as behaviour `Dialog` was to generalise, and 006D-AC-003
forbids a hand-built dialog on any screen. A drawer that had to keep its own
trap in order to keep its own shape would have generalised nothing, so the
shape is a variant of the primitive and the trap is the primitive's.

The application shell is the only caller. Its wrapper carries the frame gate:
the drawer is the mobile frame's rail, so it is `display: none` above 767.98px
and `display: contents` at and below it, which is also what keeps a layer opened
at 390 from reappearing over a tablet layout after a resize.

## The bottom-sheet boundary is 767.98px

`Sheet`'s mobile rule and the guided setup's 40vh cap both break at 767.98px,
not at 768px. 768 is the tablet frame design brief section 14 names, and
`apps/web/src/features/guided-setup/model/panel-placement.ts` treats it as wide:
`SIDE_ANCHOR_MIN_WIDTH` is 768 and the mobile branch is `viewport.width < 768`.
With `max-width: 768px` the stylesheet and the arithmetic disagreed at exactly
the tablet frame, which drew a bottom sheet while the model anchored the panel
beside the element it points at. `app-shell.module.css` already drew its mobile
boundary at 767.98px for the same reason.

## An open panel gives the page room at its end

Design brief section 14: "Sticky actions never cover fields, errors, or safe-area
insets." The guided setup's placement model can only ask the page to scroll, and
a page already at its maximum scroll has nothing left to give, so an element
within the panel's own block size of the page's end cannot rise clear of it.
Measured twice in the review browser run on 2026-09-20: at 390 the create
screen's "Save and run the checks" sat under the docked sheet and a tap there
reached the sheet's footer, and at 1180 the campaign page's approve control was
covered by the panel that had to go below it.

The rule, added 2026-09-20: while a guided-setup step is open, the document gains
room at its end equal to the block size the panel is placed against at that
frame, plus the gap and the viewport margin the scroll's own ceiling subtracts.
It applies at every frame, because the defect is the end of a page rather than
the mobile sheet.

- The number is `panelEndRoom` in
  `apps/web/src/features/guided-setup/model/panel-placement.ts`, computed from
  the same block size the scroll is computed from, so the two cannot drift. It
  depends only on the frame and the panel, never on the anchored element, so it
  is knowable on the first render of a step, which is the render the scroll runs
  on.
- It crosses to the layout as the custom property `--guided-setup-panel-room`
  on the document element, published by `guided-setup-step.tsx` while a step is
  open and removed on cleanup. `app-shell.module.css` adds it to the main
  landmark's end padding at both its frames.
- With no step open the property is absent, the stylesheet's `var()` falls back
  to `0px`, and nothing moves. The room never narrows while a step is open,
  because a document that shortened would let the browser clamp the scroll back
  down and slide the control under the panel again.
- The sticky footer is inside the panel and is part of the block size this
  measures, so the room is not added twice.

## The footer stays visible

A sheet is capped in the block axis and scrolls inside itself. Its footer is
`position: sticky` at the end of that scroll box, carrying the panel surface, so
a panel with more content than cap never scrolls its own Continue control out of
sight. PRD-006c D7 states the behaviour; before 2026-09-20 nothing implemented
it.

A sticky footer that keeps itself on screen will sit on whatever the browser
scrolls to the end of that box, so the sheet also carries
`scroll-padding-block-end: calc(var(--target-min-size) * 2 + var(--space-3))`.
Tab to a control in the panel's body that is past the end of the box and the
browser scrolls it into view at the nearest edge, which is the end, which is
where the footer is pinned. Measured on 2026-09-20 in the review run at Light
1180x900, guided setup step 2 "Your details": the NMLS field's 44px box sat
entirely under the footer's 56px box, ring and all, which is a WCAG 2.2 SC
2.4.11 failure and rubric axis 7's own sentence, "a sticky surface never covers
a field, an error, or a focus ring". The scroll padding is the scroll box's
answer: the last stretch of the box is spoken for and a scroll into view stops
above it. Its value is the footer's own two ingredients, a control row and the
space above it, plus one control row more, because the footer is
`flex-wrap: wrap` and a footer whose controls have wrapped is twice as tall.

`Dialog` generalises the `alertdialog` that `SafeAction` renders inline for a
confirmation, and the drawer trap in the application shell. A new screen uses
`Dialog`; `SafeAction` keeps its own inline confirmation because its confirmation
copy is part of the safe-action contract.

## The focus contract

Identical for both layers except where the table above says otherwise.

1. On open, focus moves to the first focusable element inside the panel.
2. Escape closes the layer. The handler is on the document, so Escape works
   wherever focus sits inside the layer.
3. On close, focus returns to the element that was focused when the layer opened.
4. In a modal layer, Tab and Shift Tab wrap at the ends of the panel. The wrap is
   decided by `resolveTabTarget`, a pure function with its own test, so the rule
   can be read and checked without a browser.
5. **Nothing on the page is ever marked `aria-hidden`.** A modal layer relies on
   `aria-modal` plus the trap. This is not a shortcut: it is the reason no
   `aria-hidden` can survive a close, which is what the PRD-006d security note
   requires. A test reads the source and fails if `aria-hidden` or
   `setAttribute` ever appears in it.
6. Background scroll is locked for a modal layer only, and the previous
   `overflow` value is restored on close rather than being cleared.

## Naming, states, and motion

- Every layer has a `title`, rendered as an `<h2>` at `--text-section-size` and
  `--weight-bold`, referenced by `aria-labelledby`.
- A `description` is rendered at `--text-body-size` in `--tx-body` and referenced
  by `aria-describedby`. `aria-describedby` is absent when there is no
  description, rather than pointing at an empty element.
- Every layer has a close control: the product `IconButton` with the accessible
  name `Close`, overridable through `closeLabel`.
- A closed layer renders nothing, so nothing hidden is left in the tree.
- The panel transitions opacity only, over `--motion-slow` with
  `--ease-standard`, which is the brief's bucket for drawers and modals. Reduced
  motion sets it to 0ms. There is no spatial transition, so there is nothing to
  convert.

## Tests

`packages/ui/src/components/overlay-and-feedback.test.tsx`: the tab-wrap policy
including both ends and the empty case; the source-level guarantee about
`aria-hidden`; closed renders nothing; the modal role, `aria-modal`, name,
description, and close control; `alertdialog` with `urgent`; the compact panel;
the footer; and the sheet's non-modal role, absent `aria-modal`, and both
anchors.

## Reference canvases

`Launch.dc.html` and `Preflight.dc.html` for the confirmation surface. No canvas
covers the guided-setup sheet; it follows this specification and reads as a
sibling of the `Onboarding.dc.html` panels.
