# 07 — Animation Events & the Feel Handoff

The seam between *your* lane (the animation) and `game-feel-juice-guardian`'s lane (how it feels). Grounded in Unity "Animation Events" + `CLAUDE.md` §7.

## The boundary, precisely

- **You own:** *when* in a clip something happens — the frame the melee swing connects, the frame a footstep lands, the frame a raider's gun fires. You place the **Animation Event** on the clip.
- **`game-feel-juice-guardian` owns:** what happens *as a result* and how it reads — the hitstop, the screenshake, the flash, the impact VFX, the audio punch. That's feel, and feel is **human-handled** (`CLAUDE.md` §7).

You provide a clean **event callback seam**; they (and the human) spend it. You never wire the screenshake yourself.

## How an Animation Event works

An Animation Event is a marker on a clip's timeline that calls a method (by name) on a `MonoBehaviour` on the animated GameObject at that frame. The canonical DRIFT events:

| Event (placed on the clip) | Calls | Owner of what happens next |
|---|---|---|
| melee swing connects | `OnAttackHitFrame()` | the attack's damage application (gameplay) + the *feel* (`game-feel-juice-guardian`) |
| footstep down | `OnFootstep()` | footstep SFX/VFX → `game-feel-juice-guardian` / `unity-audio-guardian` |
| raider fire | `OnFireFrame()` | the projectile/hit (gameplay/fsm-ai) + muzzle feel (`game-feel-juice-guardian`) |

Your deliverable is the **event placement** (which frame) and the **callback method names** on a thin component — not the bodies that do the juicing.

## Don't move gameplay timing into the clip silently

The melee in code (`PlayerMeleeAttack`) decides *whether* a hit lands and the enemy FSM (`MutatedCrewEnemy.TryAttack` `:199`) decides *whether* it attacks. The animation event aligns the **visual/feedback moment** to the animation — it should **drive feedback**, and may signal the gameplay moment, but the **authority** for damage stays in the gameplay/AI code (or is explicitly handed there). Don't quietly relocate the damage decision into an animation event in a way that breaks the EditMode-tested gameplay path (`RuntimeEnemyTests`, Hard Rule #11). If you want the event to *be* the damage trigger, that's a deliberate change to coordinate with `fsm-ai-guardian` and `unity-csharp-guardian`, with a test.

## EditMode caveat

Animation Events fire from the Animator at runtime — they are **not** EditMode-steppable the way `Step`/`Tick` are. So:

- Keep the **decision** (does it hit, how much) in the EditMode-tested code path.
- Keep the **event callback** a thin feedback trigger.
- Test the callback's *effect* (if it's a feedback component) via that component's deterministic `Step`, not via the Animator firing.

This keeps the tested spine green (Hard Rule #11, `ARCHITECTURE.md` §7).

## What you deliver

- The list of animation events (which clip, which frame intent, which callback name).
- A thin callback component shape that *signals* — never the feel bodies.
- The **handoff**: "Here are the event hooks at the right frames. The hitstop/shake/flash/VFX off these is game-feel-juice's lane, and the final feel is the human's (§7)."

## Cross-Guardian

- **Hitstop / screenshake / flash / impact VFX off the event** → `game-feel-juice-guardian` (the human owns final feel, §7).
- **Footstep/fire SFX** → `unity-audio-guardian` (and game-feel for the cue moment).
- **Whether the attack actually lands / FSM attack decision** → `fsm-ai-guardian` (+ `unity-csharp-guardian` for the gameplay code).
