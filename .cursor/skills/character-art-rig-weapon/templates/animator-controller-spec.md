# Template — Animator Controller Spec

A fill-in spec for the DRIFT humanoid Animator controller. The **human authors the `.controller` in-editor**; this spec is the design they implement (`CLAUDE.md` §7). Map every parameter onto the real code seam (`guides/02`, Principle #5). Keep the driver EditMode-safe (`ARCHITECTURE.md` §7).

---

## Character: `<protagonist | mutation | raider>`

Reuses the **one Humanoid avatar** (`guides/01`). Archetypes are deltas, not new controllers (Principle #3).

## Parameters (mapped to code — fill the source column)

| Parameter | Type | Source in code | Notes |
|---|---|---|---|
| `Speed` | float | `TopDownPlayerController.CurrentMoveSpeed` (`:18`) / enemy: derived from `EnemyState` | normalize 0..1 |
| `MoveX` | float | `ResolveMove` input.x (`:88`) | only if 2D blend |
| `MoveY` | float | `ResolveMove` input.y (`:88`) | only if 2D blend |
| `IsSprinting` | bool | `TopDownPlayerController.IsSprinting` (`:17`) | |
| `Moving` | bool | enemy: `State == Chase \|\| Return` (`:34`) | enemy driver |
| `Attacking` | bool/trigger | player: `PlayerMeleeAttack`; enemy: `State == Attack` | fires upper-body layer |
| `<add yours>` | | | |

## Layers

| Layer | Mask (`guides/01`) | Blend | Drives |
|---|---|---|---|
| Base | none (full body) | Locomotion blend tree | idle/walk/run/strafe |
| Upper-Body | upper-body mask | override, weight on `Attacking` | attack/aim |
| (Additive) | — | Tier-later (flinch/hit-react) | **flag, don't build** |

## Locomotion blend tree

- Type: `<1D Speed | 2D Freeform Directional>` (facing model = Q2, human's call — `guides/03`)
- Motions: Idle, RunForward/Back/Left/Right (+ diagonals if 2D)
- `applyRootMotion = false` (Principle #6 — movement is code-driven via `CharacterController.Move`)

## Transition / blend knob table (recommended starting values)

| Knob | Start | Range | Effect |
|---|---|---|---|
| idle→walk `Speed` | 0.1 | 0.05–0.3 | when legs start |
| walk→run `Speed` | ~6 | 5–7 | matches `moveSpeed` |
| `SetFloat` dampTime | 0.1s | 0.05–0.2 | blend smoothness |
| attack layer blend-in | 0.1s | 0.05–0.25 | upper-body takeover |
| facing turn rate | 720°/s | 360–1080 | spin to new dir (`guides/03`) |

## Animation events (`guides/07`)

| Clip | Event method | Frame intent | Feel owner |
|---|---|---|---|
| melee | `OnAttackHitFrame()` | connect | `game-feel-juice-guardian` |
| run | `OnFootstep()` | foot down | `unity-audio` / game-feel |
| fire (raider) | `OnFireFrame()` | muzzle | game-feel / fsm-ai |

## Mobile budget (`guides/08` — co-own w/ mobile-game-perf-guardian)

- Skin weights: `SkinQuality.Bone2`
- `cullingMode`: `CullCompletely` (enemies)
- `updateMode`: Normal

## Handoff

"Author this controller in-editor and tune the knobs; the facing model and the feel are yours (`CLAUDE.md` §7, §4). I have not judged the look."
