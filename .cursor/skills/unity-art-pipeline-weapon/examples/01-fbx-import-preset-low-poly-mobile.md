# Example 01 — FBX Import Preset for a Low-Poly Mobile Prop

A worked, field-by-field model import Preset for the first DRIFT prop (say a `SM_Crate_01.fbx`).
All field names **in-editor-verify** against a `6000.0.x` Model importer.

## Context

DRIFT is mid-Tier-0 with no art (gray-box primitives via `GrayBoxVisuals.cs`). This is the
contract the *first* FBX imports through, captured as `DriftModel.preset` so it's applied by
default, not remembered (`guides/06`, `CLAUDE.md §6.3`).

## The Preset, field by field

**Model tab**
| Field | Value | Why |
|---|---|---|
| Scale Factor / Convert Units | 1 unit = 1 m (Convert Units on, or 0.01 if DCC exports cm) | Match the `CharacterController` capsule scale; wrong scale = must-fix (`guides/01`) |
| Mesh Compression | Low (Medium for non-hero) | Small build-size win, negligible quality loss on low-poly |
| Read/Write Enabled | **Off** | On doubles mesh memory; only on for runtime mesh edits (Hard Rule §4) |
| Optimize Mesh | On | Free GPU-cache win |
| Normals | Import | Preserve the artist's faceted low-poly smoothing |
| Tangents | None (Calculate only if a normal map is used) | Saves vertex data |
| Blend Shapes / Import Cameras / Import Lights | Off | Props don't need them |

**Rig tab**
| Field | Value | Why |
|---|---|---|
| Animation Type | **None** | It's a prop. **For a skinned/rigged FBX, STOP — Rig + Animation tabs are `character-art-rig-guardian`'s lane** (`guides/01`) |

**Materials tab**
| Field | Value | Why |
|---|---|---|
| Material Creation Mode | Use External Materials / None + assign project materials | An FBX re-import must not clobber hand-tuned materials (must-fix if it does) |
| Textures | Extract once, then import via the ASTC texture Preset (`guides/05`) | Keeps the FBX a pure mesh source |

## Apply it

1. Save the above as `Assets/Art/Presets/DriftModel.preset` (`guides/08`).
2. Set it as the **Preset Manager default** for ModelImporter scoped to `Assets/Art/Models/`
   (`guides/06`) so every FBX dropped there imports correct by default.

## Handoffs

- Rigged FBX → `character-art-rig-guardian` for the Rig/Animation tabs.
- "Is this mesh within the poly budget?" → `mobile-game-perf-guardian` (`guides/09`).

## DRIFT note

No `SM_Crate_01.fbx` exists — this is the template the first one follows. Verify every field name
in a real editor before treating it as exact.
