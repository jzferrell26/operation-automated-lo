# 01 — URP setup & the Render Pipeline Asset

**Open every plan here: URP is not installed.** `Packages/manifest.json` has no
`com.unity.render-pipelines.universal`. Installing it is a **Tier-1 decision** (one render
pipeline for the project, switched from Built-in) and warrants an ADR (`library/architecture/`).

## The install (Tier-1 step zero)

1. **Add the package** — `com.unity.render-pipelines.universal` via Package Manager (or add it to
   `Packages/manifest.json` and let the resolver pull the URP version paired with Unity
   `6000.0.x`). **Verify the exact compatible URP version in-editor** — do not assert a version
   tag headless.
2. **Switching from Built-in is a one-way-ish migration.** Existing Built-in materials (including
   the gray-box's `Standard` fallback) render **pink/magenta** until upgraded — that's the
   migration in `guides/08-builtin-to-urp-migration.md`, not a bug.

## The objects URP creates

- **URP Render Pipeline Asset** (`Universal Render Pipeline Asset`) — the central settings object:
  quality, lighting, shadows, post-processing toggle, render scale. You author **one per quality
  tier** (`guides/02-quality-tiers-mobile.md`).
- **URP Renderer asset** (the **Universal Renderer**) — the rendering path (Forward / Forward+ /
  Deferred) and the **Renderer Features** list (`guides/03-forward-vs-forward-plus.md`). A pipeline
  asset references one or more renderers.
- **`UniversalRenderPipelineGlobalSettings`** — project-wide URP settings (default volume profile,
  stripping). Created automatically when URP is assigned.

## Assigning the pipeline (the must-fix gate)

URP only takes effect when the asset is **assigned**:

- **Project Settings → Graphics** → set the **default Render Pipeline Asset**.
- **Project Settings → Quality** → assign a URP asset **per Quality level** (this is how the tiers
  in `guides/02` are actually selected at runtime).

**If the pipeline asset is not assigned, everything renders pink** — that is the #1 URP setup
failure (`guides/10-failure-modes.md`). This is a **must-fix once URP is installed**.

## Tier discipline reminder

URP is not in the repo and Tier 0 has no scene. **Do not add the package mid-Tier-0** to skin the
gray-box (`CLAUDE.md §6` Rule #1). Frame all of the above as "when URP lands in Tier 1." The human
makes the install call and art-directs the result (`CLAUDE.md §7`).

## Verify-in-editor flags

- Exact URP package version compatible with Unity `6000.0.x` — **verify in-editor.**
- Whether `UniversalRenderPipelineGlobalSettings` is auto-created on assign in this Unity version —
  **verify in-editor.**

Sources: Unity 6 Manual "Universal Render Pipeline overview", "The Universal Render Pipeline
Asset"; `Packages/manifest.json` (URP absent); `CLAUDE.md §6, §7`.
