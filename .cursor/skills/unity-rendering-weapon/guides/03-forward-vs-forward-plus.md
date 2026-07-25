# 03 — Forward vs Forward+ on mobile

The rendering **path** is set on the URP **Universal Renderer** asset (referenced by the pipeline
asset, `guides/01`). URP offers **Forward**, **Forward+**, and **Deferred**.

## The three paths

- **Forward** — the classic mobile path. Cheap, simple, but historically caps **per-object
  real-time lights** (~8) and culls lights per-object. Great when a scene is lit by a few lights.
- **Forward+** — does **tiled / clustered light culling**: lifts the per-object light limit and
  handles many lights far better, at extra GPU cost for the culling pass.
- **Deferred** — strong with very many lights, but the G-buffer bandwidth is usually the **wrong
  trade on mobile** and an odd fit for a flat top-down scene. Rarely the pick here.

## The DRIFT default: Forward

A top-down station + dead-planet scene is lit predominantly by **one directional light + baked
GI** (`guides/04-lighting-model.md`). That's exactly the case **Forward** is cheapest for —
there's no large dynamic-light count to cull. **Default the low and mid tiers to Forward.**

**Forward+ earns its cost** only when many small dynamic lights appear at once — e.g. lots of
glowing salvage, weapon muzzle flashes, or hazard lights in one view. That's a **Tier-1 content
question**: if the art direction lands on "many local lights," reconsider Forward+ on the high
tier and **measure the delta with `mobile-game-perf-guardian`** (`guides/09`).

## Renderer Features

The Universal Renderer carries a **Renderer Features** list (`ScriptableRendererFeature`, e.g.
**Render Objects**, decals, SSAO). Each feature is an extra pass — **keep the low/mid renderer
feature-light**. SSAO in particular is usually too expensive for the low tier
(`guides/05-post-processing-volumes.md`).

## Tier discipline

URP isn't installed; there's no renderer asset to configure yet. The path choice is
**design-now, author-on-install**. Don't add a renderer feature speculatively.

## Verify-in-editor flags

- The Unity 6 **per-object light limit** in classic Forward and the **Forward+ tile size /
  max lights per tile** defaults — **verify in-editor**; don't assert the numbers.
- Whether Deferred has any mobile-specific caveats in this URP version — **verify in-editor.**

Sources: Unity 6 Manual "Rendering paths in URP" (Forward / Forward+ / Deferred), "Renderer
Features", "Render Objects Renderer Feature"; `guides/04-lighting-model.md`;
`mobile-game-perf-weapon/guides/01-the-frame-budget.md`.
