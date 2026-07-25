# 05 — Seeding and Determinism

The spine of the whole Weapon. A generator that is a **pure function of `(seed, config)`** is
reproducible at runtime AND drivable in an EditMode test with no Unity lifecycle. This is what
satisfies `CLAUDE.md` Hard Rule #11 and makes procgen verifiable on a headless VM. Get this wrong
and nothing else in the Weapon holds.

## The contract: pure function of `(seed, config)`

Same `seed` + same `config` → **byte-identical output**, every run, every platform. That means:

- No `UnityEngine.Random` (global static, not seedable per-instance, shared across the frame).
- No `DateTime.Now`, no frame count, no `Time.time`, no GUIDs.
- No iteration over **unordered** collections (`HashSet`, `Dictionary`) — their order is not
  guaranteed stable. Iterate ordered structures (arrays, `List`) in a defined order.
- No floating-point order-dependence that differs across platforms in a way that affects branch
  outcomes (prefer integer math for selection decisions; see guide 03's `NextInt`).

## PRNG choice: `System.Random` vs `Unity.Mathematics.Random`

Two seedable surfaces are available in this project:

| | `System.Random` | `Unity.Mathematics.Random` |
|---|---|---|
| Seedable per-instance | Yes (`new System.Random(seed)`) | Yes (`new Random((uint)seed)`) — seed must be non-zero |
| Value type (no GC) | No (class) | Yes (struct) |
| Burst-compatible | No | Yes |
| Cross-platform stream stability | Generally stable `[memory]` | Xorshift, well-defined `[memory]` |

**Recommendation (DEGRADED — re-verify with web access):** prefer `Unity.Mathematics.Random` for
shipped generators — it's a struct (no allocation), Burst-friendly, and has a well-defined Xorshift
stream. `System.Random` is acceptable and simpler for pure-C# tests. **Whichever you pick, pick
ONE per generator and thread it** — never mix, never fall back to `UnityEngine.Random`. A generator
using `UnityEngine.Random` is a **must-fix**. (`Unity.Mathematics.Random` requires a non-zero seed —
map a zero seed to a constant non-zero value.)

## Seed threading (the discipline that breaks most often)

A location generator runs several sub-steps: layout, then loot rolls, then spawn distribution. Each
must be deterministic **and independent** so changing one doesn't shift the others' output.

**Pattern: derive sub-seeds from the master seed, don't reseed globally.**

```
masterSeed
  → layoutSeed = Hash(masterSeed, "layout")
  → lootSeed   = Hash(masterSeed, "loot")
  → spawnSeed  = Hash(masterSeed, "spawn")
```

Each sub-generator gets its own PRNG seeded from its sub-seed. This way the loot rolls don't consume
the layout PRNG's stream (so adding a chunk doesn't shift every loot drop), and the whole location
is still a pure function of the single `masterSeed`. A sub-step that reseeds a shared/global PRNG —
or pulls from another step's stream — is a **should-refactor** (it breaks independence and makes the
output fragile). The `prng-seed-util.cs` template provides this sub-seed derivation.

## No hidden global state (Hard Rule #9)

The PRNG is **owned by the generator** — a field set in `Configure`/`Generate` — or passed in
explicitly. It is never a static singleton another generator could advance in the same frame. Two
generators running in one frame must not interfere; that's only true if neither touches shared
mutable PRNG state.

## Why this equals testability (link to guide 07)

Because the generator is a pure function of `(seed, config)` and runs in an extracted
`Generate()`/`Step()` (not a lifecycle callback), an EditMode test can:

1. `Configure(config, seed)` then `Generate()` — once.
2. `Configure(config, seed)` then `Generate()` — again, same seed.
3. Assert the two outputs are **identical**.

That assertion is impossible if the generator touches `UnityEngine.Random`, time, or unordered
iteration. **Determinism and testability are the same property.** This is the headline of guide 07
and the reason this guide is the spine.

## Saving a run (handoff to save-load)

Because a location is a pure function of its seed, **persisting a generated run is persisting the
seed** (plus the config id). On load, regenerate from the same seed → the same location. This is the
cleanest possible save story, and it's `save-load-guardian`'s to serialize — this Guardian just
guarantees the determinism that makes it a one-field save.

## Output

A seeding invocation produces a **seed-threaded pure-function refactor**: the generator owns a
seedable PRNG, derives independent sub-seeds for each sub-step, touches no global/time state, and is
proven identical-output-per-seed by an EditMode test. See `templates/prng-seed-util.cs`.
