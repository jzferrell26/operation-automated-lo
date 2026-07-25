# Template — Mobile post-processing Volume Profile

> **DESIGN template.** URP is not installed; there's no camera/scene to attach a volume to yet.
> Author this `VolumeProfile` when URP + scenes land (Tier 1). The human owns final
> intensity/color (`CLAUDE.md §7`); `mobile-game-perf-guardian` owns the fill-rate verdict
> (`guides/09`). The camera must have **Post Processing enabled** or none of this applies
> (`guides/07`, `guides/10`).

A single **Global `Volume`** + this `VolumeProfile` sets the base look. Add **Local** volumes
later for area grades (e.g. breached-deck).

## In-budget overrides (the neutral baseline)

| Override | Suggested setting | Rationale |
|---|---|---|
| **Tonemapping** | **Neutral** *(or ACES — pick one, commit)* | Makes HDR read right; one mode only. |
| **Color Adjustments** | Post Exposure ~0; slight Contrast; slight Saturation | The cheap grade knob; human tunes. |
| **Vignette** | Intensity low, smoothness moderate | Focuses the eye on the character; cheap. |
| **Bloom** | Threshold high-ish; Intensity low; **High Quality Filtering OFF**; few iterations | Subtle glow, not a bath. |

## Deliberately EXCLUDED on mobile (don't add to the base profile)

| Effect | Why excluded |
|---|---|
| **Depth of Field** | Full-screen blur passes; expensive + odd for top-down. |
| **Motion Blur** | Per-pixel velocity sampling; expensive. |
| **SSAO** (Renderer Feature) | Extra depth-normals pass; usually too costly on the low tier. |
| **Film Grain** | Per-pixel cost for little top-down payoff. |
| **Chromatic Aberration** (heavy) | Edge sampling; keep ~0 if used at all. |

If the **High tier** wants one of these, make it a per-tier opt-in and **let perf measure it**.

## Hand-offs (name them explicitly)

- **Juice** (hit-flash, damage pulse, heal-glow) → `game-feel-juice-guardian` owns the intent;
  this profile is the **budget + base look** it lives inside.
- **Cost** → `mobile-game-perf-guardian`: "confirm the post-process pass fits the low-tier ms
  budget on <reference device>; drop Bloom first if not."
- **Look** → human (`CLAUDE.md §7`).
