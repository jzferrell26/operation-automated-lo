# 02 — Input Action Assets

The `.inputactions` asset is the single source of truth for *what inputs exist*. Bindings (keyboard, touch, gamepad) map onto actions; gameplay reads actions, never devices.

## Anatomy

An action asset is JSON (Unity serializes it; `templates/input-actions.inputactions.json` is a minimal one). Three nesting levels:

- **Action Maps** — a named group of actions for a context. Drift needs two: **`Player`** (movement + combat + interaction, active during gameplay) and **`UI`** (menu navigation, active in menus). Only one gameplay map should be enabled at a time so a tap on a menu button doesn't also swing the melee.
- **Actions** — a named input with a **type**: `Value` (continuous, e.g. `Move` → `Vector2`), `Button` (discrete press, e.g. `Attack`), or `PassThrough` (raw, rarely needed here).
- **Bindings** — the device controls feeding an action. An action can have many bindings (keyboard composite for editor + an on-screen control path for device).

## The Tier 0 Player map

| Action | Type | Control type | Bindings |
|---|---|---|---|
| `Move` | Value | Vector2 | 2D-Vector composite (WASD/arrows) for editor; the `OnScreenStick` writes here on device |
| `Sprint` | Button | Button | Left/Right Shift for editor; held-state on device (see `07` thumb zones) |
| `Attack` | Button | Button | Space / left mouse for editor; `OnScreenButton` on device |
| `Interact` | Button | Button | E for editor; `OnScreenButton` on device |
| `Build` | Button | Button | Tab for editor; `OnScreenButton` on device |

These map onto the existing consumers: `Move` + `Sprint` feed `TopDownPlayerController.ResolveMove(input, sprintHeld, dt)`; `Attack` feeds `PlayerMeleeAttack.TryAttack`; `Interact`/`Build` feed the salvage/build planners. The HUD already advertises this control vocabulary — `Tier0Hud.cs:154` prints "Shift sprint | Space/LMB attack | 1/2/3 craft | shuttle pads extract | R repair" — so the action names should track that grammar.

## `Value` vs `Button` — get this right

- **`Move` is `Value` / Vector2.** Read it with `action.ReadValue<Vector2>()` every frame and pass it to `ResolveMove`. A continuous stick is a value, not a button.
- **`Attack` / `Interact` / `Build` are `Button`.** Subscribe to `action.performed` for the *edge* (matching the existing `wasPressedThisFrame` semantics in `PlayerMeleeAttack.cs:25`). Reading a button as a value loses the edge and causes auto-fire.

The distinction is the difference between "move while held" and "fire once per press." Getting it wrong is a should-refactor at best, an auto-fire bug at worst.

## Composite bindings

The keyboard `Move` uses a **2D Vector composite** (up=W, down=S, left=A, right=D) so four buttons synthesize a `Vector2` — exactly what `TopDownPlayerController.Update` builds by hand today (`TopDownPlayerController.cs:52-71`). The composite replaces that hand-rolled accumulation. The on-screen stick binds to the same `Move` action via the `OnScreenStick` control path, so both editor and device feed one action.

## Control schemes

Define two control schemes — **"Keyboard&Mouse"** (editor) and **"Touch"** (device) — so the active scheme can be reported and the right on-screen controls shown. Tier 0 doesn't need scheme auto-switching UI; just tag the bindings. Gamepad/rebinding UI is Tier 1 (`00-principles.md` #8) — do not author it now.

## How gameplay reads it (through the seam)

Gameplay never references the asset directly. An `IInputSource` implementation owns the `InputActionAsset` (or the generated wrapper), reads `Move`/`Sprint`/`Attack`/… and exposes them as a `MoveIntent` + action edges (`08-decoupling-input-for-tests.md`). That is the only place that touches the asset.

## Authoring vs. editing in-editor

The `.inputactions` JSON can be authored as text (`templates/input-actions.inputactions.json`), but the canonical editing surface is the Input Actions editor window in Unity. When you hand a JSON template to the user, note that opening it in the editor and re-saving normalizes GUIDs — that's expected, not a diff to fight. Source: Unity Manual — *Input System / Action Assets* and *Action Bindings*.

## Findings to watch for

- **Move authored as a `Button`** → auto-fire / no analog magnitude. Must-fix.
- **A single mega-map** with menu + gameplay actions mixed → menu taps trigger gameplay. Should-refactor to Player/UI split.
- **Device-specific binding hardcoded in code** instead of in the asset → the asset is the source of truth; code reads actions. Should-refactor.
- **A Tier 1 rebinding screen** built mid-Tier-0 → tier violation. Must-fix (stop and flag).
