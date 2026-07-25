# 06 — Enemy Character Setup (Archetypes)

Rigging and animating DRIFT's enemies — **mutation** (melee swarm) and **raider** (ranged/tactical) — as deltas off the one humanoid base. Grounded in GDD §8/§13 and the real `MutatedCrewEnemy`.

## Reuse the one base (Principle #3)

Both archetypes are bipedal humanoids. They share the **one Humanoid avatar + one Animator controller** from `guides/01`/`guides/02`. An archetype is:

- a **mesh** (mutated body vs raider body) — swappable via `guides/04`'s skinned-mesh sharing,
- a **material/skin** (mutation discoloration vs raider gear),
- **attachments** (raider gun via `Socket_HandR`; mutation claws baked into the mesh),
- a few **Animator parameters/states** (e.g. a ranged-aim pose for the raider),
- possibly an **avatar mask** difference (raider upper-body aim layer).

A **parallel enemy rig/Animator is a must-fix.** The retargeting from `guides/01` is exactly what makes one set of clips animate both archetypes even with different proportions.

## Consume `EnemyState`, don't drive it (lane boundary)

The enemy's **behavior** is `fsm-ai-guardian`'s. Your animator driver **reads** the existing FSM and maps it to animation — it never decides transitions:

| `EnemyState` (`MutatedCrewEnemy.cs:6`) | Animation |
|---|---|
| `Idle` | idle loop |
| `Chase` | run (the FSM moves it via `MoveTowards` `:178`; animation is in-place, root-motion off) |
| `Attack` | attack clip + the attack **animation event** (`guides/07`) |
| `Return` | walk/run back (FSM-driven) |

Wire it: a thin EditMode-safe driver (`Configure(enemy, animator)`, `Tick(dt)`) reads `enemy.State` (the public getter at `:34`) each step and sets the Animator. Because `MutatedCrewEnemy.Step` is the deterministic tick (`:100`), the driver can be stepped in lockstep and tested (Hard Rule #11) — same pattern as `RuntimeEnemyTests`.

> You do **not** read or set `detectRadius`, `attackDamage`, `attackCooldown`, etc. — those are `game-balance-guardian`'s numbers. You only map the *state* to a *clip*.

## Archetype deltas (GDD §8/§13)

| Archetype | Mesh/material | Attachments | Animator delta | Behavior owner |
|---|---|---|---|---|
| **Mutation** (melee swarm) | mutated body, discolored skin | claws in-mesh | base locomotion + melee attack clip | `fsm-ai-guardian` |
| **Raider** (ranged/tactical) | survivor body, gear material | gun on `Socket_HandR`, maybe backpack | upper-body **aim** layer (masked) + ranged "fire" clip/event | `fsm-ai-guardian` |

GDD §8 also names hostile drones (non-humanoid — **Generic** rig or a non-skinned model, Tier-later flag), a heavy mutation/mech boss (slow stalker), and fast alien fauna. These are **forward design**: note them, design the humanoid archetypes now, flag the non-humanoids as their own future rigs — don't fork the pipeline pre-emptively (Principle #7).

## The raider reuses the breach loop (don't re-rig the raid)

GDD §8/§13 and `fsm-ai-guardian` establish the raider assault **reuses** `MutatedCrewEnemy` + `Tier0RaiderAssault`/`HullBreachEvent`. So the raider character is the same base + a gear delta; the *assault behavior* is the FSM Guardian's. You supply the raider's look and its aim/fire animation; they supply when it fires.

## EditMode-safe (Principle #9)

The enemy animator driver: lazy-init, `Configure(enemy, animator)`, extracted `Tick(dt)` that reads `enemy.State` and writes Animator params — no logic-only-in-`Update`. Mirrors `ARCHITECTURE.md` §7 and `RuntimeEnemyTests`.

## What you deliver

- The archetype delta table (mesh/material/attachment/Animator), all off one base.
- The `EnemyState → clip` map + the EditMode-safe driver shape.
- A flag for any non-humanoid (drone/boss/fauna) as a separate Tier-later rig.
- The **handoff**: "Behavior is fsm-ai's; numbers are game-balance's; I supply the look and the state→clip map."

## Cross-Guardian

- **Enemy transitions / perception / *when* it attacks** → `fsm-ai-guardian`.
- **Difficulty numbers** (`detectRadius`, `attackDamage`, cadence) → `game-balance-guardian`.
- **Hit feel / telegraph** → `game-feel-juice-guardian` via the animation event (`guides/07`).
