# Unity Rendering Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `unity-rendering-guardian`. Use this guide to
decide whether a user request belongs to this Guardian.

**Guardian:** [`ai-tools/agents/unity-rendering-guardian.md`](../../../agents/unity-rendering-guardian.md)
**Weapon:** [`ai-tools/skills/unity-rendering-weapon/`](../../unity-rendering-weapon/)
**Command Brief:** [`ai-tools/command-briefs/unity-rendering-guardian-command-brief.md`](../../../command-briefs/unity-rendering-guardian-command-brief.md)
**Trigger policy:** on-demand (not proactive)

---

## Domain

`unity-rendering-guardian` is PROJECT-DRIFT's authority on **URP (Universal Render Pipeline)
configuration and the mobile render look**. Its remit: the URP Render Pipeline Asset + quality
tiers / render scale, the Forward-vs-Forward+ renderer choice on mobile, the lighting model
(baked/mixed for static geometry + a realtime budget, light + reflection probes), post-processing
volumes (tonemapping / bloom / vignette / color grading within a mobile fill-rate budget), the
top-down camera stack, the URP shader/material baseline, and migrating the gray-box's `Standard`
fallback onto a real URP pipeline. Two facts gate everything: **URP is not installed** (no
`com.unity.render-pipelines.universal` in `Packages/manifest.json`), so this is Tier-1/art-phase
pipeline DESIGN, not a build-now directive; and per `CLAUDE.md §7`, **the human owns the final
look** — this Guardian ships a neutral, measurable baseline.

## Trigger phrases

Route to `unity-rendering-guardian` when the user says any of:

- "Set up URP" / "configure the URP asset" / "install the render pipeline"
- "URP quality tiers for mobile" / "render scale for Android"
- "Forward or Forward+" / "which rendering path"
- "Bake the lighting" / "baked vs realtime lights" / "lighting model for the top-down view"
- "Add a post-processing volume" / "tonemapping / bloom / vignette / color grading"
- "Pick a URP shader" / "Simple Lit vs Lit" / "the material baseline"
- "Migrate GrayBoxVisuals off Standard" / "we're going URP, fix the materials"
- "Set up the top-down camera" / "perspective vs orthographic camera"
- Anything about configuring the render pipeline / the mobile look for the 3D top-down game

Or when the request implicitly involves URP configuration, the render pipeline asset, the lighting
model, post-processing setup, or the camera/shader baseline.

## Do NOT route when

- The user wants shader/material **runtime cost**, **draw-call batching**, or **overdraw
  measurement** — that is `mobile-game-perf-guardian`. (**Co-owned** seam: this Guardian picks the URP
  shader / volume / render scale; perf measures whether it batches and fits the ms budget. Route
  the *config* here, the *cost verdict* to perf.)
- The user wants **model or texture import** (mesh import settings, ASTC source compression, atlas
  authoring) — that is `unity-art-pipeline-guardian`. (This Guardian defines what the materials consume.)
- The user wants post-fx as **juice / game-feel intent** (a hit-flash, a damage pulse, a heal-glow)
  — that is `game-feel-juice-guardian`. (This Guardian owns the post-process **volume stack + budget**
  the juice lives inside.)
- The user wants **gameplay component C#** (the MonoBehaviours, `Configure`, the EditMode harness)
  — that is `unity-csharp-guardian`. (Render-related C# — camera-stack wiring, the material-swap
  edit — is co-owned; keep it EditMode-safe per `ARCHITECTURE.md §7`.)
- The user wants **per-scene lightmap baking** or **probe placement** in an authored level — that is
  `unity-level-design-guardian`. (This Guardian owns the lighting-mode choice; the bake belongs there.)
- The user wants PRD or IRD authoring — that is `library-guardian`. (Architectural rationale for the
  URP-install / look ADR stays here.)
- The user wants device builds, flashing, or the final aesthetic call — that is the **human**
  (`CLAUDE.md §7`).

If the request straddles boundaries (e.g. "make the game look good and run fast on mobile"), prefer
routing to `unity-rendering-guardian` first for the pipeline + look config, then chain to
`mobile-game-perf-guardian` for the on-device cost verdict.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- `Packages/manifest.json` — to confirm URP presence (**absent today** → step zero is install).
- `ProjectSettings/ProjectVersion.txt` — the Unity pin (`6000.0.23f1`).
- The render sites: `Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs` (the `Standard`
  fallback) and `Assets/Scripts/Drift/Gameplay/CameraRig/TopDownFollowCamera.cs` (orthographic).
- Optional: specific focus (URP setup, quality tiers, Forward/Forward+, lighting model, post-process
  volume, shader baseline, camera stack, gray-box migration).
- Optional: constraints (target device class, whether the team is committing to install URP in
  Tier 1, the perspective-vs-orthographic preference).

If the repo access is missing, do not invoke yet — ask the user to point at the manifest and the
render scripts.

## Outputs the Guardian produces

- **Standalone render audits / setup notes** → `library/qa/unity-rendering/<date>-<topic>.md`.
- **Feature-tied** → `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`.
- **Issue-tied** → `library/requirements/issues/issue-<###>-<title>/reports/<date>-<type>-report.md`.
- **ADRs** → `library/architecture/ADR-<n>-<topic>.md` (e.g. "Install URP", "Camera projection").

Every finding cites (a) the repo path (`Assets/Scripts/Drift/...:LN`, `Packages/manifest.json`) and
(b) the relevant guide plus, where applicable, a named Unity 6 URP reference. Unverifiable URP
defaults are marked "verify in-editor," never asserted.

## Multi-Guardian sequences this Guardian participates in

- **"Make it look good and run fast on mobile"** — `unity-rendering-guardian` sets the URP pipeline,
  quality tiers, lighting model, post-process budget, and shader baseline; `mobile-game-perf-guardian`
  measures the on-device cost and confirms batching/fill-rate; `unity-art-pipeline-guardian` imports
  the meshes/textures the materials apply to. Sequence: rendering (config) → perf (cost verdict),
  with art-pipeline feeding both.
- **Gray-box → real-art migration** — `unity-rendering-guardian` migrates `GrayBoxVisuals` off the
  `Standard` fallback and picks the URP shader; `mobile-game-perf-guardian` owns the shared-material
  + `MaterialPropertyBlock` batching fix; `unity-csharp-guardian` keeps the C# EditMode-safe.
- **Lighting a level** — `unity-rendering-guardian` chooses baked/mixed/realtime + the probe
  strategy; `unity-level-design-guardian` authors the scene and runs the bake; `mobile-game-perf-guardian`
  confirms the lightmap/texture-memory budget.
- **The look pass** — `unity-rendering-guardian` ships the neutral baseline (tonemapping, exposure,
  render scale); `game-feel-juice-guardian` adds the juice within the volume budget; the **human**
  art-directs the final aesthetic (`CLAUDE.md §7`).

## Critical directives the orchestrator should respect

- **Tier discipline first.** URP isn't installed and Tier 0 has no scene — every response is pipeline
  DESIGN framed for Tier-1/art-phase, never a "go build the look now" directive (`CLAUDE.md §6` Rule
  #1).
- **URP is absent — the Guardian says so.** It will not assert a configured pipeline; step zero is
  always "install `com.unity.render-pipelines.universal` (Tier-1 ADR)."
- **The human owns the look.** The Guardian configures a neutral, measurable baseline and hands the
  final aesthetic call to the human (`CLAUDE.md §7`).
- **Co-ownership with perf is explicit.** The Guardian sets the shader / volume / render scale; it hands
  the cost verdict (batching, ms budget, fill-rate) to `mobile-game-perf-guardian` and never asserts
  an on-device number headless.
- **Severity is credibility.** The Guardian classifies findings (must-fix / should-fix / forward-guidance)
  and never drags a Tier-1 render system into a Tier-0 block.
- **Ground every claim; flag the unverifiable.** Cite the repo (`GrayBoxVisuals.cs`,
  `TopDownFollowCamera.cs`, the manifest); mark any Unity 6 URP default it can't verify headless as
  "verify in-editor"; never fabricate URLs or version numbers.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`ai-tools/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
