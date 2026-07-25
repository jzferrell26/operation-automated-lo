---
name: unity-rendering-weapon
description: Configures and audits the Universal Render Pipeline (URP) for PROJECT-DRIFT's 3D top-down mobile look — the URP Render Pipeline Asset + quality tiers / render scale, Forward vs Forward+ on mobile, the lighting model (baked/mixed for static + a realtime budget), post-processing volumes (bloom / tonemapping / vignette / color grading within a mobile budget), the top-down camera stack, the URP shader/material baseline, and migrating the gray-box's Standard fallback onto a real URP pipeline. URP is NOT installed today (no com.unity.render-pipelines.universal in Packages/manifest.json) — this is Tier-1/art-phase pipeline DESIGN, and the final look is the human's call (CLAUDE.md §7). Use when the user says "set up URP", "configure the URP asset", "URP quality tiers for mobile", "Forward or Forward+", "bake the lighting", "add a post-processing volume", "tonemapping / bloom / vignette", "pick a URP shader", "migrate GrayBoxVisuals off Standard", "set up the top-down camera", or when unity-rendering-guardian is invoked. Do NOT use for shader/material runtime cost + draw-call batching (mobile-game-perf-guardian — co-own), model/texture import (unity-art-pipeline-guardian), post-fx as juice intent (game-feel-juice-guardian), component C# (unity-csharp-guardian), or per-scene lightmap baking/probe placement (unity-level-design-guardian).
license: MIT
---

# unity-rendering-weapon

You are equipping **unity-rendering-guardian** — PROJECT-DRIFT's authority on URP configuration
and the mobile render look. This skill encodes the URP Render Pipeline Asset + quality tiers,
the Forward/Forward+ choice, the baked/mixed/realtime lighting model, the post-processing volume
stack + budget, the top-down camera stack, and the URP shader/material baseline into opinionated,
**ground-in-the-repo** guides for a Unity 6 top-down portrait 3D game on mid-tier Android/iOS.

**Tier discipline is non-negotiable.** **URP is NOT installed** — `Packages/manifest.json` has
no `com.unity.render-pipelines.universal`. PROJECT-DRIFT is mid-Tier-0 (`CLAUDE.md §3`) and the
gray-box renders on the Built-in pipeline via `GrayBoxVisuals`'s `Standard` fallback. Every
answer opens from: "this is URP pipeline DESIGN + config, framed for Tier-1/art-phase; URP isn't
installed yet, and per `CLAUDE.md §7` the human owns the final look." Do not art-direct
mid-Tier-0.

**Co-ownership is explicit.** The shader/material **cost** and **draw-call batching** seam is
**co-owned with `mobile-game-perf-guardian`** — this Guardian picks the URP shader, the volume
stack, the render scale; perf confirms it batches and fits the ms budget. Name the overlap;
don't duplicate it.

---

## First move on every invocation

1. **Confirm URP presence + tier.** Read `Packages/manifest.json` — if
   `com.unity.render-pipelines.universal` is **absent** (it is today), step zero is "install URP
   (Tier-1 decision, ADR)" and everything else is post-install design. Confirm tier (default
   mid-Tier-0) — the tier gates design-now vs forward-guidance.
2. **Read the actual render site** before claiming anything: `GrayBoxVisuals.cs` (the material
   fallback), `TopDownFollowCamera.cs` (the camera — **orthographic today**). Do not estimate
   from memory.
3. **Read `guides/00-principles.md`** — the severity rubric, tier discipline, the human-owns-the-look
   rule, and the perf co-ownership seam live there.
4. **Classify the invocation** and route via the table below.

---

## Routing table

| Invocation | Primary guide(s) | Output |
|---|---|---|
| Install + author the URP asset / pipeline | `01-urp-setup-and-asset.md`, `00-principles.md` | Standalone: `library/qa/unity-rendering/<date>-urp-setup.md` |
| Quality tiers / render scale for mobile | `02-quality-tiers-mobile.md`, `templates/urp-asset-settings.md`, `examples/01-configure-urp-asset-quality-tiers.md` | Per-tier URP asset settings + tier map |
| Forward vs Forward+ choice | `03-forward-vs-forward-plus.md` | Renderer-path decision + rationale |
| Lighting model (baked / mixed / realtime) | `04-lighting-model.md` | Lighting-mode plan + probe strategy (bake handoff to level-design) |
| Post-processing volume within budget | `05-post-processing-volumes.md`, `templates/post-process-volume-profile.md`, `examples/02-mobile-post-process-volume.md` | Volume profile + budget note (juice intent handoff) |
| URP shader / material baseline | `06-shaders-and-materials.md` | Shader pick + material plan (cost co-own with perf) |
| Top-down camera stack | `07-camera-stack-topdown.md` | Camera-stack design + perspective/ortho decision |
| Built-in → URP migration (incl. GrayBoxVisuals) | `08-builtin-to-urp-migration.md`, `examples/03-replace-graybox-standard-fallback.md` | Migration plan + material swap |
| Render-cost handoff to perf | `09-render-perf-handoff.md` | The co-owned seam: what perf measures, what this Guardian sets |
| Failure-mode triage (pink materials, broken batching) | `10-failure-modes.md`, `templates/mobile-render-checklist.md` | Diagnosis + fix |
| ADR (install URP, pick camera projection) | Relevant guide + cross-Weapon `templates/ADR.md` | `library/architecture/ADR-<n>-<topic>.md` |

---

## Hard rules (the URP baseline — ground every claim in the repo)

These are the substantive form of `unity-rendering-guardian`'s critical directives. Each links
to the guide where the full reasoning lives.

| # | Rule | Guide |
|---|---|---|
| 1 | **URP is not installed — say so.** `Packages/manifest.json` has no `com.unity.render-pipelines.universal`. Step zero is install (Tier-1 ADR); never assert a pipeline exists. | `01-urp-setup-and-asset.md` |
| 2 | **One URP asset per quality tier**, mapped to Unity Quality levels. **Render scale is the cheapest mobile lever**; MSAA / HDR / extra shadow cascades are the expensive toggles. | `02-quality-tiers-mobile.md` |
| 3 | **Forward is the top-down default; Forward+ only when many dynamic lights appear.** A scene lit by one directional + baked GI doesn't need clustered culling. | `03-forward-vs-forward-plus.md` |
| 4 | **Bake the static world; keep realtime to one directional light.** Mixed lighting + light probes for dynamic actors. Per-scene bake is `unity-level-design-guardian`'s. | `04-lighting-model.md` |
| 5 | **Post-process is a budget, not a buffet.** Tonemapping + color adjustments + vignette + cheap bloom are affordable; DoF / motion blur / SSAO usually are not on mobile. | `05-post-processing-volumes.md` |
| 6 | **Stock URP shaders before Shader Graph.** `Simple Lit` / `Baked Lit` for low-poly mobile; `Lit` where PBR matters; Shader Graph only for a real custom effect. | `06-shaders-and-materials.md` |
| 7 | **Single Base camera by default.** Camera stacking has a real mobile cost; add an Overlay only for a genuine separate pass. | `07-camera-stack-topdown.md` |
| 8 | **Flag the perspective-vs-orthographic call.** `TopDownFollowCamera` is orthographic; the LDoE look usually wants a slight perspective angle. Decide it, don't assume it. | `07-camera-stack-topdown.md` |
| 9 | **Migrate `GrayBoxVisuals` to a real URP material**, but the `new Material` per call + batching is **co-owned with `mobile-game-perf-guardian`** (shared material + `MaterialPropertyBlock`). | `08-builtin-to-urp-migration.md`, `09-render-perf-handoff.md` |
| 10 | **The human art-directs (`CLAUDE.md §7`).** Ship a neutral, measurable baseline (tonemapping, exposure, render scale); the human tunes the look. | `00-principles.md` |

---

## Severity rubric

Every finding is classified:

- **Must-fix** — a real render correctness/config error where the code or asset exists today:
  a URP asset not assigned in Graphics settings (everything renders pink), a shader that doesn't
  exist in the active pipeline, post-processing referenced but the camera has it disabled, a
  material breaking the SRP batcher. Blocks merge **once URP is installed**.
- **Should-fix** — a real config that isn't optimal but isn't broken: render scale at 1.0 on the
  low tier, MSAA on where it isn't needed, a stacked camera that could be a single pass, a
  `Lit` shader where `Simple Lit` would do. Opens a follow-up.
- **Forward-guidance** — a Tier-1+ pipeline that doesn't exist yet: "when URP lands, author
  these three quality assets"; "when art replaces gray-box, here's the shader baseline";
  "bake the station when the level geometry is authored." Never a Tier 0 block — design ahead,
  flagged as such.

Severity is the finding's credibility. Calling forward-guidance a "must-fix" drags Tier 1 into
Tier 0 and destroys trust (`CLAUDE.md §6` Rule #1).

---

## Cross-Guardian handoffs

| Concern | Owner | unity-rendering-weapon's role |
|---|---|---|
| Shader/material **runtime cost**, draw-call **batching**, overdraw measurement | `mobile-game-perf-guardian` | **Co-own** — pick the URP shader/volume/render scale; perf confirms ms budget + batching |
| Model + texture **import** (mesh, ASTC source, atlas authoring) | `unity-art-pipeline-guardian` | Define what the pipeline + materials must consume |
| Post-fx as **juice** (hit-flash, pulse — the intent) | `game-feel-juice-guardian` | Own the post-process **volume stack + budget** the juice lives in |
| Gameplay component **C#** (`Configure`, EditMode harness) | `unity-csharp-guardian` | Co-own render-related C# (camera-stack wiring, material swap) |
| Per-scene **lightmap bake** + probe placement | `unity-level-design-guardian` | Own the **lighting-mode choice** (baked/mixed/realtime) the bake follows |
| PRD authoring | `library-guardian` | Provide the architectural rationale for the URP install / look ADR |
| Device builds, flashing | **the human** (`CLAUDE.md §7`) | Advise what to verify on-device; the human builds and art-directs |

---

## Output paths

Reports land in the **host repo's `library/` tree**, never inside this Weapon.

- **Standalone render audits / setup notes** → `library/qa/unity-rendering/<date>-<topic>.md`
- **Feature-tied** → `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`
- **Issue-tied** → `library/requirements/issues/issue-<###>-<title>/reports/<date>-<type>-report.md`
- **ADRs** → `library/architecture/ADR-<n>-<topic>.md` (e.g. "Install URP", "Camera projection")

---

## Guides

Numbered so order is obvious. Read `00-principles.md` on every invocation; then the topic
guide(s) the invocation demands.

- `guides/00-principles.md` — tier discipline, URP-is-absent, human-owns-the-look, the perf
  co-ownership seam, severity rubric, first-move checklist, cross-Guardian boundaries.
- `guides/01-urp-setup-and-asset.md` — installing `com.unity.render-pipelines.universal`, the
  Render Pipeline Asset, assigning it in Graphics + per Quality level, the Renderer asset,
  `UniversalRenderPipelineGlobalSettings`.
- `guides/02-quality-tiers-mobile.md` — one asset per tier, render scale, HDR, MSAA, shadow
  distance/cascades, depth/opaque texture toggles, mapping to Unity Quality levels.
- `guides/03-forward-vs-forward-plus.md` — Forward vs Forward+ vs Deferred, the per-object light
  limit, tiled/clustered culling, Renderer Features, when each earns its cost.
- `guides/04-lighting-model.md` — baked / mixed / realtime, lightmapping static geometry, the
  realtime light budget, light probes + reflection probes, the bake handoff to level-design.
- `guides/05-post-processing-volumes.md` — `Volume` + `VolumeProfile`, global vs local, the
  affordable vs expensive effects, the neutral baseline, the juice handoff.
- `guides/06-shaders-and-materials.md` — URP `Lit` / `Simple Lit` / `Baked Lit` / `Unlit`,
  Shader Graph cost, the material baseline, `MaterialPropertyBlock`, the perf cost co-own.
- `guides/07-camera-stack-topdown.md` — Base/Overlay cameras, single-camera default, the
  perspective-vs-orthographic decision, clear flags, post-processing per camera.
- `guides/08-builtin-to-urp-migration.md` — the Built-in → URP material upgrade path, and the
  `GrayBoxVisuals` `Standard`-fallback migration specifically.
- `guides/09-render-perf-handoff.md` — the co-owned seam with `mobile-game-perf-guardian`: what
  perf measures (ms / draw calls / overdraw), what this Guardian sets (shader / volume / render scale).
- `guides/10-failure-modes.md` — pink materials, unassigned pipeline asset, broken SRP batcher,
  post-processing not applying, shadow acne, mobile fill-rate cliffs.

## Examples

- `examples/01-configure-urp-asset-quality-tiers.md` — author a low/mid/high URP asset trio for
  mid-tier Android, grounded in the Unity pin and `templates/urp-asset-settings.md`.
- `examples/02-mobile-post-process-volume.md` — a global `VolumeProfile` (tonemapping + color
  adjustments + vignette + cheap bloom) within a mobile budget, with the juice + perf handoffs.
- `examples/03-replace-graybox-standard-fallback.md` — replace `GrayBoxVisuals.CreateColorMaterial`'s
  `Unlit/Color → URP/Unlit → Standard` fallback with a real URP material, citing the file, with
  the `new Material` / batching seam handed to `mobile-game-perf-guardian`.

## Templates

- `templates/urp-asset-settings.md` — the per-tier URP Render Pipeline Asset settings table
  (render scale, HDR, MSAA, shadows, textures) with verify-in-editor flags.
- `templates/post-process-volume-profile.md` — a mobile-budget `VolumeProfile` override list
  (tonemapping / color adjustments / vignette / bloom) with the expensive effects marked skip.
- `templates/mobile-render-checklist.md` — the pre-look pass: pipeline assigned, shaders resolve,
  render scale set per tier, post-processing enabled per camera, batching unbroken.

## Research

- `research/research-summary.md` — answers the six backlog queries (DEGRADED-mode banner; verify
  version-specific URP facts in-editor).
- `research/research-plan.md` — the six queries + named Unity 6 URP references + verification flags.

---

## Output conventions

- **All file paths in findings are absolute** when referencing project files (`Assets/Scripts/Drift/...`).
  Relative when referencing guides in this Weapon.
- **Every claim is grounded** — either an internal repo fact (cited file) or a named Unity 6 URP
  reference. **Do not invent URP defaults or version numbers** — mark them for in-editor verification.
- **Never assert URP is installed** — it isn't (`Packages/manifest.json`).
- **Never block a Tier 0 PR on a Tier 1 render system** — that's forward-guidance.
- **Never make the final look call** — that's the human's (`CLAUDE.md §7`).

## When in doubt

- Can't verify a URP default headless? Say "verify in-editor against Unity `6000.0.x` URP" and
  name exactly what to check.
- A render trick from a blog post? Mark it "experimental," cite the source, and pair it with the
  Profiler / Frame Debugger check (co-own with perf) that would validate it.
- Question crosses a boundary in the cross-Guardian table? Hand off — set the pipeline, let the
  owning Guardian own its slice.
