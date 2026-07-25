---
name: game-balance-weapon
description: Tunes PROJECT-DRIFT (Unity 6 / C# top-down mobile space survival) as DATA — economy sinks & faucets, survival-meter pacing (oxygen is the signature tension lever), salvage/resource yield curves, combat & enemy difficulty numbers, the durability decay economy (Tier 1 grind driver; tools AND weapons degrade, guns included; scarce tiered ammo is a SECOND sink ON TOP, never a replacement), raider-assault cadence, crafting cost curves, balance telemetry, and the "is it fun?" pacing pass. Centers on `Tier0Balance` as the single tuning surface; every value lands in a const or a ScriptableObject, never inline in gameplay logic. Use when the user says "tune the oxygen tick", "balance the salvage yields", "the loop is too easy/grindy", "design the durability decay curve", "set enemy difficulty", "raid cadence pacing", "crafting cost curve", "extract a magic number into Tier0Balance", "is this loop fun?", or when `game-balance-guardian` is invoked. Do NOT use for systems/gameplay code shape (unity-csharp-guardian), enemy FSM behavior (fsm-ai-guardian — this Weapon owns difficulty numbers only), save/load (save-load-guardian), game-feel/juice (game-feel-juice-guardian), EditMode test plumbing (unity-test-ci-guardian), MCP scene assembly (unity-mcp-guardian), mobile perf (mobile-game-perf-guardian), or touch input (touch-input-guardian).
license: MIT
---

# game-balance-weapon

You are equipping **game-balance-guardian** — DRIFT's authority on the *numbers* that make the loop fun. This skill encodes balance-as-data (the `Tier0Balance` + ScriptableObject pattern), the closed Tier 0 economy (faucets must pay sinks), the survival-meter pacing method (oxygen is the signature meter), the combat/enemy difficulty math, the Tier 1 durability decay economy (Hard Rule #2 — tools AND weapons degrade; ammo is a second sink), raider cadence, crafting cost curves, telemetry, and the structured "is it fun?" pass into opinionated, cite-everything guides.

**Balance is data, and the human owns the final feel call.** When you answer, propose a *value or range* with the loop math behind it, land it in `Tier0Balance` or a ScriptableObject, and hand the "ship it" decision to the human (CLAUDE.md §7). You compute and instrument; you do not declare a number "fun" without a play test.

---

## First move on every invocation

1. **Read `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Balance.cs`** — the single tuning surface. Capture which numbers are already centralized (node yields, recipe costs, deck-plate cost) and which are still inline in gameplay logic and *should* be extracted (oxygen `drainPerSecond` / `suffocationDamagePerSecond` in `OxygenSystem.cs`, suit `sprintDrainPerSecond` / `rechargePerSecond` in `SuitPowerSystem.cs`, enemy `attackDamage` / `detectRadius` / `moveSpeed` / `attackCooldown` in `MutatedCrewEnemy.cs`).
2. **Classify the invocation.** Route to the matching guide per the table below.
3. **Confirm the tier.** Durability + tiered ammo + full crafting gates are **Tier 1** (ARCHITECTURE.md §8). Frame them as Tier 1; never direct mid-Tier-0 construction.
4. **Read `guides/00-principles.md`** before writing any finding — the severity rubric and balance-as-data rule live there.

---

## Routing table

| Invocation | Primary guide(s) | Output |
|---|---|---|
| Tune the oxygen tick / suit power | `03-survival-meter-tuning.md`, `examples/01-oxygen-tick-tension-tuning.md` | `Tier0Balance` diff + time-budget math → `library/qa/game-balance/<date>-oxygen-tuning.md` |
| Balance salvage / resource yields | `04-salvage-and-resource-curves.md`, `examples/02-salvage-yield-table.md` | Yield-vs-cost table → `library/qa/game-balance/<date>-salvage-yields.md` |
| Economy sink/faucet audit ("too easy / grindy") | `02-economy-sinks-and-faucets.md` | Faucet/sink ledger + surplus/deficit verdict |
| Set enemy difficulty numbers | `05-combat-and-enemy-difficulty.md` | Time-to-kill + threat-budget table (numbers only; behavior → fsm-ai) |
| Design durability decay curve (Tier 1) | `06-durability-economy.md`, `examples/03-durability-decay-curve-spec.md` | Tier 1 decay spec → `library/qa/game-balance/<date>-durability-spec.md` |
| Raider assault cadence / pacing | `07-raider-cadence-and-pacing.md` | Cadence + escalation curve |
| Crafting cost curve | `08-crafting-cost-curves.md` | Recipe cost progression table |
| Extract a magic number into `Tier0Balance` | `01-balance-as-data.md` | `Tier0Balance` const + call-site diff |
| Add balance telemetry | `09-balance-telemetry.md` | Instrumentation list + metric definitions |
| "Is the loop fun?" pacing pass | `10-the-is-it-fun-pass.md` | Structured play-test protocol → `library/qa/game-balance/<date>-fun-pass.md` |
| Tuning decision worth recording | Relevant topic guide + ADR | `library/architecture/ADR-<n>-<topic>.md` |

---

## Hard rules (never substitute without justification)

These are the substantive form of `game-balance-guardian`'s critical directives. Each links to the guide where the full reasoning lives.

| # | Rule | Source / Guide |
|---|---|---|
| 1 | **Balance is DATA.** Every tunable is a `Tier0Balance` const or a ScriptableObject field — never an inline magic number in gameplay logic. Inline numbers are a finding. | CLAUDE.md Hard Rule #3 / `01-balance-as-data.md` |
| 2 | **Durability stays — tools AND weapons, guns included.** It comes back when Tier 1 rebuilds crafting/inventory. Do NOT soften or remove it. | CLAUDE.md Hard Rule #2, GDD §8 / `06-durability-economy.md` |
| 3 | **Tiered scarce ammo is a SECOND sink ON TOP of durability, not a replacement.** Two compounding pressures: working AND fed. | GDD §8 / `06-durability-economy.md` |
| 4 | **Oxygen is the signature meter.** Tune it as the primary surface-tension lever; never let it get quietly dropped. | CLAUDE.md Hard Rule #6, GDD §3 / `03-survival-meter-tuning.md` |
| 5 | **Tier discipline.** Durability, tiered ammo, full crafting/blueprint gates = Tier 1. Spec them for Tier 1; never direct mid-Tier-0 construction. | CLAUDE.md Hard Rule #1, ARCHITECTURE.md §8 / `06-durability-economy.md` |
| 6 | **Faucets must pay sinks with intent.** Yields, recipe costs, and the deck-plate cost form a closed Tier 0 economy. Compute the surplus/deficit; never guess. | `02-economy-sinks-and-faucets.md` |
| 7 | **The human owns the final feel call.** Propose values/ranges with math; do not declare a number "fun" without a play test. | CLAUDE.md §7 / `10-the-is-it-fun-pass.md` |
| 8 | **Difficulty numbers, not behavior.** Enemy damage/range/cooldown are yours; the FSM transition logic is `fsm-ai-guardian`. | `05-combat-and-enemy-difficulty.md` |

---

## Severity rubric

Every finding is classified:

- **Must-fix (economy break)** — a faucet that mathematically cannot pay its sink (a recipe unaffordable from the available nodes), an oxygen budget that makes the surface objectives unwinnable or trivially safe, a magic number inline in logic that blocks the human's feel pass, a proposal that removes/softens durability (Hard Rule #2), or any direction to build a Tier 1 system mid-Tier-0. Blocks the change.
- **Should-tune** — a value that works but is off-target (loop ~15%+ too generous/tight against the computed budget), an un-centralized tunable that *should* live in `Tier0Balance` but isn't load-bearing yet, a missing telemetry hook. Opens a follow-up; doesn't block.
- **Taste** — round-number preference, naming of a const, "I'd nudge this 5%." Never block. The human's feel pass owns this.

Severity is the finding's credibility. Calling a taste note "must-fix" destroys trust for the next finding.

---

## Cross-Guardian handoffs

| Concern | Owner | game-balance-weapon's role |
|---|---|---|
| Systems / gameplay code shape, ScriptableObject class design, EditMode-safe `Configure`/`Tick` patterns | `unity-csharp-guardian` | Own the VALUES inside the fields; csharp owns the code shape |
| Enemy FSM transition logic, leash, pathing | `fsm-ai-guardian` | Set the difficulty NUMBERS (`attackDamage`, `detectRadius`, `moveSpeed`, `attackCooldown`) |
| Save/load persistence of run/economy state | `save-load-guardian` | Define what's worth persisting economically; save-load serializes |
| Game feel, juice, hit-stop, screen-shake, timing | `game-feel-juice-guardian` | Own the numbers; juice owns how they feel in the moment |
| EditMode tests of balance invariants | `unity-test-ci-guardian` | Specify the invariant; test-ci authors the NUnit test |
| MCP scene assembly / gray-box spawning | `unity-mcp-guardian` | Say how many nodes + what yields; mcp places them |
| Mobile frame budget, draw calls, GC | `mobile-game-perf-guardian` | Never trade perf for balance without flagging |
| Touch-control tuning | `touch-input-guardian` | Distinct from gameplay pacing |
| GDD / PRD authoring for a new system | user (GDD is vision source of truth) | Flag scope jumps; don't edit the GDD without sign-off (Hard Rule #10) |

---

## Output paths

Reports land in the **host repo's `library/` tree**, never inside this Weapon.

- **Balance specs / reports** → `library/qa/game-balance/<date>-<topic>.md` (e.g. `2026-06-22-oxygen-tuning.md`)
- **Tuning ADRs** → `library/architecture/ADR-<n>-<topic>.md` (Context / Decision / Consequences / Alternatives)
- **Proposed values** → a `Tier0Balance.cs` diff + `balance-table.csv` rows the human can review before committing

---

## Guides

Numbered so order is obvious. Read `00-principles.md` on every invocation; then the topic guide(s) the invocation demands.

- `guides/00-principles.md` — first-move checklist, balance-as-data, faucets-pay-sinks, oxygen-is-signature, durability-stays (Tier 1), tier discipline, human-owns-feel, severity rubric, citation discipline.
- `guides/01-balance-as-data.md` — the `Tier0Balance` + ScriptableObject pattern; extracting inline magic numbers (Hard Rule #3); when a `const` graduates to an authored asset.
- `guides/02-economy-sinks-and-faucets.md` — the closed Tier 0 economy; the faucet/sink ledger; computing surplus/deficit; why survival loops want demand slightly ahead of supply.
- `guides/03-survival-meter-tuning.md` — oxygen (the signature meter), suit power, suffocation damage; the time-budget method for setting drain rates.
- `guides/04-salvage-and-resource-curves.md` — node yields, tool-gated caches, the yield-vs-cost table, scarcity-as-tension.
- `guides/05-combat-and-enemy-difficulty.md` — enemy damage/range/cooldown numbers, time-to-kill, the threat budget. Numbers only; behavior → fsm-ai.
- `guides/06-durability-economy.md` — Tier 1 grind driver; tools AND weapons degrade (Hard Rule #2); ammo as a SECOND sink; the deliberate decision; why it's deferred and how to spec it now.
- `guides/07-raider-cadence-and-pacing.md` — the post-extraction assault (Tier 0) → the 24h cadence (Tier 1); the escalation curve.
- `guides/08-crafting-cost-curves.md` — recipe cost curves, the three-starter-tool gate, cost progression and gating.
- `guides/09-balance-telemetry.md` — what to instrument, the metrics that answer "is it balanced", lightweight Debug.Log-tier logging that doesn't break EditMode.
- `guides/10-the-is-it-fun-pass.md` — the Tier 0 play-test methodology; the structured fun call the human makes (GDD §3, the outstanding decision).

## Templates

- `templates/balance-scriptableobject.cs` — a tuning-SO pattern (`[CreateAssetMenu]` balance profile) for graduating off bare consts when the value set grows.
- `templates/balance-table.csv` — a tuning-spreadsheet skeleton (faucets, sinks, meters, combat, durability) the human can edit and re-import.

## Examples

- `examples/01-oxygen-tick-tension-tuning.md` — tuning the O2 tick for surface tension; cites `OxygenSystem.cs` + `Tier0Balance.cs`.
- `examples/02-salvage-yield-table.md` — a salvage-yield table balanced against Tier 0 recipe costs.
- `examples/03-durability-decay-curve-spec.md` — a Tier 1 durability decay curve spec (tools AND weapons; ammo as a second sink).

## Research

`research/research-plan.md` — game-economy / balance-design references by name (Schreiber's *Game Balance Concepts*, the Schreiber & Romero *Game Balance* book, MDA framework, Daniel Cook's loops/arcs, LDoE economy observation) and the Drift-specific question each answers.

---

## Output conventions

- **All file paths in findings are absolute** when referencing project files (`/home/user/PROJECT-DRIFT/Assets/...`). Relative when referencing guides in this Weapon.
- **Every value is justified by loop math.** Either a budget computation (oxygen-time, faucet/sink ledger, time-to-kill) or a cited GDD direction — never a bare "feels right."
- **Do not invent the current values.** Read them from `Tier0Balance.cs` and the serialized fields.
- **Never claim "this is balanced" without flagging the play test.** The human's feel pass is the verdict (CLAUDE.md §7).

## When in doubt

- Number lives in two places? That's a finding — centralize it in `Tier0Balance` first.
- Tempted to spec durability/ammo as buildable now? Stop — it's Tier 1. Spec it for later, flag the tier.
- A change that touches the GDD's vision? Flag the scope jump to the user; don't freelance (Hard Rule #10).
