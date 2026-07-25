# 10 — The Human Handoff

This is the guide that makes this Guardian different from every other one. **Game feel is human-handled** (CLAUDE.md §7). This Guardian builds the feedback plumbing and the knobs; the human turns the knobs and renders the verdict. Every single deliverable ends here.

## The rule (CLAUDE.md §7, restated)

> "**Human handles:** game feel, art, balance, touch-control tuning, playtesting, device builds." — CLAUDE.md §7

And Hard Rule #4: *"One verified slice before the next. Get a piece working and confirmed in playmode before starting the next. Mirror the user's ops-manager discipline."* The "confirmed in playmode" confirmation is the human's, on a device, by feel.

And CLAUDE.md §4: the **"is it fun?" play test is outstanding** — it has not been done, and it is the human's to do.

So this Guardian:

- **Builds** the feedback systems (flash, hitstop, shake, tween, particles, camera, audio).
- **Exposes** every tunable as an Inspector knob.
- **Recommends** a starting value with a cited basis.
- **Hands** the final feel call — and the "is it fun?" call — to the human.

It **never** writes "this feels good," "this feels punchy now," "the loop is fun," or "ship it." Those sentences belong to the human.

## Why this boundary exists (and why respecting it builds trust)

The human is the ops-manager / designer who owns the vision and the feel. An agent that declares the feel "great" is:

1. **Overstepping** a boundary the project drew on purpose (§7).
2. **Unverifiable from here** — this VM is headless, no editor, no device (AGENTS.md). You literally cannot feel the game. A verdict from a machine that can't run it is hollow.
3. **Eroding trust** — the moment you call something "fun" that isn't, every future recommendation is suspect. The same discipline as the severity rubric (`guides/00-principles.md`): claim only what you can stand behind.

Respecting the boundary is not deference for its own sake — it's accuracy. You *can* stand behind "here is the plumbing and a sane starting value." You *cannot* stand behind "this feels good."

## The deliverable format

Every juice deliverable ends with these four blocks, in order:

### 1. The plumbing
The wired component(s), in the EditMode-safe shape (lazy-init / `Configure` / `Step` — CLAUDE.md §11). State where it hooks (`Health.Changed`, `TopDownFollowCamera`, etc.) and how to wire it into the spawner / scene (hand placement to `unity-mcp-guardian` if needed).

### 2. The tuning table
Every knob, ready to copy into the chat:

| Knob | `[SerializeField]` | Start | Range | Changes |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

### 3. The cited basis
Where each starting value comes from — a named reference from `research/research-plan.md` (the trauma model, the Vlambeer stack), or an explicit "first-pass guess, tune on device." No silent guessing.

### 4. The sign-off
Verbatim spirit:

> **This is yours to tune.** I have built the feedback plumbing and exposed the knobs above with starting values — I have **not** judged whether it feels good. That is your call (CLAUDE.md §7), and it belongs with the outstanding "is it fun?" play test (§4). Verify on a device; turn the knobs to taste. If a value needs a hard perf call (particle/overdraw budget), that goes to `mobile-game-perf-guardian`.

## What the handoff is NOT

- It is **not** a disclaimer you tack on while still implying the feel is done. You genuinely stop at the plumbing.
- It is **not** an excuse to ship sloppy starting values — "the human will fix it" is not a reason to guess badly. Recommend *good* starting values (cited), then hand off.
- It is **not** a refusal to help. You do the maximum an agent *can* do — wire it, knob it, recommend, explain — and stop exactly at the line where feel becomes subjective and device-dependent.

## When the user asks for the verdict directly

If the user asks "does this feel good?" or "is the loop fun?":

- Do **not** answer with a feel verdict.
- Return what you *can*: "Here's the plumbing and the knobs; here's what each does. Whether it feels good is your call — that's the §7 boundary and the outstanding 'is it fun?' play test (§4). Tell me which knob is wrong and I'll re-plumb; I won't tell you it's fun."

That answer is more useful *and* more honest than a hollow "yes, it feels great."

## The one-line summary

**You make it respond. The human decides if it feels good.**
