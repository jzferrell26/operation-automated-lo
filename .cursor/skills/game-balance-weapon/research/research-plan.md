# Research Plan — game-balance-weapon

The balance-design sources behind this Weapon's guides, and the Drift-specific question each one answers. Sources are named by author/title (no fabricated URLs); consult the primary text when a claim needs deeper grounding.

## Topics & sources

### 1. Game balance as a discipline
- **Ian Schreiber — *Game Balance Concepts* (course / blog series).** The foundational free course on transitive/intransitive balance, cost curves, and "the math of fun." → backs `guides/02` (sinks/faucets), `guides/08` (cost curves).
- **Ian Schreiber & Brenda Romero — *Game Balance* (CRC Press, 2021).** The book-length treatment: resource economies, feedback loops, difficulty curves. → backs `guides/00` principles, `guides/05` (difficulty), `guides/08`.

### 2. Economy design — sinks, faucets, loops
- **Daniel Cook (Lostgarden) — "Loops and Arcs" / "Game economy" essays.** The loop-vs-arc framing and the faucet/sink vocabulary used throughout. → backs `guides/02`, `guides/10` (the loop must be fun before content).
- **Joris Dormans & Ernest Adams — *Game Mechanics: Advanced Game Design* (Machinations).** Internal-economy modeling, source/drain/converter/trader nodes. → backs `guides/02` (the closed Tier 0 ledger), `guides/06` (durability as an infinite drain).

### 3. The framework lens
- **Hunicke, LeBlanc, Zubek — "MDA: A Formal Approach to Game Design and Game Research."** Mechanics → Dynamics → Aesthetics; tune mechanics (numbers) to produce the intended aesthetic (tension). → backs `guides/00`, `guides/10` (target experience first).

### 4. Survival-game economy in practice (the genre Drift inherits)
- **Last Day on Earth: Survival — observed economy (the GDD's explicit reference).** Durability as the late-game grind driver, scarce-storage tension, the 24h horde timer, the vehicle-as-fast-travel-token pattern. The GDD (§3, §8, §10) is itself the primary Drift-side source; this Weapon operationalizes it. → backs `guides/06` (durability stays), `guides/07` (raid cadence), `guides/02` (scarcity-as-tension).
- **Don't Starve / Rust / Project Zomboid — survival-meter and decay norms.** Comparative grounding for meter drain rates and item-decay pacing. → backs `guides/03` (meter budgets), `guides/06` (decay curves).

### 5. Difficulty & pacing curves
- **Jenova Chen — "Flow in Games" (thesis).** The flow channel between boredom and anxiety; difficulty must track player skill. → backs `guides/05` (threat budget), `guides/07` (escalation), `guides/10` (slack vs unfair beats).

### 6. Telemetry / playtest-driven balancing
- **Game-analytics practice (industry talks on telemetry-driven tuning; Riot/Valve/mobile F2P post-mortems).** Instrument the loop, read distributions, tune against data not vibes. → backs `guides/09` (what to instrument), `guides/10` (instrumented play test).

## Drift-specific questions this Weapon answers

| Question | Guide | Grounding |
|---|---|---|
| Does the Tier 0 economy's faucets pay its sinks? | `02` / `04` / `08` | Schreiber cost curves + the `Tier0Balance` ledger |
| How long should a player survive outside on O2? | `03` | flow channel + survival-meter norms + GDD §3 |
| How hard is the one enemy, and is it killable inside the O2 budget? | `05` | threat budget + flow + `MutatedCrewEnemy` numbers |
| Why does durability stay for guns, and how is ammo a *second* sink? | `06` | Machinations infinite-drain + LDoE economy + GDD §8 |
| How should the raid escalate over the 24h cadence? | `07` | difficulty curves + LDoE horde timer + GDD §3/§8 |
| What do we measure to know it's balanced? | `09` | telemetry-driven tuning practice |
| Who decides "fun," and how is that call structured? | `10` | MDA + Lostgarden loops + CLAUDE.md §7 |

## Method notes

- **The GDD and `Tier0Balance.cs` are the primary Drift-side sources.** External references inform *method*; the actual numbers and constraints come from the repo. Always read the code first (`guides/00` Rule #1).
- **No fabricated URLs or invented citations.** Where a claim needs a source, name the author/work above; if a specific value is needed, derive it from the repo and the loop math, not from a remembered statistic.
- **Balance is opinionated method + human-owned verdict.** The references justify *how* to compute a tuning; the human's play test (CLAUDE.md §7) is the final authority on whether it's fun.
