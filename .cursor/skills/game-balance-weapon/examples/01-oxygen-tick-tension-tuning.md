# Example 01 — Tuning the Oxygen Tick for Tension

**Invocation:** "The oxygen meter doesn't really matter on the surface — tune the O2 tick so it creates tension."

**Guides:** `03-survival-meter-tuning.md`, `02-economy-sinks-and-faucets.md`, `01-balance-as-data.md`, `10-the-is-it-fun-pass.md`.

---

## Step 1 — Read the current values (don't guess)

From `Assets/Scripts/Drift/Core/Survival/OxygenSystem.cs`:

```csharp
[SerializeField] float maxOxygen = 100f;                 // line 11
[SerializeField] float drainPerSecond = 1f;              // line 12
[SerializeField] float suffocationDamagePerSecond = 8f;  // line 13
```

These are **inline `[SerializeField]` defaults — not yet in `Tier0Balance`** (`Tier0Balance.cs` has no oxygen consts). Finding #1, **should-tune**: oxygen drain is the most-tuned number in the game and is referenced by `RuntimeOxygenTests`; extract it to `Tier0Balance.OxygenDrainPerSecond` mirrored by the field default (`guides/01`).

## Step 2 — Compute the current budget

```
oxygen_seconds  = maxOxygen / drainPerSecond = 100 / 1   = 100 s
grace_after     = playerHealth / suffocationDPS = 100 / 8 ≈ 12.5 s
total_survivable = 100 + 12.5 ≈ 112.5 s outside the station
```

## Step 3 — Compare against the surface workload

The Tier 0 surface objectives (`Tier0ObjectiveTracker`): craft 3 tools, open 3 tool-gated caches, take 1 enemy hit, reach extraction. Estimate (confirm by play test / telemetry, `guides/09`) a confident player needs ~75–90 s of *productive* surface time.

**Verdict:** a clean 100 s budget leaves a 10–25 s margin — *already roughly tense.* But `drainPerSecond = 1` is a very round, soft number, and if movement is quick the player may finish with 40%+ O2 left (telemetry confirms). The meter is *present* but not *pressing*.

## Step 4 — Propose the tuning (with math, as a range)

Goal: O2-at-extract clustering ~10–25% for a competent run — felt, not fatal.

| Lever | From | To | New budget | Effect |
|---|---|---|---|---|
| `drainPerSecond` | 1.0 | **1.25** | `100 / 1.25 = 80 s` | Tightens margin to ~0–15 s; O2 becomes a real clock |
| `suffocationDamagePerSecond` | 8 | 8 (keep) | ~12.5 s grace | Preserve the recovery beat — don't make depletion instant |

Why 1.25 and not 2.0: at `drain = 2`, budget = 50 s, below the ~75 s workload → likely **unwinnable** for an average player (must-fix territory). 1.25 keeps the loop *completable under pressure* — the `guides/10` tension bar, not a death sentence.

## Step 5 — Land it as data + cross-check

Proposed `Tier0Balance` addition (the extraction from Step 1):

```csharp
public const float OxygenMax = 100f;
public const float OxygenDrainPerSecond = 1.25f;       // tuned up from 1.0 for surface tension (GDD §3)
public const float SuffocationDamagePerSecond = 8f;
```

And `OxygenSystem` fields default to these. **Cross-meter check (`guides/03`):** a tighter O2 budget makes sprint-to-extract more valuable, so re-verify suit power (`maxPower / sprintDrainPerSecond = 100/18 ≈ 5.5 s` burst) still gives a meaningful escape option — it does; no change needed.

## Step 6 — Hand the feel call to the human

> "I've tightened the oxygen budget from 100 s to 80 s by raising `drainPerSecond` 1.0 → 1.25, extracted into `Tier0Balance`, kept the 12.5 s suffocation grace. The math says this makes O2 a felt clock without making the surface unwinnable (workload ~75–90 s). **Play it and confirm the tension lands — the final feel call is yours (CLAUDE.md §7).** Run `guides/09` telemetry and check O2-at-extract clusters ~10–25%; if it's still slack we go to 1.4, if runs fail we drop to 1.1."

**Report:** `library/qa/game-balance/2026-06-22-oxygen-tuning.md`.
