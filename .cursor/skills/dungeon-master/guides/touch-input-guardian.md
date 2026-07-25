# Touch Input Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `touch-input-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`agents/touch-input-guardian.md`](../../../../agents/touch-input-guardian.md)
**Weapon:** [`.claude/skills/touch-input-weapon/`](../../touch-input-weapon/)
**Trigger policy:** on-demand (not proactive)

---

## Domain

`touch-input-guardian` is PROJECT-DRIFT's mobile touch-input specialist for a Unity 6, top-down, portrait-friendly space-survival game built on Unity's **new Input System** (already a `Drift.Runtime` dependency). It owns the entire input layer: Input Action assets and maps; the on-screen virtual joystick for movement; tap-to-move as an alternative; drag/swipe gesture recognition; on-screen action buttons (attack / interact / build); portrait thumb-reach ergonomics; and — the load-bearing concern — **decoupling input from gameplay logic** via an `IInputSource` + `MoveIntent` seam so `TopDownPlayerController.ResolveMove(...)` and `PlayerMeleeAttack` are driven from EditMode tests without a device (Hard Rule #11). It **scaffolds** controls and the input architecture; per `CLAUDE.md` §7 the **human tunes the final touch feel** (dead zones, joystick behaviour, button sizes, swipe thresholds).

## Trigger phrases

Route to `touch-input-guardian` when the user says any of:

- "Add touch controls" / "wire up mobile controls"
- "Add a virtual joystick" / "on-screen joystick for movement"
- "Tap-to-move" / "click-to-move locomotion"
- "On-screen attack/interact/build button"
- "Set up Input Actions" / "author the .inputactions asset" / "add an action map"
- "Swipe to dodge" / "add gesture recognition" / "pinch / drag input"
- "Portrait thumb zones" / "where should the controls go on the screen"
- "Make input testable" / "decouple input from the player controller" / "feed the controller a movement vector in a test"
- Anything touching input wiring (`Keyboard.current` / `Touchscreen` polling, `IInputSource`, on-screen controls) in a Drift PR

Or when the request implicitly involves how the player drives the game on a touchscreen, or the testable seam between input and movement/combat.

## Do NOT route when

- The user wants **movement or combat LOGIC internals** — what `ResolveMove` does with the vector, suit-power integration, melee overlap math — that is `unity-csharp-guardian`. (The `IInputSource` / `MoveIntent` boundary is **co-owned**: touch-input-guardian defines and feeds the seam; unity-csharp-guardian owns the gameplay on the other side.)
- The user wants **input FEEDBACK / juice** — button press animation, haptics, screenshake on attack, joystick knob tween, camera follow feel (`TopDownFollowCamera`) — that is `game-feel-juice-guardian`. (This Guardian emits the edge/event; the response is theirs.)
- The user wants to **write or run the EditMode/PlayMode suite, CI, or batchmode** — that is `unity-test-ci-guardian`. (This Guardian designs input to be *testable* and ships one example test; the harness is theirs.)
- The user wants **input perf** — allocation in the input hot path, pointer-event GC, frame budget of polling — that is `mobile-game-perf-guardian`. (This Guardian keeps the seam allocation-light; profiling is theirs.)
- The user wants **editor automation / scene assembly** — placing the Canvas and joystick prefab via MCP — that is `unity-mcp-guardian`. (This Guardian authors the components and action asset; placing them is theirs.)
- The user wants **enemy AI / FSM** (`fsm-ai-guardian`), **balance values** like move speed or cooldown numbers (`game-balance-guardian`), **generic MonoBehaviour/C# scaffolding** unrelated to input (`unity-csharp-guardian`), or **input/AI-state save format** (`save-load-guardian`).

If the request straddles boundaries (e.g., "add a touch joystick and make the player feel snappy"), route to `touch-input-guardian` first for the control + seam, then chain to `game-feel-juice-guardian` for the feel and `unity-test-ci-guardian` for the suite.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- The Drift repo at the current branch.
- Access to `CLAUDE.md` (Hard Rules §6, §7), `ARCHITECTURE.md` (§4, §7), `TIER0.md`, `Packages/manifest.json` (for the `com.unity.inputsystem` version), and the input consumers: `Assets/Scripts/Drift/Gameplay/Player/TopDownPlayerController.cs`, `Assets/Scripts/Drift/Gameplay/Combat/PlayerMeleeAttack.cs`, `Assets/Scripts/Drift.Runtime.asmdef`.
- Optional: specific focus (joystick, tap-to-move, on-screen buttons, gestures, ergonomics, decoupling-for-tests, feedback handoff).
- Optional: design intent for the control scheme (joystick vs. tap-to-move, which gestures are in Tier 0 scope).

If the consumer files or `CLAUDE.md`/`ARCHITECTURE.md` are inaccessible, do not invoke yet — ask the user to point at the repo.

## Outputs the Guardian produces

- **Input design / control-scheme reports / audits** → `library/qa/touch-input/<date>-<topic>.md` (e.g., `2026-06-22-virtual-joystick-decoupling.md`).
- **ADRs** (e.g., tap-to-move vs. joystick as the primary scheme) → `library/architecture/ADR-<n>-<topic>.md`.
- **Scaffolded controls + the input abstraction** → code on the `Drift` spine: an `.inputactions` asset, `IInputSource`/`MoveIntent`, source implementations, a `Configure` seam on the consumers, and one EditMode example proving testability.
- **Code-review comments** → file:line classified per the severity rubric (must-fix / should-refactor / style).

Every finding cites (a) `Assets/.../File.cs:LN` in the repo and (b) the relevant guide in `touch-input-weapon/guides/` plus the governing `CLAUDE.md` Hard Rule, `ARCHITECTURE.md` section, or named Unity reference. Final feel tuning is always **flagged and handed to the human** (`CLAUDE.md` §7).

## Multi-Guardian sequences this Guardian participates in

- **Stand up touch controls (Tier 0)** — `touch-input-guardian` authors the action asset, joystick, on-screen buttons, and the `IInputSource` seam + `Configure` wiring; `unity-csharp-guardian` confirms the consumer side of the seam (`ResolveMove`, melee); `unity-test-ci-guardian` runs the EditMode example in batchmode; `game-feel-juice-guardian` adds press feedback/juice; `unity-mcp-guardian` places the Canvas/controls in the scene. The human tunes feel last.
- **Make the player controller testable** — `touch-input-guardian` introduces `IInputSource`/`MoveIntent` + `Configure` so a `FakeInputSource` drives `ResolveMove`; `unity-test-ci-guardian` owns the resulting suite; `unity-csharp-guardian` co-owns the seam shape.
- **Add a combat verb (swipe-dodge)** — `touch-input-guardian` recognizes the swipe and emits a dodge edge; `unity-csharp-guardian` implements what dodge does; `game-feel-juice-guardian` adds the dodge feel/haptic; `game-balance-guardian` sets the dodge distance/cooldown numbers. (Confirm it's Tier 0 scope first.)

## Critical directives the orchestrator should respect

- **Decouple input from gameplay — the headline.** The Guardian will refuse to wire a control that pokes `TopDownPlayerController`/`PlayerMeleeAttack` directly; input flows through `IInputSource` (`MoveIntent` + edges) so it's EditMode-testable (Hard Rule #11).
- **New Input System only.** It already references `Unity.InputSystem`; the Guardian blocks legacy `UnityEngine.Input` calls (mixed backends are a footgun).
- **Mobile-first, portrait-first, thumb-first.** Controls target thumbs on a portrait screen; keyboard is editor-only behind the same seam.
- **Scaffold, don't tune.** Dead zones, joystick behaviour, button sizes, swipe thresholds ship as `[SerializeField] private` defaults flagged "human to tune" (`CLAUDE.md` §7). The Guardian will not present a tuned feel as finished.
- **Tier discipline.** Touch movement + attack/interact/build are Tier 0; radial menus, rebinding UIs, grid drag-and-drop are Tier 1 — the Guardian stops and flags a tier jump.
- **Emit, don't animate.** The Guardian makes the press register and emits the edge; press-state, haptics, and juice hand off to `game-feel-juice-guardian`.
- **Hand off at the boundary.** Logic internals → `unity-csharp-guardian`; the test suite → `unity-test-ci-guardian`; perf → `mobile-game-perf-guardian`; scene placement → `unity-mcp-guardian`.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
