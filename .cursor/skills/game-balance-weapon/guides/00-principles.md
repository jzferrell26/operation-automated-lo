# 00 — Principles

The non-negotiables. Read on every invocation.

## The eight principles

### 1. Read `Tier0Balance.cs` first — always

`Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Balance.cs` is the single Tier 0 tuning surface. Before proposing any number, capture:

- **Item ids** — `ScrapMetalId`, `PolymerId`, `RawOreId`, `CutterId`, `WelderId`, `PlasmaDrillId`.
- **Faucets (node yields)** — `ScrapMetalNodeAmount` (14), `PolymerNodeAmount` (4), `RawOreNodeAmount` (3); the cache amounts `CutterCacheScrapAmount` (3), `WelderCachePolymerAmount` (2), `DrillCacheRawOreAmount` (2).
- **Sinks (recipe costs)** — `CutterScrapCost` (4); `WelderScrapCost` (3) + `WelderPolymerCost` (2); `DrillScrapCost` (5) + `DrillRawOreCost` (2) + `DrillPolymerCost` (1).
- **Build sink** — `DeckPlateScrapCost` (2) + `DeckPlatePolymerCost` (1).

Then note what is **not** yet centralized but is balance-load-bearing and should be extracted (Rule #2): oxygen `drainPerSecond` / `suffocationDamagePerSecond` (`OxygenSystem.cs`), suit `sprintDrainPerSecond` / `rechargePerSecond` (`SuitPowerSystem.cs`), enemy `attackDamage` / `detectRadius` / `leashRadius` / `moveSpeed` / `attackRange` / `attackCooldown` (`MutatedCrewEnemy.cs`).

Source: every guide assumes you've done step 1.

### 2. Balance is data, not code

Every tunable is a `Tier0Balance` const or a `[SerializeField]` on a ScriptableObject / authored asset. A number inline in a method body (`drainPerSecond = 1f`) is invisible to the human's feel pass and a **finding** — the first recommendation is to extract it into the tuning surface. Source: CLAUDE.md Hard Rule #3, GDD §4; `guides/01-balance-as-data.md`.

### 3. Faucets must pay sinks with intent

Salvage yields, recipe costs, and the deck-plate cost form a **closed Tier 0 economy**. Any change to one ripples. Compute the surplus/deficit; never eyeball it. A survival loop lasts because raw-material demand stays slightly *ahead* of supply — an accidental surplus makes the loop go slack. Source: `guides/02-economy-sinks-and-faucets.md`.

### 4. Oxygen is the signature meter

O2 ticks outside the sealed station and is the core tension lever of the surface loop. It is what no competitor can copy. Tune it as the *primary* pacing knob and never let it get quietly dropped. Source: CLAUDE.md Hard Rule #6, GDD §3; `guides/03-survival-meter-tuning.md`.

### 5. Durability stays — and it's Tier 1

Item/tool/**weapon** durability decay (guns included) is the load-bearing wall of the late game. It was debated and **kept on purpose** (GDD §8). It is currently deferred — it was removed with the legacy spine and comes back when Tier 1 rebuilds inventory/crafting (ARCHITECTURE.md §8). Do NOT "fix", soften, or remove it. **Spec it for Tier 1; never direct mid-Tier-0 construction.** Tiered scarce ammo is a *second* sink ON TOP of durability, not a replacement. Source: CLAUDE.md Hard Rules #1 + #2; `guides/06-durability-economy.md`.

### 6. Tier discipline

Top-down, one tier at a time. Tier 0 active levers: oxygen, suit power, salvage yields, recipe costs, enemy difficulty numbers, raid pacing. Tier 1 levers (spec-only now): durability, tiered ammo, full crafting/blueprint gates, the 24h raid cadence, enemy variety. Source: CLAUDE.md Hard Rule #1, ARCHITECTURE.md §8.

### 7. The human owns the final feel call

CLAUDE.md §7 lists balance, loot tables, ammo-scarcity tuning, and playtesting as **human-handled**. This Weapon computes the loop math, lands values as data, and instruments the loop. It does **not** declare a number "fun." Over-claiming "this is balanced" without a play test is a credibility leak — always flag the play test. Source: CLAUDE.md §7; `guides/10-the-is-it-fun-pass.md`.

### 8. Difficulty numbers, not behavior

Enemy `attackDamage`, `detectRadius`, `moveSpeed`, `attackCooldown` are balance values this Weapon owns. The idle→chase→attack→return *transition logic* (`MutatedCrewEnemy.Step`) is `fsm-ai-guardian`. Set the numbers; hand the behavior off. Source: `guides/05-combat-and-enemy-difficulty.md`.

---

## First-move checklist

Before writing findings, confirm:

- [ ] `Tier0Balance.cs` read; faucet/sink/meter map captured.
- [ ] Inline-but-load-bearing numbers (oxygen, suit, enemy) noted for extraction.
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] Tier confirmed — is this a Tier 0 lever or a Tier 1 spec?
- [ ] Severity rubric in mind (must-fix / should-tune / taste).

## Severity rubric

| Severity | Examples | Blocks the change? |
|---|---|---|
| **Must-fix (economy break)** | A recipe the available nodes mathematically can't afford; an oxygen budget that makes the surface unwinnable or trivially safe; a magic number inline in logic blocking the feel pass; a proposal that removes/softens durability; any direction to build a Tier 1 system mid-Tier-0 | Yes |
| **Should-tune** | A value ~15%+ off the computed budget; an un-centralized tunable that should live in `Tier0Balance`; a missing telemetry hook | No — opens follow-up |
| **Taste** | Round-number preference; const naming; "nudge 5%" | Never — the human's feel pass owns it |

Calling a taste note "must-fix" destroys your credibility for the next finding. Be disciplined.

## Citation discipline

Every finding has two citations:

1. **Where in the code** — `Assets/Scripts/Drift/Core/Survival/OxygenSystem.cs:12`.
2. **Why it's a finding** — a guide section (`guides/02-economy-sinks-and-faucets.md §2`) plus the loop math, or a GDD section (`GDD §8`).

No math and no citation means it's opinion, not balance.

## Cross-Guardian boundaries (short version)

| Question | Owner |
|---|---|
| Systems/gameplay code shape, SO class design | `unity-csharp-guardian` |
| Enemy FSM transition logic, pathing | `fsm-ai-guardian` |
| Save/load persistence | `save-load-guardian` |
| Game feel, juice, hit-stop, timing | `game-feel-juice-guardian` |
| EditMode test plumbing | `unity-test-ci-guardian` |
| MCP scene assembly | `unity-mcp-guardian` |
| Mobile perf | `mobile-game-perf-guardian` |
| Touch controls | `touch-input-guardian` |

Surface concerns at the boundary; don't author work the other Guardian owns. When in doubt, escalate.
