# Research Summary — unity-rendering-weapon

> **RESEARCH MODE: DEGRADED — knowledge-based; Firecrawl/Exa unavailable; verify
> version-specific URP facts against current Unity 6 docs.** Where a URP default, render-scale
> value, Forward+ tile size, or shader name matters, the guide marks it for in-editor /
> live-docs verification rather than asserting it. Internal repo facts (`Packages/manifest.json`
> URP absence, the Unity pin, `GrayBoxVisuals.cs`, `TopDownFollowCamera.cs`) are authoritative
> and cited directly.

This synthesis answers the six backlog queries that scope `unity-rendering-weapon`. The
governing repo fact, true for all six: **URP is not installed**
(`Packages/manifest.json` has no `com.unity.render-pipelines.universal`), the gray-box renders
on the Built-in pipeline via `GrayBoxVisuals`'s `Unlit/Color → URP/Unlit → Standard` fallback,
and the final look is the human's call (`CLAUDE.md §7`). Everything below is Tier-1/art-phase
DESIGN.

---

## 1. URP mobile rendering settings & quality tiers

The **URP Render Pipeline Asset** is the central config object. In Unity 6 it lives in
**Project Settings → Graphics** (the default pipeline) and is referenced per-**Quality** level
(Project Settings → Quality), so you author **one URP asset per quality tier** and map them to
Unity's Quality levels:

- **Low (mid-tier Android floor):** render scale < 1.0 (upscale), HDR off or low, MSAA off,
  short shadow distance + 1 cascade, depth/opaque textures off unless a feature needs them.
- **Mid:** render scale 1.0, HDR optional, MSAA 2x optional, modest shadow distance.
- **High (newer devices / editor):** render scale 1.0, HDR on, MSAA 2–4x, longer shadows.

The biggest mobile lever is **render scale** (renders at a fraction of native, upscales) —
it's the cheapest way to buy frame time. **MSAA, HDR, and extra shadow cascades are the
expensive toggles.** Detail in `guides/02-quality-tiers-mobile.md` +
`templates/urp-asset-settings.md`. **Verify the Unity 6 default render scale / MSAA values
in-editor** — don't assert them. Whether a setting fits the ms budget is **co-owned with
`mobile-game-perf-guardian`.**

## 2. Post-processing volumes within a mobile budget

URP post-processing is the **Volume framework**: a `Volume` component (global or local/box)
holds a `VolumeProfile`, and the camera must have **Post Processing enabled** to apply it.
Mobile budget reality (tiled GPUs are fill-rate bound):

- **Affordable:** **Tonemapping** (pick **Neutral** or **ACES** — pick one and commit),
  **Color Adjustments** (exposure/contrast/saturation), **Vignette**, a **cheap Bloom**
  (low iterations, no high-quality filtering).
- **Expensive / usually skip on mobile:** Depth of Field, Motion Blur, screen-space ambient
  occlusion (SSAO renderer feature), Film Grain, Chromatic Aberration at high intensity.

The base look should be a **neutral, measurable** profile (tonemapping + slight color grade);
the human art-directs intensity. Post-fx as **juice** (a hit-flash, a damage pulse) is
`game-feel-juice-guardian`'s intent call — this Guardian owns the **volume stack + budget** it
lives in. Detail in `guides/05-post-processing-volumes.md` +
`templates/post-process-volume-profile.md`. **Real fill-rate cost needs an on-device capture
(co-own with perf).**

## 3. Forward vs Forward+ on mobile

URP offers **Forward**, **Forward+**, and Deferred rendering paths (set on the URP **Renderer**
asset). For a top-down game:

- **Forward** is the classic mobile default — cheap, but caps **per-object real-time lights**
  (historically ~8) and does per-object light culling.
- **Forward+** does **tiled/clustered light culling**, lifting the per-object light limit and
  handling many lights better — at some extra GPU cost. For a top-down scene lit mostly by
  **one directional light + baked lighting**, classic **Forward is usually the right default**;
  Forward+ earns its cost only when many small dynamic lights appear (a Tier-1 question).
- **Deferred** is rarely the mobile pick for this game class.

**Renderer Features** (`ScriptableRendererFeature`, e.g. Render Objects) extend a renderer;
keep the mobile/low-tier renderer feature-light. Detail in
`guides/03-forward-vs-forward-plus.md`. **Verify the Unity 6 per-object light limit + Forward+
tile defaults in-editor.**

## 4. Lighting model: baked / mixed / realtime

A top-down station + dead-planet scene is mostly **static geometry** — ideal for **baked
lighting**:

- **Baked** lightmaps for static walls/floors/props: zero runtime lighting cost, the mobile
  sweet spot.
- **Mixed** (e.g. Shadowmask / Baked Indirect) for a key **directional light** so dynamic
  actors (player, enemies, salvage) still cast/receive sensible shadows while static GI stays
  baked.
- **Realtime** kept to a tight budget — ideally a **single directional light**; avoid many
  realtime point/spot lights on the low tier.
- **Light Probes** light dynamic actors from the baked environment cheaply; **Reflection
  Probes** give low-poly surfaces grounded reflections (low resolution on mobile).

This Guardian owns the **lighting-mode choice** (baked/mixed/realtime + probe strategy); the
per-scene **bake and probe placement** is `unity-level-design-guardian`. Detail in
`guides/04-lighting-model.md`.

## 5. Shaders & materials (and the gray-box migration)

URP ships **`Lit`** (PBR), **`Simple Lit`** (cheaper, Blinn-Phong-ish — good for low-poly
mobile), **`Baked Lit`** (uses baked lighting only), and **`Unlit`**. The baseline:

- Low-poly mobile → **`Simple Lit`** or **`Baked Lit`** for most surfaces; **`Lit`** only where
  PBR response matters; **`Unlit`** for flat/UI-ish elements.
- **Shader Graph** earns its cost only for a real custom effect — a plain tinted surface does
  **not** need a graph; use a stock URP shader + a material.
- The Built-in **`Standard`** material upgrade path: Unity's **"Render Pipeline → Universal
  Render Pipeline → Upgrade … Materials"** converter remaps `Standard` to URP `Lit`.

**The gray-box migration** (`GrayBoxVisuals.CreateColorMaterial`): today it does
`Shader.Find("Unlit/Color") → "Universal Render Pipeline/Unlit" → "Standard"` and
`new Material(shader)` **per call**, probing `_BaseColor` then `_Color`. Once URP is installed,
the real target shader is **`Universal Render Pipeline/Unlit`** (or `Simple Lit`) with
`_BaseColor`; the `new Material` per call is a **perf concern co-owned with
`mobile-game-perf-guardian`** (shared material + `MaterialPropertyBlock` to keep batching).
Detail in `guides/06-shaders-and-materials.md` + `guides/08-builtin-to-urp-migration.md` +
`examples/03-replace-graybox-standard-fallback.md`.

## 6. Camera stack for top-down

URP cameras carry a **render type**: **Base** or **Overlay**, composited via **Camera
Stacking** (Overlay cameras added to a Base camera's stack). For DRIFT:

- A **single Base camera** is the default — stacking has a real mobile cost; add an Overlay
  camera only for a genuine separate pass (e.g. a UI/3D-icon layer that must not be
  post-processed). The Tier-0 throwaway IMGUI HUD does not need a stack.
- **Perspective vs orthographic:** `TopDownFollowCamera` is **orthographic today**
  (`_camera.orthographic = true`, 90° pitch). The Last-Day-on-Earth look usually wants a
  slightly **perspective**, **angled** (not straight-down) camera for parallax/depth — this is
  a **design decision to flag**, not silently flip.
- Post Processing is enabled **per camera**; the clear flags / background already set in
  `TopDownFollowCamera.Awake` (`SolidColor`, dark blue) carry over.

Detail in `guides/07-camera-stack-topdown.md`. **Camera-stack ms cost needs an on-device
capture (co-own with perf).**

---

## Five most load-bearing facts (repo-grounded)

1. **URP is NOT in `Packages/manifest.json`** — no `com.unity.render-pipelines.universal`.
   Step zero of every plan is "install URP (Tier-1 decision, ADR)."
2. **The gray-box renders on Built-in** via `GrayBoxVisuals`'s `Unlit/Color → URP/Unlit →
   Standard` fallback + `new Material` per call — the migration target and a perf seam.
3. **The camera is orthographic** (`TopDownFollowCamera.cs`) — the perspective/ortho call is a
   flagged design decision.
4. **The human art-directs** (`CLAUDE.md §7`) — this Guardian ships a neutral, measurable baseline.
5. **Shader cost + batching are co-owned with `mobile-game-perf-guardian`** — this Guardian picks
   the shader/volume; perf confirms it fits the ms budget and batches.

## Open questions for ongoing accuracy

- Whether the team installs URP in Tier 1 (gates the entire Weapon) and which URP package
  version pairs with Unity `6000.0.x`.
- Final perspective-vs-orthographic camera decision for the LDoE look.
- Exact Unity 6 URP defaults (render scale, MSAA, Forward+ tile size, per-object light limit)
  — verify in-editor.
- The realtime light count the low tier can actually afford (on-device capture, co-own perf).
