# Example 01 — Melee Hit Feedback (flash + hitstop + small shake)

**Request:** "Make the melee hit feel good."

The highest-leverage juice on DRIFT's combat loop. We layer feedback on the *existing* hit moment without touching the damage logic. Walk the feel loop (`guides/01-the-feel-loop.md`) first.

## 1. Map the request onto the feel loop

- **Input:** Space / LMB → `Assets/Scripts/Drift/Gameplay/Combat/PlayerMeleeAttack.cs` → `Update` → `TryAttack`.
- **Response:** `TryAttack` runs `Physics.OverlapSphere`, finds a `Health`, calls `health.TakeDamage(damage)`. `Health.TakeDamage` fires `Changed(current, max)` (and `Died`). **Already instant — do not touch it.**
- **Feedback (what we add):** flash the struck enemy, a few frames of hitstop, a small camera trauma bump, plus (optional, see other guides) a hit sound and a tiny impact burst.
- **Latency:** flash + shake fire the *same frame* as `Health.Changed`; hitstop is a deliberate ~3-frame world-freeze *after* the hit registers.

## 2. The hook — `Health.Changed`

The clean, decoupled hook (read `Assets/Scripts/Drift/Core/Combat/Health.cs:17-18`):

```csharp
public event Action Died;
public event Action<float, float> Changed;   // (current, max)
```

Nothing on the enemy or `PlayerMeleeAttack` needs to know about feedback — three small components subscribe.

## 3. The plumbing

### a) Flash — `HitFlash` on the enemy

Use `templates/hit-flash.cs` verbatim. It subscribes to `Health.Changed`, flashes the enemy's `MeshRenderer` toward near-white on a *decrease* (damage, not heal), and restores via a deterministic `Step(dt)`. It caches the flash material at `Configure` (no per-hit alloc). Wire it on the enemy capsule (the spawner builds the enemy with `Health + MutatedCrewEnemy`, ARCHITECTURE.md §4) — placement handed to `unity-mcp-guardian`.

### b) Hitstop — on the player attack, fired from the hit

In `PlayerMeleeAttack.TryAttack`, after `health.TakeDamage(damage); hitAny = true;`, request a short hitstop. Implement hitstop as a tiny component that, on `Begin(seconds)`, sets `Time.timeScale = 0f` and counts down with **`Time.unscaledDeltaTime`** (so it actually resumes — `guides/02-hit-feedback-and-hitstop.md`), then restores `timeScale = 1f`. Keep it ≤ a few frames. **Input sampling must keep running** (Hard Rule #4): `PlayerMeleeAttack.Update` reads `Keyboard.current`/`Mouse.current` which are unaffected by `timeScale`, so the next swing isn't dropped — but verify movement intent isn't gated on scaled time.

### c) Small shake — `CameraShake.AddTrauma`

Use `templates/screenshake.cs`. From the hit site, call `cameraShake.AddTrauma(traumaPerHit)` the same frame as the hit. `TopDownFollowCamera` adds `CurrentOffset` on top of its damped follow (`guides/06-camera-feel.md`, `examples/02`).

## 4. Wiring sketch (Configure-style, EditMode-safe)

```csharp
// In a small Tier0 feel binder, or extend Tier0RuntimeSpawner (hand to unity-mcp-guardian):
var flash = enemyGo.AddComponent<HitFlash>();
flash.Configure(enemyHealth, enemyRenderer);

var hitstop = playerGo.AddComponent<Hitstop>();      // Begin(sec) on hit; counts unscaled
var shake   = cameraGo.GetComponent<CameraShake>();

// PlayerMeleeAttack gets a Configure(hitstop, shake, traumaPerHit) so the hit site can
// fire feedback without PlayerMeleeAttack knowing concrete types — keeps it testable.
```

Each component follows the spine's lazy-init / `Configure` / `Step` pattern (CLAUDE.md §11) so the whole stack is EditMode-testable: a test raises a damage event, calls `Step`, and asserts the flash restored and trauma decayed.

## 5. Cost (co-own with mobile-game-perf-guardian)

- **Flash:** one cached `Material` per enemy at `Configure`; zero per-hit alloc. Negligible.
- **Hitstop:** `timeScale` toggle; ~free; touches all time-based code (use `unscaledDeltaTime`).
- **Shake:** a few Perlin samples/frame; ~free CPU. Real limit is mobile nausea → cap `maxShake`.
- **Hard call:** none of these should move the frame budget, but **verify with the Profiler on device** — deferred to `mobile-game-perf-guardian`.

## 6. Tuning table (hand to the human)

| Knob | `[SerializeField]` | Start | Range | Changes |
|---|---|---|---|---|
| Flash duration | `HitFlash.flashSeconds` | `0.06` | `0.03–0.12` | How long the enemy stays lit |
| Flash color | `HitFlash.flashColor` | near-white | any | The lit tint |
| Hitstop duration | `Hitstop.hitstopSeconds` | `0.04` | `0.0–0.08` | Frames of world-freeze (0 = off) |
| Trauma per hit | `traumaPerHit` (caller) | `0.3` | `0.15–0.5` | Shake size on hit |
| Max shake | `CameraShake.maxShake` | `0.5` | `0.2–1.0` | Shake ceiling (mobile) |

## 7. The handoff (CLAUDE.md §7)

> This is yours to tune. I've wired flash + hitstop + a small trauma bump onto the existing `Health.Changed` hit moment, all EditMode-testable, none touching the damage logic. Starting values come from the Vlambeer/Swink hit-feedback stack (`research/research-plan.md`) and are first-pass. **I have not judged whether it feels good — that's your call (§7), alongside the "is it fun?" play test (§4).** Verify on a device; turn the knobs to taste. Hard perf calls (overdraw if we add the impact particle) go to `mobile-game-perf-guardian`.
