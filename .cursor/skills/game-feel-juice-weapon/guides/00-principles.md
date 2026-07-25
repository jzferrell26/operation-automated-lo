# 00 — Principles

The non-negotiables. Read on every invocation.

## The ten principles

### 1. Feel is the human's; plumbing is yours

CLAUDE.md §7 is explicit: *game feel is human-handled.* You scaffold the feedback systems, expose the tunable knobs, and recommend starting values. You do **not** make the final feel call or the "is it fun?" call (CLAUDE.md §4). This is the most important rule in the Weapon — it shapes every deliverable. When you finish, you hand the call to the human; you never render the verdict yourself. Source: CLAUDE.md §7, Hard Rule #4; `guides/10-human-handoff.md`.

### 2. Every technique ships with a knob, a starting value, and a cited range

The human tunes feel by turning knobs in the Inspector, not by editing your code. A juice constant baked into a method body is a **must-fix** finding. A `[SerializeField] float traumaPerHit = 0.4f;` with a documented sane range (`0.2–0.6`) and a note on what it changes is the deliverable. Source: this guide; every `templates/*.cs`.

### 3. The feel loop owns latency

Input → response → feedback. The **response** is the thing the player directly controls (the character moving, the swing firing). **Feedback** is everything layered on top to make the response read (flash, shake, particles, sound). Any technique that delays the response to add feedback is a **regression**, not polish. Feedback rides on top of an already-responsive response. Source: Swink, *Game Feel*; `guides/01-the-feel-loop.md`.

### 4. Hitstop freezes the world, never input sampling

A hitstop / freeze-frame on a hit is a few frames of frozen or slowed time that sells impact. It must **not** eat the player's next input. Sample input every frame; freeze the *world* (animation, movement, simulation), not the *controls*. A dropped input during a freeze reads as the game ignoring the player. Source: `guides/02-hit-feedback-and-hitstop.md`.

### 5. Screenshake is trauma-based and capped

Use a `trauma` value in `[0,1]` that decays over time, with shake magnitude ∝ `trauma²` (Squirrel Eiserloh's model), and a hard magnitude cap. On a phone held ~30cm from the face, desktop-tuned shake is nausea. Linear/manual shake stacks into unreadable chaos; trauma² decay self-limits and a cap keeps it mobile-safe. Source: Eiserloh, "Juicing Your Cameras With Math" (trauma model); `guides/03-screenshake.md`.

### 6. Mobile readability gates every feedback choice

The target is mobile portrait (CLAUDE.md §1). Feedback must read on a ~6" portrait screen, with a thumb occluding part of it, possibly in sunlight, at small scale. A flash or shake calibrated on a 27" monitor is mistuned by default — too subtle to read or too violent to tolerate. Readability is a gate, not an afterthought. Source: `guides/08-mobile-readability.md`.

### 7. Restraint is the discipline; the perf budget is co-owned

More juice is not better juice — past a point it is noise and dropped frames. Every technique carries a frame-budget cost and a cap, **co-owned** with `mobile-game-perf-guardian`. You propose the cost and the cap; perf-guardian ratifies the hard numbers (particle ceilings, overdraw, draw calls). Juice that drops frames is a net feel *loss*. Source: `guides/09-restraint-and-perf-budget.md`.

### 8. Tweening: present the choice; no drive-by dependency

Lightweight custom tweens (a coroutine + `AnimationCurve`) are zero-dependency and trivially EditMode-testable. DOTween is feature-rich and battle-tested but is a package decision with build-size and (mis)configured-GC cost. **Present the trade-off and let the human decide.** Do **not** add a line to `Packages/manifest.json` as a side effect of a juice task. Source: `guides/04-tweening.md`.

### 9. Stay inside Tier 0

Juice the existing gray-box: melee hits, salvage pickup, the hull breach, extraction, the camera. Do **not** build feedback for Tier 1 systems that don't exist yet (the real UGUI HUD, NavMesh enemies, the full station builder). Juicing vapor-systems is building ahead — Hard Rule #1. Source: CLAUDE.md Hard Rule #1, `TIER0.md`.

### 10. Audio is feedback, treated like VFX

Hit/pickup/breach audio cues are part of the feel loop and half of perceived impact. They get the same treatment as particles: a knob, restraint, voice limits, pitch variation to avoid machine-gun sameness, and **no per-frame `PlayOneShot` spam**. Source: `guides/07-audio-feedback.md`.

---

## First-move checklist

Before producing anything, confirm:

- [ ] The boundary stated: feel is the human's (CLAUDE.md §7); you scaffold + recommend.
- [ ] Tier confirmed: Tier 0, juice the existing gray-box only (Hard Rule #1).
- [ ] The real feel surface read: `PlayerMeleeAttack.cs`, `Health.cs`, `TopDownFollowCamera.cs`, `GrayBoxVisuals.cs`, `Tier0Hud.cs`.
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] Severity rubric in mind (must-fix / should-tune / style).
- [ ] EditMode-test contract in mind (CLAUDE.md §11): deterministic `Step(dt)` for any frame-driven feedback.

## The EditMode-test contract (CLAUDE.md §11, ARCHITECTURE.md §7)

Unity does not run `Awake`/`Start`/`Update` on script-added components in EditMode. Feedback code that lives in `Update`/coroutines (hitstop countdown, shake decay, tween progress, flash restore) must follow the spine's three patterns so it stays testable:

1. **Lazy init** — guard state behind an `EnsureInitialized()` flag called from `Awake` *and* every public entry point.
2. **Explicit `Configure(...)`** — inject the camera/renderer/target rather than resolving only in `Awake`.
3. **Extracted `Step(dt)`** — pull the per-frame decay/countdown out of `Update` into a public method taking `deltaSeconds`; `Update` just forwards `Time.deltaTime`. This also keeps `Time.timeScale`-based hitstop from fighting the test harness.

A feedback component you can't call `Step(0.1f)` on in a test is a **must-fix**.

## Severity rubric

| Severity | Examples | Blocks merge? |
|---|---|---|
| **Must-fix** | Technique adds latency to the *response* (anti-juice); hitstop eats input; uncapped/linear screenshake; baked magic number with no knob; package added to `manifest.json` as a side effect; frame-driven feedback with no deterministic `Step`; a technique with no perf cost/cap noted | Yes |
| **Should-tune** | Starting value reads wrong on mobile portrait; a feedback event has VFX but no audio (or vice versa); a tween that should ease but is linear; camera framing clips the player | No — opens a follow-up, and the human finalizes the value |
| **Style / preference** | Curve shape, color choice, particle count within budget | Never — surface as a knob and hand to the human |

Calling a *tuning preference* "must-fix" oversteps the human's feel authority (CLAUDE.md §7) and burns your credibility for the next finding. The line: **a broken or mistuned mechanism is must-fix; a debatable value is the human's to set.**

## Citation discipline

Every starting value has a basis:

1. **A named reference** in `research/research-plan.md` (e.g., the Vlambeer screenshake talk, the Eiserloh trauma model), or
2. **An explicit flag** — "first-pass guess, tune on device."

No basis means you're guessing silently — say so instead.

## The human-handoff protocol

Every deliverable ends with: the plumbing → a tuning table (knob, starting value, range, effect) → the cited basis → the sign-off. The sign-off says, in substance: *"This is yours to tune. I have not judged whether it feels good — that's your call (CLAUDE.md §7), alongside the outstanding 'is it fun?' play test (§4)."* Full format in `guides/10-human-handoff.md`.

## Cross-Guardian boundaries (short version)

The full table lives in `SKILL.md`. Surface concerns at the boundary; don't author work another Guardian owns.

| Question | Owner |
|---|---|
| Raw touch input capture | `touch-input-guardian` |
| Hard perf calls (particle ceilings, overdraw, draw calls, GC) | `mobile-game-perf-guardian` (co-owned) |
| C# component shape | `unity-csharp-guardian` |
| Balance numbers / pacing / "is it fun?" pacing | `game-balance-guardian` |
| EditMode harness / CI | `unity-test-ci-guardian` |
| Enemy FSM behavior | `fsm-ai-guardian` |
| MCP scene assembly | `unity-mcp-guardian` |
| **The final feel call / "is it fun?"** | **the human** (CLAUDE.md §4, §7) |

When in doubt, hand it over.
