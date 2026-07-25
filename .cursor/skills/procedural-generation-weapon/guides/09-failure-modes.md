# 09 — Failure Modes

The recurring ways procgen breaks, each with its root cause and the test that catches it. Most trace
back to one of two sins: **non-determinism** (guide 05) or **a missing invariant check**.

## 1. Non-reproducibility (the cardinal sin)

**Symptom:** the same seed produces different output across runs, so a run can't be reproduced or
EditMode-tested.

**Root causes:**
- `UnityEngine.Random` static anywhere in the generator (**must-fix**).
- `DateTime.Now`, `Time.time`, frame count, or a `GUID` feeding a decision.
- Iterating an **unordered** collection (`HashSet`/`Dictionary`) whose order isn't stable.
- Float order-dependence across platforms flipping a branch.

**Catch:** the reproducibility test (guide 07) — `Configure(seed)` + `Generate()` twice, assert
identical. It fails immediately on any of these. **Fix:** seed-threaded PRNG owned by the generator,
ordered iteration, integer selection math (guide 05).

## 2. Stranded / unreachable chunk (the loop-breaker)

**Symptom:** a required tool cache or the extract pad lands behind a chunk that never connected, so
the player can't reach it → can't craft → can't progress. Breaks the GDD loop.

**Root cause:** placing required content without validating connectivity from the entrance.

**Catch:** the reachability invariant test (guide 07) — flood-fill the socket graph from the
entrance, assert every required slot is reachable. **Fix:** validate reachability *after* the shell
and *before* returning; if a seed fails, fail loud (don't ship a broken location). Optionally retry
with a derived sub-seed, capped, then surface the failure. Reachability failure is a **must-fix**.

## 3. Clumped or gridded spawns

**Symptom:** enemies spawn on top of each other (uniform-random clumping) or in a visible lattice
(naive grid), both reading as wrong pacing.

**Root cause:** pure-random placement, or a grid stamp, instead of blue-noise.

**Catch:** the minimum-separation invariant (guide 04) — assert no two spawn points are closer than
`minSeparation`. **Fix:** Poisson-disc sampling (guide 04). Missing minimum separation is a
**should-refactor** (clumping); using `UnityEngine.Random` to do it is a **must-fix** (also fails #1).

## 4. Seed bleed between sub-steps

**Symptom:** adding a chunk to the layout shifts every loot drop and spawn point, because the
sub-steps share one PRNG stream — small input changes ripple unpredictably.

**Root cause:** one PRNG threaded through layout → loot → spawn, so consuming more in step 1 changes
step 2's stream.

**Catch:** a test that changes the layout config slightly and asserts the loot rolls are unaffected
(when they should be independent). **Fix:** derive independent sub-seeds from the master seed
(guide 05, `prng-seed-util.cs`). This is a **should-refactor**.

## 5. Hardcoded table / chunk ladder (data-over-code violation)

**Symptom:** loot or chunk selection is an `if (roll < 0.6) return scrap;` ladder in C#, so adding
content needs a recompile and balance can't tune it.

**Root cause:** ignoring Hard Rule #3.

**Catch:** review — selection logic that references item ids/literals directly instead of iterating
a `DropTableDefinition`/`ChunkSet` SO. **Fix:** move the table to data; the algorithm iterates the
data (guide 03). This is a **must-fix** (it also blocks the balance handoff).

## 6. Constant generator (ignores its seed)

**Symptom:** every seed produces the same output — the generator takes a seed but never uses it (or
uses it for nothing load-bearing).

**Root cause:** a `Configure(seed)` that stores the seed but the algorithm uses a fixed order / no
PRNG draw.

**Catch:** the variation test (guide 07) — different seeds must produce different output. **Fix:**
ensure every nondeterministic-by-design choice draws from the seeded PRNG. **Must-fix** (the
generator isn't generating).

## 7. Allocation spike during generation

**Symptom:** a generation pass spikes GC (LINQ in hot loops, per-candidate allocations, unsized
collections), causing a hitch.

**Root cause:** allocation-unaware generation.

**Catch:** profiling (perf's tool) flags it; review catches obvious LINQ-in-loop. **Fix:** pre-size
collections, reuse buffers, avoid LINQ in the inner loop (guide 04). This Guardian keeps the pass
GC-conscious; the **frame-budget verdict and pooling are `mobile-game-perf-guardian`'s** — hand off
the budget call, fix the obvious allocations here. **Should-refactor** (unless it's a measured frame
break, which perf adjudicates).

## 8. Untestable generation (logic in a lifecycle callback)

**Symptom:** the generator's logic lives in `Awake`/`Start`/`Update`, so EditMode can't drive it
(Unity doesn't call those on script-added components).

**Root cause:** ignoring Hard Rule #11 / the `Configure`+`Step` shape.

**Catch:** there's no way to write the reproducibility test — that absence *is* the finding. **Fix:**
extract to `Configure` + `Generate()`/`Step()` (guide 07). **Must-fix.**

## The meta-rule

Every failure mode above is caught by **one of the three test shapes** (reproducibility, variation,
invariant) or by a **review against the data-over-code / no-global-PRNG rules**. If a generator
ships with those three tests and passes the data/PRNG review, it is robust against this list. That's
why guide 07 is non-negotiable.
