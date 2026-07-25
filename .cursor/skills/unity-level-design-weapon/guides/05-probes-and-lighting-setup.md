# 05 — Probes & Lighting Setup (Placement)

Probe and light **placement** in the scene. URP renderer/lighting-model **config** is
`unity-rendering-guardian`'s lane (Rule #7).

## The split with rendering

| This Weapon (placement) | `unity-rendering-guardian` (config) |
|---|---|
| Where light probe groups go in the play-volume | URP Render Pipeline Asset, quality tiers, render scale |
| Where reflection probes go per room/zone | Forward vs Forward+, the lighting model |
| Which lights sit where in the scene hierarchy | Post-processing volumes, shadow/quality settings |
| Lightmap-bake setup for static modular geometry (placement of static + probes) | The global lighting-model decision (baked/mixed/realtime budget) |

Place; don't configure the pipeline. When a question is "what render pipeline settings", hand it off.

## Light probe groups (for dynamic objects)

Baked lightmaps light **static** geometry only. The player, enemies, and moving pickups take their
GI from **light probes**. Place a probe lattice through the play-volume:

- **Denser** where lighting changes fast — doorways, edges of light pools, room thresholds, the O2
  deck's lit zone.
- **Sparser** over uniform open floor where light barely changes.
- Cover the **full traversal volume** at roughly player height so the player is never lit by an
  extrapolated probe far outside the lattice (that's the classic "character goes black in a corner"
  bug — `09`).

The DRIFT gray-box uses a single directional `Sun` + flat ambient (`Tier0RuntimeSpawner.CreateLighting`).
The art-phase scene adds baked GI + a probe lattice so dynamic objects sit in the lit world.

## Reflection probes

- **Baked** reflection probes are the mobile default; place one per room/zone so low-poly URP
  surfaces get a plausible environment reflection for the angle the **fixed top-down camera** sees.
- **Realtime** reflection probes only when a reflection must update (rare on mobile — flag the cost
  to perf if proposed).

## Mixed lighting + lightmap baking

Static modular geometry contributes to GI (Contribute GI static flag, `02`) and bakes into
lightmaps; dynamic objects take light from probes. The **lighting-model choice** (fully baked vs
mixed vs a realtime budget) is `unity-rendering-guardian`'s; this guide places the probes and sets
the static flags that bake correctly under whatever model they choose.

## Output

A probe placement plan (lattice density map, reflection-probe positions per zone) + a handoff note
to `unity-rendering-guardian` for the lighting-model and render config. Verify probe densities and
bake settings in-editor.

## Severity

- **Must-fix:** dynamic play-volume with no probe coverage (dynamic objects unlit / wrongly lit).
- **Should-refactor:** uniform-density lattice ignoring light gradients; realtime reflection probes
  on mobile without a perf sign-off.
- **Style:** probe-group naming.
