# 02 — Hit Feedback & Hitstop

The single highest-leverage juice on a combat loop. DRIFT's hit moment already exists and is clean to hook: `PlayerMeleeAttack.TryAttack` calls `Health.TakeDamage`, which fires `Health.Changed(current, max)` and, on death, `Health.Died`. You layer feedback on those events — you never touch the damage logic itself.

> Sources: Swink, *Game Feel*; Jan Willem Nijman (Vlambeer), "The Art of Screenshake" (the hit-feedback stack); Jonasson & Purho, "Juice it or lose it." See `research/research-plan.md`.

## The hit-feedback stack

A satisfying hit is rarely one thing — it's a stack of cheap effects firing together on the same frame the hit registers:

1. **Flash** — the struck thing briefly changes color (usually toward white or its damage tint).
2. **Knockback** — a short impulse pushing the target away from the hit.
3. **Hitstop** — a few frames where the world freezes or slows, selling the impact.
4. **Camera punch / small shake** — a trauma bump (see `guides/03-screenshake.md`).
5. **Audio cue** — the impact sound (see `guides/07-audio-feedback.md`).
6. **Particles** — a small impact burst (see `guides/05-particles-and-vfx.md`).

You rarely ship all six at full strength. Start with flash + a small shake + a sound; add hitstop and knockback if the human wants more weight. Restraint (Principle #7).

## The hook: `Health.Changed`

The real wiring (read `Assets/Scripts/Drift/Core/Combat/Health.cs`):

```csharp
public event Action Died;
public event Action<float, float> Changed;   // (current, max)
```

A flash-on-hit component subscribes to `Changed` in its `Configure(...)` and reacts. This is the canonical, decoupled hook — the enemy's `Health` doesn't know about feedback, and `PlayerMeleeAttack` doesn't either. See `templates/hit-flash.cs` and `examples/01-melee-hit-feedback.md`.

> Note: `Health.Changed` fires on **heal too**. A flash component should distinguish damage (current went *down*) from heal, or only flash on a decrease. Cache the previous value.

## Flash

The cheapest, most readable hit feedback — especially on a gray-box. DRIFT has no sprites yet; it has primitives tinted by `GrayBoxVisuals.Tint(go, color)` / `CreateColorMaterial(color)` (read `Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs`).

Pattern:

1. On `Health.Changed` (damage), swap the `MeshRenderer.sharedMaterial` to a flash material (e.g., near-white) — or better, set a property on a `MaterialPropertyBlock` to avoid creating materials (perf, co-own with `mobile-game-perf-guardian`).
2. Hold for `flashSeconds` (knob; start `0.06`).
3. Restore the original material/color.

The restore is frame-driven, so it follows the EditMode contract: a deterministic `Step(dt)` countdown, not a bare coroutine. See `templates/hit-flash.cs`.

**Gray-box caveat:** `GrayBoxVisuals.CreateColorMaterial` allocates a new `Material` each call. For a flash that fires often, cache two materials (normal + flash) at `Configure` time, or use a `MaterialPropertyBlock`. Note the alloc cost and hand the hard call to `mobile-game-perf-guardian` (Principle #7).

## Knockback

A short impulse on the struck target, away from the attacker. On DRIFT's enemy (`MutatedCrewEnemy` uses direct steering, NavMesh-free — ARCHITECTURE.md §8), knockback is a position offset applied over a short decay, not a physics force. Knobs: `knockbackDistance` (start `0.5` world units), `knockbackSeconds` (start `0.1`), eased out.

**Boundary:** the *decision* to be staggered/interrupted by a hit is FSM behavior → `fsm-ai-guardian`. The *visual displacement* of the knockback is yours. If knockback should cancel the enemy's attack, that's a co-owned seam — propose it, let fsm-ai own the state change.

## Hitstop (freeze-frames)

A few frames where the world freezes or slows on impact. This is the weightiest single effect and the easiest to get wrong.

### The right way

- Hitstop fires **after** the hit has registered (`Health.TakeDamage` already ran). The player sees: hit lands → world freezes for N frames → world resumes. The freeze *punctuates* the hit.
- Freeze the **world**, not **input**. Principle #4 / Hard Rule #4: a hitstop must never eat the player's next input. Two implementation options:
  - **`Time.timeScale = 0` for N frames** — simplest, freezes everything. But it freezes input-driven movement too, and it fights the EditMode test harness and any `Time.deltaTime`-based code. Use `Time.unscaledDeltaTime` to count down the freeze, and keep input *sampling* alive.
  - **A scoped freeze** — only the combatants pause their `Step` for N frames; the camera and input keep running. More code, more control, mobile-friendlier. Preferred when you have a clean `Step(dt)` seam.
- Keep it **short**: 2–4 frames (~0.03–0.07s at 60fps). Longer reads as a stutter/lag spike, not a punch. Knob: `hitstopSeconds` (start `0.04`).

### The wrong way (must-fix)

- Hitstop *before* the hit registers → the player feels a stutter, then a hit. Backwards.
- Hitstop that pauses input sampling → dropped inputs → reads as the game ignoring the player.
- `Time.timeScale = 0` counted with scaled `Time.deltaTime` → it never resumes (deltaTime is 0 while frozen). Always count the freeze with `Time.unscaledDeltaTime`.
- Long hitstop on *every* hit → on a fast melee loop this is constant micro-stutter. Reserve longer hitstop for heavy/finishing hits; keep light hits at 0–2 frames.

## EditMode-testability

All of the above is frame-driven (flash restore, knockback decay, hitstop countdown). Per CLAUDE.md §11 / ARCHITECTURE.md §7, extract the per-frame logic into a public `Step(dt)`:

- `HitFlash.Step(dt)` counts down `flashSeconds` and restores.
- `Hitstop.Step(unscaledDt)` counts down and un-freezes.
- A test can call `Step(0.1f)` and assert the material restored / the freeze ended — no Play mode, no real time.

A feedback component you can't `Step` is a must-fix (Principle #2 / the EditMode contract).

## Tuning table (hand to the human)

| Knob | `[SerializeField]` | Start | Range | Changes |
|---|---|---|---|---|
| Flash duration | `flashSeconds` | `0.06` | `0.03–0.12` | How long the struck thing stays lit |
| Flash color | `flashColor` | near-white | any | The lit tint |
| Knockback distance | `knockbackDistance` | `0.5` | `0.2–1.0` | How far the target is shoved |
| Knockback time | `knockbackSeconds` | `0.1` | `0.05–0.2` | How fast the shove resolves |
| Hitstop duration | `hitstopSeconds` | `0.04` | `0.0–0.08` | Frames of world-freeze (0 = off) |
| Camera trauma per hit | `traumaPerHit` | `0.3` | `0.15–0.5` | Shake size on hit (see guide 03) |

All starting values are first-pass, grounded in the Vlambeer/Swink stack; **the human tunes them on device.** End with the handoff (`guides/10-human-handoff.md`).
