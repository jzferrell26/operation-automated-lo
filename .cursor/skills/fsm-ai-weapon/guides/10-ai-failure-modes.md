# 10 — AI Failure Modes

The recurring ways top-down FSM AI goes wrong, each with the symptom, the root cause, and the fix — anchored on how `MutatedCrewEnemy` avoids it. Use this as a diagnostic checklist when someone reports "the enemy is doing something weird."

## 1. Un-leashed aggro (the #1 failure)

- **Symptom:** an enemy chases the player to the far edge of the zone and never comes back; zones depopulate; the player can "train" every enemy into one spot.
- **Root cause:** a chase/pursue state with no return condition.
- **Fix:** every pursuing state checks a leash *first* and breaks to Return. `MutatedCrewEnemy` checks `leashDistance > leashRadius` at the top of both Chase and Attack (`MutatedCrewEnemy.cs:131`, `:147`). Return steers home and re-enters Idle on arrival.
- **Severity:** must-fix. **This is the one to check on any new pursuing state** (Principle #4).

## 2. State thrash / jitter at a boundary

- **Symptom:** the enemy flickers between two states every frame at a range boundary — visible as stutter, or attacks firing erratically.
- **Root cause:** the enter and exit conditions for adjacent states use the *same* threshold, so an agent sitting on the line toggles each tick.
- **Fix:** add a hysteresis band. `MutatedCrewEnemy` exits Attack→Chase at `attackRange * 1.25f`, not `attackRange` (`MutatedCrewEnemy.cs:153`) — you must leave *before* you'd re-enter. Same idea for a de-aggro radius larger than the detect radius (`guides/03 §3`). The *structure* (a band exists) is yours; the *size* (`1.25`) is `game-balance-guardian`'s.
- **Severity:** must-fix if it produces erratic behavior; the hysteresis is structural.

## 3. Detect/leash inversion

- **Symptom:** an enemy aggros and instantly returns, never reaching the player.
- **Root cause:** `leashRadius <= detectRadius`, so the target is already outside leash the moment chase begins.
- **Fix:** enforce the invariant `leashRadius > detectRadius` (in `MutatedCrewEnemy`, 16 > 10). Flag it as a behavior bug even though the fix is a number — the *relationship* is broken (`guides/03 §3`).
- **Severity:** must-fix (broken invariant), then hand the values to balance.

## 4. The untestable transition (the silent killer)

- **Symptom:** none at first — then a transition quietly stops working after an unrelated change, and no test caught it.
- **Root cause:** the transition only fires from inside `Update`, or depends on state initialized only in `Awake`, or a target resolved only in `Start` — so EditMode can't reach it and there's no test (Hard Rule #11).
- **Fix:** route it through `EnsureInitialized()` + `Configure(...)` + extracted `Step` and add a `Step`-driven test (`guides/08`). Every branch the shipped suite covers (`RuntimeEnemyTests`) is a branch that *can't* silently break.
- **Severity:** must-fix. An untestable transition is a latent regression with no alarm.

## 5. Stuck on geometry

- **Symptom:** an enemy walks into a wall/corner and grinds in place because direct steering points straight through the obstacle.
- **Root cause:** pure steering with no local avoidance in a zone that gained concave obstacles.
- **Fix:** add a forward-whisker deflection *before* reaching for NavMesh (`guides/04 §4`), behind an injectable seam so it stays testable. Escalate to NavMesh only if avoidance genuinely fails and the agent budget allows (`mobile-game-perf-guardian`). Don't jump to A*.
- **Severity:** should-refactor (it's a zone-shape regression, not a logic bug) unless it traps the player.

## 6. Y-axis aggro noise

- **Symptom:** enemies detect or mis-range based on tiny height differences (capsule pivots, sloped floor).
- **Root cause:** distance measured in full 3D instead of flattened to the top-down plane.
- **Fix:** flatten before measuring, as `MutatedCrewEnemy.Flat`/`FlatDistance` do (`MutatedCrewEnemy.cs:225-233`). Always, in a top-down game.
- **Severity:** must-fix (it makes aggro non-deterministic and untestable cleanly).

## 7. Leaked / double-fired event handlers

- **Symptom:** in tests, an assault completes twice, or a re-`Configure`d component reacts to the old dependency; handlers accumulate across test runs.
- **Root cause:** subscribing without unsubscribing — no symmetry between `Configure`/`Awake` (subscribe) and `OnDestroy`/re-`Configure` (unsubscribe).
- **Fix:** copy `Tier0RaiderAssault`'s discipline — `Configure` unsubscribes the old before subscribing the new (`Tier0RaiderAssault.cs:35-42`), `SubscribeBreach` guards double-subscribe, `OnDestroy` unsubscribes (`Tier0RaiderAssault.cs:71-96`).
- **Severity:** must-fix (it breaks EditMode determinism).

## 8. Allocation in the per-tick path

- **Symptom:** frame hitches/GC stalls once several enemies are active.
- **Root cause:** `new` arrays, LINQ, boxing, or closures inside `Step` — multiplied across a swarm.
- **Fix:** keep `Step` allocation-free (stack vector ops, `sqrMagnitude`, cached components) as `MutatedCrewEnemy.Step` is. The *budget* is `mobile-game-perf-guardian`'s; the *clean hot path* is yours.
- **Severity:** must-fix for the behavior side (no allocation in `Step`); the budget math hands off.

## 9. Hardcoded behavior that should be a transition (or a number)

- **Symptom:** an enemy "always does X" and you can't change it without editing logic; or a magic constant lives in the FSM.
- **Root cause:** behavior baked into code that should be a guarded transition, or a tunable inlined into logic.
- **Fix:** if it's *when something happens*, make it a transition you own; if it's *how much/how far/how long*, surface it to `game-balance-guardian`. Never inline a new magic number into `Step`.
- **Severity:** must-fix (magic number) / should-refactor (bakable behavior).

## 10. Aggro tunnel (over-eager perception)

- **Symptom:** every enemy in the zone wakes at once / aggros through everything; encounters feel undifferentiated.
- **Root cause:** detect radius too generous, or LOS missing where the archetype needs it.
- **Fix:** the *radius* is balance's; the *missing-LOS* is yours — add LOS for tactical archetypes (raider) behind an injectable seam (`guides/03 §4`). Diagnose which it is before touching anything.
- **Severity:** behavior side (missing LOS) is your should-refactor; the radius is balance's.

## Diagnostic order

When handed "the AI is weird," check in this order: (1) is it a *number* or a *behavior*? hand off if it's a number; (2) un-leashed?; (3) thrashing at a boundary?; (4) flattened distance?; (5) is the transition even tested? — write the failing test, it usually localizes the bug. Then fix, add the `Step`-driven test, and confirm the suite stays green.
