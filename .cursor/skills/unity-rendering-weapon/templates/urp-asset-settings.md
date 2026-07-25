# Template — URP Render Pipeline Asset settings (per quality tier)

> **DESIGN template.** URP is not installed (`Packages/manifest.json` has no
> `com.unity.render-pipelines.universal`). Author these assets when URP lands in Tier 1. Numbers
> are a **neutral baseline** — the human art-directs the final look (`CLAUDE.md §7`) and
> `mobile-game-perf-guardian` confirms each fits the ms budget on-device. **Verify all Unity 6 URP
> defaults in-editor** before locking values.

One **Universal Render Pipeline Asset** per tier, each assigned to a Unity Quality level
(Project Settings → Quality), plus the default in Project Settings → Graphics.

## Per-tier settings

| Setting | Low | Mid | High | Notes |
|---|---|---|---|---|
| **Render Scale** | ~0.75 | 1.0 | 1.0 | Cheapest mobile lever (`guides/02`). |
| **HDR** | Off | Optional | On | Needed for nice bloom on High. |
| **MSAA** | Off | 2x (opt) | 2–4x | Bandwidth cost on tiled GPUs. |
| **Anti-Aliasing (post)** | None/FXAA | FXAA | FXAA/SMAA | Cheaper than MSAA; verify availability. |
| **Main Light** | Per Pixel | Per Pixel | Per Pixel | One directional key light. |
| **Cast Shadows** | On | On | On | |
| **Shadow Distance** | Short | Modest | Longer | Flat top-down rarely needs far shadows. |
| **Shadow Cascades** | 1 | 1–2 | 2–4 | |
| **Shadow Resolution** | Low | Medium | High | |
| **Additional Lights** | Disabled / few | Per Pixel (few) | Per Pixel | Keep realtime light count tiny (`guides/04`). |
| **Depth Texture** | Off | Off* | Off* | *On only if a feature needs it — it's a pass. |
| **Opaque Texture** | Off | Off | Off | On only for refraction-style effects. |
| **Renderer Path** | Forward | Forward | Forward (+? ) | Forward+ only if many dynamic lights (`guides/03`). |

## Assignment checklist

- [ ] Project Settings → Graphics → default Render Pipeline Asset set (Mid is a sane default).
- [ ] Project Settings → Quality → Low/Mid/High asset assigned per Quality level.
- [ ] **Pipeline assigned everywhere — otherwise everything renders pink** (`guides/10`).

## Verify-in-editor flags

- Default Render Scale, MSAA sample counts, post-AA options available in Unity `6000.0.x` URP.
- Whether "Additional Lights = Disabled" is acceptable for the low tier given the lighting model.

## Hand-offs

- **Look** → human (`CLAUDE.md §7`).
- **Cost** → `mobile-game-perf-guardian`, on-device Profiler (`guides/09`).
