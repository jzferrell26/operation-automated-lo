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
| Frames | Centred at every frame, capped at `calc(100vh - var(--space-8))` with its own scroll. | Anchored beside (`inline-end`) or below (`block-end`) its `SheetAnchor` above 768px. At 768px and below it becomes a bottom sheet: fixed to the inline edges and the block end, up to `80vh`, with `env(safe-area-inset-bottom)` added to its end padding so it never covers the safe-area inset. |

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
