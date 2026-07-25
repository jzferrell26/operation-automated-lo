# 01 — Model / FBX Import

How a low-poly 3D prop enters DRIFT cleanly. All field names are **in-editor-verify** against a
`6000.0.x` editor's Model import inspector (Model / Rig / Animation / Materials tabs).

## `.fbx` is the interchange format

Import **`.fbx`**, not `.blend` / `.max` / `.c4d` directly. Direct DCC-format import makes Unity
shell out to a local Blender/Max install, which (a) breaks on any machine without that DCC, (b)
breaks CI, and (c) re-imports unpredictably. Export FBX from the DCC tool and commit the FBX.
A `.blend` in the import path is a **must-fix** for a team project.

## Model tab — the load-bearing fields

- **Scale Factor / "Convert Units":** nail this first. DRIFT's gameplay is built around a
  `CharacterController` capsule at roughly human scale (1 unit ≈ 1 metre). If the DCC exports in
  cm, "Convert Units" or a Scale Factor of 0.01 keeps 1 Unity unit = 1 m. A prop that imports
  100× too large or small is a **must-fix** — it breaks colliders, the camera framing, and the
  `TopDownFollowCamera` distance.
- **Mesh Compression:** Off → Low/Medium/High trades a small precision loss for smaller assets.
  For low-poly mobile props, **Low or Medium** is a fine default; High only where you can't see
  the artifacts. (This is *vertex-data* compression, distinct from texture compression in `05`.)
- **Read/Write Enabled:** **OFF** by default (Hard Rule §4). On keeps a CPU-side copy of the
  mesh, doubling its memory — only turn it on if you genuinely read/modify vertices at runtime
  (mesh deformation, runtime combining). On-without-cause is a **must-fix**.
- **Optimize Mesh:** **ON** — reorders vertices/indices for better GPU cache use; free win.
- **Normals:** **Import** when the DCC authored clean normals (preserves the artist's smoothing/
  hard edges — important for the low-poly faceted look). **Calculate** with a chosen smoothing
  angle only when the source normals are missing/broken.
- **Tangents:** Calculate only if the material uses a normal map; otherwise **None** saves data.
- **Blend Shapes / Cameras / Lights:** off for props unless explicitly needed.

## Materials tab — don't clobber tuned materials

Default to **"Use External Materials"** (or import none and assign project materials), and avoid
re-importing materials embedded in the FBX over hand-tuned project materials. A pipeline where a
fresh FBX export silently resets the artist's material assignments is a **must-fix**. Extracting
materials/textures once into the project and then assigning them keeps the FBX a pure mesh source.

## Rig tab — hand off to `character-art-rig-guardian`

- **Props:** Rig → **None**. Done here.
- **Characters / anything skinned:** the **Rig type (Generic / Humanoid), avatar mapping,
  retargeting, skinning, and animation import are `character-art-rig-guardian`'s lane.** This
  Weapon co-owns only the *model-import mechanics* (scale, mesh compression, read/write) on the
  same FBX. When a rigged FBX shows up, set the model-tab basics and **hand the Rig + Animation
  tabs to the rig Guardian.**

## DRIFT note

No FBX exists in the repo today — this is the contract the first prop will import through. Encode
it as a **model import Preset** (`templates/model-import-preset.md`, `guides/06`) so the scale /
Read-Write / mesh-compression defaults are applied automatically, not remembered.
