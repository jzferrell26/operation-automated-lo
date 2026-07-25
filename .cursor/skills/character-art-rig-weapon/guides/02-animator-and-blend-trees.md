# 02 — Animator Controller & Blend Trees

The Animator controller layout and the blend trees that turn movement into animation — mapped onto the **existing** `TopDownPlayerController` seam (Principle #5). Grounded in Unity "Animator Controller", "Blend Trees", "Animation parameters" (named).

## Map onto the real code (Principle #5)

The player already exposes everything the Animator needs. Do **not** invent a new control path — surface these:

| Animator parameter | Type | Source in code | Note |
|---|---|---|---|
| `Speed` | float | `TopDownPlayerController.CurrentMoveSpeed` (`:18`) or the move vector magnitude from `ResolveMove` (`:88`) | Drives idle↔walk↔run 1D blend |
| `MoveX`, `MoveY` | float | the `input` passed to `ResolveMove` (`:88`), or the world-space move delta | Drives the 2D directional blend (`guides/03`) |
| `IsSprinting` | bool | `TopDownPlayerController.IsSprinting` (`:17`) | Biases the blend toward the run pole / a sprint clip |
| `IsAttacking` | trigger/bool | `PlayerMeleeAttack` (the melee entry point) | Fires the upper-body attack layer |

For the enemy, the seam is `MutatedCrewEnemy.EnemyState` (`:6`) and `Step` (`:100`) — see `guides/06`.

A thin `MonoBehaviour` (e.g. `CharacterAnimatorDriver`) reads these and calls `Animator.SetFloat/SetBool/SetTrigger`. Keep it EditMode-safe (`ARCHITECTURE.md` §7): lazy-init, `Configure(controller, animator)`, and an extracted `Tick(dt)` that does the parameter writes so it's testable (Hard Rule #11). The template `templates/animator-controller-spec.md` lays out the full controller.

## Controller layer layout

- **Base Layer** — the locomotion state, which is a single **blend tree** state (not a web of idle/walk/run states with transitions). The blend tree handles the speed/direction continuum; transitions become a tuning curve, not a state graph.
- **Upper-Body Layer** (masked, `guides/01`) — attack/aim, weight 0→1 on `IsAttacking`, masked to spine+arms.
- **(Optional) Additive Layer** — flinch/hit-react, Tier-later; flag, don't build.

## Blend trees: 1D vs 2D

- **1D blend tree** — one parameter (`Speed`): idle → walk → run. Simplest; fine if the character always faces its move direction and you don't need strafing.
- **2D blend tree** — two parameters (`MoveX`, `MoveY`): supports strafing/aim-relative movement (face one way, move another) — the twin-stick-lite model (GDD §8). Unity offers **2D Simple Directional**, **2D Freeform Directional** (recommended for an 8-way locomotion set), and **2D Freeform Cartesian**. See `guides/03` for the top-down specifics.

Default recommendation: **2D Freeform Directional** for the base locomotion, since DRIFT's top-down twin-stick-lite wants strafing. If the human decides the character always faces its move direction, a 1D tree is enough — that's a facing-model decision (`guides/03`, open question Q2).

## Transition knobs (hand to human)

Every transition/blend ships with knobs and starting values — never baked magic numbers:

| Knob | Starting value | Range | What it changes |
|---|---|---|---|
| idle→walk Speed threshold | 0.1 | 0.05–0.3 | When the legs start moving |
| walk→run Speed threshold | ~base moveSpeed (6) | 5–7 | When it breaks into a run |
| sprint pole | `moveSpeed * 1.45` (`:11`) | — | Matches `sprintMultiplier` in code |
| blend smoothing (`SetFloat` dampTime) | 0.1s | 0.05–0.2 | How snappy direction changes read |
| attack layer blend-in | 0.1s | 0.05–0.25 | How fast the attack layer takes over |

These mirror the real serialized values in `TopDownPlayerController` (`moveSpeed = 6`, `sprintMultiplier = 1.45`) — read them from code, don't invent.

## Mecanim vs Playables (open question Q3 — default Mecanim)

Default to **Mecanim** (Animator + blend trees + masks). It's the standard, lowest-friction path for a small team and covers everything DRIFT needs through Tier 1. The **Playables API / `AnimationStream`** is a Tier-later escalation for fully procedural animation (e.g. procedural aim-IK beyond what a masked layer gives); flag it and write an ADR if it's ever genuinely needed — don't build it speculatively.

## What you deliver

- The Animator layer + parameter spec (mapped to the real seam).
- The blend-tree choice (1D vs 2D, with the facing-model caveat) + the knob table.
- The thin EditMode-safe driver shape.
- The **handoff**: "Author the controller in-editor; tune the thresholds against feel — that's yours (§7)."

## Cross-Guardian

- **When the attack actually fires / hit timing feel** → `game-feel-juice-guardian` via the animation event (`guides/07`).
- **Animator update mode / culling cost** → `mobile-game-perf-guardian` (`guides/08`).
- **The number a threshold *means* for balance** → `game-balance-guardian` (you own the curve shape; they own the gameplay number if one exists).
