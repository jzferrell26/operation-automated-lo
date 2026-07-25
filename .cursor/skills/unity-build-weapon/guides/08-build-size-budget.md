# 08 — Build-Size Budget & Teardown

The build-time size pass. **Co-owned with `mobile-game-perf-guardian`** — this Guardian owns the
*build-side* size teardown (the Build Report, stripping levers, the budget); perf owns *runtime*
cost (frame budget, GC, draw calls). When a finding is "this asset is huge," it's shared.

> **Tier note:** Tier 0 has no scene to build (`AGENTS.md`), so there's no real Build Report yet.
> This is the teardown methodology to apply in Tier 1 once content + a scene exist; the human runs
> the build that produces the report (`CLAUDE.md §7`).

## 1. The Build Report is the instrument

`BuildPipeline.BuildPlayer` returns a `BuildReport` (`UnityEditor.Build.Reporting`). It is the
source of truth for "why is the build this big":

```csharp
BuildReport report = BuildPipeline.BuildPlayer(options);
BuildSummary summary = report.summary;
Debug.Log($"Total size: {summary.totalSize} bytes, result: {summary.result}");

foreach (PackedAssets packed in report.packedAssets)
    foreach (PackedAssetInfo info in packed.contents)
        Debug.Log($"{info.sourceAssetPath}: {info.packedSize} bytes");
```

`templates/BuildScript.cs` logs the top contributors after every build. The legacy
`Editor.log`/Build Report window shows the same breakdown interactively.

## 2. The teardown pass

Given a Build Report, triage in this order (see `examples/03-build-size-teardown.md`):

1. **Textures** — usually the #1 contributor. Compression (ASTC) and atlasing are
   `mobile-game-perf-guardian`'s `guides/06`/`04` — **co-owned**: this Guardian flags "textures are
   N% of the build," perf owns the import-setting fix.
2. **Audio** — compression format + load type; uncompressed clips bloat builds fast.
3. **Managed code (IL2CPP)** — raise **managed stripping** + add a `link.xml` (`guides/05 §2`);
   use **OptimizeSize** codegen (`guides/05 §3`).
4. **Engine modules** — "Strip Engine Code"; remove unused modules from `Packages/manifest.json`
   (DRIFT's manifest currently includes many `com.unity.modules.*` — VR, XR, cloth, vehicles,
   terrain, wind — that a top-down mobile game does not ship; pruning them is a Tier-1 size win,
   flagged here, removed deliberately).
5. **Duplicated assets** — assets pulled into multiple bundles (relevant once Addressables lands,
   `guides/07`).

## 3. The size budget

Set a target install size (a product decision — co-own with the human/product owner; mobile
conversion drops as install size climbs). Track the Build Report `totalSize` against it every CI
build (`guides/10`) and flag regressions. A size budget that nobody measures is not a budget — the
CI build should print the size and (optionally) fail past a ceiling.

## 4. The manifest-pruning opportunity (repo-grounded)

`Packages/manifest.json` today carries the full default module set including
`com.unity.modules.vr`, `.xr`, `.cloth`, `.vehicles`, `.terrain`, `.terrainphysics`, `.wind`,
`.umbra`, `.director`. A top-down mobile portrait game (`CLAUDE.md §1`) ships none of these.
**Pruning unused modules is a clean Tier-1 build-size win** — but it's a structural change, so:
flag it here, do it deliberately with an `ARCHITECTURE.md` note (`CLAUDE.md §6` Rule #8), and verify
nothing in the spine references them first.

## Severity

- **Must-fix:** none inherent to size (size is a budget, not correctness) — except shipping
  uncompressed textures/audio to device at scale (a perf+size regression, co-owned must-fix).
- **Should-refactor:** no Build Report teardown step in the build; unused engine modules shipped;
  no size budget tracked in CI; stripping at default (`guides/05`).
- **Style:** report formatting.

## Handoffs

- Texture/audio import settings + ASTC + atlasing → `mobile-game-perf-guardian` (**co-owned**).
- Managed stripping / codegen → `guides/05`.
- Tracking size in CI → `guides/10`.
- Addressables bundle dedup → `guides/07` (forward).
