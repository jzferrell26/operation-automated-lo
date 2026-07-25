# 04 — Material Variants & SRP-Batcher-Friendliness

Keeping DRIFT's material set batch-friendly. **Shader CHOICE and the URP look are
`unity-rendering-guardian`'s + the human's lane** — this Weapon keeps materials *shaped* so they
batch. URP is **not installed yet** (`Packages/manifest.json`), so this is "after URP lands."

## The SRP Batcher rule (the one fact that drives everything)

The SRP Batcher batches consecutive draws that use the **same shader and the same shader-keyword
variant**. Per-material properties (colors, scalars) live in a per-object CBUFFER, so they **do
not** break the batch — only a *different shader* or a *different keyword set* does.

The counter-intuitive consequence: the win is **few shaders, many materials**, not "few
materials." You can have dozens of materials and still batch them all, as long as they share one
shader + keyword set. This inverts the old "merge everything into one material" instinct.

## Material Variants (`Material.parent`)

Unity Material Variants let a **base material** define the shared low-poly look (shader, keywords,
default props), and **variants** override only specific properties (a tint, a smoothness) while
inheriting the rest. Because variants share the base's shader + keywords, **they stay in the same
SRP batch**. This is the clean way to express "everything is the same flat low-poly material,
just different colors":

- One base material on one URP shader (e.g. `Lit` or `Simple Lit` — rendering Guardian's choice).
- A variant per palette colour / surface, overriding only `_BaseColor` (and friends).
- Result: a coherent art style *and* a single SRP batch.

This also maps naturally onto how the gray-box already works — `GrayBoxVisuals.CreateColorMaterial`
makes one solid-color material per call. The variant model is the production-grade version of
that: a shared base + color overrides.

## What breaks batching (flag these as findings)

- **A new shader per prop** — proliferating shaders is the **must-fix** anti-pattern; each shader
  is a new batch.
- **Inconsistent keyword sets** — the same shader compiled with different keywords (e.g. some
  materials enable normal mapping, some don't) splits the batch. Keep the keyword surface uniform.
- **Mixing SRP-Batcher-incompatible material property layouts** — verify the inspector's "SRP
  Batcher: compatible" line per material **in-editor**.
- **`MaterialPropertyBlock` misuse** — fine for GPU instancing, but it interacts with batching
  differently; flag for perf review if used broadly.

## The boundary

- **You (art-pipeline):** keep the variant hierarchy clean, the shader set tiny, the keyword set
  uniform, and confirm the "SRP Batcher: compatible" flag.
- **`unity-rendering-guardian`:** picks the URP shader, configures the URP asset, owns the look.
- **`mobile-game-perf-guardian`:** measures whether batching actually fires and fits the ms
  budget on device (`guides/09`).

## DRIFT note

Until URP lands, there is no URP shader to build variants on; the gray-box uses the
`Unlit/Color → URP/Unlit → Standard` fallback in `GrayBoxVisuals.cs`. Frame variant guidance as
"once the rendering Guardian installs URP and picks the base shader, express the palette as Material
Variants on it." Never claim a URP material exists.
