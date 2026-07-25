# 10 — The "Is It Fun?" Pass

> GDD §3: *"If this isn't fun, stop and rethink before building anything below."* CLAUDE.md §4 lists the "is it fun?" play test as the **outstanding** Tier 0 decision. This is the single most important balance moment in the project.

## What this pass is — and who makes the call

The fun pass is the structured play test of the assembled Tier 0 gray-box loop: **descend → salvage → craft 3 tools → fight → extract → survive a raid.** Its output is a *go/no-go on the core loop* — does it earn the right to build Tier 1?

**The human makes the call.** CLAUDE.md §7 puts playtesting and game feel squarely in the human's hands. This Weapon's job is to make that call *informed and structured*, not to make it. You supply the protocol, the telemetry (`guides/09`), the loop math, and the candidate tuning levers; the human plays it and decides. Never write "the loop is fun" — write "here is the protocol and the data; the call is yours."

## Prerequisite: it must be playable end-to-end

The fun pass needs the gray-box assembled and run in a real Unity editor. As of CLAUDE.md §4 the EditMode suite hasn't had a real-editor green-check and the gray-box hasn't been assembled — those gate the fun pass. Confirm with the human that the loop runs in Play mode (descend pad → surface → craft → cache → enemy hit → extract pad → breach → seal) before running this pass. If it doesn't run, the blocker is assembly/test (`unity-mcp-guardian` / `unity-test-ci-guardian`), not balance.

## The protocol

### 1. Define the target experience (from the GDD)

Before playing, write down what "fun" *should* feel like here, from GDD §1 and §3:

> *"A tight, punishing, repeatable loop. Gather → craft → build → fight → die a little → come back stronger."* The signature feeling is **oxygen-driven tension** on the surface (GDD §3) and the **reseal-or-vacuum crisis** at the raid (GDD §2).

That's the bar. The pass measures the gray-box against *this*, not against a generic "is it fun."

### 2. Play it 3–5 times, instrumented

Run the full loop several times with `guides/09` telemetry on. Capture per run: surface time, O2-at-extract %, resources left over, HP at extract, time-to-seal, and which beat (if any) felt slack or unfair.

### 3. Score the loop on the tension checklist

| Beat | The question | Healthy signal |
|---|---|---|
| Descend | Does leaving the station feel like a commitment? | A small "here we go" stakes-beat |
| Salvage | Is gathering satisfying, not a chore? ("same dopamine," GDD §3) | Each pickup feels earned; one resource feels scarce |
| Oxygen | Is the O2 clock *felt* the whole time? | Glances at the meter; a decision to leave | (`guides/03`) |
| Craft | Does the 3-tool gate feel like progress? | "Now I can open that cache" momentum | (`guides/08`) |
| Fight | Is the enemy a respected threat, not a speed bump or a wall? | Real attention cost; survivable with skill | (`guides/05`) |
| Extract | Is reaching the pad a relief? | A "made it" exhale, ideally O2-low | |
| Raid | Is the reseal a genuine crisis? | Scramble to seal before vacuum | (`guides/07`) |

A beat that's *slack* (no tension) or *unfair* (unwinnable) is a tuning target. A loop where every beat lands is a strong "fun" candidate — but the human confirms.

### 4. Diagnose slack/unfair beats with the levers

Each weak beat maps to a data lever you already own:

- Oxygen never bites → raise `drainPerSecond` (`guides/03`).
- Resources too plentiful → tighten the constraining yield (`guides/02`, `guides/04`).
- Enemy ignored or unkillable → tune `attackDamage`/`attackCooldown`/`moveSpeed` (`guides/05`).
- Raid trivial or impossible → tune breach severity / raider spawn (`guides/07`).
- Craft gate unrewarding → adjust the cost curve (`guides/08`).

Propose the change as a `Tier0Balance` diff with the loop math; hand the "does that fix the feel?" verdict back to the human for the next play test. Iterate.

### 5. Produce the fun-pass report

Output to `library/qa/game-balance/<date>-fun-pass.md`:

- The target experience (the GDD bar).
- Per-run telemetry summary (3–5 runs).
- The tension-checklist scores, beat by beat.
- Diagnosed slack/unfair beats + the candidate data levers for each.
- **Explicitly: the go/no-go call is the human's.** Surface the data; don't render the verdict.

## The honest part

GDD §1 is blunt: *"If the core loop isn't fun in a gray-box prototype with no art, no amount of crew management or clan warfare saves it."* The fun pass is allowed to conclude **"not yet"** — and that's a *good* outcome if true, because it stops Tier 1 from being built on a slack core. Your role is to make a "not yet" *diagnosable* (which beat, which lever) so the human can iterate the loop instead of guessing. Never paper over a slack loop with optimistic framing — that betrays Hard Rule #10 (flag, don't freelance) and the whole point of the gray-box.
