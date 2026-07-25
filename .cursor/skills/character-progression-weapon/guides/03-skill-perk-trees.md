# 03 — Skill / Perk Trees

GDD §6 calls for a **"light perk tree."** This guide designs the tree's *data model* — the node graph. Node power and point costs are `game-balance-guardian`'s numbers.

## The data model: an acyclic prerequisite graph of SO nodes

A perk tree is a set of `SkillNodeDefinition` ScriptableObjects (`templates/skill-node.cs`), each carrying:

| Field | Purpose | Owner |
|---|---|---|
| `id` (string) | Stable key — save/lookup (mirrors `ItemDefinition.id`) | progression (shape) |
| `displayName` | Editor + UI label | progression |
| `maxRank` (int) | 1 for a binary perk; N for a ranked perk | progression (shape); the *value* of N is game-balance |
| `prerequisites` (string[] of node ids) | What must be unlocked first | progression (shape) |
| `pointCostPerRank` (int[]) | Skill-point cost to buy each rank | **game-balance** |
| `grantsPerRank` (`RankGrant[]`, each wrapping `StatModifier[]`) | The effect — built on the real `StatModifier` | shape is progression; **magnitudes are game-balance** |

Nodes reference prerequisites **by id**, not by SO reference — this keeps the graph serialization-friendly (save-load) and avoids circular asset references.

## The invariants (this Weapon enforces these)

1. **Acyclic prerequisites.** No node may (transitively) require itself. A cycle makes the tree unreachable. This is a must-fix in any authored tree — validate it in an EditMode test (`guides/08`).
2. **Reachability.** Every node must be reachable from a root (a node with no prerequisites). An orphan node is a should-refactor.
3. **Rank monotonicity.** `pointCostPerRank` and `grantsPerRank` arrays have length `maxRank` (validated by `HasConsistentRankArrays`). A length mismatch is a must-fix.
4. **Effects are `StatModifier[]`** (Principle #4) — a perk grants modifiers aggregated by the stat stack (`guides/04`), not bespoke `if (perkId == ...)` code (Hard Rule #3).

## The runtime state (durable — hand to save-load)

The *tree definition* is content (SOs). The *player's progress* through it is durable state:

```csharp
// Durable — save-load serializes this (guides/07):
//   Dictionary<string nodeId, int rankUnlocked>  (as a List for JsonUtility)
//   int unspentSkillPoints
```

Define this shape; `save-load-guardian` owns the serialization (stable node ids, versioned).

## Pure queries (EditMode-safe)

```csharp
bool CanUnlock(string nodeId, ProgressionState state)   // prereqs met + points available
bool IsCycleFree(IReadOnlyList<SkillNodeDefinition> all) // validation
StatModifier[] ActiveModifiers(ProgressionState state)   // all granted modifiers, for the stack
```

All pure — no Unity lifecycle. `ActiveModifiers` feeds `guides/04`'s aggregator.

## Scope — keep it "light" (GDD §6)

The GDD says *light* perk tree. Resist designing a 200-node lattice. A clean shape — a handful of branches (salvage / craft / combat / engineering, mirroring the XP sources), shallow prerequisite chains — serves the GDD. The *exact* node count and layout is a design call the human makes with `game-balance-guardian`.

## What NOT to do here

- **Don't set point costs or perk power.** Those are game-balance numbers.
- **Don't hardcode perk effects.** `StatModifier[]` on the node SO.
- **Don't build the tree mid-Tier-0.** Tier 1 design (Hard Rule #1).

## Sources
- GDD §6 ("light perk tree").
- `examples/02-skill-tree-data-model.md`, `templates/skill-node.cs`.
- `research/research-summary.md` Q2 (DEGRADED — perk-tree patterns named).
