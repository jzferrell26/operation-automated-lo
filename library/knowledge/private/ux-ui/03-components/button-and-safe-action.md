# Button and Safe Action

## Governing sections

This component implements [Design Brief §12](../00-design-brief.md#12-motion), [§15](../00-design-brief.md#15-operational-truth-and-safe-actions), and [§18](../00-design-brief.md#18-accessibility-baseline).

## Canonical exports

Feature code imports `Button` and `SafeAction` from `@oalo/ui`. It does not consume a raw button primitive.

`Button` variants are `primary`, `secondary`, `outline`, and `ghost`; sizes are `sm`, `md`, and `lg`. They use the semantic surface, text, border, action, radius, shadow, focus, and motion tokens in `01-master-tokens.css`, with `.ui-interactive` and `.ui-focusable`. `primary` is the only routine decisive action. `secondary` supports a paired action; `outline` and `ghost` are low-emphasis actions.

Controls have a visible label, at least a 44 by 44px target on mobile, and a 2px focus ring with 3px offset. Loading retains the label for assistive technology, prevents duplicate submission, and announces progress without changing the action's meaning. Disabled controls retain the reason in adjacent text, not only a tooltip.

## SafeAction contract

`SafeAction` wraps a consequential `Button` with the operational precondition and confirmation pattern. It accepts a safe-action label, explanation, required role or permission, current state, and `onConfirm` action.

| State | Rendering and allowed next action |
| --- | --- |
| `ready` | Enabled action. Confirmation is required for pause, resume, publish, disconnect, or other material change. |
| `blocked` | Disabled action plus prerequisite, responsible role, and next safe action. |
| `permission_restricted` | Disabled action names the required role and offers a non-mutating path, such as asking an Owner or Compliance Approver. |
| `uncertain_reconciling` | Blocks another provider write, shows read-back in progress and the correlation ID, and exposes no retry until a terminal result. |
| `loading` | Shows progress and prevents duplicate invocation. |
| `error` | Preserves the last safe state and provides retry only when retry is safe. |

Confirmation copy identifies the concrete effect, scope, and irreversible or uncertain result. Pause and resume always confirm. Material edits create a new campaign version and state that affected approvals will be invalidated. Prohibited actions remain absent, not merely disabled.

## Motion and accessibility

Hover, press, and toggle feedback use `--motion-fast` and `--ease-standard`; confirmation overlays use `--motion-slow`. Reduced motion is immediate or opacity-only. Keyboard activation uses Enter and Space, focus returns to the trigger after a cancelled confirmation, and focus is not obscured by sticky actions.
