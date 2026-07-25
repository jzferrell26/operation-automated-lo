# 07 — Art-Style Consistency

Keeping imported art coherent — without art-directing. **The look is HUMAN-handled
(`CLAUDE.md §7`).** This Weapon's job is the *measurable, enforceable substrate* under a
consistent low-poly mobile style: poly budgets, texel density, a shared material/palette set —
all expressed as Presets and targets, not as aesthetic calls.

## What "consistency" means at the import layer

The human decides whether DRIFT looks grimy, clean, saturated, or muted. This Weapon ensures that
whatever the human picks, every asset imports to the **same technical target**, so the scene
doesn't end up with one prop at 200 tris and one at 40,000, or one texture at 256px and one at
4096. Inconsistency at the import layer reads as sloppiness even when the art is good.

## The three targets to document (as a preset-backed spec)

1. **Poly budget ranges (per asset class).** Document target triangle ranges — e.g. small prop /
   large prop / hero prop / character — so the DCC-authored meshes stay in band. (Exact numbers
   are a Tier-1 + perf decision; this Weapon provides the *bands and the discipline*, not the
   final figures, which `mobile-game-perf-guardian` will pressure-test against the frame budget.)
2. **Texel density.** A consistent texels-per-metre target so a wall and a crate have matching
   texture resolution at the same on-screen size. Tie it to the Max-Size clamp in `guides/05`.
   Inconsistent texel density is the most visible import-layer inconsistency.
3. **Shared material / palette set.** Express the palette as **Material Variants** on one base
   URP shader (`guides/04`) so the whole game shares a coherent, batch-friendly material family.
   This is the production-grade version of `GrayBoxVisuals.CreateColorMaterial`'s solid-color
   approach: a fixed palette, applied uniformly.

## Encode it, don't just describe it

- The **poly/texel targets** live in a short spec doc + the import Presets (`guides/06`).
- The **palette** lives as a base material + variant set (`guides/04`), so "consistency" is
  enforced by *using the variants* rather than by reviewing every material by eye.
- Naming/folder conventions (`guides/08`) keep the consistent assets findable.

## The boundary (sharp)

- **You:** the *technical* consistency substrate — poly bands, texel density, the preset/variant
  machinery that makes uniformity automatic.
- **The human (`CLAUDE.md §7`):** the *aesthetic* — what the game actually looks like.
- **`unity-rendering-guardian`:** the shader/look the variants sit on.
- **`mobile-game-perf-guardian`:** whether the poly/texel targets fit the device budget.

Never present an aesthetic opinion as a finding. "These two props have wildly different texel
density" is your finding; "this should look grungier" is not.

## DRIFT note

The gray-box's uniform solid colors are, ironically, already perfectly consistent. The risk
arrives with real art in Tier 1 — which is exactly when the poly/texel/palette targets and their
Presets must already exist. Set the targets as a doc now; the human fills the numbers when the
art style is chosen.
