# 08 — Handoff: Balance and Level-Design (and the rest of the lane map)

This Guardian's domain is narrow and sharp: **the generation ALGORITHM.** Almost every procgen request
brushes a sibling's lane. This guide is the map and the phrasing — getting a handoff right is as
much the product as the algorithm itself, because mislabeling a sibling's concern as a generation
bug is the cardinal credibility error.

## The two co-owned seams (the ones that matter most)

### Numbers → `game-balance-guardian`

| This Guardian owns (ALGORITHM) | game-balance owns (VALUES) |
|---|---|
| Cumulative-weight / alias selection method | The drop-table weights, amounts, roll counts, rarity tiers |
| The difficulty-READ mechanism (reads a curve, routes it) | The difficulty CURVE — chunk count by level, rarity by tier, density ramp |
| Poisson-disc distribution algorithm | `minSeparation` (r), spawn counts, zone budgets, safe-radius |
| Layout target-count / junction-frequency *plumbing* | The target-count VALUES |

**Phrasing:** "The table selects by cumulative weight over its entries; the weights are
`game-balance-guardian`'s — name them and route them. I've left them as tunable data fields." Never
invent a weight or a count to make an example concrete — use a placeholder and flag it.

### Kits → `unity-level-design-guardian`

| This Guardian owns (PLACEMENT) | level-design owns (CONTENT) |
|---|---|
| The layout walk that arranges chunks | The `ChunkDefinition.prefab` — the room art, walls, props |
| Socket-matching logic (which edges may join) | The socket authoring on the prefab (where the doorways are) |
| Reachability validation | The kit's grid footprint + pivot/snap discipline |

**Phrasing:** "I randomize the arrangement of the kit; the kit prefabs, their art, and their socket
markers are `unity-level-design-guardian`'s. I reference `ChunkDefinition.prefab`; I don't author
it." Co-owned: they make the pieces, this Guardian shuffles them.

## The rest of the lane map

| Concern | Owner | Why it's not this Guardian |
|---|---|---|
| Enemy behavior, FSM, aggro, leash | `fsm-ai-guardian` | This Guardian produces spawn *points* (`Vector3`); the FSM at each point is theirs (`MutatedCrewEnemy.Configure`) |
| Instantiation perf, pooling, draw calls | `mobile-game-perf-guardian` | This Guardian keeps generation allocation-aware; the frame budget + pooling of placed prefabs is theirs |
| MonoBehaviour / SO scaffolding, lifecycle, serialization shape | `unity-csharp-guardian` | This Guardian owns the generation *logic*; the C# component shape around it is theirs |
| EditMode harness, CI runner, batchmode | `unity-test-ci-guardian` | This Guardian co-owns the test *pattern* (what to assert); the runner is theirs |
| Run-state persistence | `save-load-guardian` | This Guardian guarantees same-seed determinism → "save the seed"; they serialize it |
| GDD / new-system vision | user (GDD is the source of truth) | Flag scope jumps; don't edit the GDD without sign-off (Hard Rule #10) |

## How to phrase a handoff (the template)

1. **State what this Guardian did** — the algorithm, the seed contract, the test.
2. **Name the sibling and the exact artifact they own** — "the weights in `DropTableDefinition`",
   "the kit prefab `ChunkDefinition.prefab`", "the `MutatedCrewEnemy` behavior".
3. **Leave a clean seam** — a tunable data field, a prefab reference, a `Vector3` list — so the
   sibling can do their part without re-touching the algorithm.
4. **Don't do their work.** Don't invent the weight, author the prefab, or write the FSM. Stop at
   the boundary.

## The one mistake that costs credibility

Calling a **balance VALUE** ("this loot weight is too low") or a **kit concern** ("this room art is
ugly") a **generation-algorithm bug** is the cardinal error. The algorithm is correct if it selects
by the data-defined weights deterministically — whether those weights are *good* is balance's call;
whether the room *looks* right is level-design's. Keep the verdict in your lane.

## Output

A handoff invocation produces a **lane verdict**: which part is the algorithm (this Guardian's), which
parts are siblings' (named, with the exact artifact), and the clean seams left between them.
