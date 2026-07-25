# Example 02 — Trauma-Based Screenshake Utility

**Request:** "Add screenshake" / "give the breach and the hits some camera punch."

We build a reusable, trauma-based `CameraShake` (`templates/screenshake.cs`), inject it into the existing `TopDownFollowCamera`, and cap it for mobile. Theory is in `guides/03-screenshake.md`.

## 1. Why trauma, not "shake the camera"

Naive random-offset shake stacks badly, pops on/off, and is the same for a tap and a cannon. The Eiserloh trauma model fixes all three: a `[0,1]` trauma value that **decays**, with magnitude ∝ `trauma²` (natural falloff), sampled via **Perlin** (smooth, not static), and a **hard cap** (mobile-safe). See `research/research-plan.md` for the source talk.

## 2. The utility

`templates/screenshake.cs` provides `CameraShake`:

- `AddTrauma(amount)` — events add trauma (light hit `~0.25`, heavy event like the breach `~0.7`), clamped to 1.
- `Step(dt)` — decays trauma (`traumaDecayPerSecond`), advances Perlin time, recomputes `CurrentOffset` (positional) and `CurrentRoll` (rotational), both `∝ trauma²` and clamped by `maxShake` / `maxAngle`.
- `CurrentOffset` / `CurrentRoll` — read by the camera.

It is EditMode-safe (lazy-init + `AddTrauma` entry point + deterministic `Step` + a `SetNoiseTimeForTest` seam).

## 3. Compose with `TopDownFollowCamera` (don't fight the follow)

The camera already lerps toward a damped `desired` in `LateUpdate` (read `Assets/Scripts/Drift/Gameplay/CameraRig/TopDownFollowCamera.cs:44-45`). The clean seam: compute the damped follow position **then add the shake offset on top**.

Minimal change to `TopDownFollowCamera.LateUpdate`:

```csharp
var desired = new Vector3(target.position.x, height, target.position.z);
var follow  = Vector3.Lerp(transform.position, desired, followSharpness * Time.deltaTime);

// Shake composes on top of the damped follow (and on top of look-ahead, example 03).
if (_shake != null)
{
    _shake.Step(Time.deltaTime);
    follow += _shake.CurrentOffset;
    // top-down view is Euler(90,0,0); roll adds Z on top:
    transform.rotation = Quaternion.Euler(90f, 0f, _shake.CurrentRoll);
}
transform.position = follow;
```

Wire `_shake` via a `Configure(CameraShake shake)` (or `GetComponent`), keeping the camera testable. **Alternative:** a child-rig where the camera follows and a child shakes — zero camera change. Pick per the human's preference.

> If `CameraShake.LateUpdate` also calls `Step`, you'd double-step. When the camera drives `Step`, remove the component's own `LateUpdate` (the template notes this). One owner of `Step` per frame.

## 4. Fire trauma from events

- **Melee hit:** `shake.AddTrauma(0.25f)` at the hit site (`examples/01`).
- **Hull breach:** `shake.AddTrauma(0.7f)` on `HullBreachEvent.BreachActivated` — a big, readable jolt for the signature raid moment.
- **Enemy death:** a medium bump on `Health.Died`.

The trauma *amounts* per event are the human's to tune; you wire the calls.

## 5. Mobile cap (the readability gate)

`orthographicSize = 11`; `maxShake = 0.5` world units is a few percent of view — plenty. Bias positional over rotational; keep `maxAngle` ≤ 2°. Test the **worst case** (multi-hit + breach saturating trauma to 1) and confirm it's tolerable on a phone — that's a feel/nausea call for the human on device (`guides/08-mobile-readability.md`).

## 6. EditMode test sketch

```csharp
var shake = go.AddComponent<CameraShake>();
shake.SetNoiseTimeForTest(0.3f);
shake.AddTrauma(0.5f);
shake.Step(0.0f);
Assert.Greater(shake.CurrentOffset.magnitude, 0f);     // shakes when traumatized
for (int i = 0; i < 60; i++) shake.Step(0.1f);
Assert.AreEqual(0f, shake.Trauma, 1e-4f);              // decays to zero
Assert.LessOrEqual(shake.CurrentOffset.magnitude, 0.5f * Mathf.Sqrt(2f)); // capped
```

## 7. Cost

A handful of Perlin samples + a vector add per frame — negligible CPU. The real constraint is **nausea/readability**, which is a feel cap (human) not a perf cap. If anything surprising shows in the Profiler, defer to `mobile-game-perf-guardian`.

## 8. Tuning table (hand to the human)

| Knob | `[SerializeField]` | Start | Range | Changes |
|---|---|---|---|---|
| Max shake | `maxShake` | `0.5` | `0.2–1.0` | Positional jolt ceiling |
| Max angle | `maxAngle` | `2.0` | `0–5` | Rotational roll ceiling |
| Trauma decay | `traumaDecayPerSecond` | `1.2` | `0.8–2.0` | How fast it settles |
| Frequency | `frequency` | `20` | `12–30` | Jolt vs buzz |
| Exponent | `traumaExponent` | `2` | `2–3` | Falloff steepness |
| Trauma per hit / breach | caller | `0.25` / `0.7` | tune | Per-event shake size |

## 9. The handoff (CLAUDE.md §7)

> This is yours to tune. The `CameraShake` utility is trauma-based, capped, mobile-considerate, and composes cleanly on top of the existing follow damping. Starting values follow the Eiserloh trauma model (`research/research-plan.md`) and are first-pass. **Whether the shake feels right — and isn't nauseating on a phone — is your call (§7).** Verify on a device. Frame-budget surprises go to `mobile-game-perf-guardian`.
