# 04 — Lighting model: baked / mixed / realtime

This guide owns the **lighting-mode choice**. The **per-scene bake and probe placement** —
actually pressing "Generate Lighting," positioning probe groups in a level — belong to
`unity-level-design-guardian`. Set the model here; hand the bake across the seam.

## The three light modes

- **Baked** — lighting is precomputed into **lightmaps**. **Zero runtime lighting cost.** The
  mobile sweet spot for **static geometry** (station walls/floors/props, the dead-planet terrain
  shell). Static objects only.
- **Mixed** — a light contributes baked indirect + (depending on the Mixed mode, e.g. Shadowmask
  / Baked Indirect) realtime direct shadows. Use this for the **key directional light** so
  **dynamic actors** (player, enemies, salvage) cast/receive sensible shadows while static GI
  stays baked.
- **Realtime** — fully dynamic, fully per-frame. **Keep this to a tight budget** — ideally a
  **single directional light** for the whole scene. Avoid sprinkling realtime point/spot lights
  on the low tier; each is GPU cost (and in classic Forward, against the per-object light limit,
  `guides/03`).

## The DRIFT recommendation

1. **Bake the static world.** Mark station/planet geometry **Static** (Contribute GI); bake
   lightmaps. The flat top-down camera shows a lot of floor — baked floor lighting is cheap and
   looks grounded.
2. **One Mixed directional light** as the key light, so the moving actors shadow correctly without
   re-baking.
3. **Light Probes** to light **dynamic actors** (player, enemies, salvage) from the baked
   environment cheaply — without them, dynamic objects look flat/disconnected from baked GI.
4. **Reflection Probes** (low resolution on mobile) give low-poly metal surfaces grounded
   reflections; a handful per zone, not per-room.

## Why this fits a top-down mobile game

The camera angle is fixed and the world is mostly static — almost everything the player sees can
be baked once. Realtime lighting cost should track **only the moving actors**, which probes handle
for pennies. This is the cheapest path to a lit, grounded look.

## Tier discipline

There's no scene to bake in Tier 0 (`AGENTS.md`) and URP isn't installed. The lighting **model**
is design-now; the **bake** happens in Tier 1 when `unity-level-design-guardian` authors real
modular scenes. Don't ask anyone to bake the gray-box.

## Verify-in-editor flags

- Which **Mixed lighting mode** (Shadowmask vs Baked Indirect vs Subtractive) the project should
  default to on mobile — **verify in-editor** against the URP lighting docs; Subtractive is
  cheapest but lower quality.
- Lightmap resolution / size budget — co-own the texture-memory side with
  `mobile-game-perf-guardian` and `unity-art-pipeline-guardian`.

Sources: Unity 6 Manual "Lightmapping", "Mixed lighting", "Light Probes", "Reflection Probes",
"Choose a lighting setup"; handoff to `unity-level-design-guardian` for the bake;
`guides/03-forward-vs-forward-plus.md`.
