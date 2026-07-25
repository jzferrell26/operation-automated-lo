# 06 — Texture Import & Compression (ASTC)

Textures are usually the largest single contributor to **VRAM, memory bandwidth, and build size** on a mobile game. The import settings — not the source art — decide what ships. The rule: **ship ASTC, never uncompressed.**

## Why uncompressed is a trap

An uncompressed RGBA32 texture is 4 bytes/pixel: a 2048×2048 sprite sheet is **16 MB** in memory. Compressed with ASTC 6×6 it's ~**1.8 MB** — roughly a 9× reduction in VRAM and bandwidth, and a similar cut in build size. Uncompressed textures also blow the texture-bandwidth budget that feeds fill-rate (`guides/05`). Shipping uncompressed art to a mid-tier phone is the single most common "why is the build 400 MB / why does it OOM" cause.

## ASTC — the modern mobile standard

ASTC (Adaptive Scalable Texture Compression) is supported on essentially all current iOS devices and the vast majority of mid-tier+ Android (GLES 3.1 / Vulkan). It supersedes the old split (ETC2 on Android, PVRTC on iOS) — **use ASTC for both platforms** as the default.

ASTC is **block-based**: you pick a block size, which trades quality for size.

| Block size | Bits/pixel | Use for |
|---|---|---|
| ASTC 4×4 | 8.00 | Highest quality — hero art, sprites with fine detail/gradients where banding shows |
| **ASTC 6×6** | 3.56 | **Default for most sprites** — strong quality/size balance |
| ASTC 8×8 | 2.00 | Backgrounds, large low-detail fills, where size matters more than crispness |
| ASTC 10×10 / 12×12 | 1.28 / 0.89 | Very large, very low-frequency textures only |

Smaller block (4×4) = bigger file, better quality. Larger block (8×8+) = smaller file, more artifacts. Start at **6×6** and only drop to 4×4 where you can *see* the difference on-device.

## The canonical mobile sprite import settings

In the texture import inspector (and codified in `templates/texture-import-preset.md`):

- **Texture Type:** Sprite (2D and UI) for sprites; Default for raw textures.
- **Compression / Format:** per-platform override → **ASTC 6×6** (Android + iOS). Do not leave it on "Automatic" without confirming what Automatic resolved to in the Build Report.
- **Generate Mip Maps:** **OFF** for screen-space sprites and UI that are never minified (drawn at ~1:1). Mip-maps add 33% memory and are pointless for UI; turn them **ON** only for world textures viewed at varying distances (rare in a fixed-zoom top-down game — the camera is orthographic at a fixed size, `TopDownFollowCamera.orthographicSize`, so most sprites are screen-space-ish).
- **Max Size:** clamp to the smallest that looks right (1024 or 2048 on mid-tier). A 4096 source downscaled to 1024 at import saves 16× the memory.
- **Non-Power-of-Two:** keep sprites/atlases power-of-two so ASTC and mips behave; the SpriteAtlas handles packing (`guides/04`).
- **Read/Write Enabled:** **OFF** unless you genuinely read pixels at runtime — it keeps a second copy in CPU memory, doubling cost.
- **sRGB (Color Texture):** ON for albedo/color sprites; OFF for data textures (masks, normal data).

## Per-platform overrides

Use the per-platform tabs in the importer (Default / Android / iOS) so the editor can keep something fast while the device gets ASTC. Set Android and iOS both to ASTC; let the Default tab use whatever's convenient for editor iteration. The **build** is what matters — confirm the resolved format in the Build Report (`guides/08`), not the Default tab.

## DRIFT tier note

Today DRIFT uses **no imported textures** — it's `CreateColorMaterial` solid colors on primitives (`GrayBoxVisuals.cs`). There is nothing to compress yet. So this guide is **forward-guidance**: the moment real sprite art lands (Tier 1), every import goes through ASTC + a SpriteAtlas + the mip/Read-Write/Max-Size policy above. Establishing a **texture import Preset** now (so artists can't accidentally ship RGBA32) is cheap insurance — see `templates/texture-import-preset.md`. Do not author art or an art pipeline; that's not this Weapon's job — just guard the import settings.

## How to measure

1. **Texture import inspector:** the bottom of the inspector shows the **resolved format and the compressed size in memory** per platform. Confirm it says ASTC and the size is what you expect.
2. **Build Report** (`guides/08`): after a build, the report lists textures by size. **Pass:** no texture is shipping uncompressed (RGBA32/ARGB32); the largest textures are ASTC-compressed and within the Max-Size clamp.
3. **Memory Profiler** (on-device): snapshot and inspect texture memory — the sum should match your compressed expectations, not the uncompressed source sizes.
4. **On-device visual check:** verify the chosen block size doesn't produce visible banding/artifacts on the target screen; drop 6×6 → 4×4 only where it does.

Pass/fail: **every shipped texture is ASTC (or a justified exception); no RGBA32 in the Build Report; mip-maps off for screen-space UI/sprites; texture memory in the Memory Profiler matches the compressed estimate.**

Source: Unity Manual — "Recommended, default, and supported texture formats by platform" / "Texture compression formats for platform-specific overrides" (ASTC) / "Importing textures" / "Mipmaps"; Arm ASTC guidance.
