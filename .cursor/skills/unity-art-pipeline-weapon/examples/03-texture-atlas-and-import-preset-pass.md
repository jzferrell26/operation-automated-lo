# Example 03 — Texture Atlas + Import Preset Pass

Combining several low-poly props onto one atlas and applying the ASTC import Preset — then
handing the budget verdict to perf. Fields **in-editor-verify**.

## Context

A Tier-1 prop kit (crate, barrel, console, deck-plate) for the station/planet zones. Goal: cut
material count + draw calls so the kit batches (`guides/03`/`04`). The **perf verdict** that the
saving is real is `mobile-game-perf-guardian`'s (`guides/09`) — this pass *enables* it.

## Step 1 — UV the kit onto one atlas (human / DCC)

The props are UV-unwrapped to share a single atlas page (`T_Props_01_Albedo`) in the DCC tool.
Authoring the atlas is the human's job (`CLAUDE.md §7`); this Weapon ensures it imports right.

## Step 2 — Import the atlas via the ASTC Preset

Apply `DriftTextureAlbedo.preset` (`guides/05`, `templates/texture-import-preset.md`):
- Texture Type: Default (3D albedo)
- Compression: per-platform → **ASTC 6×6** (Android + iOS)
- Generate Mip Maps: ON if the props are seen at varying on-screen size; otherwise OFF (verify
  per the orthographic camera, `guides/05`)
- Max Size: clamp (e.g. 1024) to the smallest that looks right
- Read/Write: **Off**
- sRGB: On (color albedo)

Name it `T_Props_01_Albedo` (`guides/08`). Confirm the **resolved** ASTC format in the import
inspector, not "Automatic."

## Step 3 — One shared material (+ variants)

All four props reference **one base URP material** on `T_Props_01_Albedo`; per-prop colour tweaks
become **Material Variants** (`guides/04`), keeping them in one SRP batch. (URP shader choice is
`unity-rendering-guardian`'s; URP must be installed first.)

## Step 4 — Hand the verdict to perf

Hand `mobile-game-perf-guardian` (`guides/09`):
- the atlas import settings (ASTC block, Max Size, mips),
- the "4 props → 1 atlas → 1 material + variants" plan.

They run the Build Report + Memory Profiler (`mobile-game-perf-weapon/guides/06`, `/08`) and
confirm: no RGBA32 shipped, texture memory matches the compressed estimate, the batch fires, the
draw-call count dropped. If they flag a tighten (e.g. drop Max Size to 512), this Weapon adjusts
the Preset. **You set the dials; they read the meter.**

## DRIFT note

No texture, atlas, or material exists in the repo (gray-box only). This is the Tier-1 pass the
first prop kit follows. Don't author the art; guard the import.
