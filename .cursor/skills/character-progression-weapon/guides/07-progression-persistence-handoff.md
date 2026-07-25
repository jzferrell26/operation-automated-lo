# 07 — Progression Persistence (save-load handoff)

Progression generates the most important *durable* state in the game: a player's XP, level, allocated points, and unlocked perks must survive across sessions. But **this Weapon does not serialize anything.** It defines *what* is durable and shapes it to be save-friendly; `save-load-guardian` owns the model, format, versioning, and migration.

## What progression state is durable

| State | Durable? | Why |
|---|---|---|
| `totalXp` (int) | Yes | The single source of truth; level is derived from it via the curve |
| Per-stat allocated points | Yes | The player's investment |
| Unlocked perk ranks (`nodeId → rank`) | Yes | Tree progress |
| `unspentSkillPoints` / `unspentStatPoints` | Yes | Spendable balance |
| Current `level` | **No — derive it** | `ProgressionProfile.LevelForXp(totalXp)` recomputes it; don't store derived state |
| Effective stats | **No — recompute** | The stack (`guides/04`) rebuilds them from sources every load |
| The curve / perk-tree definitions | **No — they're content** | ScriptableObjects (Hard Rule #3); the save references them by id |

The rule: **persist sources, recompute derivations.** Store `totalXp`, not `level`. Store allocated points and unlocked ranks, not effective stats. This keeps the save small and makes a curve re-tune (by game-balance) automatically re-level the player on load instead of stranding a stale stored level.

## The save-friendly shape (so the handoff is clean)

`save-load-guardian`'s hard rules (its `SKILL.md`) say: serialize **stable string ids, never object/SO references or array indices**; the save is a **plain `[Serializable]` model**, not a MonoBehaviour/SO. So design progression state to surface exactly that:

```csharp
// What progression hands save-load (shape only — save-load owns the actual DTO + versioning):
//   int totalXp
//   List<StatPointAllocation> { string statId; int points; }
//   List<PerkRank>            { string nodeId; int rank; }
//   int unspentSkillPoints, unspentStatPoints
```

Every key is a **string id** (`statId` from `StatModifier`, `nodeId` from `SkillNodeDefinition`, `id` from `ItemDefinition`) — which is exactly what `save-load-guardian` rehydrates via `ItemDatabase.TryGetById`-style lookups. No InstanceIDs, no indices.

## The capture/apply seam (what save-load needs from you)

`save-load-guardian` captures on save and applies on load. Provide a clean seam:

```csharp
ProgressionStateDto Capture();          // pure read of durable state
void Apply(ProgressionStateDto dto);    // sets totalXp + allocations + ranks, then Recompute()
```

Keep these pure and lifecycle-free (Hard Rule #11) so a round-trip is EditMode-testable on both sides.

## The boundary (stated)

- **This Weapon:** what's durable, what's derived, the id discipline, the capture/apply shape.
- **`save-load-guardian`:** the `[Serializable]` save model, JsonUtility-vs-Newtonsoft, `schemaVersion`, the v1→v2 migration ladder, atomic writes, `persistentDataPath`. Hand all of that off.

When a request asks "how do I write the progression save / version it / handle corruption," that is `save-load-guardian`'s — surface it and hand off.

## Tier note

Both progression *and* save are Tier 1 / `[NOT STARTED]`. This is two deferred systems describing their seam in advance — pure design, no committed code (Hard Rule #1).

## Sources
- `.claude/skills/save-load-weapon/SKILL.md` (its hard rules: stable ids, save model, versioning).
- `Assets/Scripts/Drift/Data/Items/StatModifier.cs`, `ItemDatabase.cs` (the id substrate).
