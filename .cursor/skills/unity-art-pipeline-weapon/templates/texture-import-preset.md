# Template — Texture Import Preset (ASTC)

Fill-in spec for a DRIFT texture import Preset (`Assets/Art/Presets/DriftTexture____.preset`).
Captures the **import-settings side** of `guides/05`.

> **CO-OWNERSHIP:** this template sets the import dials. The texture-memory **budget**, the
> Build-Report RGBA32 verdict, and the Memory-Profiler check are `mobile-game-perf-guardian`'s
> (`mobile-game-perf-weapon/guides/06`, this Weapon's `guides/09`). This template is a deliberate
> **subset** of the perf guide and must never contradict it. Field names **in-editor-verify**.

```
Preset name:        DriftTexture________.preset
Applies to:         TextureImporter
Preset Manager:     [ ] set as default for Assets/Art/Textures/ (recommended — guides/06)

── Main ──────────────────────────────────────────────────
Texture Type:       [ Default (3D albedo/data) | Sprite (2D and UI) ]
sRGB (Color Texture): [ ON for albedo/color | OFF for data/masks ]
Read/Write Enabled: [ OFF ]  ← default off (Hard Rule §4); justify if on: __________
Generate Mip Maps:  [ OFF for screen-space UI/sprites | ON for varying-distance world textures ]
  (orthographic fixed-zoom camera → verify mips earn their keep per texture, guides/05)
Non-Power-of-Two:   keep atlases/sprites power-of-two
Max Size:           ________   (clamp to smallest that looks right — 1024/2048 mid-tier)

── Per-platform overrides (Default / Android / iOS) ──────
Android Format:     ASTC ____   (default 6×6; 4×4 hero, 8×8 large flat — guides/05)
iOS Format:         ASTC ____   (same policy — ASTC supersedes ETC2/PVRTC)
Compressor Quality: ________
⚠ Confirm the RESOLVED format in the import inspector + Build Report — never trust "Automatic".

── Naming / location (guides/08) ─────────────────────────
File name:   T_______________ _Albedo / _Data   (channel suffix drives sRGB)
Folder:      Assets/Art/Textures/
```

**Budget verdict:** hand the chosen settings to `mobile-game-perf-guardian` (`guides/09`); they
rule on whether it fits the budget. **You set the dials; they read the meter.** **Verify field
names in a real editor — this Weapon was forged headless.**
