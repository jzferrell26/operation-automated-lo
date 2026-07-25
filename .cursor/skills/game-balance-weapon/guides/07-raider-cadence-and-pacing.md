# 07 — Raider Cadence and Pacing

> GDD §3, §8: *"Raider assault every 24h"* + the hull-breach crisis. Tier 0 ships a *trigger-based stub* of this, not the 24h timer (CLAUDE.md §3). This guide tunes the *pacing* of that escalation.

## What Tier 0 actually has

`Tier0RaiderAssault` (`Assets/Scripts/Drift/Gameplay/LifeSupport/Tier0RaiderAssault.cs`) is a **post-extraction trigger**, not a 24h clock (CLAUDE.md §3, ARCHITECTURE.md §5):

- `BeginAssault()` is called once, right after the player extracts home (`Tier0LoopController` → phase `RaidActive`).
- It spawns one raider (`SpawnRaider` reuses `MutatedCrewEnemy` — `Tier0RaiderAssault.cs:117-125`) and activates a `HullBreachEvent` (vents the deck, O2 offline).
- The player seals the breach with the Welder (`R`) → `BreachSealed` → `CompleteAssault` → `RecordRaidSurvived` → back to `StationHub`.

So in Tier 0 there is **one assault, triggered by completing the loop** — the gray-box proof of the mechanic, not the full cadence. The pacing levers here are about *that single crisis*, plus the spec for the Tier 1 cadence.

## Tier 0 pacing levers

The crisis is a **race**: the breach vents atmosphere (O2 offline on the deck) and a raider is loose; the player must seal before the situation collapses. The balance values that pace it:

| Lever | Where | Current | Tuning intent |
|---|---|---|---|
| Raider spawn position | `Tier0RaiderAssault.cs:14` `raiderSpawnPosition` | `(4,1,8)` | How fast the threat reaches the player mid-repair |
| Raider difficulty | `MutatedCrewEnemy` fields (`guides/05`) | shared with surface enemy | The pressure during the seal |
| Breach severity | `HullBreachEvent` (vent rate / O2 drain while breached) | read from the component | The clock on the repair |
| Seal requirement | Welder crafted + stand on deck + `R` | — | The skill/prereq gate |

**The core pacing question:** can the player seal the breach *before* the combined pressure (raider DPS + breach O2 loss) overwhelms them, given they just got back from a full surface run (possibly low on Health/suit)? Tune the breach drain and raider spawn distance so the seal is *achievable under pressure* — a crisis, not a formality (too easy) and not a death sentence (too hard). The same oxygen-budget math from `guides/03` applies: while the deck is breached, O2 isn't refilling, so the repair has a hard time limit.

## Tier 1 forward look: the real cadence (spec-only)

When Tier 1 builds the 24h cadence (GDD §3, §8), the pacing becomes a **curve over time**, not a single event. Spec these as data (`guides/01`); do not build mid-Tier-0:

### The escalation curve

| Cadence cycle | Raider count | Raider difficulty | Breach severity |
|---|---|---|---|
| Day 1 (low-level, per GDD §3) | 1–2 | base | 1 breach |
| Day N | scales up | scales up | multiple breaches |

The headline tunables:

- **Interval** — the "24h" of game-time between assaults. A `Tier0Balance`-style const (later a difficulty-profile SO). Shorter = relentless; longer = build-up time.
- **Wave size curve** — raiders per assault as a function of day/station-tier. Linear early, steeper late.
- **Difficulty scaling** — raider damage/HP per cycle (reuses `guides/05` numbers, scaled). GDD §8: *"Low-level/easy early, scaling over time."*
- **Breach count/severity curve** — more breaches, faster venting, at higher tiers — the §5 pressure crisis grows teeth.
- **Defense interaction** — station hull tiers (L1→L4, GDD §5), turrets, traps offset the curve. Balance is the *gap* between attacker scaling and the defenses the player can realistically build by then. This is the central retention lever: the player must keep upgrading to keep pace.

### The pacing principle

The 24h cadence is DRIFT's horde-attack timer (GDD §3, the LDoE inheritance). Its job is to **convert the player's off-station scavenging into stakes**: everything you gather on the surface must also fund the defenses for the next raid. So raid scaling and salvage faucet rates (`guides/02`, `guides/04`) are coupled — if raids outscale what salvage can fund, the player hits a wall; if salvage outpaces raids, the raid stops mattering. Compute the two curves together.

## Boundary

The raider's *combat behavior* (how it paths to and attacks structures) is `fsm-ai-guardian`. The breach *system* (vent mechanics, seal logic) is `unity-csharp-guardian`. You own: how often, how many, how hard, and how fast it escalates — the cadence and difficulty NUMBERS.
