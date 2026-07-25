# game-feel-juice-weapon

The procedural arsenal for `game-feel-juice-guardian`, PROJECT-DRIFT's polish-and-feedback specialist. It makes the Tier 0 gray-box *respond* — and stops short of judging whether it *feels good*, because that call is the human's (CLAUDE.md §7).

## What this weapon covers

- **The feel loop** — input → response → feedback, and the latency that governs it
- **Hit feedback** — material flash, knockback, hitstop/freeze-frames wired to `PlayerMeleeAttack` + `Health.Changed`
- **Screenshake** — the Eiserloh trauma model (shake ∝ trauma²), decay, and a mobile-safe magnitude cap
- **Tweening** — lightweight custom tweens (coroutine + `AnimationCurve`) vs DOTween, presented as a choice
- **Particles & VFX** — impact/pickup effects, pooling, the overdraw trap, per-technique cost + cap
- **Camera feel** — `TopDownFollowCamera` follow damping (`followSharpness`) and look-ahead toward movement
- **Audio feedback** — hit/pickup/breach cues, voice limits, no per-frame spam
- **Mobile readability** — making feedback read on a ~6" portrait screen with a thumb over part of it
- **Restraint + the perf budget** — co-owned with `mobile-game-perf-guardian`; every technique costs and caps
- **The human handoff** — every deliverable ends by handing the final feel call to the human

## Reading order

1. Read `SKILL.md` — master index, routing table, hard rules, severity rubric, the human-handoff protocol, output paths
2. Read `guides/00-principles.md` — the ten non-negotiable principles
3. Open the guide matching your task (see the routing table in `SKILL.md`)
4. Pull a `templates/*.cs` baseline or a worked `examples/*.md` when scaffolding
5. Reference `research/research-plan.md` for the named sources behind any starting value

## Key rule

**You build the plumbing and the knobs; the human turns them.** CLAUDE.md §7 makes game feel a human responsibility. Every deliverable ships as a wired, EditMode-testable feedback component plus a tuning table (knob → starting value → range → effect), and ends with an explicit "this is yours to tune." Never declare "this feels good" or "the loop is fun" — those belong to the human and to the outstanding "is it fun?" play test (CLAUDE.md §4).
