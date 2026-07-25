# 07 — Station & Planet Zones

The two DRIFT zones, grounded in `Tier0RuntimeSpawner` and the GDD (station base + descend-to-
planet). This guide turns those into modular-scene layouts.

## Read the code first

`Tier0RuntimeSpawner.Build()` builds **one combined gray-box** today — station and planet share a
single 40m plane, with the station gameplay clustered at +Z (O2 deck `(0,0,8)`, return point
`(0,1,6)`, descend pad `(-5,0.25,8)`) and the planet gameplay at −Z (drop point `(0,1,-9)`, extract
pad `(0,0.25,-13)`, ore + drill cache deep at −Z). The Tier-1 design **splits** these into two
authored scenes that load additively (`03`), preserving the coordinates (Rule #4).

## The Station zone (the base)

GDD: the orbital station is the player's surviving base. Authored as a modular interior kit (`01`):

- **Layout anchor:** the **O2 deck** at `(0,0,8)` is the sealed life-support heart — the
  `LifeSupportZone` + `O2Generator` + the raid breach. Build the station interior around it as
  rooms (kit walls + `Wall_Door` modules) so it reads as a base, not an open floor.
- **Return point** `(0,1,6)` is where the shuttle deposits the player back — put it at the station's
  shuttle bay, adjacent to the descend pad `(-5,0.25,8)`.
- **Readability:** interior rooms are exactly where occlusion culling can pay off (`04`) and where
  the top-down camera needs sightlines kept clear (`02`).
- **Raid:** `Tier0RaiderAssault` spawns at `(-4,1,8)` — the breach is in the station; the kit should
  make the breachable hull section legible.

## The Planet (Surface) zone (scavenge)

GDD: the player descends to the dead planet to scavenge. Authored as a more open surface kit:

- **Drop point** `(0,1,-9)` is where the shuttle lands the player — the scene entry.
- **Salvage + tool caches** are scattered across the surface (`(-5,0.75,1)`, `(5,0.75,0)`,
  `(0,0.75,-7)`, and the three caches) — these are the scavenge objectives; the kit dresses ruins/
  wreckage **around** them without moving them.
- **Extract pad** `(0,0.25,-13)` is the return-to-station trigger at the far edge.
- **Mutations** (`MutatedCrew` at `(7,1,-2)`) roam the surface — keep enemy sightlines and the
  player's escape paths legible at the camera angle.
- **Occlusion:** a flat open surface bakes little occlusion (`04`) — lean on frustum culling + LOD;
  hand the measurement to perf.

> **Procgen co-own:** the planet zone is the natural home for **randomized** scavenge layouts (Last
> Day on Earth-style). This Weapon owns the **handcrafted modular kit + the chunk modules**;
> `procedural-generation-guardian` owns the **randomization** that arranges them. See `08`.

## Output

Two zone layouts (Station interior, Planet surface) on the kit grid, each preserving its
`Tier0RuntimeSpawner` coordinates, with the additive-load seam between them (`03`). Worked station
example: `examples/01-station-hub-modular-kit.md`.

## Severity

- **Must-fix:** a zone layout that moves a gameplay coordinate; building the breach/O2 deck where
  the raid spawn can't reach it.
- **Should-refactor:** station authored as an open floor (no rooms → no base feel, no occlusion win);
  authoring randomized surface layout here instead of handing the RNG to procgen.
- **Style:** room naming.
