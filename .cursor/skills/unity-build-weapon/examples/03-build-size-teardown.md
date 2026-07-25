# Example 03 — Build-Size Teardown Pass

A worked teardown of a build's size using the `BuildReport`. **Co-owned with
`mobile-game-perf-guardian`** — this Guardian owns the build-side teardown methodology and the manifest
prune; perf owns the texture/audio import fixes and all runtime cost.

> **Tier framing (read first):** Tier 0 has no scene to build (`AGENTS.md`), so there's no real Build
> Report yet. This is the *methodology* to apply in Tier 1, when content + a scene exist and the human
> runs the build (`CLAUDE.md §7`).

## Step 1 — Get the report

`BuildPipeline.BuildPlayer` returns a `BuildReport`; `templates/BuildScript.cs` logs the largest
contributors after every build (`guides/08 §1`):

```
=== DRIFT Build Report ===
Total size: 84.2 MB   Result: Succeeded
Top contributors:
  Assets/Art/Textures/atlas_environment.png   18.4 MB
  Assets/Audio/ambient_station_loop.wav        9.1 MB
  <IL2CPP managed code>                        14.7 MB
  <Engine: terrain, vehicles, vr, xr modules>   6.2 MB
  ...
```

## Step 2 — Triage in order (the largest levers first)

### Textures (#1 contributor — co-owned with perf)

`atlas_environment.png` at 18.4 MB is uncompressed/oversized. **This Guardian flags it; the fix is
perf's** — ASTC compression + atlasing (`mobile-game-perf-guardian` `guides/06`/`04`). The build-side
note: confirm the texture's *packed* size in the Build Report drops after the import-setting change.

### Audio

`ambient_station_loop.wav` at 9.1 MB → compressed format (Vorbis) + an appropriate load type. Again
the import setting is perf-adjacent; the build-size confirmation is via the Report.

### Managed code (this Guardian)

14.7 MB of IL2CPP managed code → raise **managed stripping** to `High` + add a `link.xml` to preserve
reflection/serialization-reached types (`guides/05 §2`), and use **OptimizeSize** codegen
(`guides/05 §3`). Re-run, confirm the managed-code line shrinks, **verify on-device** nothing
`MissingMethod`-crashes (the stripping risk).

### Engine modules (this Guardian — repo-grounded prune)

The "terrain, vehicles, vr, xr" line is `Packages/manifest.json` shipping modules a top-down mobile
portrait game (`CLAUDE.md §1`) doesn't use: `com.unity.modules.vr`, `.xr`, `.cloth`, `.vehicles`,
`.terrain`, `.terrainphysics`, `.wind`, `.umbra`, `.director`. **Pruning these is a clean size win** —
but it's a structural change: do it deliberately, verify nothing in the `Drift` spine references them,
and update `ARCHITECTURE.md` in the same commit (`CLAUDE.md §6` Rule #8). Flag in Tier 0; prune in Tier 1.

## Step 3 — Set & track a budget

Pick an install-size target (co-own the number with the human/product owner — conversion drops as size
climbs). Print `summary.totalSize` every CI build (`guides/10`) and flag regressions; optionally fail
past a ceiling. A budget nobody measures isn't a budget.

## The split, stated

- **This Guardian:** the Build Report teardown method, managed stripping/codegen, the engine-module
  prune, the size budget + CI tracking.
- **`mobile-game-perf-guardian`:** texture/audio import settings, ASTC, atlasing, and every
  *runtime* cost (frame budget, GC, draw calls).

A size finding that touches textures/audio is **co-owned** — flag here, fix there, confirm in the
Report.

## Handoffs

- Texture/audio/ASTC/atlasing → `mobile-game-perf-guardian` (`guides/06`/`04`).
- Stripping levers → `guides/05`.
- CI size tracking → `guides/10`.
- The manifest-prune structural change → note in `ARCHITECTURE.md`; if PRD-worthy, `library-guardian`.
