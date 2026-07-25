# 03 — Perception and Aggro

Perception is what turns a state machine into an *enemy*. It's also where behavior and balance numbers sit closest together, so it's where the behavior-vs-numbers line (Principle #1) matters most.

## 1. What perception decides (and who owns what)

Perception feeds exactly three transitions in the canonical FSM:

| Transition | Perception input | Behavior (yours) | Number (game-balance's) |
|---|---|---|---|
| Idle → Chase | distance to target | "aggro when target is close enough" | `detectRadius` |
| Chase → Return | distance from spawn anchor | "break off when dragged too far" | `leashRadius` |
| Chase → Attack | distance to target | "engage when in reach" | `attackRange` |

You own the *shape*: a distance comparison, a flat-plane projection, a line-of-sight gate. The threshold values are surfaced to `game-balance-guardian`. When someone says "it aggros from across the map," your answer is either "the *condition* is wrong" (your fix) or "the *radius* is too big" (their fix) — diagnose which before touching anything.

## 2. Distance perception — keep it flat and cheap

`MutatedCrewEnemy` projects onto the XZ plane before measuring (`MutatedCrewEnemy.cs:225-233`):

```csharp
static Vector3 Flat(Vector3 p) => new Vector3(p.x, 0f, p.z);
static float FlatDistance(Vector3 a, Vector3 b) => Vector3.Distance(Flat(a), Flat(b));
```

This is correct for a top-down game: vertical offset (capsule heights, slightly different Y) must not affect aggro. Always flatten before distance-comparing in a top-down FSM, or enemies will mis-detect based on height noise.

Use **squared distance** when you only need a comparison and not the actual magnitude — `toPlayer.sqrMagnitude <= detectRadius * detectRadius` skips a `sqrt`. `MutatedCrewEnemy` uses `.magnitude` for readability at one agent; in a swarm hot path, prefer `sqrMagnitude` (perf rationale → `mobile-game-perf-guardian`; the behavior is identical).

## 3. The detect/leash relationship

Two radii, one invariant: **`leashRadius` must exceed `detectRadius`** (in `MutatedCrewEnemy`, 16 vs 10). If leash ≤ detect, an enemy can aggro and instantly leash-break in the same step — a thrash. You own the *invariant* ("leash must be larger than detect"); the *values* are balance's. Flag a violation as a must-fix behavior bug even though the fix is a number — because the *relationship* is broken, not just the tuning.

Optional refinement (forward design): a separate, larger **de-aggro radius** so an enemy that has acquired a target keeps chasing slightly past `detectRadius` before giving up — hysteresis on aggro itself, mirroring the `attackRange * 1.25f` band in `guides/01`. Design it; let balance size it.

## 4. Line-of-sight — only when a check needs it

The Tier 0 mutation has no LOS check: it's a melee swarm in open zones, and pure distance aggro is right for it (GDD §8: "aggro + pathing is enough"). **Don't add LOS to the mutation.**

LOS becomes relevant for the **raider** archetype (GDD §13: "ranged, tactical") — a ranged enemy that shouldn't shoot through walls, and that should enter a Search state when it loses sight (`guides/07-enemy-archetypes.md`). When you add it:

```csharp
bool HasLineOfSight(Vector3 from, Vector3 to)
{
    var dir = to - from;
    return !Physics.Raycast(from, dir.normalized, dir.magnitude, _obstacleMask);
}
```

**Testability caveat (Hard Rule #2):** a raw `Physics.Raycast` inside `Step` is not deterministic in EditMode — there's no physics scene to query against script-added objects. Put LOS behind a seam you can fake:

```csharp
public Func<Vector3, Vector3, bool> LineOfSightCheck = DefaultRaycast;  // overridable in tests
```

The test injects a stub returning `true`/`false`; the FSM transition is asserted via `Step` as usual. This mirrors how `MutatedCrewEnemy.Configure` injects the target instead of resolving it through physics/tags. Without this seam, an LOS-gated transition is untestable — a must-fix.

## 5. Target acquisition — inject, don't hunt

`MutatedCrewEnemy` acquires its target two ways:

- **Production:** `Start()` does `FindGameObjectWithTag("Player")` (`MutatedCrewEnemy.cs:66-78`).
- **Tests + spawner:** `Configure(player.transform, spawn)` injects it directly (`MutatedCrewEnemy.cs:84`).

The `Configure` path is what makes the FSM testable — `RuntimeEnemyTests` never relies on tags (`RuntimeEnemyTests.cs:37`). **Any new perception that needs a target must accept it through `Configure`, not resolve it inside `Step`/`Start` only.** For multi-target perception (a raider picking the nearest of several threats), pass the candidate set through `Configure` or a setter the test can drive — never a `FindObjectsByType` call buried in `Step`.

## 6. Perception review checklist

- [ ] Distance checks are flattened to the top-down plane.
- [ ] `leashRadius > detectRadius` invariant holds (flag violations even though the fix is a number).
- [ ] No LOS on the melee mutation; LOS only where the archetype needs it.
- [ ] Any LOS / physics perception is behind an injectable seam, asserted via `Step`.
- [ ] Target(s) arrive via `Configure`, never resolved only in `Start`/`Step`.
- [ ] Thresholds surfaced to `game-balance-guardian`, not hardcoded as new magic numbers.
- [ ] Hot-path comparisons use `sqrMagnitude` where the magnitude itself isn't needed.
