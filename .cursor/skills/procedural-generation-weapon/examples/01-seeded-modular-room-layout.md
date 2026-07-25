# Example 01 — A Seeded Modular-Room Layout Generator (EditMode-testable)

**Goal:** generate an LDOE-style location by assembling authored chunks, so the same seed always
produces the same rooms, and a required tool cache is always reachable from the entrance. Proves
guides 02 (modular layout), 05 (determinism), 07 (EditMode testing), 09 (reachability).

**Tier framing:** Tier-1+ design. The Tier 0 world is hand-placed by `Tier0RuntimeSpawner.cs` and
stays that way. This generator is proven seedable + EditMode-testable *now* so it's verifiable
headless before it's ever wired into a scene.

## The shape

Use `templates/chunk-layout-generator.cs`. The generator is a plain class:

```
Configure(ChunkSet set, LayoutConfig config, int seed)   // explicit wiring, no Awake
LayoutResult Generate()                                   // pure walk -> placement DATA
```

`Generate()`:
1. Places the entrance chunk at the origin; its sockets seed an **ordered** frontier.
2. Grows the layout up to `config.targetChunkCount` by popping the frontier in stable order,
   weighted-selecting a socket-compatible chunk from the seeded PRNG, placing it (or capping the
   opening if nothing fits), and pushing its new sockets.
3. Collects `objective_slot`-tagged cells as `RequiredSlots` and builds the socket `Adjacency` graph.
4. Returns **DATA** — placements + adjacency + required slots. No prefab is instantiated in the
   testable path (instantiation is a separate thin step; perf is `mobile-game-perf-guardian`'s).

## The three tests (guide 07)

```csharp
[Test]
public void SameSeed_ProducesIdenticalLayout()
{
    var a = Configured(seed: 12345).Generate();
    var b = Configured(seed: 12345).Generate();
    CollectionAssert.AreEqual(a.Placements, b.Placements);   // determinism (guide 05)
}

[Test]
public void DifferentSeed_ProducesDifferentLayout()
{
    var a = Configured(seed: 1).Generate();
    var b = Configured(seed: 2).Generate();
    Assert.AreNotEqual(Serialize(a.Placements), Serialize(b.Placements)); // not a constant generator
}

[Test]
public void EveryRequiredSlot_IsReachableFromEntrance()
{
    var result = Configured(seed: 7).Generate();
    Assert.IsTrue(AllReachable(result.Adjacency, result.Entrance, result.RequiredSlots)); // guide 09
}

static bool AllReachable(
    Dictionary<Vector2Int, List<Vector2Int>> adjacency, Vector2Int start, List<Vector2Int> targets)
{
    var seen = new HashSet<Vector2Int> { start };
    var stack = new Stack<Vector2Int>();
    stack.Push(start);
    while (stack.Count > 0)
    {
        var c = stack.Pop();
        if (adjacency.TryGetValue(c, out var neighbours))
        {
            foreach (var n in neighbours)
            {
                if (seen.Add(n)) stack.Push(n);
            }
        }
    }

    foreach (var t in targets)
    {
        if (!seen.Contains(t)) return false;
    }

    return true;
}
```

`Configured(seed)` builds a `ChunkSet` (entrance + a couple of corridors + a `room_medbay` tagged
`objective_slot` + a `capWall`) and calls `Configure(set, config, seed)`. The `ChunkSet` is **data**
(an SO in practice) and the chunk *prefabs* are placeholders here — the real prefabs are
`unity-level-design-guardian`'s.

## Why this satisfies the rules

- **Determinism (guide 05):** seeded `DeterministicPrng`, ordered frontier, declared-order chunk
  iteration → same seed, same rooms. No `UnityEngine.Random`.
- **EditMode-testable (Hard Rule #11 / guide 07):** logic is in `Generate()`, not `Awake`/`Update`;
  the test drives it directly twice.
- **Reachability (guide 09):** the third test flood-fills the socket graph and asserts every
  required slot is reachable — a stranded cache fails the build.
- **Data over code (Hard Rule #3):** chunks live in a `ChunkSet`, not an `if`-ladder.

## Handoffs

- The `weight` and `targetChunkCount` VALUES → `game-balance-guardian`.
- The chunk **prefabs**, room art, socket markers → `unity-level-design-guardian`.
- Instantiating placements + frame budget → `mobile-game-perf-guardian`.
