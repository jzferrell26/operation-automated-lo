# 06 — Import Presets & Automation

Turning the import rules of guides 01–05 into **data, not memory** (`CLAUDE.md §6.3`). This is
the keystone guide: a Preset an artist can't forget beats a doc they can.

## Three layers, weakest to strongest

### 1. `.preset` assets (the baseline)

A **Preset** captures an importer's full settings. Create one by configuring an importer in the
inspector, then "Save current settings as a Preset" → a `.preset` asset (commit it under
`Assets/Art/Presets/`, see `guides/08`). You apply it to any matching asset's importer. DRIFT
needs at minimum:
- `DriftModel.preset` — the model/FBX rules from `guides/01` (scale, mesh compression, Read/Write
  off, Optimize Mesh on, normals policy).
- `DriftTextureAlbedo.preset` — the ASTC color-texture rules from `guides/05`.
- `DriftTextureData.preset` — the data-texture variant (sRGB off, no mips).
- `DriftSpriteUI.preset` — the UI sprite rules (Sprite type, mips off, ASTC) for the Tier-1 HUD.

### 2. Preset Manager defaults (apply-by-default)

In **Project Settings → Preset Manager**, set a Preset as the **default** for a type (optionally
filtered by a name/path prefix). New assets then import with the right settings *without anyone
choosing the Preset*. This is what stops the first artist-supplied texture from importing as
RGBA32 by accident — the whole point of doing this in Tier 0 before art exists.

### 3. `AssetPostprocessor` (hard enforcement) — C# is `unity-csharp-guardian`'s lane

For rules that **must** hold regardless of Preset, an editor `AssetPostprocessor` with
`OnPreprocessModel` / `OnPreprocessTexture` can stamp settings at import time (e.g. "any texture
under `Assets/Art/` is forced to Read/Write off and ASTC"). This is the strongest guard, but:

> **The C# of the postprocessor — its architecture, where it lives, its EditMode coverage — is
> `unity-csharp-guardian`'s lane** (and editor-import scripts per the brief's boundaries). This
> Weapon **specifies what it must enforce**; it does not author the C#. Hand off the
> implementation with a precise rule list (path filter + the exact import settings to stamp).

## Recommended DRIFT setup (Tier-1-ready, set up now)

1. Author the four `.preset` assets above (settings from guides 01 + 05).
2. Wire `DriftModel.preset` and `DriftTextureAlbedo.preset` as **Preset Manager defaults** scoped
   to `Assets/Art/`.
3. Optionally, once art volume grows, hand `unity-csharp-guardian` a spec for an
   `AssetPostprocessor` that hard-enforces Read/Write-off + ASTC under `Assets/Art/`.

## Why this is the right Tier-0 move

There's no art to import yet, but the Presets + Preset-Manager defaults are **cheap insurance**:
they cost nothing now and guarantee the first real asset lands correct. This is the one piece of
the art pipeline genuinely worth setting up before Tier 1 — it's pipeline plumbing, not art.

## DRIFT note

No `.preset` exists in the repo. Verify Preset Manager scoping behavior and the exact
`AssetPostprocessor` callback signatures **in a `6000.0.x` editor** — they're **in-editor-verify**.
See `templates/model-import-preset.md` and `templates/texture-import-preset.md`.
