# Onboarding Checklist

## Governing sections

Implements [Design Brief §7](../00-design-brief.md#7-mvp-capability-boundaries), [§15](../00-design-brief.md#15-operational-truth-and-safe-actions), [§16](../00-design-brief.md#16-data-freshness-and-missing-values), and [§18](../00-design-brief.md#18-accessibility-baseline).

## Canonical export

Feature code imports `OnboardingChecklist` from `@oalo/ui`. It presents server-verified readiness evidence, not browser-local completion.

## Item contract

Each item has a title, phase, state, evidence freshness, responsible role, plain-language blocker where relevant, and one next safe action. States are `not_started`, `in_progress`, `blocked`, `complete`, and `stale`. They use text and distinct glyphs in addition to status color. A completion claim is shown only after server-verified evidence.

The checklist contains exactly these phases and items:

1. Get Connected: Install and permissions; Brand and compliance; HighLevel routing; Meta connection; Team responsibilities.
2. Launch Readiness: Dependency recheck; Synthetic lead; Results review; Launch Ready.

Synthetic lead is visibly labeled as synthetic and is excluded from business metrics and production lead routing. `Launch Ready` cannot be manually checked complete. Blocked actions state the prerequisite, responsible role, and next safe action. AI may suggest content but cannot complete identity, license, lender, disclosure, consent, or compliance evidence.

## Interaction and responsive behavior

Items use buttons or disclosure controls, not drag-only ordering. Keyboard users can reach each item and its action in a predictable order. At 390px, each item remains one column with the status and next safe action visible before optional evidence; at larger widths, evidence may sit in a secondary column. Focus uses the shared ring, and progress or disclosure uses `--motion-base` with reduced-motion fallback.

Optional guidance is a separate dismissible region before the checklist. Dismissing it removes only the guidance region for the current rendered session. Both checklist phases, their ordered items, progress, and server-shaped evidence remain mounted and unchanged. This interaction does not claim cross-device dismissal persistence or browser authority over checklist completion.
