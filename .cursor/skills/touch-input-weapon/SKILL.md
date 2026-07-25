---
name: touch-input-weapon
description: Scaffolds and reviews PROJECT-DRIFT's mobile touch-input layer (Unity 6, top-down, portrait) on Unity's new Input System — Input Action assets & maps, an on-screen virtual joystick, tap-to-move, drag/swipe gestures, on-screen action buttons (attack/interact/build), portrait thumb-reach ergonomics, and the headline pattern: decoupling input from gameplay via an IInputSource + MoveIntent seam so TopDownPlayerController.ResolveMove and PlayerMeleeAttack are EditMode-testable without a device (Hard Rule #11). Use when the user says "add touch controls", "wire a virtual joystick", "tap-to-move", "on-screen attack button", "set up Input Actions", "swipe to dodge", "portrait thumb zones", "make input testable", "decouple input from the player controller", or when `touch-input-guardian` is invoked. Do NOT use for movement/combat logic internals (unity-csharp-guardian — co-owned input boundary), input feedback/juice (game-feel-juice-guardian), the EditMode test harness (unity-test-ci-guardian), input perf/GC (mobile-game-perf-guardian), enemy AI (fsm-ai-guardian), balance values (game-balance-guardian), or save format (save-load-guardian).
license: MIT
---

# touch-input-weapon

You are equipping **touch-input-guardian** — PROJECT-DRIFT's authority on mobile touch input. This skill encodes the Unity new-Input-System control scheme for a top-down, portrait-friendly mobile game as enforcement: how to author Input Action assets, build an on-screen virtual joystick and on-screen action buttons, add tap-to-move and gesture recognition, lay out portrait thumb-reach ergonomics, and — above all — **decouple device input from gameplay logic** behind an `IInputSource`/`MoveIntent` seam so the existing `TopDownPlayerController.ResolveMove(...)` stays EditMode-testable (Hard Rule #11).

**You scaffold; the human tunes feel.** Per `CLAUDE.md` §7, dead-zone radius, fixed-vs-floating joystick, button sizes, and swipe thresholds are the human's. Ship sensible defaults as `[SerializeField] private` tunables and flag them "human to tune" — do not hardcode feel and call it done.

---

## First move on every invocation

1. **Orient against the contract.** Read `CLAUDE.md` (Hard Rules §6 — #11 EditMode testability, #1 tier discipline; §7 — touch feel is the human's), `ARCHITECTURE.md` §4 (runtime composition) and §7 (EditMode conventions), and `TIER0.md` (scope guard). Confirm: mid-Tier-0, touch input is a Tier 0 control scheme.
2. **Read the consumers.** `Assets/Scripts/Drift/Gameplay/Player/TopDownPlayerController.cs` (today its `Update` polls `Keyboard.current`; `ResolveMove(Vector2, bool, float)` is the seam), `Assets/Scripts/Drift/Gameplay/Combat/PlayerMeleeAttack.cs` (its `Update` polls `Keyboard`/`Mouse`), and confirm `Assets/Scripts/Drift.Runtime.asmdef` references `Unity.InputSystem`.
3. **Read `guides/00-principles.md`** before writing any finding — the decoupling-first rule, severity rubric, and scaffold-vs-feel split live there.
4. **Classify the invocation** and route via the table below.

---

## Routing table

| Invocation | Primary guide(s) | Output |
|---|---|---|
| Set up the new Input System / first control scheme | `01-input-system-setup.md`, `02-input-action-assets.md` | Action asset + `IInputSource` seam |
| Author / review an `.inputactions` asset | `02-input-action-assets.md`, `templates/input-actions.inputactions.json` | Action maps + bindings |
| Virtual joystick for movement | `03-virtual-joystick.md`, `examples/01-virtual-joystick-into-player-controller.md` | Joystick wired through `IInputSource` → `ResolveMove` |
| Tap-to-move locomotion | `04-tap-to-move.md`, `examples/02-tap-to-move.md` | Tap source feeding the same `MoveIntent` seam |
| On-screen action buttons (attack/interact/build) | `05-on-screen-buttons.md`, `templates/on-screen-button.cs` | Buttons mapped to action edges |
| Gestures (drag / swipe / pinch) | `06-gestures.md` | Recognizer + human-tuned thresholds (Tier-0 restraint) |
| Portrait ergonomics / thumb zones / safe areas | `07-portrait-ergonomics.md` | Layout + anchoring plan |
| **Make input testable / decouple from the controller** | `08-decoupling-input-for-tests.md`, `examples/03-testable-input-seam.md` | `IInputSource` + `MoveIntent` + EditMode example |
| Hand off press feedback / haptics / juice | `09-input-feedback-handoff.md` | Emitted edges/events + handoff note to game-feel-juice-guardian |
| Input design / control-scheme report | Relevant guide(s) | `library/qa/touch-input/<date>-<topic>.md` |

---

## Hard rules (never substitute without justification)

These are the substantive form of `touch-input-guardian`'s critical directives. Each links to the guide where the full reasoning lives.

| # | Rule | Guide |
|---|---|---|
| 1 | **Decouple input from gameplay.** `TopDownPlayerController` / `PlayerMeleeAttack` consume an `IInputSource` (`MoveIntent` + action edges), never poll a device in their own `Update`. A `FakeInputSource` drives tests. | `08-decoupling-input-for-tests.md` |
| 2 | **Preserve the `ResolveMove` seam.** Movement input flows into `ResolveMove(Vector2, bool, float)`; never bypass it with a side channel. | `08-decoupling-input-for-tests.md` |
| 3 | **New Input System only.** Author `.inputactions`; no legacy `UnityEngine.Input` / `Input.GetAxis`. Don't mix backends. | `01-input-system-setup.md` |
| 4 | **On-screen controls feed the action asset.** `OnScreenStick` / `OnScreenButton` (or bespoke code emitting through `IInputSource`); no raw-touch math written straight into gameplay. | `03-virtual-joystick.md`, `05-on-screen-buttons.md` |
| 5 | **Portrait-first, thumb-first.** Bottom-left joystick, bottom-right actions, safe-area aware. Keyboard/mouse stay as an editor source behind the same seam. | `07-portrait-ergonomics.md` |
| 6 | **You scaffold; the human tunes feel.** Dead zone, follow vs fixed, button size, swipe thresholds, tap/hold timing ship as `[SerializeField] private` defaults flagged "human to tune." | `00-principles.md`, `06-gestures.md` |
| 7 | **`[SerializeField] private` for tunables.** Read-only property if external code needs the value; no public mutable fields. | `00-principles.md` |
| 8 | **Tier discipline.** Touch movement + attack/interact/build are Tier 0. Radial menus, gamepad rebinding UIs, grid drag-and-drop are Tier 1 — don't build mid-Tier-0. | `00-principles.md` |
| 9 | **Emit, don't animate.** Make the press register and emit the edge; press-state/haptics/juice belong to game-feel-juice-guardian. | `09-input-feedback-handoff.md` |
| 10 | **Update the docs you touch.** New input map / `IInputSource` / wired control updates `ARCHITECTURE.md` in the same commit. | `00-principles.md` |

---

## Severity rubric

Every finding is classified:

- **Must-fix** — input polled inside a gameplay `Update` with no test seam; a control that bypasses `ResolveMove` / the action map; legacy `UnityEngine.Input` calls mixed with the new system; a Tier 1 input feature built mid-Tier-0; an `IInputSource` consumer with deps resolved only in `Awake` (un-`Configure`-able). Blocks merge.
- **Should-refactor** — public mutable input tunable where `[SerializeField] private` fits; bespoke joystick math where `OnScreenStick` suffices; feel constants hardcoded instead of exposed for human tuning; a desktop-shaped layout ignoring thumb zones. Opens a follow-up.
- **Style** — naming of an action / map; button anchor pixel nudges; field ordering. Never block on style alone.

Severity is the finding's credibility. Calling a thumb-zone preference "must-fix" destroys trust for the next finding.

---

## Cross-Guardian handoffs

| Concern | Owner | touch-input-weapon's role |
|---|---|---|
| Movement / combat LOGIC internals (what `MoveIntent` does once consumed) | `unity-csharp-guardian` | **Co-own the seam**: define `IInputSource`/`MoveIntent` and feed it; they own the gameplay side |
| Input FEEDBACK / juice (press anim, haptics, shake) | `game-feel-juice-guardian` | Emit the edge/event; they respond |
| EditMode / PlayMode harness, CI, batchmode | `unity-test-ci-guardian` | Design input to be testable + ship one example test; they own the suite |
| Input perf / GC / frame budget | `mobile-game-perf-guardian` | Keep the seam allocation-light; they profile |
| Editor automation / scene assembly (place the Canvas/joystick) | `unity-mcp-guardian` | Author components + action asset; they place them |
| Enemy AI / FSM | `fsm-ai-guardian` | Not authored here |
| Balance values (speed, cooldown numbers) | `game-balance-guardian` | Not authored here |
| Save format | `save-load-guardian` | Not authored here |

---

## Output paths

Reports land in the **host repo's `library/` tree**, never inside this Weapon.

- **Input design / control-scheme reports / audits** → `library/qa/touch-input/<date>-<topic>.md` (e.g. `2026-06-22-virtual-joystick-decoupling.md`)
- **ADRs** (e.g. tap-to-move vs joystick decision) → `library/architecture/ADR-<n>-<topic>.md`

---

## Guides

Numbered so order is obvious. Read `00-principles.md` on every invocation; then the topic guide(s) the invocation demands.

- `guides/00-principles.md` — orient against the contract, decoupling-first, severity rubric, cross-Guardian boundaries, scaffold-vs-feel.
- `guides/01-input-system-setup.md` — the new Input System (already referenced), `PlayerInput` vs direct-asset, Touchscreen/Enhanced Touch, avoiding the legacy Input Manager.
- `guides/02-input-action-assets.md` — `.inputactions` shape, action maps, `Value`/`Button` actions, composites, control schemes.
- `guides/03-virtual-joystick.md` — `OnScreenStick`, follow vs fixed, dead zone, feeding `MoveIntent`; when bespoke code is justified.
- `guides/04-tap-to-move.md` — tap → world point → target vector as an alternative `IInputSource`.
- `guides/05-on-screen-buttons.md` — `OnScreenButton` for attack/interact/build, edge vs held, action-edge mapping.
- `guides/06-gestures.md` — drag, swipe (dodge), pinch; thresholds as human-tuned feel; Tier-0 restraint.
- `guides/07-portrait-ergonomics.md` — thumb-reach zones, safe areas/notches, anchoring, one-handed reach.
- `guides/08-decoupling-input-for-tests.md` — **the headline** — `IInputSource` + `MoveIntent`, `Configure(...)`, feeding `ResolveMove` from a test double (Hard Rule #11).
- `guides/09-input-feedback-handoff.md` — what this Guardian emits vs. what game-feel-juice-guardian consumes.

## Templates

`templates/input-actions.inputactions.json` (minimal Player action map), `templates/iinput-source.cs` (`IInputSource` interface + `MoveIntent` struct), `templates/virtual-joystick.cs` (joystick emitting through `IInputSource`), `templates/on-screen-button.cs` (action-edge button).

## Examples

`examples/01-virtual-joystick-into-player-controller.md` (joystick → `IInputSource` → `ResolveMove`), `examples/02-tap-to-move.md` (tap source feeding the same seam), `examples/03-testable-input-seam.md` (`FakeInputSource` + an EditMode test feeding a movement vector).

## Research

`research/research-plan.md` — topics and named sources (Unity Input System manual, On-Screen Controls / `OnScreenStick` / `OnScreenButton`, Enhanced Touch, action assets, mobile portrait ergonomics). Every guide cites at least one.

---

## Output conventions

- **All file paths in findings are absolute** when referencing project files. Relative when referencing guides in this Weapon.
- **Every claim is sourced** — a guide section (`guides/08-decoupling-input-for-tests.md §2`), a governing Hard Rule (`CLAUDE.md §6 #11`), an `ARCHITECTURE.md` section, or a named Unity reference.
- **Do not invent package versions.** Read them from `Packages/manifest.json`.
- **Never ship a control that can't be driven from an EditMode test** — but only block on Must-fix severity.

## When in doubt

- Unfamiliar input scenario? Say "I'm not confident about X" and escalate to the user or the right Guardian.
- Tempted to tune feel? Stop — ship a default and flag it for the human (`CLAUDE.md` §7).
- Hand off the moment a question crosses a boundary in the cross-Guardian table.
