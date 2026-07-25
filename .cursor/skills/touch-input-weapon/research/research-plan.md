# Research Plan — touch-input-weapon

The topics and named sources consulted while forging this Weapon. Sources are named (manual sections, package docs, platform guidelines) rather than fabricated URLs — verify against the live Unity documentation for the project's pinned package versions (read versions from `Packages/manifest.json`; do not invent them).

## Project-internal sources (the ground truth)

- `CLAUDE.md` — Hard Rules §6 (#11 EditMode testability, #1 tier discipline, #4 one slice at a time, #8 update docs), §7 (human owns touch-control tuning), §1 (mobile, portrait-friendly), §3 (Status Map — full grid inventory is Tier 1).
- `ARCHITECTURE.md` — §2 source layout / `Drift.Runtime` references `Unity.InputSystem`, §4 runtime composition (player capsule), §5 event flow, §7 EditMode conventions (lazy-init / `Configure` / extracted `Tick`).
- `AGENTS.md` — headless batchmode EditMode run, license activation caveat, no committed `ProjectSettings/`.
- `TIER0.md` — Tier 0 scope guard.
- `Assets/Scripts/Drift/Gameplay/Player/TopDownPlayerController.cs` — the `ResolveMove` seam (line 88) and the current inline `Keyboard.current` poll (lines 44–81).
- `Assets/Scripts/Drift/Gameplay/Combat/PlayerMeleeAttack.cs` — the `wasPressedThisFrame` edge semantics (lines 23–29).
- `Assets/Scripts/Drift/Gameplay/UI/Tier0Hud.cs` — the control grammar the on-screen buttons mirror (lines 154, 173, 191).
- `Assets/Scripts/Drift.Runtime.asmdef` — confirms `Unity.InputSystem` reference (line 5).
- `Assets/Tests/EditMode/RuntimePlayerTests.cs` — the existing EditMode pattern this Guardian extends.

## Topic 1 — Unity new Input System fundamentals

- Unity Manual — *Input System* package: Installation & Settings (Active Input Handling), Concepts (actions, action maps, bindings), Workflows (`PlayerInput` component vs. direct action-asset reference, generated C# wrapper class).
- Informs: `guides/01-input-system-setup.md`, `guides/02-input-action-assets.md`.

## Topic 2 — Action assets, action maps, bindings, composites

- Unity Manual — *Input System / Action Assets*, *Action Bindings* (composite bindings, 2D Vector composite), *Action Types* (`Value` / `Button` / `PassThrough`), *Control Schemes*.
- Informs: `guides/02-input-action-assets.md`, `templates/input-actions.inputactions.json`.

## Topic 3 — On-Screen Controls (the on-screen joystick + buttons)

- Unity Manual — *Input System / On-Screen Controls*: `OnScreenStick` (Movement Range, Behaviour: static vs. dynamic origin / follow stick), `OnScreenButton` (control path, press/release).
- Informs: `guides/03-virtual-joystick.md`, `guides/05-on-screen-buttons.md`, `templates/virtual-joystick.cs`, `templates/on-screen-button.cs`.

## Topic 4 — Touch & Enhanced Touch

- Unity Manual — *Input System / Touch Support*, *EnhancedTouch* API (`EnhancedTouchSupport.Enable()`, `Touch.activeTouches`), `Touchscreen.primaryTouch`; simulated touchscreen / *Device Simulator* for editor testing.
- Informs: `guides/01-input-system-setup.md`, `guides/06-gestures.md`.

## Topic 5 — Gesture recognition

- Unity Manual — touch phases and deltas; community-standard swipe/drag/pinch recognition (distance + time/velocity thresholds). Recognition thresholds documented as feel (human-tuned), not authoritative constants.
- Informs: `guides/06-gestures.md`.

## Topic 6 — Mobile portrait ergonomics & thumb zones

- Steven Hoober's "thumb zone" reachability research (industry-standard reach maps), as popularized in mobile UX literature.
- Apple Human Interface Guidelines — touch target minimums (~44 pt); Google Material Design — touch target guidance (~48 dp). Used as *floors*, not the answer (final sizes are human-tuned per `CLAUDE.md` §7).
- Unity — `Screen.safeArea` for notch/gesture-bar insets; RectTransform anchoring for aspect-ratio robustness.
- Informs: `guides/07-portrait-ergonomics.md`.

## Topic 7 — Decoupling input for testability (the headline)

- `ARCHITECTURE.md` §7 + `CLAUDE.md` §6 #11 — the three EditMode-safe patterns (lazy-init, explicit `Configure`, extracted `Tick`/`Step`).
- General dependency-inversion / ports-and-adapters practice applied to Unity input (interface seam + test double), grounded in the existing `ResolveMove` extraction and `RuntimePlayerTests`.
- Unity Manual — reading actions in code (`ReadValue<T>()`, `WasPressedThisFrame()`, `IsPressed()`).
- Informs: `guides/08-decoupling-input-for-tests.md`, `templates/iinput-source.cs`, all three examples.

## Topic 8 — Feedback / juice boundary

- Sibling Guardian `game-feel-juice-guardian` description (owns the feel loop, hit feedback wired to `PlayerMeleeAttack`/`Health`, `TopDownFollowCamera`, haptics).
- Unity — `Handheld.Vibrate()` (basic haptics) noted as belonging to the feel layer, not the input source.
- Informs: `guides/09-input-feedback-handoff.md`.

## Open questions / TBD

- Confirm the pinned `com.unity.inputsystem` version from `Packages/manifest.json` before citing version-specific API (e.g. `WasPressedThisFrame()` availability).
- Whether Tier 0 ships joystick-only or joystick + tap-to-move is a **design call** for the user — flagged in `guides/04-tap-to-move.md`, not decided here.
- Final thumb-zone sizes, dead zones, and swipe thresholds are **human-tuned** (`CLAUDE.md` §7) — this Weapon ships defaults, not answers.
