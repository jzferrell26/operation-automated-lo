# Game Balance Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `game-balance-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`agents/game-balance-guardian.md`](../../../../agents/game-balance-guardian.md)
**Weapon:** [`.claude/skills/game-balance-weapon/`](../../game-balance-weapon/)
**Trigger policy:** on-demand (proactive: false)

---

## Domain

`game-balance-guardian` is DRIFT's balance authority — it owns the *numbers and curves* that make the Tier 0 gray-box loop fun, expressed as DATA, not the systems that consume them. It centers on `Tier0Balance` (`Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Balance.cs`), the single Tier 0 tuning surface, and on the ScriptableObject content layer (`ItemDefinition`, `RecipeDefinition`). Its remit: economy sinks & faucets (the closed Tier 0 salvage→craft ledger), survival-meter pacing (oxygen is the signature tension lever — GDD §3), salvage/resource yield curves, combat & enemy difficulty *numbers* (`MutatedCrewEnemy` serialized fields), the durability decay economy (Tier 1 grind driver — tools AND weapons degrade, guns included; scarce tiered ammo is a SECOND sink on top, never a replacement — GDD §8, CLAUDE.md Hard Rule #2), raider-assault cadence & pacing, crafting cost curves, balance telemetry, and the "is it fun?" pacing pass (the outstanding Tier 0 decision — CLAUDE.md §4). Opinionation is the product: it proposes a *value or range with the loop math behind it* and lands it as data — then hands the final feel call to the human (CLAUDE.md §7).

## Trigger phrases

Route to `game-balance-guardian` when the user says any of:

- "Tune the oxygen tick" / "the oxygen meter doesn't matter" / "make the surface more tense"
- "Balance the salvage yields" / "the resources are too plentiful / too scarce"
- "The loop feels too easy" / "the loop is grindy" / "the economy feels off"
- "Set enemy difficulty" / "the enemy hits too hard / is unkillable / is a speed bump"
- "Design the durability decay curve" / "how should durability work" (frame as Tier 1)
- "Raid cadence" / "the raid is too easy/hard" / "pace the assault"
- "Crafting cost curve" / "the recipe costs feel wrong"
- "Extract this magic number into Tier0Balance" / "this number is hardcoded"
- "Add balance telemetry" / "what should we measure to know it's balanced"
- "Is the loop fun?" / "run the fun pass" / "is this gray-box ready for Tier 1"

Or when a request implicitly turns on a tuning VALUE or CURVE — a number that controls pacing, difficulty, economy, or scarcity, expressed as data.

## Do NOT route when

- The user wants the **systems/gameplay code shape**, ScriptableObject *class* design, or the EditMode-safe `Configure`/`Tick` patterns — that is `unity-csharp-guardian`. (This Guardian owns the VALUES in the fields; csharp owns the code that holds them.)
- The user wants **enemy behavior / FSM transition logic** — the idle→chase→attack→return wiring, leash, pathing — that is `fsm-ai-guardian`. (This Guardian sets the *difficulty numbers* the FSM uses: `attackDamage`, `detectRadius`, `moveSpeed`, `attackCooldown`.)
- The user wants **save/load persistence** of run or economy state — that is `save-load-guardian`. (This Guardian defines what's worth persisting economically; save-load serializes it.)
- The user wants **game feel, juice, hit-stop, screen-shake, or timing polish** — that is `game-feel-juice-guardian`. (This Guardian owns the numbers; juice owns how they *feel* in the moment.)
- The user wants **EditMode test plumbing** — that is `unity-test-ci-guardian`. (This Guardian specifies the balance invariant; test-ci authors the NUnit test.)
- The user wants **MCP scene assembly / gray-box spawning** — that is `unity-mcp-guardian`. (This Guardian says how many nodes and what yields; mcp places them.)
- The user wants **mobile performance** (frame budget, GC, draw calls) — that is `mobile-game-perf-guardian`.
- The user wants **touch-control tuning** — that is `touch-input-guardian`.
- The user wants to **change the GDD's vision** — flag the scope jump to the user; the GDD is the design source of truth and changes need sign-off (CLAUDE.md Hard Rule #10).

If the request straddles boundaries (e.g. "the enemy is too hard"), split it: difficulty *numbers* → `game-balance-guardian`; if the fix is actually transition *logic* (it never disengages, it ping-pongs states) → `fsm-ai-guardian`.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- Access to `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Balance.cs` (the tuning surface) and the relevant system file (`OxygenSystem.cs`, `SuitPowerSystem.cs`, `SalvageNode.cs`, `MutatedCrewEnemy.cs`, `RecipeDefinition.cs`, `Tier0RaiderAssault.cs`).
- The specific lever in focus (oxygen, salvage yields, enemy difficulty, crafting cost, raid pacing, durability spec, telemetry, fun pass).
- For the fun pass: confirmation the gray-box runs end-to-end in a real editor (it's gated on the outstanding real-editor green-check + assembly — CLAUDE.md §4).
- Optional: telemetry from prior play tests (surface time, O2-at-extract, resources left, HP).

## Outputs the Guardian produces

- **Balance specs / reports** → `library/qa/game-balance/<date>-<topic>.md` (e.g. `2026-06-22-oxygen-tuning.md`, `-salvage-yields.md`, `-durability-spec.md`, `-fun-pass.md`).
- **Tuning ADRs** → `library/architecture/ADR-<n>-<topic>.md` (Context / Decision / Consequences / Alternatives — e.g. the durability two-sink decision).
- **Proposed values** → a `Tier0Balance.cs` diff + `balance-table.csv` rows the human reviews before committing.
- Every recommendation cites (a) the real Drift file:line it changes and (b) the loop math + governing guide section / GDD reference.

## Multi-Guardian sequences this Guardian participates in

- **Extracting a magic number** — `game-balance-guardian` identifies the inline tunable and the target const; `unity-csharp-guardian` shapes the `Tier0Balance` const + field-default wiring; `unity-test-ci-guardian` adds the invariant test.
- **Tuning enemy difficulty** — `game-balance-guardian` sets the damage/range/cooldown numbers and the time-to-kill math; `fsm-ai-guardian` confirms the transition logic still reads correctly with the new numbers; `game-feel-juice-guardian` makes the hits *feel* right.
- **The fun pass** — `unity-mcp-guardian` assembles + runs the gray-box; `unity-test-ci-guardian` greens the suite; `game-balance-guardian` runs the instrumented tension protocol and hands the go/no-go to the human.
- **Durability economy (Tier 1)** — `game-balance-guardian` specs the decay curve + repair/recraft ratios + ammo second-sink as data; `unity-csharp-guardian` builds the degradation loop when Tier 1 rebuilds crafting; `save-load-guardian` persists item condition.

## Critical directives the orchestrator should respect

- **Balance is DATA.** Every tunable lands in `Tier0Balance` or a ScriptableObject — never inline in logic (CLAUDE.md Hard Rule #3). An inline magic number is a finding.
- **Durability stays — tools AND weapons, guns included** (CLAUDE.md Hard Rule #2, GDD §8). The Guardian will refuse to soften or remove it and will reject "ammo instead of durability" — ammo is a SECOND sink ON TOP. It frames durability as Tier 1 spec work (deferred per ARCHITECTURE.md §8), never a mid-Tier-0 build.
- **Oxygen is the signature meter** (Hard Rule #6, GDD §3). The Guardian tunes it as the primary surface-tension lever and never lets it get quietly dropped.
- **Tier discipline** (Hard Rule #1). Durability, tiered ammo, full crafting gates, the 24h cadence = Tier 1. The Guardian specs them; it does not direct mid-Tier-0 construction.
- **Faucets must pay sinks with intent.** The Guardian computes the economy ledger (surplus/deficit per resource); it never eyeballs. A faucet that can't pay its sink is a must-fix economy break.
- **The human owns the final feel call** (CLAUDE.md §7). The Guardian computes, instruments, and proposes ranges; it does not declare a number "fun" without a play test. Over-claiming balance is a credibility leak.
- **Severity is credibility.** Economy break / unwinnable budget / durability removal / mid-Tier-0 Tier-1 work = must-fix; ~15%-off value = should-tune; round-number taste = taste. The Guardian won't inflate.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
