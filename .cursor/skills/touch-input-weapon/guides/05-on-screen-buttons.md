# 05 — On-Screen Buttons

Attack, interact, build — the discrete actions. These are `Button` actions fed by `OnScreenButton`, surfaced to gameplay as **edges** so a press fires once.

## Default to `OnScreenButton`

Unity's `OnScreenButton` (On-Screen Controls module) drops on a UI `Image`/`Button`, takes a **Control Path** (e.g. `<Keyboard>/space` or a button control), and feeds the bound action a 1 on pointer-down and a 0 on pointer-up. Bind each on-screen button to its action (`Attack`, `Interact`, `Build`) and the existing consumers see them through the action — no gameplay branching for "is this a real key or an on-screen tap." Source: Unity Manual — *Input System / On-Screen Controls* (`OnScreenButton`).

## Edge, not held — match the existing semantics

`PlayerMeleeAttack` today fires on `keyboard.spaceKey.wasPressedThisFrame` / `mouse.leftButton.wasPressedThisFrame` (`Assets/Scripts/Drift/Gameplay/Combat/PlayerMeleeAttack.cs:25,28`) — a **press edge**, one swing per tap, with the cooldown gating repeat. The action equivalent is subscribing to `action.performed` (the press) rather than reading the action as a held value. The `IInputSource` exposes these as edges (e.g. `bool AttackPressedThisFrame` or an `event Action AttackPerformed`); the consumer reads the edge, preserving one-swing-per-tap.

Reading a button as a continuous value gives you auto-fire (a held attack button swings every frame the cooldown allows). That is the #1 on-screen-button bug — flag it.

## The Tier 0 buttons and where they go

| Button | Action | Consumer (today) | Edge semantics |
|---|---|---|---|
| Attack | `Attack` | `PlayerMeleeAttack.TryAttack` (`PlayerMeleeAttack.cs:36`) | press edge, cooldown-gated |
| Interact | `Interact` | salvage node / shuttle pad / tool cache | press edge |
| Build | `Build` | `Tier0BuildPlanner` open/close + place (HUD advertises "Tab" — `Tier0Hud.cs:173`) | press edge to toggle; placement is a second edge |

The HUD's existing control text (`Tier0Hud.cs:154,173`) is the grammar: "Space/LMB attack," "Tab - open/close build mode … Enter - place." On-screen buttons are the touch bindings for that same grammar.

## Held actions are different — Sprint and Repair

Some actions are **held**, not edge:

- **Sprint** — `ResolveMove` takes `bool sprintHeld` (`TopDownPlayerController.cs:88`); the sprint button reports a held boolean, not an edge. Read the action as a value (pressed = held).
- **Repair** — the HUD says "hold R to repair" (`Tier0Hud.cs:191`); the repair button is held.

Decide edge-vs-held **per action** and bind accordingly. An on-screen "Sprint" wired as an edge would toggle, not hold — a finding.

## Layout

Action buttons cluster in the **bottom-right** thumb zone (`07-portrait-ergonomics.md`), sized for a thumb (recommend ~`64–88` px diameter — **human to tune**, `CLAUDE.md` §7), spaced so adjacent presses don't mis-fire. Attack is the largest/most central (most-used in combat); Interact and Build sit around it. Do not overlap the bottom-right with the character/loadout panel (`Tier0Hud.DrawCharacterPanel` draws top-right today).

## The seam still applies

On-screen buttons feed actions; the `IInputSource` reads those actions and exposes edges/held-states; gameplay reads the source. A test sets `source.AttackPressedThisFrame = true` and asserts `PlayerMeleeAttack` swung — no button, no pointer, no scene. Hard Rule #1.

## Findings to watch for

- **Attack button read as a value** → auto-fire. Must-fix.
- **Sprint/Repair wired as an edge** when the consumer expects held (`sprintHeld`, "hold R") → broken control. Must-fix.
- **Button calls `TryAttack()` directly** bypassing the action/seam → untestable, couples UI to gameplay. Must-fix.
- **Buttons sized/placed for a desktop cursor** (tiny, top-of-screen) → ergonomics finding for a thumb. Should-refactor.
- **Press feedback (button bounce/highlight) implemented here** → that's `game-feel-juice-guardian` (`09`). Emit the edge; hand off the feel.
