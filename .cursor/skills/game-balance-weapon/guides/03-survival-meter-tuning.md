# 03 — Survival Meter Tuning

> CLAUDE.md Hard Rule #6: **Oxygen is the signature meter.** It ticks outside the sealed station. Don't let it get quietly dropped. GDD §3: O2 is *the* tension lever no competitor can copy.

## The two Tier 0 meters

Both build on `SurvivalMeter` (`Assets/Scripts/Drift/Core/Survival/SurvivalMeter.cs`) — a `max`/`current` primitive with `Tick(dt, drainPerSecond)` that fires `Depleted` once at zero.

| Meter | Class | Role | Drains when |
|---|---|---|---|
| **Oxygen** | `OxygenSystem.cs` | Signature survival timer | Outside a powered `LifeSupportZone` |
| **Suit power** | `SuitPowerSystem.cs` | Sprint pacing budget | While sprinting outside the zone |

The `LifeSupportZone` refills both and pauses drain inside the powered hull (ARCHITECTURE.md §6). On the planet surface, both drain — that's the tension.

## The signature meter: oxygen

Current values (`OxygenSystem.cs`):

```csharp
[SerializeField] float maxOxygen = 100f;                 // line 11
[SerializeField] float drainPerSecond = 1f;              // line 12
[SerializeField] float suffocationDamagePerSecond = 8f;  // line 13
```

`Tick` drains the meter while `DrainEnabled`, and once `IsDepleted` it bleeds `Health` at `suffocationDamagePerSecond * dt` (`OxygenSystem.cs:103-106`).

### The time-budget method

Tune oxygen by **how long the player can stay outside**, not by the raw drain number. The budget is the lever; the drain is derived.

```
oxygen_seconds = maxOxygen / drainPerSecond
```

At `100 / 1 = 100 seconds` of surface time before O2 hits zero. After that, suffocation: `Health` (default 100) drains at 8/s, so `100 / 8 ≈ 12.5s` grace before death. **Total survivable time outside ≈ 112.5s.**

Now ask: **can a competent player complete the surface objectives inside the budget, with tension but not panic?** The Tier 0 surface objectives (`Tier0ObjectiveTracker`, ARCHITECTURE.md §5) are:

1. craft/own the 3 tools, 2. open all 3 tool caches, 3. take ≥1 enemy hit, 4. reach extraction.

If those take a confident player ~70–90s, a 100s clean budget gives a ~10–30s margin — tense, fair. If they take ~110s, the budget is too tight (must-fix: unwinnable for an average player). If they take ~40s, the meter never bites (should-tune: drop the budget or raise the drain so O2 is felt).

### Tuning levers, in priority order

1. **`drainPerSecond`** — the primary tension knob. Raising it shortens the budget without touching anything else. This is what "tune the oxygen tick" means.
2. **`maxOxygen`** — couple with suit-tier upgrades later (GDD §4: better suits gate O2 efficiency). In Tier 0, leave at 100 and tune drain.
3. **`suffocationDamagePerSecond`** — the grace window after depletion. 8/s gives ~12.5s of "get back to the zone NOW" — a deliberate second chance. Lower it for a harder game; never set it so the player dies instantly (removes the recovery beat).

**Extract these into `Tier0Balance`** (`guides/01`) — `drainPerSecond` is the single most-tuned number in the game and belongs in the central surface, mirrored by the `[SerializeField]` default.

## The pacing meter: suit power

Current values (`SuitPowerSystem.cs`):

```csharp
[SerializeField] float maxPower = 100f;             // line 11
[SerializeField] float sprintDrainPerSecond = 18f;  // line 12
[SerializeField] float rechargePerSecond = 20f;     // line 13
```

`TryConsumeSprint(dt)` drains while sprinting and gates it; recharges inside the zone (`SuitPowerSystem.cs:47-72`).

### The budget

```
sprint_seconds = maxPower / sprintDrainPerSecond = 100 / 18 ≈ 5.5s
```

~5.5s of continuous sprint before depletion. That's a **short burst** — exactly the GDD §3 intent ("short movement bursts"). It's a tactical escape lever, not a travel mode. Recharge only happens in the powered zone (it recharges at 20/s there), so on the surface a spent sprint stays spent until you extract — meaning sprint is a one-shot panic button per run unless you return. That's a strong, deliberate tension design; preserve it.

### Interaction with oxygen (the key cross-meter check)

Sprinting gets you to extraction faster (saves oxygen) but the *only* surface recharge is back in the station. So the meters are coupled: sprint trades a fast finite resource (suit) to conserve a slow finite resource (O2). **When tuning one, recompute the other's budget** — e.g. raising oxygen drain makes sprint-to-extract more valuable, which may mean suit power needs a touch more headroom. Show both budgets in any survival-meter report.

## Tier 1 forward look

- Hydration + radiation join O2 as meters (GDD §3, §7).
- Suit/helmet tiers gate O2 efficiency (GDD §4) — this is where `maxOxygen` becomes a per-suit ScriptableObject value, not a const.
- O2 *fuel* becomes a craftable sink (GDD §6) — the meter stops being free.

Spec these; the Tier 0 job is to make the single oxygen lever feel like the heartbeat of the surface loop.
