# 05 — Combat and Enemy Difficulty

> This guide owns the **difficulty NUMBERS**. The enemy idle→chase→attack→return *behavior* — the FSM transition logic in `MutatedCrewEnemy.Step` — belongs to `fsm-ai-guardian`. Set the numbers; hand the behavior off.

## The Tier 0 enemy: numbers you own

`MutatedCrewEnemy` (`Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs`) exposes these `[SerializeField]` difficulty values:

```csharp
[SerializeField] float detectRadius = 10f;    // line 20 — when Idle→Chase
[SerializeField] float leashRadius = 16f;     // line 21 — when Chase/Attack→Return
[SerializeField] float moveSpeed = 3.5f;      // line 22 — chase/return speed
[SerializeField] float attackRange = 1.4f;    // line 23 — Chase→Attack
[SerializeField] float attackDamage = 12f;    // line 24 — per hit to player Health
[SerializeField] float attackCooldown = 1.2f; // line 25 — seconds between hits
```

The player's `Health` defaults to 100. The enemy attacks via `TryAttack` (`MutatedCrewEnemy.cs:199-218`): on cooldown-ready, it deals `attackDamage` to player `Health`.

## The threat budget

### Damage-per-second the enemy applies

```
enemy_dps = attackDamage / attackCooldown = 12 / 1.2 = 10 dps
```

At 10 dps against 100 player HP, a player standing in melee range and doing nothing dies in **10 seconds**. That's the *worst case* — and it's deliberately survivable-with-attention, not instant. Good gray-box default: the enemy is a threat you must respect but not an instant-kill.

### Time-to-kill (player → enemy)

The player's melee (`PlayerMeleeAttack`, `Health`) needs to drop the enemy faster than the enemy drops the player, or combat is a loss. Compute both sides:

```
player_ttk = enemy_maxHealth / (player_hitDamage / player_swingInterval)
enemy_ttk  = player_maxHealth / enemy_dps  (= 100 / 10 = 10s, worst case)
```

Read the actual player melee damage and swing rate from `PlayerMeleeAttack` and tune so `player_ttk < enemy_ttk` with a margin — the player should win a focused fight but feel pressure. (The Tier 0 objective only requires *taking one hit*, not killing the enemy — `Tier0ObjectiveTracker.TookEnemyHit` — so the enemy is a tension prop more than a kill wall in Tier 0. Tune it as a *threat*, not a checkpoint.)

### The oxygen interaction

Combat costs *time*, and time costs *oxygen* (`guides/03`). A fight that drags eats the O2 budget. So enemy difficulty is implicitly capped by the survival timer: an enemy that takes 30s to deal with on a 100s O2 budget is too expensive. **When raising enemy difficulty, recheck the oxygen budget** — the two are coupled.

## The difficulty levers, in order

1. **`attackDamage` / `attackCooldown`** — set the threat DPS. This is "set enemy difficulty." Raise DPS for danger; keep player-survivable-with-attention.
2. **`detectRadius`** — how far the enemy notices you. Larger = more aggressive zone, fewer safe paths to extraction. This is a *pacing* lever as much as a difficulty one.
3. **`leashRadius`** — how far it chases before returning. Larger = harder to disengage; couples with `moveSpeed`.
4. **`moveSpeed`** — `3.5` is below a sprinting player but near walking pace. If `moveSpeed >= player sprint speed`, the player can never escape — usually a must-fix unless intentional (a "stalker" boss is Tier 1, GDD §8).

**Extract these to `Tier0Balance`** when a second spawn path or a test references them (`guides/01`). Note `Tier0RaiderAssault.SpawnRaider` reuses `MutatedCrewEnemy` for the raid (`Tier0RaiderAssault.cs:117-125`) — so raid difficulty and surface difficulty currently share these numbers. If you want the raid harder than the surface enemy, that's a reason to centralize and split the values.

## Tier 1 forward look (spec-only)

GDD §8 enemy archetypes — each needs its own difficulty number set (a ScriptableObject per archetype, `guides/01`):

- **Mutations** — melee swarm (the Tier 0 enemy is the seed).
- **Raiders** — ranged/tactical (introduces ammo + range as difficulty dimensions).
- **Drones** — hostile, distinct movement.
- **Heavy/boss** — slow stalker ("the Colonel"); high HP, high damage, low speed.
- **Fast fauna** — high speed, low HP.

Difficulty *scaling over time* (the raid grows tougher each cycle — GDD §8) becomes a curve, not a constant. Spec it; the Tier 0 job is one well-tuned threat.

## Boundary reminder

If the request is "the enemy chases through walls" or "it never disengages" or "the FSM ping-pongs between states," that's **behavior** → `fsm-ai-guardian`. If it's "the enemy hits too hard / notices me too early / is unkillable in the O2 budget," that's **difficulty numbers** → you.
