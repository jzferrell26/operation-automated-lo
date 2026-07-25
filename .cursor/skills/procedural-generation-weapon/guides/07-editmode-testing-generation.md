# 07 — EditMode Testing of Generation

`CLAUDE.md` Hard Rule #11 in depth, applied to generators. This is the rule that keeps procgen
verifiable on a headless VM with no editor — and it falls straight out of determinism (guide 05).
A generator that can't be stepped in EditMode does not ship.

## Why EditMode generators need the lazy-init + Configure + extracted-method shape

Unity does **not** run `Awake`/`Start`/`Update` on script-added components in EditMode
(`ARCHITECTURE.md` §7, `CLAUDE.md` Hard Rule #11). The as-built repo already solves this — see the
two reference shapes:

- `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs` — `EnsureInitialized()` (lazy-init),
  `Configure(player, spawn)` (explicit dependency wiring), and `Step(deltaSeconds)` (the extracted
  logic the test drives directly). `Update()` just forwards `Time.deltaTime` to `Step`.
- `Assets/Scripts/Drift/Gameplay/Salvage/SalvageNode.cs` — `Configure(item, amount[, toolId])`
  wires state without depending on `Start`.

Generators follow the same shape:

```
EnsureInitialized()        // lazy: build PRNG/buffers on first use, idempotent
Configure(config, seed)    // explicit: wire the ChunkSet/DropTable/zones + seed, no Awake needed
TResult Generate()         // extracted: runs the whole algorithm, returns DATA, no lifecycle
```

`Generate()` (or `Step()` for incremental generators) contains **all** the logic. Any
`MonoBehaviour` wrapper's `Awake`/`Start` only forwards into these. The test never relies on Unity
calling a lifecycle method.

## The canonical generation test (modeled on RuntimeEnemyTests)

The existing `Assets/Tests/EditMode/RuntimeEnemyTests.cs` drives `MutatedCrewEnemy.Step`
deterministically without `Update`. A generation test mirrors it:

```
[Test]
public void SameSeed_ProducesIdenticalLayout()
{
    var gen = new ChunkLayoutGenerator();          // or a script-added MonoBehaviour
    gen.Configure(chunkSet, config, seed: 12345);
    var a = gen.Generate();

    var gen2 = new ChunkLayoutGenerator();
    gen2.Configure(chunkSet, config, seed: 12345);
    var b = gen2.Generate();

    CollectionAssert.AreEqual(a.Placements, b.Placements);   // byte-identical -> determinism proven
}

[Test]
public void DifferentSeed_ProducesDifferentLayout()        // guard against a constant generator
{
    // ... seed 1 vs seed 2 -> NOT equal
}

[Test]
public void EveryRequiredSlot_IsReachableFromEntrance()      // the reachability invariant (guide 09)
{
    var result = Configured(seed: 7).Generate();
    Assert.IsTrue(Reachability.AllReachable(result, result.Entrance, result.RequiredSlots));
}
```

The three test shapes every generator ships with:

1. **Reproducibility** — same seed → identical output (proves determinism).
2. **Variation** — different seed → different output (guards against a generator that ignores its
   seed and returns a constant — a sneaky must-fix).
3. **Invariant** — the property that must always hold: reachability for layout (guide 09), minimum
   separation for spawns (guide 04), weight-fidelity for loot (guide 03, e.g. over many seeds the
   distribution matches the weights within tolerance).

## Return DATA, instantiate separately

Keep the testable `Generate()` returning **plain data** (a placement list, a `Vector3[]`, an
`(item, amount)`), and put the `Instantiate`/`Configure`-the-prefab step in a separate thin method.
`Instantiate` and most `UnityEngine.Object` work is awkward/expensive in EditMode; the algorithm
isn't. Separating them keeps the algorithm test pure and fast, and lets the instantiation step be a
PlayMode/perf concern (`mobile-game-perf-guardian`).

## EditMode-legal cleanup

If a generator's test does touch `GameObject`s, destroy with `DestroyImmediate` (not `Destroy`,
which is illegal/deferred in edit mode) — the repo's `Tier0RuntimeSpawner.DestroyObject` already
encodes this `Application.isPlaying` split. Prefer not creating objects in the algorithm test at all.

## No allocation in a per-step generator

If a generator is incremental (`Step()` called repeatedly), keep the per-step path allocation-free
(reuse buffers) — same discipline as `MutatedCrewEnemy.Step`. One-shot `Generate()` may allocate its
result, but pre-size collections. Frame budget is `mobile-game-perf-guardian`'s; testability and
GC-consciousness are this Guardian's.

## Lane handoff

- **The EditMode harness, the CI runner, batchmode plumbing** → `unity-test-ci-guardian`. This Guardian
  **co-owns the test pattern** (what to assert: reproducibility, variation, invariant) and writes
  the seed-driven test shape; they own the runner that executes it.

## Output

A testability invocation produces a **refactor to lazy-init + `Configure` + extracted
`Generate()`/`Step()`** plus the **three-test shape** (reproducibility, variation, invariant) — the
proof that the generator is verifiable headless. A generator without these is a must-fix.
