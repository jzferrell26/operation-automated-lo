# 07 — Top-down camera stack

The repo's camera baseline is **`Assets/Scripts/Drift/Gameplay/CameraRig/TopDownFollowCamera.cs`**:
it forces a `Camera`, sets **`orthographic = true`**, `orthographicSize = 11`, a 90° pitch
(`Quaternion.Euler(90, 0, 0)`), `SolidColor` clear, and follows the player tagged `Player`. Read
that file before proposing anything — the camera already exists; this guide configures the **URP
camera + stack** around it.

## URP camera render types

Under URP, every camera has a **render type**: **Base** or **Overlay**. Overlay cameras are
composited onto a Base camera via the Base camera's **Camera Stack** list.

- **Default: a single Base camera.** Camera **stacking has a real mobile cost** (each stacked
  camera is extra setup + a render pass). Add an Overlay **only** for a genuine separate pass —
  e.g. a 3D weapon/icon layer that must render without the Base camera's post-processing, or a
  separate UI-3D layer. The Tier-0 throwaway IMGUI HUD (`Tier0Hud`) needs **no** stack.
- **Post Processing is a per-camera toggle.** The Base camera enables it; Overlays opt in/out.
  Forgetting this is the "my volume does nothing" failure (`guides/10`).

## The decision to flag: perspective vs orthographic

`TopDownFollowCamera` is **orthographic today**. That's a clean, flat top-down — but the
**Last-Day-on-Earth look** the art direction calls for usually wants a **slightly perspective**,
**angled** (not straight-down 90°) camera: a modest FOV + a tilted pitch gives depth, parallax,
and readable 3D forms on low-poly models.

**This is a design decision to surface, not silently flip** (`CLAUDE.md §7` — the human owns the
look). Present the trade:

| | Orthographic (today) | Perspective (LDoE-style) |
|---|---|---|
| Look | Flat, clean, "true" top-down | Depth, parallax, 3D readability |
| Tuning | `orthographicSize` | FOV + pitch + height |
| Risk | Low-poly forms read flat | Must tune so gameplay reads aren't distorted |

If the team goes perspective, that's an **ADR** ("Camera projection for the top-down look") and a
change to `TopDownFollowCamera` (the C# change co-owned with `unity-csharp-guardian`).

## Tier discipline

There's no scene and no URP camera component in Tier 0. The stack design + projection decision are
**design-now**; they're wired when URP lands and real scenes exist. Don't restructure the working
gray-box camera mid-Tier-0 just to add URP plumbing.

## Verify-in-editor flags

- The exact mobile cost of an Overlay camera in this URP version — **needs an on-device capture
  (perf co-own)**.
- Whether the URP camera component auto-adds on the existing `Camera` when URP is installed —
  **verify in-editor.**

Sources: Unity 6 Manual "Cameras in URP", "Camera Stacking", "Camera component reference";
`Assets/Scripts/Drift/Gameplay/CameraRig/TopDownFollowCamera.cs`; `CLAUDE.md §7`.
