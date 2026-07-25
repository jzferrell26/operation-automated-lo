# 02 — Quality tiers for mobile

**One URP Render Pipeline Asset per quality tier**, each mapped to a Unity **Quality** level
(Project Settings → Quality). DRIFT targets mid-tier Android/iOS in portrait; plan three tiers:
**Low**, **Mid**, **High**.

## The levers, cheapest to most expensive

| Lever | What it does | Mobile guidance |
|---|---|---|
| **Render scale** | Renders below native res, upscales | **The cheapest frame-time lever.** Low tier < 1.0; Mid 1.0; High 1.0. |
| **Shadow distance / cascades** | How far + how many shadow splits | Low: short distance, 1 cascade. Mid: modest. High: longer. |
| **HDR** | High-dynamic-range color buffer | Off/Low on the low tier; on for High (needed for nice bloom). |
| **MSAA** | Hardware anti-aliasing | Off on Low; 2x Mid; 2–4x High. Costs bandwidth on tiled GPUs. |
| **Depth / Opaque texture** | Extra full-screen passes for effects | **Off unless a feature needs them** — each is a real cost. |
| **Shadow resolution** | Shadowmap size | Lower on Low; the look rarely needs more on a top-down view. |

## Suggested tier shape (a starting baseline — the human tunes)

- **Low:** render scale ~0.7–0.85, HDR off, MSAA off, short shadow distance + 1 cascade,
  depth/opaque textures off.
- **Mid:** render scale 1.0, HDR optional, MSAA 2x optional, modest shadows.
- **High:** render scale 1.0, HDR on, MSAA 2–4x, longer shadows.

These exact numbers are a **neutral baseline**, not the final look — author them, then hand the
intensity/feel call to the human (`CLAUDE.md §7`), and hand the "does this fit the ms budget"
question to `mobile-game-perf-guardian` (`guides/09-render-perf-handoff.md`). The canonical
settings table is `templates/urp-asset-settings.md`; the worked walkthrough is
`examples/01-configure-urp-asset-quality-tiers.md`.

## How tiers are selected

Each URP asset is assigned to a Quality level. At runtime, the active Quality level (set by the
player, the platform default, or `QualitySettings.SetQualityLevel`) picks the URP asset. On mobile
you typically detect device class once and pick a tier — but that **device-tiering logic is
forward-guidance** until DRIFT ships content.

## Tier discipline

URP isn't installed and Tier 0 has no scene. Three authored quality assets are **Tier-1
forward-guidance**: design them now, author them when URP lands. Don't block a Tier 0 PR on a
quality-tier asset that has nothing to render.

## Verify-in-editor flags

- Unity 6 URP **default render scale** and whether sub-1.0 upscaling uses a specific upscaler
  (e.g. FSR / bilinear) — **verify in-editor.**
- Default MSAA sample count and the per-platform shadow defaults — **verify in-editor.**

Sources: Unity 6 Manual "Configure URP for better performance" / "Optimize for mobile", "The
Universal Render Pipeline Asset"; `mobile-game-perf-weapon/guides/01-the-frame-budget.md` (the
ms budget the tiers must fit); `CLAUDE.md §7`.
