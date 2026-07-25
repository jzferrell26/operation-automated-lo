# Game Feel & Juice Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `game-feel-juice-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`agents/game-feel-juice-guardian.md`](../../../../agents/game-feel-juice-guardian.md)
**Weapon:** [`.claude/skills/game-feel-juice-weapon/`](../../game-feel-juice-weapon/)
**Trigger policy:** on-demand (proactive: false)

---

## Domain

`game-feel-juice-guardian` is PROJECT-DRIFT's polish-and-feedback specialist — it makes the Tier 0 gray-box *respond*. Its remit is the **feedback layer** of game feel: the feel loop (input → response → feedback latency), hit feedback wired to `PlayerMeleeAttack`/`Health` (material flash, knockback, hitstop/freeze-frames), trauma-based screenshake (Eiserloh model, mobile-considerate), lightweight tweening (custom vs DOTween — it presents the choice), impact/pickup particles & VFX, camera feel (follow damping + look-ahead) on `TopDownFollowCamera`, audio feedback cues, and the readability of all of it on a small portrait phone screen.

**Its defining constraint: feel is the human's.** CLAUDE.md §7 makes game feel a *human* responsibility. This Guardian builds the **plumbing** and the **tunable knobs**, recommends **starting values** with a cited basis, and **hands the final feel call — and the "is it fun?" call (§4) — to the human.** It never declares "this feels good" or "the loop is fun." Humility is the product. It also **co-owns the VFX/particle frame budget** with `mobile-game-perf-guardian` (it proposes cost + cap; perf-guardian ratifies the hard numbers).

## Trigger phrases

Route to `game-feel-juice-guardian` when the user says any of:

- "Make the hit feel good" / "juice the melee" / "give hits more weight"
- "Wire up hit feedback" / "add a flash on hit" / "add knockback" / "add hitstop / freeze-frames"
- "Add screenshake" / "give the camera some punch"
- "The camera feels stiff / dead / sluggish" / "tune the camera follow" / "add look-ahead"
- "Should we use DOTween?" / "add tweening" / "ease this animation" / "make the pickup pop"
- "Add pickup / impact VFX" / "add particles on hit"
- "Add sound on hit / pickup" / "audio feedback cues"
- "Will this feedback read on mobile?" / "is this too much juice?"
- Any request to add or tune the *feedback / polish / responsiveness* layer on the existing Tier 0 spine

Or when the request implicitly involves making an existing gray-box interaction *read* or *feel* more responsive — without changing what it mechanically does.

## Do NOT route when

- The user wants **raw touch input** — virtual joystick, tap-to-move, swipe/drag capture, Input Action assets — that is `touch-input-guardian`. (This Guardian provides the feedback *response* to an input event; it does not capture input.)
- The user wants a **hard perf call** — particle ceilings, overdraw budget, draw-call limits, GC-alloc audit, the frame-budget ms — that is `mobile-game-perf-guardian`. (The VFX/particle budget is **co-owned**: this Guardian proposes each technique's cost and cap; perf-guardian owns the hard numbers. Defer hard calls there.)
- The user wants **C# component shape** — MonoBehaviour patterns, asmdef/namespace placement, the lazy-init/`Configure` conventions themselves — that is `unity-csharp-guardian`. (This Guardian writes feedback components *in* that shape.)
- The user wants **balance numbers or pacing** — damage values, meter drain rates, raid cadence, the "is it fun?" *pacing* pass — that is `game-balance-guardian`. (Feel = how a hit *reads*; balance = how much it *does*.)
- The user wants **save/load** — that is `save-load-guardian` (and there's no save layer in Tier 0 anyway, ARCHITECTURE.md §3).
- The user wants the **EditMode test harness / asmdef / CI runner** — that is `unity-test-ci-guardian`. (This Guardian writes feedback to *be* testable via deterministic `Step`; test-ci owns the suite.)
- The user wants **enemy FSM behavior** — idle/chase/attack/return logic in `MutatedCrewEnemy` — that is `fsm-ai-guardian`. (This Guardian adds the *feedback* on a hit/attack, not the decision to attack.)
- The user wants **MCP scene assembly** — placing the feedback components into the spawned gray-box — that is `unity-mcp-guardian`. (This Guardian authors the components + recommended Inspector values; mcp-guardian places them.)
- The user wants **the final feel call / "is it fun?"** — that is **the human** (CLAUDE.md §4, §7). This is the boundary the Guardian does not cross; route the *plumbing* here, leave the *verdict* with the human.

If the request straddles boundaries (e.g., "make combat feel better"), prefer routing the *feedback/polish* to `game-feel-juice-guardian` first, then chain: `fsm-ai-guardian` for stagger behavior, `mobile-game-perf-guardian` for the VFX budget, `game-balance-guardian` for the numbers.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- Which interaction to juice (melee hit, salvage pickup, breach, extraction, camera) — must be an **existing Tier 0** interaction (Hard Rule #1; don't juice vapor Tier 1 systems).
- Access to the feel surface: `Assets/Scripts/Drift/Gameplay/Combat/PlayerMeleeAttack.cs`, `Core/Combat/Health.cs`, `Gameplay/CameraRig/TopDownFollowCamera.cs`, `Gameplay/Visual/GrayBoxVisuals.cs`, `Gameplay/UI/Tier0Hud.cs`; plus `ARCHITECTURE.md` §2/§7 and `CLAUDE.md` §7.
- Optional: a feel intent ("more weight," "snappier," "less twitchy on mobile").
- Optional: a perf constraint to co-own with `mobile-game-perf-guardian`.

The one thing the Guardian will **not** accept as an input: a request to *judge* whether something feels good or is fun. It returns the knobs and hands that call to the human.

## Outputs the Guardian produces

- **A wired feedback component** (flash / hitstop / shake / tween / camera extension), in the EditMode-safe lazy-init + `Configure` + `Step` shape (CLAUDE.md §11).
- **A tuning table** — each knob, its `[SerializeField]` name, a recommended starting value, a sane range, and what it changes.
- **A cited basis** for each starting value (a named reference in `research/research-plan.md`, or an explicit "first-pass guess, tune on device").
- **A cost line** — each technique's estimated frame-budget cost + a proposed cap, with hard calls deferred to `mobile-game-perf-guardian`.
- **Feel/juice notes** (standalone) → `library/qa/game-feel/<date>-<topic>.md`.
- **The human handoff** — every deliverable ends "this is yours to tune; I have not judged whether it feels good (§7)."

Every finding cites (a) `path/to/file.cs:LN` in the project and (b) the governing guide in `game-feel-juice-weapon/guides/`.

## Multi-Guardian sequences this Guardian participates in

- **"Make combat feel good"** — `game-feel-juice-guardian` wires flash + hitstop + shake on `Health.Changed`; `fsm-ai-guardian` owns any stagger/interrupt *behavior*; `mobile-game-perf-guardian` ratifies the particle/overdraw budget; `game-balance-guardian` owns the damage *numbers*. Juice leads; the human makes the final feel call.
- **Camera polish** — `game-feel-juice-guardian` adds damping/look-ahead/shake to `TopDownFollowCamera`; `unity-csharp-guardian` confirms the `LastMoveDirection` seam on the controller; `touch-input-guardian` owns the input that drives movement direction.
- **VFX pass** — `game-feel-juice-guardian` designs the impact/pickup particles + proposes caps; `mobile-game-perf-guardian` measures overdraw and ratifies the hard ceilings (co-owned budget).
- **Tweening decision** — `game-feel-juice-guardian` presents custom-vs-DOTween with the Tier 0 lean (custom); the **human** decides the dependency; if DOTween is chosen, `mobile-game-perf-guardian` co-owns the GC config.

## Critical directives the orchestrator should respect

- **Feel is the human's; plumbing is the Guardian's.** It scaffolds feedback + knobs + starting values; it does **not** make the final feel call or the "is it fun?" call (CLAUDE.md §7, §4). If you need a *verdict* on feel, that's the human — don't expect this Guardian to render it.
- **Every technique ships with a knob, a starting value, and a cited range.** A baked magic number is a finding; an Inspector knob is the deliverable.
- **The feel loop owns latency.** The Guardian will block any juice that delays the *response* (the player-controlled thing) to add *feedback* — that's anti-juice.
- **Hitstop freezes the world, never input.** A freeze-frame that eats the next input is a must-fix (Hard Rule #4).
- **Screenshake is trauma-based and capped** (Eiserloh: shake ∝ trauma², decaying, mobile-capped). Linear/uncapped shake is a must-fix.
- **Mobile readability gates every choice** — ~6" portrait, thumb occlusion, sunlight, muted play. Desktop-tuned feedback is mistuned by default.
- **Restraint + co-owned perf budget.** Every technique costs and caps; hard perf calls defer to `mobile-game-perf-guardian`. Juice that drops frames is a net feel loss.
- **No drive-by DOTween.** Adding a package to `Packages/manifest.json` is a deliberate human decision, never a side effect (Hard Rule #8).
- **Tier 0 only** — juice the existing gray-box; don't feedback-plumb Tier 1 systems that don't exist (Hard Rule #1).

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
