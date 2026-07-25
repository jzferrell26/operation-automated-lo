# 00 — Principles

The non-negotiables for mobile touch input in PROJECT-DRIFT. Read on every invocation.

## The nine principles

### 1. Orient against the project contract — always

Before any finding, read in this order (the order `CLAUDE.md` §0 mandates):

- `CLAUDE.md` — Hard Rules §6 (especially **#11** EditMode testability, **#1** tier discipline) and §7 (touch-control *tuning* is a human responsibility; you scaffold). Confirm the current tier (mid-Tier-0) and current objective (§4).
- `ARCHITECTURE.md` — §4 runtime composition (what's on the player capsule), §7 EditMode conventions (lazy-init / `Configure` / extracted `Tick`).
- `space-survival-design-doc.md` (the GDD) for *what/why* when the question is design-shaped (mobile, portrait-friendly controls).

The GDD wins on vision; `ARCHITECTURE.md` wins on implementation; `CLAUDE.md` wins on process. A recommendation that contradicts one is wrong advice until you flag the contradiction. Source: `CLAUDE.md` §0, §2.

### 2. Decouple input from gameplay — the headline rule

`TopDownPlayerController` and `PlayerMeleeAttack` must **not** poll a device (`Keyboard.current`, `Mouse.current`, touch) inside their own `Update`. Device reading lives behind an **`IInputSource`** that emits a **`MoveIntent`** struct (and action edges). The controller consumes the intent; a test feeds it a `FakeInputSource`. The seam already exists — `TopDownPlayerController.ResolveMove(Vector2 input, bool sprintHeld, float deltaSeconds)` (`Assets/Scripts/Drift/Gameplay/Player/TopDownPlayerController.cs:88`) is the proof. The input layer's job is to feed that seam from whatever source (joystick, tap, keyboard) without coupling the controller to a device. Source: `CLAUDE.md` §6 #11; `guides/08-decoupling-input-for-tests.md`.

### 3. The new Input System is canon

`Drift.Runtime.asmdef` already references `Unity.InputSystem` (`Assets/Scripts/Drift.Runtime.asmdef:5`). Author input as `.inputactions` action assets and action maps. Do **not** introduce legacy `UnityEngine.Input` / `Input.GetAxis` calls — mixing the two input backends is a documented Unity footgun. Source: `guides/01-input-system-setup.md`.

### 4. Mobile-first, portrait-first, thumb-first

Drift is a top-down mobile game, portrait-friendly (`CLAUDE.md` §1). Every control is designed for thumbs on a portrait screen: virtual joystick bottom-left, action buttons bottom-right, safe-area aware. Keyboard/mouse remain only as an **editor-convenience** input source behind the same `IInputSource`. A desktop-shaped scheme is a finding. Source: `guides/07-portrait-ergonomics.md`.

### 5. On-screen controls feed the action asset

Prefer the official `On-Screen` controls (`OnScreenStick`, `OnScreenButton`) that write into the action asset; they handle pointer capture and multi-touch correctly. Bespoke joystick code is acceptable only when the package's behavior is insufficient (follow-stick, variable dead-zone) — and even then it emits through the action / `IInputSource` seam, never raw-touch math poked straight into gameplay. Source: `guides/03-virtual-joystick.md`, `guides/05-on-screen-buttons.md`.

### 6. You scaffold; the human tunes feel

`CLAUDE.md` §7 reserves touch-control *tuning* for the human. Dead-zone radius, fixed-vs-floating joystick origin, button diameter, swipe distance/velocity thresholds, tap-vs-hold timing are **feel**. Ship them as `[SerializeField] private` tunables with a read-only property and a comment flagging "human to tune." A Guardian that hardcodes a dead-zone of `0.2` and declares the joystick done has overstepped. Source: `CLAUDE.md` §7.

### 7. One control scheme verified before the next

Get the virtual joystick driving `ResolveMove` end-to-end with a passing EditMode test before adding tap-to-move or gestures. Mirror the ops-manager discipline of `CLAUDE.md` §6 #4 — one verified slice before the next.

### 8. Tier discipline is law

Touch movement + attack/interact/build buttons are Tier 0 controls. Gesture-heavy schemes, context-sensitive radial menus, gamepad rebinding UIs, and full grid-inventory drag-and-drop are **Tier 1** — do not build them mid-Tier-0. Source: `CLAUDE.md` §6 #1.

### 9. Emit, don't animate — and update the docs you touch

Make the press *register* and emit the edge/event; the visual press-state, haptic buzz, and juice belong to `game-feel-juice-guardian`. And any structural change (new input map, new `IInputSource` implementation, new control wired into the spine) updates `ARCHITECTURE.md` in the same commit. Source: `guides/09-input-feedback-handoff.md`; `CLAUDE.md` §6 #8.

---

## First-move checklist

Before writing findings, confirm:

- [ ] `CLAUDE.md` Hard Rules §6 (#11, #1) + §7 read; current tier confirmed (Tier 0).
- [ ] `ARCHITECTURE.md` §4 / §7 read; the player-capsule composition understood.
- [ ] `Assets/Scripts/Drift.Runtime.asmdef` confirmed to reference `Unity.InputSystem`.
- [ ] `TopDownPlayerController.ResolveMove` + `PlayerMeleeAttack` read — the seams the input layer must feed.
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] Severity rubric in mind (must-fix / should-refactor / style).
- [ ] Scaffold-vs-feel line clear — defaults shipped, feel flagged for the human.

## Cross-Guardian boundaries

The full table lives in `SKILL.md`. The short version: surface concerns at the boundary; don't author work another Guardian owns.

| Question | Owner |
|---|---|
| Movement / combat LOGIC internals (what `MoveIntent` *does*) | `unity-csharp-guardian` (co-owned seam) |
| Input FEEDBACK / juice — press anim, haptics, shake | `game-feel-juice-guardian` |
| EditMode / PlayMode harness, CI, batchmode | `unity-test-ci-guardian` |
| Input perf / GC / frame budget | `mobile-game-perf-guardian` |
| Editor automation / scene assembly | `unity-mcp-guardian` |
| Enemy AI / FSM | `fsm-ai-guardian` |
| Balance values (speed, cooldown numbers) | `game-balance-guardian` |
| Save / load format | `save-load-guardian` |

## Severity rubric

| Severity | Examples | Blocks merge? |
|---|---|---|
| **Must-fix** | Input polled in a gameplay `Update` with no test seam; a control bypassing `ResolveMove` / the action map; legacy `UnityEngine.Input` mixed with the new system; a Tier 1 input feature mid-Tier-0; an `IInputSource` consumer with deps only resolvable in `Awake` (un-`Configure`-able) | Yes |
| **Should-refactor** | Public mutable input tunable where `[SerializeField] private` fits; bespoke joystick math where `OnScreenStick` suffices; feel constants hardcoded instead of exposed for human tuning; desktop-shaped layout ignoring thumb zones | No — opens follow-up |
| **Style** | Action / map naming; button anchor pixel nudges; field ordering | Never — don't block |

Calling a thumb-zone preference "must-fix" destroys your credibility for the next finding. Be disciplined.

## Citation discipline

Every finding has two citations:

1. **Where in the repo** — `Assets/Scripts/Drift/Gameplay/Player/TopDownPlayerController.cs:44`.
2. **Why it's a finding** — a guide section (`guides/08-decoupling-input-for-tests.md §2`), a governing Hard Rule (`CLAUDE.md §6 #11`), an `ARCHITECTURE.md` section, or a named Unity reference.

No citations means the finding is opinion, not enforcement.

## Scope explicitly excluded

- **What the intent does once consumed.** `ResolveMove`'s suit-power integration, melee overlap math — `unity-csharp-guardian` (the seam is co-owned).
- **Feedback / juice / haptics.** Emit the edge; `game-feel-juice-guardian` responds.
- **The test harness, perf, AI, balance, save.** Each has its own Guardian — see the boundary table. This Guardian owns the input layer they build on.

When in doubt, escalate.
