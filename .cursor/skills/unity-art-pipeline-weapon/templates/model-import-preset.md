# Template — Model / FBX Import Preset

Fill-in spec for a DRIFT model import Preset (`Assets/Art/Presets/Drift<Name>.preset`). Captures
the rules in `guides/01`. All field names **in-editor-verify** against a `6000.0.x` Model importer.

```
Preset name:        Drift________.preset
Applies to:         ModelImporter
Preset Manager:     [ ] set as default for Assets/Art/Models/ (recommended — guides/06)

── Model tab ─────────────────────────────────────────────
Scale Factor / Convert Units:  ________   (target: 1 Unity unit = 1 metre)
Mesh Compression:              [ Off | Low | Medium | High ]   (default: Low/Medium)
Read/Write Enabled:            [ OFF ]  ← default off (Hard Rule §4); justify if on: __________
Optimize Mesh:                 [ ON ]
Normals:                       [ Import | Calculate ]   (Import when DCC normals are clean)
  Smoothing Angle (if Calculate): ________
Tangents:                      [ None | Calculate ]   (Calculate only if a normal map is used)
Blend Shapes:                  [ OFF for props ]
Import Cameras / Lights:       [ OFF ]

── Rig tab ───────────────────────────────────────────────
Animation Type:                [ None for props ]
⚠ Skinned / rigged FBX → HAND Rig + Animation tabs to character-art-rig-guardian (guides/01).

── Materials tab ─────────────────────────────────────────
Material Creation Mode:        [ Use External Materials | None + assign project materials ]
  (must NOT clobber hand-tuned project materials on re-import — must-fix if it does)
Textures:                      extract once → import via texture Preset (guides/05)

── Naming / location (guides/08) ─────────────────────────
File name:    SM_____________   (LODs: _LOD0 / _LOD1)
Folder:       Assets/Art/Models/
```

**Handoffs:** rig → `character-art-rig-guardian`; poly-budget verdict → `mobile-game-perf-guardian`
(`guides/09`). **Verify every field name in a real editor — this Weapon was forged headless.**
