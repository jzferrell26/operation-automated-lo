# 04 — Steering and Pathfinding (mobile)

This is a stance, not a survey. DRIFT is a top-down survival game on mid-tier phones, and the deliberate position is: **direct steering until a real, measured need proves otherwise.** This guide arms you to argue it.

## 1. What DRIFT does today

`MutatedCrewEnemy` has no pathfinding. It steers straight at the target (`MutatedCrewEnemy.cs:178-187`):

```csharp
void MoveTowards(Vector3 direction, float deltaSeconds)
{
    if (direction.sqrMagnitude <= 0.0001f) return;
    transform.position += direction * (moveSpeed * deltaSeconds);
    Face(direction);
}
```

The chase direction is `(flatPlayer - flatSelf).normalized` (`MutatedCrewEnemy.cs:143`); return steers toward the spawn anchor the same way. This is `com.unity.ai.navigation`-free by design — the package is in `manifest.json` but reserved for Tier 1, and `ARCHITECTURE.md` §8 records the intent: "`MutatedCrewEnemy` uses direct steering; Tier 1 swaps in `com.unity.ai.navigation` for pathing."

## 2. Why simple steering usually wins here

The GDD already made the call: "Unity NavMesh for pathing. LDoE enemies aren't sophisticated; aggro + pathing is enough" (GDD §8). But "enough" is the ceiling, not the floor — and for a *gray-box top-down* the floor (direct steering) is often all you need. The argument, point by point:

1. **Open top-down zones have few obstacles to route around.** A planet-surface scavenging zone and a station deck are mostly open floor. A* shines in mazes; it's dead weight on a field. The player can *see* the enemy walking straight at them, and on a flat zone that reads as correct, not dumb.
2. **The swarm is the design.** Mutations are a "melee swarm" (GDD §13). A swarm means *many* agents. Per-agent NavMesh path queries — even amortized — cost far more than a vector subtract and normalize. On a phone you hit the agent budget on pathfinding overhead long before the gameplay needs it (hand the exact budget to `mobile-game-perf-guardian`).
3. **Steering is trivially deterministic and testable.** `RuntimeEnemyTests.Enemy_Chase_MovesTowardThePlayer` asserts the gap closes after one `Step` (`RuntimeEnemyTests.cs:61-75`). A NavMesh agent's movement is driven by Unity's nav system, which doesn't run in EditMode — you'd lose that test, violating Hard Rule #2. Steering keeps the FSM a pure function of (state, world).
4. **No bake step, no surface, no project config drift.** DRIFT deliberately stays "light on project configuration" (`TIER0.md`) — no committed scene, NavMesh-free. Adding NavMesh adds a bake artifact and a surface to maintain before the loop is even proven fun.

## 3. When pathfinding is actually justified (the honest other side)

Don't be dogmatic. Steering breaks down in specific, *measurable* situations. Reach for pathing when **all** of these hold:

- Zones gain **concave obstacles** (interior walls, U-shaped cover) where straight steering visibly sticks agents on geometry, AND
- Cheap local avoidance (a single forward whisker raycast that nudges the steering vector — see §4) doesn't resolve it, AND
- The agent count at which you need it is within the measured mobile budget (`mobile-game-perf-guardian`'s call).

Even then, the order of escalation is: **direct steering → steering + local avoidance → NavMesh → grid A*.** Most DRIFT cases never pass step two. Grid A* in particular is almost never right for this game — it's for tile-grid pathing with many blocked cells, which a top-down scavenging field isn't.

A pathfinding switch is an architectural decision: write it up as `library/architecture/ADR-<n>-enemy-pathfinding.md` with the measured trigger, and co-own the cost with `mobile-game-perf-guardian`. Don't slip it in.

## 4. Local avoidance — the cheap middle ground

Before NavMesh, a forward "whisker" check that deflects the steering vector handles most stuck-on-geometry cases at a fraction of the cost:

```csharp
Vector3 Steer(Vector3 desired)
{
    // desired is already normalized toward the target
    if (Physics.Raycast(transform.position, desired, out _, _whiskerLength, _obstacleMask))
        desired = Vector3.Lerp(desired, _lastClearDir, 0.5f).normalized;  // nudge around
    else
        _lastClearDir = desired;
    return desired;
}
```

**Testability caveat (Hard Rule #2):** same as LOS in `guides/03` — a raw `Physics.Raycast` in `Step` isn't deterministic in EditMode. Put avoidance behind an injectable seam (`Func<Vector3, bool> IsBlocked`) so a test can drive the deflection branch, and keep the *pure-steering* path (no obstacle) the default that `RuntimeEnemyTests`-style tests assert. The whisker length is a tunable → `game-balance-guardian` (or feel → `game-feel-juice-guardian`); the *deflection behavior* is yours.

## 5. Keep `Step` allocation-free

Steering math must not allocate per tick — no `new` arrays, no LINQ, no closures in the hot path. `MutatedCrewEnemy.MoveTowards` is alloc-free (vector ops on the stack). A swarm of agents each allocating per frame is a GC stall on mobile. The *budget* is `mobile-game-perf-guardian`'s; keeping `Step` clean so the budget is *meetable* is yours.

## 6. Steering review checklist

- [ ] Default is direct steering; any NavMesh/A* has a written, measured justification (ADR).
- [ ] Movement is flattened to the top-down plane (no Y drift from steering).
- [ ] Any obstacle/avoidance query is behind an injectable seam, asserted via `Step`.
- [ ] The no-obstacle pure-steering path remains the EditMode-tested default.
- [ ] `Step` is allocation-free; hot comparisons use `sqrMagnitude`.
- [ ] Escalation order respected: steering → local avoidance → NavMesh → A* (rarely).
