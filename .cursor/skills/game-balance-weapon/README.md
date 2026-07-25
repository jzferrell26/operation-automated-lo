# game-balance-weapon

The procedural arsenal for `game-balance-guardian`, DRIFT's data-driven game-balance specialist.

## What this weapon covers

- **Balance-as-data** — the `Tier0Balance` + ScriptableObject pattern; extracting inline magic numbers (CLAUDE.md Hard Rule #3)
- **Economy sinks & faucets** — the closed Tier 0 economy ledger; salvage yields must pay recipe + build costs with intent
- **Survival-meter tuning** — oxygen (the signature meter — GDD §3), suit power, suffocation; the time-budget method
- **Salvage & resource curves** — node yields, tool-gated caches, scarcity-as-tension
- **Combat & enemy difficulty** — damage/range/cooldown NUMBERS, time-to-kill, threat budget (numbers only; FSM behavior → fsm-ai-guardian)
- **Durability economy (Tier 1)** — the grind driver; tools AND weapons degrade (Hard Rule #2); scarce tiered ammo as a SECOND sink on top, never a replacement
- **Raider cadence & pacing** — the post-extraction assault (Tier 0) → the 24h cadence (Tier 1)
- **Crafting cost curves** — the three-starter-tool gate, cost progression
- **Balance telemetry** — what to instrument to answer "is it balanced"
- **The "is it fun?" pass** — the structured Tier 0 play-test the human makes (GDD §3, the outstanding decision)

## Reading order

1. Read `SKILL.md` — master index, hard rules, severity rubric, routing table, output paths
2. Read `guides/00-principles.md` — the non-negotiables (balance-as-data, faucets-pay-sinks, durability-stays, human-owns-feel)
3. Open the guide matching your task (see the routing table in `SKILL.md`)
4. Use `examples/` for worked tunings and `templates/` for the SO + CSV scaffolds
5. Reference `research/research-plan.md` for the balance-design sources behind a claim

## Key rules

**Balance is DATA — never a magic number in logic.** Every tunable lands in `Tier0Balance` or a ScriptableObject so the human's feel pass can iterate without recompiling gameplay logic (Hard Rule #3).

**Durability stays — for tools AND weapons, guns included.** It is the Tier 1 grind driver and was kept on purpose (Hard Rule #2, GDD §8). Tiered scarce ammo is a SECOND sink ON TOP of it, never a replacement. Do not "fix" or remove it.

**The human owns the final feel call.** This Weapon computes the loop math, lands the values as data, and instruments the loop. It does not declare a number "fun" without a play test (CLAUDE.md §7).
