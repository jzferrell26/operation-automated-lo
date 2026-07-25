# touch-input-weapon

The procedural arsenal for `touch-input-guardian`, PROJECT-DRIFT's mobile touch-input specialist (Unity 6, top-down, portrait) on Unity's new Input System. It owns the input layer and — above all — its **testable decoupling** from gameplay logic.

## What this weapon covers

- **The new Input System setup** — the system already referenced by `Drift.Runtime.asmdef` (`Unity.InputSystem`); action-based input, Touchscreen / Enhanced Touch, and why the legacy Input Manager stays out
- **Input Action assets & maps** — `.inputactions` shape, Player/UI maps, `Value` vs `Button` actions, composite bindings, control schemes
- **Virtual joystick** — `OnScreenStick`, follow vs fixed origin, dead zone, feeding a `MoveIntent`
- **Tap-to-move** — screen tap → world point → target vector, as an alternative locomotion source on the same seam
- **On-screen action buttons** — `OnScreenButton` for attack / interact / build, edge vs held
- **Gestures** — drag, swipe (dodge), pinch; recognition thresholds as human-tuned feel, with Tier-0 restraint
- **Portrait ergonomics** — thumb-reach zones, safe areas / notches, one-handed reachability
- **Decoupling input for tests** — the headline: `IInputSource` + `MoveIntent` so `TopDownPlayerController.ResolveMove(...)` is driven from an EditMode test double (Hard Rule #11)
- **Feedback handoff** — what this Guardian emits (edges/events) vs. what `game-feel-juice-guardian` consumes (press-state, haptics, juice)

## Reading order

1. Read `SKILL.md` — master index, routing table, hard rules, severity rubric, cross-Guardian handoffs, output paths
2. Read `guides/00-principles.md` — the non-negotiables, the decoupling-first rule, and the scaffold-vs-feel split (orient against `CLAUDE.md` + `ARCHITECTURE.md` every time)
3. Read `guides/08-decoupling-input-for-tests.md` — the headline pattern; read it before authoring any control
4. Open the guide matching your task (see the routing table in `SKILL.md`)
5. Pull a skeleton from `templates/`; read `examples/` for the worked walkthroughs
6. Reference `research/research-plan.md` for the authoritative sources behind a claim

## Layout

```
touch-input-weapon/
  SKILL.md         Navigation, hard rules, severity rubric, routing table, output paths
  README.md        This overview
  guides/          10 numbered guides (00-principles → 09-input-feedback-handoff)
  templates/       4 copy-paste skeletons (action asset, IInputSource+MoveIntent, joystick, button)
  examples/        3 worked examples tied to real Drift consumers
  research/        Research plan — named Unity sources mapped to the guides they inform
```

## Key rule

**Decouple input from gameplay before you wire a single control.** `TopDownPlayerController.ResolveMove(Vector2, bool, float)` already proves the seam — input must flow into it through an `IInputSource` emitting a `MoveIntent`, never by polling `Keyboard.current` inside the controller's own `Update`. A control wired straight to a device can't be driven from an EditMode test, and `CLAUDE.md` Hard Rule #11 makes that a must-fix. The joystick, tap-to-move, and the action buttons are all just sources behind the same seam.

## Scaffold vs. feel

This Weapon scaffolds controls and the input architecture. The **final touch feel is the human's** (`CLAUDE.md` §7): dead-zone radius, fixed-vs-floating joystick, button diameter, swipe distance/velocity thresholds, tap-vs-hold timing. Ship them as `[SerializeField] private` defaults and flag them "human to tune" — never hardcode feel and call it finished.

## Output convention

Reports are written into the **host repo's `library/` tree**, never inside this Weapon:

- **Input design / control-scheme reports / audits** → `library/qa/touch-input/<date>-<topic>.md`
- **ADRs** → `library/architecture/ADR-<n>-<topic>.md`

Cursor sees this Weapon at `.cursor/skills/touch-input-weapon/` once deployed.
