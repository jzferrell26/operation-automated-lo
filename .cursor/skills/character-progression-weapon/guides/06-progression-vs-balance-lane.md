# 06 — Progression vs. Balance (the load-bearing lane)

This is the most important boundary this Weapon polices, and the one most likely to be crossed. Read it on every invocation.

> **character-progression-guardian owns the SYSTEM SHAPE.**
> **game-balance-guardian owns the NUMBERS.**

The two Guardians **co-own** progression: this Weapon designs the container; `game-balance-guardian` tunes what's in it. Be explicit, and be repetitive — the temptation to "just pick a value" is constant, and giving in quietly steps on the other Guardian's lane.

## The line, made concrete

| character-progression designs (SHAPE) | game-balance fills (NUMBER) |
|---|---|
| The XP curve is a ScriptableObject sampled by level (`02`) | The curve's exponent / per-level XP / level cap |
| XP comes from salvage/craft/combat/engineering (GDD §6) | How much XP each activity grants |
| Level-up grants stat points and skill points | How many points per level |
| A skill node has ranks, prerequisites, a point cost (`03`) | The point cost; how many ranks; how powerful each rank |
| Stats stack additive-then-percent, deterministically (`04`) | The actual `+10 maxHealth`, `+15% craftSpeed` magnitudes |
| Equipment contributes `StatModifier[]` to the stack (`05`) | What stat values a given suit/weapon carries |
| Zones are gated by level (GDD §7) | Which level gates which zone |

## The test: "is this a number a designer would tune?"

If the answer to a request is a value someone would sit in a spreadsheet and adjust to make the game feel right — XP amounts, costs, magnitudes, caps, rates — it is `game-balance-guardian`'s. Surface it and hand off. If the answer is a *structure* — "the curve is data," "the node graph is acyclic," "modifiers stack in this order" — it is this Weapon's.

## Why the split matters

- **Credibility (severity rubric).** Declaring a number you don't own is a lane violation — a must-fix in a review, the same severity as a balance Guardian hardcoding a system shape.
- **The human owns feel (CLAUDE.md §7).** Balance numbers feed the human's "is it fun?" pass. Progression shouldn't pre-empt that by baking values in.
- **Clean handoff.** A well-shaped curve SO with empty/placeholder values is exactly what `game-balance-guardian` wants to receive — a container to tune, not a system to argue with.

## How to hand off (the pattern)

> "I've designed the leveling curve as a `ProgressionProfile` ScriptableObject sampled by level (shape). The actual per-level XP, the curve steepness, and the level cap are balance numbers — `game-balance-guardian` should set those against the loop math. I've left them as clearly-marked placeholders."

## What this Weapon may say about numbers

- It may state the **shape constraints** a number must satisfy ("XP-to-next must be monotonically increasing," "point cost ≥ 1," "percent modifiers must be representable as a fraction").
- It may note **where** a number lives (which SO field) so game-balance knows where to tune.
- It may **not** pick the value.

## Sibling boundaries (so the lane is unambiguous)

| Sibling | Owns | Not this Weapon's because |
|---|---|---|
| `game-balance-guardian` | All progression VALUES | Numbers are tuning, not structure |
| `save-load-guardian` | Persisting progression state | Serialization, not the model design |
| `unity-csharp-guardian` | The C# code shape | Class/asmdef form, not the data model |
| `character-art-rig-guardian` | Cosmetic looks/outfits | Appearance, not stats |

## Sources
- CLAUDE.md §7 (human owns feel), the dispatch lane note (game-balance co-owns numbers).
- `.claude/skills/game-balance-weapon/SKILL.md` (the balance Weapon's own statement of its lane).
