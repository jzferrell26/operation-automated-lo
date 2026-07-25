# Example 02 — A Salvage-Yield Table Balanced Against Recipe Costs

**Invocation:** "Give me a salvage-yield table — make sure the yields actually pay for the Tier 0 crafting."

**Guides:** `04-salvage-and-resource-curves.md`, `02-economy-sinks-and-faucets.md`, `08-crafting-cost-curves.md`.

---

## Step 1 — Read faucets and sinks from `Tier0Balance.cs`

**Faucets (yields):**

| Node | Resource | Const | Amount | Gated? |
|---|---|---|---|---|
| Scrap node | scrap | `ScrapMetalNodeAmount` | 14 | no |
| Polymer node | polymer | `PolymerNodeAmount` | 4 | no |
| Raw-ore node | raw_ore | `RawOreNodeAmount` | 3 | no |
| Cutter cache | scrap | `CutterCacheScrapAmount` | 3 | needs Cutter |
| Welder cache | polymer | `WelderCachePolymerAmount` | 2 | needs Welder |
| Drill cache | raw_ore | `DrillCacheRawOreAmount` | 2 | needs Drill |

**Sinks (costs):** Cutter 4 scrap · Welder 3 scrap + 2 polymer · Drill 5 scrap + 2 ore + 1 polymer · Deck plate 2 scrap + 1 polymer.

## Step 2 — The balanced yield-vs-cost table

| Resource | Base nodes | Caches | Total available | Demanded (3 tools + 1 plate) | Surplus |
|---|---|---|---|---|---|
| Scrap | 14 | +3 (cutter) | **17** | 4+3+5+2 = **14** | **+3** |
| Polymer | 4 | +2 (welder) | **6** | 2+1+1 = ... wait → 0+2+1+1 = **5** | **+1** |
| Raw ore | 3 | +2 (drill) | **5** | 0+0+2+0 = **2** | **+3** |

Polymer demand detail: Cutter 0 + Welder 2 + Drill 1 + Deck plate 1 = **4** for tools + plate... recompute precisely:
- Tools only: Welder 2 + Drill 1 = **3** polymer.
- Plus deck plate: +1 = **4** polymer.

So **polymer demanded = 4, available = 6, surplus = +2** for the full path (tools + 1 plate). (If the player places a *second* deck plate, polymer surplus drops to +1 — the intended pinch.)

**Corrected verdict table:**

| Resource | Available | Demanded (3 tools + 1 plate) | Surplus |
|---|---|---|---|
| Scrap | 17 | 14 | **+3** |
| Polymer | 6 | 4 | **+2** |
| Raw ore | 5 | 2 | **+3** |

## Step 3 — Read the curve

- **Every recipe is affordable** from available yields → no economy break (must-fix avoided). ✓
- **Polymer is the constraining resource** — smallest surplus, and the only one a second deck plate eats into. It is the deliberate tension lever (`guides/04` principle 2). ✓
- **Gating holds:** base scrap (14) alone covers Cutter (4) + Welder scrap (3) before any cache opens; base polymer (4) covers the Welder's 2 before the welder cache exists. The staircase is intact (`guides/04` principle 1). ✓

## Step 4 — Sensitivity check (what breaks it)

| Change | Effect | Severity |
|---|---|---|
| `PolymerNodeAmount` 4 → 2 | Available polymer 4; demand 4 → surplus 0, and a 2nd deck plate or any extra craft goes negative | **must-fix economy break** |
| `ScrapMetalNodeAmount` 14 → 8 | Available scrap 11; demand 14 → **−3**, Drill uncraftable | **must-fix** |
| `RawOreNodeAmount` 3 → 5 | Raw-ore surplus +5 — ore stops feeling scarce | should-tune (slack) |

This is what makes the table load-bearing: it tells the human exactly which yield is safe to nudge and which one is the cliff edge.

## Step 5 — Deliver

The corrected verdict table above, plus the sensitivity rows, plus (if any yield changes) a `Tier0Balance` diff and the matching `balance-table.csv` rows. Flag the human's feel pass: "the math says the economy is sound with polymer as the intended pinch — confirm gathering *feels* good and polymer scarcity *reads* as tension, not frustration (`guides/04`, CLAUDE.md §7)."

**Report:** `library/qa/game-balance/2026-06-22-salvage-yields.md`.
