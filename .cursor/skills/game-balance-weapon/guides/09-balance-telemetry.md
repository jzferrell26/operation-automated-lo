# 09 — Balance Telemetry

> You can't balance what you can't measure. Telemetry turns "the loop feels grindy" (opinion) into "the player spends 38% of surface time gathering polymer" (a finding).

## The Tier 0 reality: lightweight, in-editor

Tier 0 has no save system, no backend, no analytics SDK (and shouldn't — tier discipline). Telemetry here means **instrumented logging** the human reads during a play test, plus EditMode-asserted invariants. The existing code already uses `Debug.Log` for state transitions (`OxygenSystem` "Oxygen depleted", `Tier0RaiderAssault` "Raider assault started/survived", `SuitPowerSystem` "Suit power depleted"). Build on that pattern — don't add a heavyweight system.

> **EditMode safety:** any telemetry hook on a MonoBehaviour must respect the Awake-less convention (ARCHITECTURE.md §7). Put counters behind lazy-init and increment them in the extracted `Tick`/`Step` methods, not in `Update` only — otherwise tests can't see them. Hand the wiring shape to `unity-csharp-guardian` / `unity-test-ci-guardian`; you specify *what* to count.

## The metrics that answer "is it balanced"

### Survival-meter metrics (the signature loop)

| Metric | Why it matters | Source |
|---|---|---|
| Surface time per run (s) | Compare against the O2 budget (`guides/03`) | timestamp descend → extract |
| O2 remaining at extraction (%) | Margin = tension level. ~10–30% = tense-fair; >50% = too generous; <5% = too tight | `OxygenSystem.Normalized` at extract |
| Times O2 hit zero per run | >0 means the player flirted with death (good) or it's unwinnable (bad) | `SurvivalMeter.Depleted` count |
| Suit power spent / recharged | Is sprint a meaningful one-shot or never used? | `SuitPowerSystem` consume calls |

### Economy metrics (faucet/sink reality)

| Metric | Why it matters | Source |
|---|---|---|
| Resources gathered per run, per type | The actual faucet rate vs the ledger (`guides/02`) | `SalvageInventory.Changed` / `Add` |
| Resources left over at extraction | The real surplus — does it match the computed +3/+2/+3 (scrap/polymer/raw ore)? | inventory snapshot at extract |
| Which resource ran out first | Confirms the intended constraining resource (polymer) | first `CanFit`/craft fail |
| Time-to-first-tool | Pacing of the early craft gate | timestamp first craft |

### Combat metrics

| Metric | Why it matters | Source |
|---|---|---|
| Player HP at extraction | Did combat + suffocation leave a margin? | `Health` at extract |
| Hits taken from enemy | Threat realized vs the `guides/05` budget | `Health.Changed` from enemy |
| Time in combat | Combat-time eats O2-budget — coupling check | enemy aggro → disengage |

### Raid metrics

| Metric | Why it matters | Source |
|---|---|---|
| Time-to-seal the breach | The crisis race (`guides/07`) | `BeginAssault` → `BreachSealed` |
| O2 lost during breach | Severity of the post-extraction crunch | O2 delta while breached |
| Raid survived / failed | The binary outcome | `RecordRaidSurvived` |

## The instrumentation pattern

1. **Add a counter/timestamp** keyed to the existing C# events (the loop already fires `Health.Changed`, `HullBreachEvent.BreachSealed`, `Tier0RaiderAssault.AssaultCompleted`, `SurvivalMeter.Depleted`, `SalvageInventory.Changed` — ARCHITECTURE.md §5). Subscribe in `Configure`, like the objective tracker does. No polling.
2. **Log a one-line run summary** on extract / loop-complete — surface time, O2-at-extract, resources left, HP, time-to-seal. One `Debug.Log` the human can scan in the Console.
3. **Assert invariants in EditMode** where they're deterministic — e.g. "a clean run leaves polymer surplus ≥ 0" — so a balance regression fails a test, not a play session. Specify the invariant; `unity-test-ci-guardian` writes the NUnit test.

## Reading telemetry into tuning

- O2-at-extract clustering high (>50%) across runs → drain too low; raise `drainPerSecond` (`guides/03`).
- Polymer-left consistently 0 and a craft fails → faucet too tight; raise `PolymerNodeAmount` or lower a polymer cost (`guides/02`, `guides/04`).
- Surface-time clustering near the full O2 budget → the loop is a nail-biter (could be intended) or unwinnable for slower players (widen the budget).
- Time-to-seal near the breach O2-out time → the raid crisis is razor-edge (`guides/07`).

Every telemetry-driven tuning change still lands as data (`Tier0Balance` / SO) and still defers the final "feels right" to the human's pass (`guides/10`). Telemetry sharpens the human's judgment; it doesn't replace it.

## Tier 1 forward look

Tier 1 + a save layer + (eventually) a backend (GDD §13) enable aggregate, cross-session telemetry — funnel completion, run-length distributions, death causes, retention against raid cadence. That's a backend concern (Tier 2+, `save-load-guardian` for local persistence first). Spec the metrics now; the Tier 0 job is per-run, in-editor instrumentation.
