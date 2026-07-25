# 07 — Coroutines vs Update

How to advance time in Drift. The default is `Update` forwarding an extracted `Tick`/`Step`; coroutines are a deliberate, narrower tool.

## The Drift default: `Update` → extracted step

Every per-frame behaviour in the spine splits into two parts:

1. A thin `Update` that reads `Time.deltaTime` (and input) and forwards it.
2. A public, pure-ish step method taking `deltaSeconds` that does the actual work.

```csharp
// OxygenSystem.cs
void Update() => Tick(Time.deltaTime);

public void Tick(float deltaSeconds)   // tests drive this directly
{
    EnsureInitialized();
    if (deltaSeconds <= 0f) return;
    if (drainEnabled) _meter.Tick(deltaSeconds, drainPerSecond);
    if (_meter.IsDepleted && _health != null && !_health.IsDead)
        _health.TakeDamage(suffocationDamagePerSecond * deltaSeconds);
}
```

Same shape in `MutatedCrewEnemy` (`Update` → `Step(float)`, `:91`) and `TopDownPlayerController` (`Update` → `ResolveMove(input, sprint, dt)`, `:88`). This is **the** reason the survival/FSM/movement economy is testable outside Play mode (`ARCHITECTURE.md` §6, §7): a test calls `Tick(1f)` ten times and asserts the meter drained, without Unity ever running `Update`.

This extracted-step pattern is non-negotiable for anything that needs coverage — it's the third leg of the EditMode-safe contract (Hard Rule #11, `10-editmode-safe-patterns.md`).

## Why coroutines are the *non*-default

A coroutine (`IEnumerator` + `StartCoroutine` + `yield return`) is driven by Unity's runtime scheduler. That gives it two properties that conflict with the spine's discipline:

- **It does not run in EditMode tests.** Coroutines need the Play-mode loop; there's no `Time.deltaTime` ticking in an EditMode test, and `yield return new WaitForSeconds(...)` never resumes. Logic inside a coroutine is invisible to the EditMode suite that guards the spine.
- **It hides time in control flow.** A coroutine's "state" is its suspension point — you can't call it with an explicit `deltaSeconds` and assert the result deterministically the way you can with `Tick`.

So: **don't put gameplay economy logic (drain, damage, FSM transitions, crafting gates) in coroutines.** Keep it in extracted steps where the EditMode suite can reach it.

## When coroutines ARE the right tool

Coroutines earn their place for **one-shot, time-sequenced, non-economy presentation flows** that don't need EditMode coverage:

- A timed sequence: "play descend animation, wait 1.5s, then teleport." (The *teleport* and phase change stay in the testable loop logic; only the *delay/sequencing* is the coroutine.)
- Fading a HUD element, a one-off spawn cadence, a "do X next frame" (`yield return null`).
- Anything that's inherently about *waiting* and is `game-feel-juice-guardian`'s territory anyway.

Even then, prefer to keep the *decision* (what happens) in testable code and let the coroutine own only the *timing* (when).

## `Update` vs `FixedUpdate` vs `LateUpdate`

| Callback | Cadence | Use for | Drift |
|---|---|---|---|
| `Update` | every frame (variable dt) | gameplay logic, input, the extracted-step forwarders | the default everywhere |
| `FixedUpdate` | fixed physics step | `Rigidbody` forces, physics-coupled motion | not used in Tier 0 (movement is `CharacterController.Move`, not physics forces) |
| `LateUpdate` | every frame, after all `Update`s | camera follow (read final positions) | `TopDownFollowCamera` territory |

Tier 0 movement uses `CharacterController.Move` from `Update` (`TopDownPlayerController.cs:80`), not `Rigidbody` physics, so `FixedUpdate` isn't in play. If a future feature adds rigidbodies, physics motion moves to `FixedUpdate` — flag that as a design change.

## `Time.deltaTime` hygiene

- The extracted step takes `deltaSeconds` as a **parameter** — it never reads `Time.deltaTime` itself. Only `Update` reads `Time.deltaTime` and passes it down. That's what makes the step deterministic in tests.
- Guard against non-positive dt: every Drift step early-returns on `deltaSeconds <= 0f` (`OxygenSystem.Tick`, `SurvivalMeter.Tick`). Do the same.
- Don't read `Time.deltaTime` inside nested helpers — thread the parameter through (`MoveTowards(direction, deltaSeconds)` in `MutatedCrewEnemy`).

## Findings to raise

- **Must-fix:** gameplay economy/FSM/movement logic implemented in a coroutine (untestable in EditMode) instead of an extracted `Tick`/`Step`.
- **Should-refactor:** an extracted step reading `Time.deltaTime` internally instead of taking `deltaSeconds` (breaks determinism); per-frame logic written directly in `Update` with no extracted method when the component needs coverage.
- **Note:** pure presentation timing (fades, one-shot delays) is a legitimate coroutine use and largely `game-feel-juice-guardian`'s call — don't flag it as a violation.
