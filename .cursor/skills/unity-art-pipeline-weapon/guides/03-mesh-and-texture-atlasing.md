# 03 — Mesh & Texture Atlasing

Cutting draw calls and material count by sharing meshes and textures. The single biggest lever
for a low-poly mobile game — but the **verdict that it's needed** is `mobile-game-perf-guardian`'s.

## Why atlasing matters for low-poly mobile

Low-poly art is cheap on vertices but each distinct material/texture is a potential draw-call
break. A scene of 40 small props each with its own material can cost 40 draw calls; the same 40
props sharing one atlas + one material can collapse toward a handful (with SRP Batcher / GPU
instancing). On a mid-tier phone, draw-call count is often a bigger limiter than triangle count.

## Two kinds of atlas — keep them straight

- **SpriteAtlas (`com.unity.2d`/UI):** for 2D sprites and UI elements. DRIFT's HUD is currently
  IMGUI (`Tier0Hud`), and the real UGUI/touch HUD is Tier 1 (`ARCHITECTURE.md §8`) — when it
  lands, UI icons/sprites pack into a **SpriteAtlas**. (`com.unity.ugui` is already in the
  manifest.) Mip/Read-Write/Max-Size policy from `guides/05` applies.
- **World texture atlas (3D):** for the 3D props — a shared texture page that many low-poly
  meshes UV into, so they share one material. This is authored at the **DCC / UV stage** (the
  human, `CLAUDE.md §7`); this Weapon ensures the resulting atlas texture imports through the
  ASTC Preset and that meshes referencing it share a material.

## Mesh combining

Static props that never move and share a material can be **mesh-combined** (StaticBatching, or a
baked combined mesh) to cut draws further. Cautions:
- StaticBatching increases memory (it duplicates combined geometry) — a trade-off
  `mobile-game-perf-guardian` weighs against the draw-call saving.
- Combining requires a **shared material**, which requires a **shared atlas** — atlas first, then
  combine.
- Don't combine things that need to move/cull independently.

## Interaction with batching paths

Atlasing enables three different batch wins; which applies is perf's call, but author for them:
- **SRP Batcher:** batches draws sharing a **shader + keyword set** (see `guides/04`). Atlasing
  helps by reducing material variety to a batch-friendly set.
- **GPU Instancing:** identical mesh + material drawn many times. A shared atlas/material makes a
  repeated prop instanceable.
- **Static Batching:** shared-material static geometry combined at build/runtime.

## The handoff

This Weapon **shapes assets so atlasing/batching is possible** (shared atlas imported correctly,
shared material, instanceable repeats). **Whether the saving is real and needed** — the draw-call
count, the static-batching memory trade-off, the on-device frame impact — is
`mobile-game-perf-guardian`'s measurement (`guides/09`). Don't claim a perf win; enable one and
hand it over.

## DRIFT note

No atlas or combined mesh exists yet. First relevance: a Tier-1 prop kit for the station/planet
zones (which `unity-level-design-guardian` will compose into scenes). See
`examples/03-texture-atlas-and-import-preset-pass.md`.
