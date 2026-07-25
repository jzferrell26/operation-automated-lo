# 01 — Procedural Philosophy (modular-over-noise for this game)

The first decision in any procgen system is *what kind* of generation. For DRIFT the answer is
settled: **modular-chunk assembly, not noise terrain.** This guide makes the case and draws the
line for when noise still earns a place.

## The taxonomy (Shaker, Togelius & Nelson `[memory]`)

Procedural content generation splits roughly into:

- **Constructive** — assemble content from authored pieces by rules (place chunk, connect socket,
  validate). Deterministic, debuggable, human-readable output. **This is DRIFT's lane.**
- **Search-based** — generate-and-test against a fitness function (evolve a level until it scores
  well). Powerful, but heavy and hard to make deterministic + EditMode-cheap.
- **Noise / fractal** — Perlin/Simplex/diamond-square fields driving terrain, heightmaps, scatter.
  Great for organic continuous surfaces; poor for "this room reads like a ransacked med-bay."
- **Grammar-based** — expand a rule grammar (L-systems, shape grammars) into structure. A middle
  ground; socket-matching (guide 02) is a lightweight constructive cousin.

## Why modular over noise for DRIFT

DRIFT emulates **Last Day on Earth**: you descend to a dead planet / derelict and scavenge
*locations* — readable, authored-feeling spaces with intent (a cache here, a chokepoint there). The
GDD (§3) frames the loop as descend → scavenge LDOE-style randomized *locations*, not as exploring
a continuous noise-generated wilderness.

| Property | Modular-chunk assembly | Noise terrain |
|---|---|---|
| Reads as an authored space | Yes — kits carry intent | No — uniform texture |
| Guarantees reachability | Yes — sockets + validation | Hard — needs post-processing |
| Places objectives meaningfully | Yes — chunk slots | No — arbitrary coordinates |
| Deterministic + EditMode-cheap | Yes | Yes, but verifying "is it fun" is harder |
| Mobile cost | Low (place prefabs) | Can be high (mesh gen) |
| Art collaboration | Clean — level-design authors kits | Murky — who owns the look? |

The decisive factor is the **kit handoff**: modular assembly lets `unity-level-design-guardian`
author readable rooms (their lane) while this Guardian randomizes their arrangement (our lane). Noise
has no such clean seam.

## Where noise still earns its keep (sub-detail only)

Noise is not banned — it is *demoted to sub-detail*:

- Rubble / debris scatter density within a chunk.
- Surface micro-variation (a planet-exterior chunk's ground roughness).
- Cosmetic, non-gameplay variation that never affects reachability or loot.

Rule: **noise may vary how a chunk looks; it must never decide whether the loop is winnable.** That
stays with deterministic constructive placement + reachability validation (guide 09).

## Wave-function-collapse and friends (Tier-later, ADR-gated)

WFC and other constraint-solver layouts are attractive but heavier than DRIFT's location scale
needs. Current stance: **simple socket-matching (guide 02) is sufficient.** Promoting to WFC is a
Tier-later decision that requires an ADR (`library/architecture/ADR-<n>-wfc-layout.md`) justifying
the complexity against a concrete shortcoming of socket-matching. Do not reach for it by default.

## Tier framing (say this first, every time)

The Tier 0 world is **hand-placed** by `Tier0RuntimeSpawner.cs` — three salvage nodes, three tool
caches, one enemy, at fixed positions. That is correct for the gray box (`CLAUDE.md` Hard Rule #1;
GDD §3 has no procgen yet). This Guardian designs the **Tier-1 procgen that eventually replaces that
hand-placement** and proves it seedable + EditMode-testable now. **Never tell anyone to rip out the
gray-box spawner mid-Tier-0.**

## Output

A philosophy invocation produces a **method decision + rationale**: "constructive modular assembly,
socket-matched, noise reserved for sub-detail; WFC is Tier-later and ADR-gated," grounded in the
GDD's LDOE intent and the kit-handoff seam with `unity-level-design-guardian`.
