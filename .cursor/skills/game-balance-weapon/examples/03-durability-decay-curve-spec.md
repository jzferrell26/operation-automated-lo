# Example 03 — A Durability Decay Curve Spec (Tier 1)

**Invocation:** "Spec the durability decay curve for the tools and weapons."

**Guides:** `06-durability-economy.md`, `08-crafting-cost-curves.md`, `02-economy-sinks-and-faucets.md`, `01-balance-as-data.md`.

> **Frame up front:** Durability is a **Tier 1** mechanic. It was removed with the legacy spine during consolidation and rebuilds cleanly when Tier 1 rebuilds inventory/crafting (ARCHITECTURE.md §8). This is a **spec for then**, not a build directive for now (tier discipline, Hard Rule #1). And per Hard Rule #2 / GDD §8: **durability stays for tools AND weapons, guns included; tiered ammo is a SECOND sink on top, never a replacement.**

---

## Step 1 — Confirm the data slot exists

`ItemDefinition` already carries `durabilityMax` (ARCHITECTURE.md §3; TIER0.md authoring note suggests ~50 for starter tools). What's missing is the *decay logic* and the *repair/recraft loop*. The spec below lands entirely as data on `ItemDefinition` / a balance SO — never inline (`guides/01`).

## Step 2 — The per-item decay tunables

| Tunable | Meaning | Cutter | Welder | Plasma Drill | (Tier 1) Pistol |
|---|---|---|---|---|---|
| `durabilityMax` | Full condition | 50 | 50 | 60 | 40 |
| `durabilityPerUse` | Condition lost per action | 1 | 1 | 1.5 | 1 |
| `usesBeforeBreak` (derived) | `max / perUse` | 50 | 50 | 40 | 40 |
| `repairCost[]` | Materials for a full repair | 2 scrap | 1 scrap + 1 poly | 2 scrap + 1 ore | 2 scrap |
| `recraftCost[]` | Full recipe (fallback) | 4 scrap | 3 scrap + 2 poly | 5 scrap + 2 ore + 1 poly | (Tier 1 recipe) |
| `breakBehavior` | At 0 condition | unusable | unusable | unusable | unusable |

**Guns included** (the protected case): the Pistol row shows a weapon on the *same* decay model as the tools — `durabilityMax 40`, degrades per shot/use, repaired or recrafted. There is no "weapons are exempt" path. Hard Rule #2.

## Step 3 — The decay curve shape

Tier 0/1 keeps it **linear** (`condition -= durabilityPerUse` per action) — simplest, most legible, matches LDoE. Reserve non-linear curves (accelerating decay near 0, "well-maintained" bonuses) for a later balance pass; a linear curve is the right gray-box-grade default.

```
condition(t) = durabilityMax - (durabilityPerUse * actions_taken)
usable while condition > 0
```

The headline tuning number is **`usesBeforeBreak`** — set it against how many actions a run demands so the player feels the maintenance grind without constant micro-repair. ~40–50 uses on a starter tool means roughly one repair per couple of runs (confirm against telemetry, `guides/09`).

## Step 4 — Repair-vs-recraft economics (the sink that keeps materials flowing)

Repair must be **cheaper than recraft but not free** (`guides/06`). Target ~30–50% of recraft cost:

| Item | Recraft cost | Full repair cost | Ratio |
|---|---|---|---|
| Cutter | 4 scrap | 2 scrap | 50% |
| Welder | 3 scrap + 2 poly (5) | 1 scrap + 1 poly (2) | 40% |
| Plasma Drill | 5 scrap + 2 ore + 1 poly (8) | 2 scrap + 1 ore (3) | ~38% |

This keeps raw-material demand *infinite* (GDD §6) — the whole point of the sink — while rewarding maintenance over neglect. **Cross-check against the faucet ledger** (`guides/02`): repeated repair demand must stay inside the per-run salvage yields plus respawn/return trips, or the economy chokes.

## Step 5 — The second sink: tiered ammo (ON TOP, not instead)

For weapons, durability runs *alongside* ammo (GDD §8):

| Ammo tier | Source | Scarcity | Sink role |
|---|---|---|---|
| Basic ballistic | craftable | low | keeps you alive |
| Specialized cells | looted / rare-salvage craft | high | the second compounding pressure |

A weapon needs to be **working** (durability) AND **fed** (ammo) to fire. The two sinks are orthogonal. **Ammo drop-rate / scarcity tuning is human-owned** (CLAUDE.md §7) — this spec defines the *structure* (which tiers, craftable vs looted, the costs), the human tunes the exact rarity against playtest feel.

## Step 6 — Deliver

The per-item decay table, the repair/recraft ratios, the ammo second-sink structure — all as `ItemDefinition`/balance-SO fields, plus the ledger cross-check. **Restate the guardrails in the handoff:** durability stays for tools AND weapons (guns included), ammo is additive not a replacement, and this is Tier 1 work to schedule when crafting/inventory rebuilds — not to build mid-Tier-0.

**Report:** `library/qa/game-balance/2026-06-22-durability-spec.md`. If this codifies the two-sink decision, also record it as `library/architecture/ADR-<n>-durability-two-sink-economy.md`.
