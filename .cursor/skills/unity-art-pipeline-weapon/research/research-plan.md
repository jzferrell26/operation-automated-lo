# Research Plan — unity-art-pipeline-weapon

Topic: the 3D art IMPORT pipeline for a Unity 6 (`6000.0.23f1`), top-down, portrait-mobile,
URP-targeted, low-poly space-survival game (PROJECT-DRIFT). Owns how art ASSETS enter the
project cleanly — model/FBX import, LOD groups, mesh + texture atlasing, material variants /
SRP-batcher-friendliness, ASTC import settings + Presets, art-style consistency, and asset
naming/folder conventions. Texture **budget/measurement** is co-owned with mobile-game-perf
(defer the budget) — this Weapon authors the **import-settings** side only.

## Constraints

- Headless VM: no Unity editor available (`AGENTS.md`). Every import-inspector field name,
  Preset behavior, and Unity-6-default claim is **in-editor-verify**, never fabricated.
- DRIFT ships **zero production art** today (gray-box primitives via `GrayBoxVisuals.cs`); URP
  is **not** in `Packages/manifest.json`. This is forward-guidance / Tier-1 pipeline design.

## Queries (6)

1. Unity 6 model / FBX import settings for low-poly mobile — Scale Factor, Mesh Compression,
   Read/Write Enabled, Optimize Mesh, normals/tangents, material import modes, `.fbx` vs `.blend`.
2. Unity LODGroup setup + screen-relative transition heights + cross-fade; when a fixed-zoom
   top-down/orthographic game actually needs LODs (mostly cull-only).
3. Mesh combining + texture atlasing for draw-call reduction; SpriteAtlas (UI) vs world mesh
   atlas; interaction with GPU instancing and the SRP Batcher.
4. SRP Batcher compatibility rules + Material Variants (`Material.parent`) — same-shader/same-
   keyword batching, keeping low-poly material count batch-friendly.
5. ASTC texture compression import settings on mobile (block sizes, mip policy, Max Size,
   sRGB, Read/Write) + reusable import **Presets** + Preset Manager defaults — cross-checked
   against `mobile-game-perf-weapon/guides/06` to avoid contradiction.
6. `AssetPostprocessor` (`OnPreprocessModel` / `OnPreprocessTexture`) + `.preset` automation +
   asset naming / folder convention best practices for Unity teams.

## Authoritative source families (to consult in a connected run)

- Unity Manual: Importing models / FBX import settings; Texture import & platform overrides;
  LODGroup & Level of Detail; SpriteAtlas; SRP Batcher; Material Variants; Preset / Preset
  Manager; AssetPostprocessor.
- Arm / mobile-GPU guidance on ASTC block-size trade-offs.
- The co-owned in-repo guide `mobile-game-perf-weapon/guides/06-texture-import-and-compression.md`.
