# 08 — Feel & Perf Handoffs

This Weapon sits between two siblings. Drawing the lines cleanly is half the job. Read this before
touching anything that fires a cue or costs memory.

## The game-feel-juice co-ownership (the key boundary)

Impact/feedback SFX are **co-owned** with `game-feel-juice-guardian`. The split:

| Aspect | Owner |
|---|---|
| *When* a hit fires a cue (the trigger moment in the feel loop) | `game-feel-juice-guardian` |
| How *loud / punchy* the hit *feels* | `game-feel-juice-guardian` |
| The **route** the cue plays through (mixer group, snapshot) | **unity-audio-guardian** |
| The **`AudioSource` pool** + voice cap | **unity-audio-guardian** |
| The **import settings** + the memory the cue costs | **unity-audio-guardian** |
| Pitch jitter, no-per-frame-spam, debounce | **shared** (both guides state it) |

**The contract:** `game-feel-juice-weapon/guides/07-audio-feedback.md` is authoritative on the
*moment*. Do **not** contradict it. When a request is "make the hit feel louder/punchier," that's
their call — you provide the route and pool it plays through. When it's "set up the mixer / pool /
import / where does this route," that's yours. The low-oxygen warning is the sharpest example: the
*threshold* is `game-balance-guardian`'s, the *feel of the warning* is `game-feel-juice`'s, and the
*route + duck snapshot + looping warning source* is yours.

When in doubt, say which half you're answering and name the other guardian for the other half.

## The mobile-game-perf co-ownership

The audio **memory/voice budget** is co-owned:

| Aspect | Owner |
|---|---|
| Compression / load-type / resident-vs-stream **strategy** | **unity-audio-guardian** |
| The **hard memory ceiling** + voice-count number | `mobile-game-perf-guardian` |
| On-device profiling | `mobile-game-perf-guardian` (human runs it) |

Propose the ceiling; defer the ratification (`07-mobile-audio-budget.md`, Principle #8).

## The human mix handoff (`CLAUDE.md §7`)

Mix, loudness, and "does it sound good?" are the **human's** — on-device, in the art phase.
Every deliverable ends at a tuning handoff with knobs (mixer params, fade times, voice cap, per-cue
volume), **never** a "this sounds good" verdict. Audio is unheard on the VM (`AGENTS.md`); the call
that matters happens on a phone.

## Audio is additive (the cross-cutting mobile rule)

Players play **muted.** Every critical cue — hull breach, low-oxygen — must **also read visually**.
This is co-owned with `game-feel-juice-guardian` (the visual flash/HUD side is theirs/the HUD's).
A critical cue with no visual fallback is a **must-fix**.

## Quick routing

- "Make the hit feel punchy / louder" → game-feel-juice owns it; you provide the route.
- "Set up the mixer / pool / import / spatializer" → you own it.
- "How much memory / how many voices can we afford?" → propose, defer to mobile-game-perf.
- "Does this sound good?" → the human, on-device.
