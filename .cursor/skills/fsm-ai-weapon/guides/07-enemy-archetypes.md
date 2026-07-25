# 07 — Enemy Archetypes (mutation vs raider)

DRIFT has two enemy families in its DNA, and the GDD draws them sharply: "mutations (melee swarm — your 'zombies'), raider survivors (ranged, tactical)" (GDD §13), plus later "hostile drones, heavy mutation/mech boss (slow stalker — your 'Colonel'), fast alien fauna" (GDD §13). This guide is how to express that variety **as deltas on the one FSM** (Principle #6), not as a zoo of bespoke controllers.

## 1. The archetype principle: parameters + small state deltas

Both shipped enemies are literally the same class. `Tier0RaiderAssault.SpawnRaider()` makes its raider a tinted `MutatedCrewEnemy` (`Tier0RaiderAssault.cs:117-125`). That is the model for *all* archetype variety:

> An archetype is the canonical FSM with (a) different serialized **parameters** and (b) at most one or two **added states**. Anything more is a fork — a should-refactor against you.

The parameters are `game-balance-guardian`'s; the *which-states-exist and how-they-transition* is yours.

## 2. The two Tier-0-and-near families

### Mutation — melee swarm (shipped)

- **FSM:** the canonical idle → chase → attack → return. No additions.
- **Perception:** pure distance aggro, no LOS (`guides/03`) — it just comes at you. Right for a swarm in open zones (GDD §8).
- **Steering:** direct (`guides/04`). Swarms must be cheap; this is why steering-over-pathfinding matters most for the mutation.
- **Attack:** melee in `attackRange` on cooldown (`MutatedCrewEnemy.TryAttack`).
- **Identity in code:** the default `MutatedCrewEnemy` parameter set.

### Raider — ranged, tactical (Tier 1 design)

The raider is the first archetype that *adds states*, and the design must stay testable. The deltas:

| Aspect | Mutation | Raider | Owner of the delta |
|---|---|---|---|
| Aggro | distance only | distance **+ line-of-sight** | behavior (you) — LOS seam, `guides/03` |
| Attack | melee, in-range | **ranged** — fire a projectile from a standoff distance | behavior (you) — Attack state variant |
| On losing sight | n/a (always sees) | **Search** state — go to last-known position, scan, then Return | behavior (you) — new state, `guides/01 §6` |
| Positioning | close to contact | **keep at preferred range** (kite if too close) | behavior (you) — a steering modifier |
| Standoff distance, fire rate, projectile damage | — | the numbers | `game-balance-guardian` |

So the raider = canonical FSM **+ Search state + LOS-gated aggro + a ranged Attack that maintains standoff**. Still one controller, still `Step`-testable, still leashed. The projectile itself (spawning, collision) is a small new piece — keep its spawn behind a factory seam (`guides/05 §5`) so it's testable and poolable.

## 3. The forward archetypes (Tier 1+ — design only)

Sketch them as deltas now so the FSM grows in one direction; build none ahead of the fun call (Principle #8).

- **Hostile drone** — ranged like the raider but no Search (it's expendable/simple); maybe a straight-line strafing steering modifier. Delta: raider minus Search.
- **Heavy mutation / "Colonel" boss (slow stalker)** — canonical FSM with very different parameters (slow, high HP — balance's) plus possibly a **telegraphed wind-up** sub-beat before Attack (an Alert/wind-up state; the *feel* of the telegraph is `game-feel-juice-guardian`'s, the *state* is yours). No pathfinding upgrade implied.
- **Fast alien fauna** — canonical FSM, fast parameters, perhaps a **lunge** Attack variant (a burst of steering on attack entry). Delta: a movement modifier on the Attack state.

Notice the pattern: every archetype is the same skeleton with parameter swaps and ≤2 added states. If a proposed archetype needs a fundamentally different control structure, that's the (rare) behavior-tree conversation — `guides/09`.

## 4. How to add an archetype (the procedure)

1. **Start from `MutatedCrewEnemy`.** Decide whether the difference is *only parameters* (then it's purely `game-balance-guardian`'s — you do nothing but confirm the FSM already supports it) or *parameters + states* (then it's yours).
2. **If it adds states**, design each per `guides/01 §6`: what enters it, what it does per `Step`, what exits it, how leash still applies.
3. **Keep one controller where the states are shared.** A Search or Stagger that both raider and a future archetype use should be a shared state object (consider promoting to the state-object pattern, `guides/02`) — not copy-pasted into two classes.
4. **Surface every new number** to `game-balance-guardian`: standoff distance, projectile speed, lunge distance, telegraph duration.
5. **Write the `Step`-driven test** for each new transition (`examples/03`, `guides/08`). An archetype isn't done until its added states are asserted via `Step`.
6. **Tint for legibility** in gray-box, as `Tier0RaiderAssault` does (`GrayBoxVisuals.Tint`) — visual identity is throwaway until the human/`game-feel-juice-guardian` does real art.

## 5. Archetype review checklist

- [ ] The archetype is the canonical FSM + parameters + ≤2 added states — not a parallel controller (Principle #6).
- [ ] Pure-parameter differences are handed entirely to `game-balance-guardian`; you only confirm the FSM supports them.
- [ ] Each added state is fully specified (enter/step/exit/leash) and `Step`-testable.
- [ ] Shared states (Search, Stagger) live in one place, not duplicated across archetypes.
- [ ] All new tunables (standoff, fire rate, telegraph, lunge distance) surfaced to balance.
- [ ] Tier-flagged: raider and beyond are Tier 1+ design unless explicitly building Tier 1.
