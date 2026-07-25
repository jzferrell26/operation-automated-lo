# Pillar 10: Factory & Orchestration (router, commands, pipeline, model matrix)

## CRITICAL DIRECTIVES

Before acting in this domain you MUST load these skills via the Skill tool:

- `dungeon-master`: the routing skill itself; consult it first to decide which Guardian owns any incoming request before invoking anything else in the Guild.
- `command-center`: owns Phase 1 of the Guild AI Tools Factory pipeline: naming a new Guardian/Weapon pair and interviewing the user to fill in the Command Brief.
- `weapon-forge`: owns Phase 2: forging the Weapon (SKILL.md, guides, examples, templates, reports) from a completed brief and loremaster's research.
- `guardian-creator`: owns Phase 3: authoring the Guardian subagent file itself from the completed brief and forged Weapon.
- `dm-registrar`: owns Phase 4: registering the finished Guardian into Dungeon Master's roster table and authoring its routing guide.
- `dms-hand-weapon`: owns driving the full five-phase pipeline end to end for exactly one queued Guardian-forging cycle, including the move-before-work invariant and the four tracking-file contracts.
- `session-zero-weapon`: owns proposing a brand new Guardian into the backlog and queue, the producer-side mirror of `dms-hand-weapon`'s consumer side.
- `the-gauntlet-glove`: owns end-to-end PRD execution across sub-agent waves once Guardians already exist, driving acceptance criteria to zero open items through a commit-push-PR-CI pipeline.

---

## What this pillar collectively knows

This pillar is the Guild's self-referential layer: the machinery that builds the machinery. It has two halves that are easy to conflate but must stay separate. The **Guardian-forging pipeline** (`command-center` through `dm-registrar`, orchestrated per-cycle by `dms-hand-weapon` and fed by `session-zero-weapon`) is how a brand-new domain specialist comes into existence. The **execution orchestrators** (`dungeon-master` for routing, `the-gauntlet-glove` for driving existing PRDs to completion) are how already-forged Guardians get dispatched to do real work. Note that `loremaster`, the pipeline's Phase 1.5 research step referenced throughout this cohort's descriptions, exists in this package as an **agent** (`.claude/agents/loremaster.md`), not a Weapon folder under `.claude/skills/` — it has no `loremaster-weapon` to mandate here, so it is named in sequences below but not in the CRITICAL DIRECTIVES list, consistent with the rule against mandating skills that do not exist as forged Weapons.

### Disambiguation table

| Situation | Weapon that owns it | Not this one |
|---|---|---|
| Deciding which Guardian owns an incoming request | `dungeon-master` | `command-center` (creates new Guardians, doesn't route to existing ones) |
| Starting a brand-new Guardian/Weapon pair, the Command Brief interview | `command-center` | `session-zero-weapon` (backlog proposal, a lighter-weight upstream step) |
| Building the Weapon's SKILL.md, guides, examples, templates from research | `weapon-forge` | `guardian-creator` (writes the subagent file, not the Weapon) |
| Authoring the Guardian subagent file itself | `guardian-creator` | `weapon-forge` (the Weapon it wields, forged first) |
| Adding the finished Guardian's row to Dungeon Master's roster | `dm-registrar` | `dungeon-master` (the roster being written to, not the writer) |
| Driving one full queue entry through all five phases | `dms-hand-weapon` | `session-zero-weapon` (proposes into the queue, doesn't drain it) |
| Proposing a brand-new Guardian idea into the backlog/queue | `session-zero-weapon` | `command-center` (interviews and fills the brief once a proposal is picked up) |
| Executing a set of existing PRDs to 100% completion with sub-agent waves | `the-gauntlet-glove` | `dms-hand-weapon` (forges new Guardians, does not execute product PRDs) |

### Canonical multi-weapon sequences

1. **The canonical five-phase Guardian-forging pipeline:** `session-zero-weapon` proposes a new Guardian into `proposed-guardians-backlog.md` and `proposed-guardians-queue.md` → `dms-hand-weapon` picks the top FIFO row, moves it to in-process (move-before-work invariant), and dispatches in strict order: `command-center` (Phase 1, the brief) → `loremaster` (Phase 1.5, research into the Weapon's `research/` folder; an agent, not a Weapon in this corpus) → `weapon-forge` (Phase 2, forges the Weapon) → `guardian-creator` (Phase 3, authors the subagent) → `dm-registrar` (Phase 4, registers into `dungeon-master`'s roster) → `dms-hand-weapon` closes out by moving the row to completed and flipping the backlog checkbox.
2. **Routing an ordinary request:** `dungeon-master` matches the request to a roster row using trigger keywords and the guide's "do NOT route when" section → the matched Guardian is invoked by its `name:` frontmatter value → if a multi-Guardian sequence applies (see each domain pillar's own sequences), `dungeon-master`'s orchestration section documents the known chain.
3. **Executing a PRD set once Guardians exist:** `the-gauntlet-glove` drives sub-agent waves against a PRD's acceptance criteria, invoking whichever domain Guardians the PRD requires, then runs the Pillar 3 security-then-quality loop before the commit-push-PR-CI pipeline.

### Load-bearing hard rules and gotchas

- **`weapon-forge` refuses to run on a missing or empty `research/` folder.** It does not conduct its own research from training data as a fallback; that would corrupt the audit trail. If `loremaster` has not populated `research/`, redirect there first.
- **`weapon-forge` never modifies `research/`.** That folder is owned by `loremaster`; treat it as read-only even when the research seems incomplete. Re-invoke `loremaster` rather than patching the folder directly.
- **The move-before-work invariant**: `dms-hand-weapon` deletes a queue row and appends it to the in-process file BEFORE invoking any phase, not after. This prevents a crash mid-pipeline from leaving a row simultaneously "queued" and "being worked."
- **Strict FIFO, top of queue only**: `dms-hand-weapon` never cherry-picks a later row out of order.
- **A Guardian is not deployable until `dm-registrar` finishes.** An unregistered Guardian cannot be discovered by `dungeon-master`'s routing, even if `guardian-creator` already wrote its subagent file.
- **`session-zero-weapon` and `dms-hand-weapon` are explicit mirrors on opposite sides of the same queue files** — never let both write in the same direction; one produces, one consumes.
- **If no roster Guardian matches a request, `dungeon-master` does not improvise one.** It either handles the request inline or asks whether to start the forging pipeline via `session-zero-weapon`; inventing an ad hoc Guardian identity is explicitly out of bounds.

---

## Cross-references to sibling pillars

- Every domain pillar (1 through 9) is what the forged Guardians actually specialize in; this pillar only governs how they come to exist and how requests are routed to them.
- The security-then-quality close-out that `the-gauntlet-glove` runs before its commit-push-PR-CI pipeline is **Pillar 3: Security, Quality & Code Review**.
- ADR authorship for architecture decisions made during a Guardian-forging cycle (rare, but possible for a genuinely novel Weapon) would route to **Pillar 7: Product Process & Documentation** (`adr-writing-weapon`).
