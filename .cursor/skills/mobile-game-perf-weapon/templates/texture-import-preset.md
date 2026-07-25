# Template — Mobile Sprite Texture Import Preset

The canonical import settings for DRIFT sprites on mid-tier Android/iOS. The rule: **ship ASTC, never uncompressed** (`guides/06`). Codify this as a Unity **Preset** asset so artists can't accidentally ship RGBA32.

**TIER NOTE:** DRIFT uses no imported textures today (gray-box primitives via `GrayBoxVisuals`). This is **forward-guidance** — apply it the moment real sprite art lands (Tier 1). Creating the Preset now is cheap insurance; building an art pipeline is not this Weapon's job.

---

## How to make it a Preset

1. Import one representative sprite. Set the fields below in the Texture Import Inspector.
2. Click the **Preset** icon (top-right of the inspector) → **Save current to...** → save as `Assets/Editor/Presets/MobileSprite.preset`.
3. Optionally set it as the **default** for the Sprite importer (Preset → "Set as Default") or apply it in an `AssetPostprocessor` so every new sprite inherits it.

---

## Settings

| Field | Value | Why |
|---|---|---|
| **Texture Type** | Sprite (2D and UI) | Sprites; use Default only for raw data textures |
| **sRGB (Color Texture)** | ON for color art; OFF for masks/data | Correct gamma; data textures must stay linear |
| **Alpha Source** | Input Texture Alpha (or None if opaque) | Don't carry alpha you don't need (overdraw + size — `guides/05`) |
| **Read/Write Enabled** | **OFF** | ON keeps a second CPU copy → doubles memory. Only enable if you read pixels at runtime |
| **Generate Mip Maps** | **OFF** for screen-space sprites/UI | Mips add 33% memory and are pointless for ~1:1 UI. ON only for world textures viewed at varying distance (rare in fixed-zoom top-down) |
| **Wrap Mode** | Clamp | Sprites don't tile; avoids edge bleed |
| **Filter Mode** | Bilinear (Point for crisp pixel-art) | Match the art style |
| **Max Size** | 1024 or 2048 | Clamp to the smallest that looks right on-device; a 4096 source → 1024 saves 16× memory |
| **Compression** | (use the per-platform overrides below) | "Automatic" can resolve to something you didn't intend — set it explicitly |

---

## Per-platform overrides (the load-bearing part)

Open the platform tabs (Default / Android / iOS) at the bottom of the importer. **Override for both mobile platforms with ASTC:**

| Platform | Override | Format | Block size |
|---|---|---|---|
| **Android** | ✅ checked | ASTC | **6×6** default; 4×4 for high-detail; 8×8 for low-detail/large |
| **iOS** | ✅ checked | ASTC | **6×6** default; 4×4 for high-detail; 8×8 for low-detail/large |
| Default (editor) | optional | whatever's convenient for iteration | — |

ASTC block-size trade-off (`guides/06`): smaller block (4×4 @ 8.00 bpp) = bigger/better; larger block (8×8 @ 2.00 bpp) = smaller/more artifacts. **Start at 6×6 (3.56 bpp); drop to 4×4 only where you can see banding on-device.**

ASTC covers both modern iOS and the vast majority of mid-tier+ Android (GLES 3.1 / Vulkan) — it replaces the old ETC2/PVRTC split. Use it as the single default for mobile.

---

## SpriteAtlas (when sprites are grouped — `guides/04`)

- Pack related, on-screen-together sprites into a **SpriteAtlas**; set the atlas's own platform settings to ASTC (the atlas, not the individual sprites, then controls compression).
- One atlas per context (zone/screen), not one mega-atlas, not one-per-sprite.
- Keep atlas max size ≤ 2048 on mid-tier; enable tight packing; mind padding.

---

## How to verify (measure it — `guides/06`)

1. **Import inspector bottom bar:** confirm it shows **ASTC** and a compressed in-memory size per platform.
2. **Build Report** (`guides/08`): no texture shipping as RGBA32/ARGB32; largest textures are ASTC, within the Max-Size clamp.
3. **Memory Profiler** (on-device): texture memory matches the compressed estimate, not the uncompressed source.
4. **On-device visual check:** chosen block size shows no objectionable banding; bump 6×6 → 4×4 only where it does.

**Pass/fail:** every shipped texture is ASTC (or a justified exception); no RGBA32 in the Build Report; mips off for screen-space UI/sprites.
