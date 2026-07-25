# 06 — Difficulty Scaling

How a generator shifts its output as difficulty rises — bigger locations, rarer loot, denser
spawns. This Guardian owns **how the generator READS a difficulty parameter and translates it into
generation decisions**; the **curve VALUES — what difficulty 3 actually means — are
`game-balance-guardian`'s** (co-owned seam).

## The line, precisely

- **This Guardian owns:** the *mechanism* — "the layout target count is `config.ChunkCountFor(difficulty)`",
  "the spawn density scales the Poisson-disc `r` down as difficulty rises", "the loot table swaps to
  a higher-rarity-weighted table at difficulty tier N." The *plumbing* that reads a difficulty input
  and routes it to chunk count / rarity / density.
- **`game-balance-guardian` owns:** the *curve* — the actual numbers: chunk count = 4 at difficulty
  1, 7 at difficulty 3; spawn `r` = 6m → 3.5m; which rarity weights apply at which tier. The shape
  and steepness of the progression.

Say "the generator reads `difficulty` and scales chunk count via a data-defined curve"; never say
"set chunk count to 7 at difficulty 3" — that's balance's value.

## The three generation knobs difficulty turns

1. **Layout size / complexity** (guide 02) — target chunk count, junction frequency, dead-end ratio.
   More/larger location = longer time-on-surface = more oxygen pressure (the survival lever, balance's).
2. **Loot rarity weighting** (guide 03) — higher difficulty selects a drop table (or weight set)
   skewed toward rarer/more-valuable yields, or raises amounts. The *which-table* swap is the
   mechanism (here); the *weights* are balance's.
3. **Spawn density / count** (guide 04) — denser Poisson-disc (smaller `r`) and/or higher zone
   budgets. The *density-from-difficulty* mapping is the mechanism; the `r` and counts are balance's.

## Read difficulty as a parameter, not a baked curve

The generator takes a `difficulty` input (an int/float) and **reads the curve from data**:

```
LayoutConfig.ChunkCountFor(difficulty)   → reads an AnimationCurve / data table (balance-owned)
DropConfig.TableFor(difficulty)          → reads a tier→table map (balance-owned)
SpawnConfig.SeparationFor(difficulty)    → reads a curve (balance-owned)
```

A generator that hardcodes `chunkCount = 4 + difficulty * 2` inline is a **should-refactor**: it
bakes a balance curve into the algorithm. The curve belongs in data (an `AnimationCurve`, a
ScriptableObject lookup) that balance tunes; the generator just *reads* it. This keeps Hard Rule #3
(data over code) and the lane line both intact.

## Determinism is preserved

Difficulty is part of `config`, so the generator is still a pure function of `(seed, config)` — a
given `(seed, difficulty)` always produces the same location. The EditMode test parameterizes over
difficulty and asserts reproducibility at each level (guide 07).

## Tier framing

Difficulty scaling is **Tier-1+** — it presupposes the procgen layout/loot/spawn systems that the
Tier 0 gray box doesn't have. Frame it as Tier-1 design. The GDD's mobility/escalation arc (shuttle
→ ship → corvette, deeper/harder locations) is the *vision* this serves; the moment-to-moment curve
numbers are balance's call after the Tier 0 fun pass.

## Lane handoffs

- **The curves themselves — chunk count by difficulty, rarity weights by tier, spawn `r` by
  difficulty, how steep the ramp is** → `game-balance-guardian`. This Guardian ships the data-driven
  *read* mechanism; balance authors and tunes the curve assets.
- **The survival-meter consequence of bigger locations (oxygen budget)** → `game-balance-guardian`
  (oxygen is the signature meter, GDD §3 / Hard Rule #6). This Guardian just makes the location bigger.

## Output

A difficulty invocation produces the **mechanism**: a generator that reads a `difficulty` parameter
and routes it to chunk count / rarity table / spawn density via **data-defined curves**, preserving
determinism, with every curve VALUE handed to `game-balance-guardian` and flagged Tier-1.
