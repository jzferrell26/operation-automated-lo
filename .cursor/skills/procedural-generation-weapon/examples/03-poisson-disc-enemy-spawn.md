# Example 03 — A Seeded Poisson-Disc Enemy-Spawn Distribution

**Goal:** scatter enemy spawn points across a sector with a minimum separation (blue noise), so the
same seed always produces the same points and no two points clump. Proves guide 04 (spawn
distribution), 05 (determinism), 07 (testing), and the fsm-ai handoff.

**Tier framing:** Tier-1+. Today `Tier0RuntimeSpawner.CreateEnemy` (`:299`) hand-places one
`MutatedCrewEnemy` at a fixed position and calls `Configure(player, position)`. This example
generates *many* spawn positions deterministically — designed and tested now, not wired in
mid-Tier-0.

## The contract it produces against

`Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs:84` — `Configure(Transform player,
Vector3 spawnPosition)`. The generator produces the **`Vector3` spawn positions**; instantiating an
enemy and calling `Configure` is a thin step, and the FSM behavior at each point is
`fsm-ai-guardian`'s.

## The algorithm (Bridson's Poisson-disc, seeded)

```csharp
public IReadOnlyList<Vector3> Generate()
{
    var points = new List<Vector3>();
    var active = new List<Vector3>();   // ORDERED -> stable removal order (guide 05)

    var first = RandomPointInBounds(_prng, _bounds);
    points.Add(first);
    active.Add(first);

    while (active.Count > 0 && points.Count < _maxCount)
    {
        var idx = _prng.NextInt(0, active.Count);   // seeded pick of an active point
        var origin = active[idx];
        var found = false;

        for (var k = 0; k < 30; k++)               // up to k candidates in the annulus [r, 2r]
        {
            _prng.NextAnnulus(_minSeparation, 2f * _minSeparation, out var dx, out var dz);
            var candidate = new Vector3(origin.x + dx, origin.y, origin.z + dz);
            if (!InBounds(candidate)) continue;
            if (TooClose(points, candidate, _minSeparation)) continue;   // background-grid O(1) in prod
            if (WithinSafeRadius(candidate)) continue;                    // keep entrance/extract clear
            points.Add(candidate);
            active.Add(candidate);
            found = true;
            break;
        }

        if (!found) active.RemoveAt(idx);
    }

    return points;
}
```

`_minSeparation` (r), `_maxCount`, the bounds, and the safe radius are **VALUES owned by
`game-balance-guardian`** (spawn density is difficulty — guide 06). The *algorithm* is this Guardian's.
`_prng` is the seeded `DeterministicPrng` (or a `Derive("spawn")` sub-stream — guide 05).

## The tests (guide 07)

```csharp
[Test]
public void SameSeed_ProducesIdenticalPoints()
{
    var a = Configured(seed: 555).Generate();
    var b = Configured(seed: 555).Generate();
    CollectionAssert.AreEqual(a, b);                 // determinism (guide 05)
}

[Test]
public void NoTwoPoints_CloserThanMinSeparation()    // the spawn invariant (guide 04)
{
    var pts = Configured(seed: 8).Generate();
    for (var i = 0; i < pts.Count; i++)
        for (var j = i + 1; j < pts.Count; j++)
            Assert.GreaterOrEqual(Vector3.Distance(pts[i], pts[j]), _minSeparation - 0.001f);
}

[Test]
public void DifferentSeed_ProducesDifferentPoints()  // not a constant generator
{
    Assert.AreNotEqual(Serialize(Configured(1).Generate()), Serialize(Configured(2).Generate()));
}
```

The minimum-separation test is the **invariant** that proves the distribution is blue-noise, not
clumped. The reproducibility test proves determinism. Both run headless with no `Update`.

## Wiring the points (Tier-1 step, separate from the testable algorithm)

```csharp
foreach (var pos in generator.Generate())
{
    var enemy = SpawnEnemyPrefab(pos);              // instantiation -> perf's concern
    enemy.GetComponent<MutatedCrewEnemy>().Configure(player, pos);  // behavior -> fsm-ai's
}
```

The generator hands a `Vector3` list. Instantiation cost and pooling for many agents is
`mobile-game-perf-guardian`'s; what each enemy *does* is `fsm-ai-guardian`'s.

## Handoffs

- `minSeparation` (r), `maxCount`, zone budgets, safe-radius, density-as-difficulty →
  `game-balance-guardian`.
- The instantiated enemy's behavior (FSM, aggro, leash) → `fsm-ai-guardian` (this Guardian produced the
  `Vector3`; the FSM is `MutatedCrewEnemy`'s).
- Pooling / instantiation budget for many agents → `mobile-game-perf-guardian`.
