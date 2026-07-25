# 08 — Asset Naming & Folder Conventions

Where art lives and what it's called. Boring, and the cheapest thing to get wrong — a project
that imports clean but can't find anything is still a broken pipeline. None of this exists in the
repo yet; this is the convention the first art lands into.

## Folder layout

The code spine lives under `Assets/Scripts/Drift/` (`ARCHITECTURE.md §2`). Art parallels it
under a dedicated tree so art and code don't tangle:

```
Assets/Art/
  Models/        # imported .fbx props + their LOD meshes
  Textures/      # source textures (albedo/data) — import via the ASTC Presets
  Materials/     # the base URP materials + Material Variants (guides/04)
  Atlases/       # SpriteAtlas (UI) + world atlas pages (guides/03)
  Presets/       # the .preset import presets (guides/06) — DriftModel, DriftTextureAlbedo, ...
  Prefabs/       # art prefabs (composition into scenes is unity-level-design-guardian's)
```

Keep `Assets/Art/` distinct from `Assets/Scripts/` and any future `Assets/Data/` (the
ScriptableObject content, `CLAUDE.md §6.3`). The Preset Manager defaults (`guides/06`) scope to
`Assets/Art/` so anything landing here imports correctly by default.

## Naming scheme

A consistent prefix/role scheme keeps assets sortable and searchable:

- **Models:** `SM_<name>` (static mesh) — e.g. `SM_Crate_01`, `SM_DeckPlate`. LOD meshes:
  `SM_Crate_01_LOD0 / _LOD1`.
- **Textures:** `T_<name>_<channel>` — `T_Crate_01_Albedo`, `T_Crate_01_Data`. The channel suffix
  drives which Preset applies (Albedo → sRGB on; Data → sRGB off, `guides/05`).
- **Materials:** `M_<name>` for base, `MV_<name>_<variant>` for Material Variants
  (`MV_Hull_Rusted`).
- **Atlases:** `Atlas_UI`, `Atlas_Props_01`.
- **Presets:** `Drift<Type>.preset` (`DriftModel`, `DriftTextureAlbedo`, `DriftTextureData`,
  `DriftSpriteUI`).

Match DRIFT's existing id style where it touches gameplay: `Tier0Balance` uses snake_case ids
(`scrap_metal`, `tool_welder`). Art *files* use the `SM_`/`T_`/`M_` PascalCase scheme above;
keep the two namespaces distinct and don't rename gameplay ids to match art files.

## `.meta` / GUID hygiene

- **Commit every `.meta` file.** Unity references assets by the GUID in the `.meta`, not the path.
  A missing `.meta` re-randomizes the GUID and breaks every reference — a silent **must-fix**.
- **Move/rename inside the editor** (or with `.meta` alongside) so the GUID survives. Renaming a
  file in the OS without its `.meta` breaks references.
- Don't hand-edit GUIDs. Don't duplicate a `.meta` to a new asset (GUID collisions).

## The boundary

Naming/folders are this Weapon's call. **Composing those prefabs into scenes** —
prefab-in-scene layout, the modular kit assembly — is `unity-level-design-guardian`'s lane; this
Weapon just delivers cleanly-named, correctly-imported assets into `Assets/Art/` for them to use.

## DRIFT note

`Assets/Art/` does not exist yet. Creating the empty tree + the Presets folder is the only
filesystem footprint worth landing before Tier 1 art — it gives the Preset Manager defaults
something to scope to and the first artist somewhere obvious to drop a file.
