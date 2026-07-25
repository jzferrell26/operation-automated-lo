# 05 — Texture Compression (ASTC) — the Import-Settings Side

> **HEAVY CO-OWNERSHIP NOTICE.** Texture work is split with `mobile-game-perf-guardian`. **This
> guide owns the IMPORT-SETTINGS side only** — block size, mips, Max Size, Read/Write, sRGB, the
> per-platform override, and the reusable Preset. The **texture-memory BUDGET, the Build-Report
> RGBA32 pass/fail, and the Memory-Profiler verdict are `mobile-game-perf-guardian`'s** and live
> in `mobile-game-perf-weapon/guides/06-texture-import-and-compression.md`. This guide is
> deliberately a *subset* of that one and **must never contradict it.** When a "is it small
> enough / does it fit the budget" question arises, hand it to perf (`guides/09`).

## The rule: ship ASTC, never uncompressed

An uncompressed RGBA32 texture is 4 bytes/pixel — a 2048×2048 is 16 MB in memory and build. ASTC
6×6 brings that to ~1.8 MB. Shipping RGBA32 is the classic "why is the build huge / why does it
OOM" cause. **Every shipped texture is ASTC** (or a justified exception). Catching a stray RGBA32
is a **must-fix** *flag* — the budget verdict is perf's, but the import setting is yours.

## ASTC block sizes (matches the perf guide)

| Block | Bits/px | Use for |
|---|---|---|
| ASTC 4×4 | 8.00 | Hero art / fine-detail textures where banding shows |
| **ASTC 6×6** | 3.56 | **Default** for most albedo/sprites — quality/size balance |
| ASTC 8×8 | 2.00 | Large low-detail fills / backgrounds |
| ASTC 10×10 / 12×12 | 1.28 / 0.89 | Very large, very low-frequency only |

Start at **6×6**; drop to 4×4 only where banding is visible **on-device**; go 8×8 for big flat
fills. (Identical policy to `mobile-game-perf-weapon/guides/06`.)

## The canonical mobile import settings (codify as a Preset)

In the texture import inspector, captured in `templates/texture-import-preset.md`:

- **Texture Type:** Sprite (2D and UI) for UI sprites; Default for 3D albedo/world textures.
- **Compression / Format:** per-platform override → **ASTC 6×6** for Android **and** iOS (ASTC
  supersedes the old ETC2/PVRTC split). Don't trust "Automatic" — confirm the **resolved**
  format in the import inspector and the Build Report.
- **Generate Mip Maps:** **OFF** for screen-space UI/sprites drawn ~1:1 (mips add 33% memory for
  no benefit there); **ON** only for 3D world textures viewed at varying distance. Note DRIFT's
  orthographic fixed-zoom camera means even many world textures are near-constant on screen —
  verify whether mips earn their keep per texture.
- **Max Size:** clamp to the smallest that looks right (1024 / 2048 on mid-tier). A 4096 source
  downscaled to 1024 at import saves 16× the memory.
- **Read/Write Enabled:** **OFF** unless runtime pixel reads are proven necessary (keeps a second
  CPU copy). On-without-cause is a **must-fix** (Hard Rule §4).
- **sRGB (Color Texture):** ON for albedo/color; OFF for data textures (masks, packed data).
- **Non-Power-of-Two:** keep atlases/sprites power-of-two so ASTC + mips behave (`guides/03`).

## Per-platform overrides

Use the Default / Android / iOS tabs: set **Android and iOS both to ASTC**; let Default use
whatever's convenient for editor iteration. The **build** is what ships — confirm the resolved
per-platform format, not the Default tab.

## DRIFT note

DRIFT uses **no imported textures today** — `GrayBoxVisuals` makes solid-color materials with no
texture. This is forward-guidance. The cheap insurance to set up **now** is the **texture import
Preset + a Preset Manager default** (`guides/06`) so the first artist-supplied texture can't ship
RGBA32 by accident. Do not author art; just guard the import settings.

## Where the verdict lives

Pass/fail — "no RGBA32 in the Build Report, texture memory in the Memory Profiler matches the
compressed estimate, fits the frame/VRAM budget" — is measured and ruled on by
`mobile-game-perf-guardian` per `mobile-game-perf-weapon/guides/06`. You set the dials; they read
the meter. See `guides/09-perf-handoff.md`.
