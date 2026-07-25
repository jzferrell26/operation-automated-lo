# 01 — Progression as Data (ScriptableObject)

CLAUDE.md Hard Rule #3: **"Data over code for content. Items, recipes, structures, crew = ScriptableObjects. Add content as data, not hardcoded classes."** Progression is content. Curves, perks, and stat-allocation rules are authored as ScriptableObjects; the runtime references them, never hardcodes them.

## The precedent already in the repo

`Assets/Scripts/Drift/Data/Items/ItemDefinition.cs` is the model to follow:

```csharp
[CreateAssetMenu(fileName = "Item_", menuName = "Drift/Item Definition")]
public class ItemDefinition : ScriptableObject
{
    public string id;                    // stable string id — the save/lookup key
    public string displayName;
    public ItemCategory category;        // a data enum, not a subclass-per-category
    public StatModifier[] statModifiers; // stats AS DATA
}
```

Three things this teaches the progression Weapon:
1. **`[CreateAssetMenu]` + a `Drift/...` menu path** — every progression asset is browsable/authorable in the editor.
2. **A stable `string id`** — the lookup/save key (mirrors `ItemDatabase.TryGetById`). Progression assets get the same.
3. **Data enums + arrays, not class-per-variant** — `ItemCategory` is an enum; categories aren't subclasses. A perk is data, not `class FireResistPerk : Perk`.

## The progression SO family (shapes — values are game-balance's)

| Asset | Owns (shape) | game-balance fills |
|---|---|---|
| `ProgressionProfile` (`templates/progression-profile.cs`) | The XP curve (sampled by level) + what each level grants (stat points, skill points) | The curve values, the per-level payouts |
| `SkillNodeDefinition` (`templates/skill-node.cs`) | Node id, ranks, prerequisite node ids, point cost per rank, the `StatModifier[]` granted | The cost numbers, the modifier magnitudes |
| (reused) `StatModifier` | The stat the node/curve/item touches (`statId` + `value`) | The `value` |

A `StatDefinition` SO (id + display name + base value + clamp) is a reasonable addition when the stat set grows — but keep it data, and let game-balance own the base/clamp numbers.

## Must-fix patterns (Hard Rule #3 violations)

```csharp
// MUST-FIX — hardcoded level table in code
int XpForLevel(int level) => level switch { 1 => 0, 2 => 100, 3 => 250, ... };

// MUST-FIX — perk effect baked into a gameplay class
if (perkId == "tough") health.maxHealth += 20f;
```

Both bury content in code. The fix is a sampled curve SO (`02`) and a `StatModifier[]` on a node SO (`03`/`04`).

## Correct pattern

```csharp
// The curve is DATA, sampled — not branched.
int level = progressionProfile.LevelForXp(currentXp);
// The perk's effect is DATA — a StatModifier[] on the node, aggregated by the stack (04).
```

## The id discipline (forward-compat with save-load)

Every progression asset carries a stable `string id` (like `ItemDefinition.id`). When `save-load-guardian` builds the save model, it stores those ids — never SO references or array indices. Designing the ids now keeps the Tier 1 save clean. Source: `guides/07-progression-persistence-handoff.md`.

## Tier note

This guide describes the **shape** of assets to author *in Tier 1*. Do not create these SOs in the project mid-Tier-0 (Hard Rule #1). The templates document the target; `guides/09-tier-discipline-note.md` governs when they land.

## Sources
- `Assets/Scripts/Drift/Data/Items/ItemDefinition.cs`, `StatModifier.cs`, `ItemDatabase.cs` (the SO + id precedent).
- CLAUDE.md Hard Rule #3.
