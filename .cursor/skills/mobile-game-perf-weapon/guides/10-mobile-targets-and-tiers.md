# 10 — Mobile Targets & Tiers

What device are we optimizing for, and what's in scope *right now* vs designed-forward. This guide keeps perf work honest against both the hardware target and the project's tier discipline (CLAUDE.md §6 Rule #1).

## The device target

DRIFT targets **mid-tier Android/iOS** — not flagships, not the editor. A reference mental model:

- **Mid-tier Android:** a 3–4-year-old mid-range phone — GLES 3.1/Vulkan, ASTC support, a modest tile-based GPU (Mali/Adreno mid-range), 4–6 GB RAM (but you share it with the OS — budget conservatively), a small thermal envelope that throttles within minutes.
- **Mid-tier iOS:** an older-but-supported iPhone — Apple GPU (TBDR), ASTC, generally stronger sustained performance than equivalent-era Android but the same fill-rate/thermal discipline applies.

Implications that recur across the guides:
- **Geometry is cheap; fill-rate and draw calls are the ceiling** (top-down 2D-ish) → `guides/04`, `guides/05`.
- **GC stalls are visible** on a smaller chip → `guides/02`.
- **Thermal throttling is real and fast** → `guides/09`.
- **Memory and build size are constrained** → `guides/06`, `guides/08`.

Always state the target when making a finding: "at 30fps (33.3ms) on mid-tier Android" — the number is meaningless without it.

## The frame targets

- **60fps (16.67ms)** — aspirational. The top-down gray-box with few agents can hit it; whether to *spend the battery* to do so is a `guides/09` decision.
- **30fps (33.3ms)** — the floor *and* a legitimate battery-first target for a non-twitchy survival game. Never sustain below it.

## Tier scope — what to optimize NOW vs design FORWARD

This is the load-bearing rule. PROJECT-DRIFT is **mid-Tier-0** (CLAUDE.md §3): a gray-box core loop with one enemy, primitive visuals, no art, no audio, no streaming. Do **not** build Tier 1 perf infrastructure while Tier 0 is incomplete.

### Optimize NOW (the gray-box exists, so the cost is real)
- **The frame cap** — add `Application.targetFrameRate` + `vSyncCount = 0` (`guides/09`). One line, real battery win, the gray-box runs uncapped today.
- **The `GrayBoxVisuals.Tint` → `MaterialPropertyBlock` change** (`guides/04`) — *should-optimize*: harmless at ~15 static objects, but it's a known landmine and the fix is small. Worth doing before runtime spawning lands.
- **Keeping the hot paths allocation-clean** (`guides/02`) — `MutatedCrewEnemy.Step` is clean today; the job now is *keeping* it clean as code lands, and establishing the 0-B/frame measurement habit.
- **The measurement workflow itself** (`guides/07`) — wire `ProfilerMarker`s on the hot paths now so the data exists when systems grow.

### Design FORWARD (the system doesn't exist yet — do not build it into Tier 0)
- **Object pooling framework** (`guides/03`) — one never-respawned enemy needs no pool. The pool ships *with* the Tier 1 wave spawner. Design the seam (DRIFT's `Configure`/lazy-init convention already fits); don't build the framework.
- **SpriteAtlas + ASTC pipeline** (`guides/04`, `guides/06`) — there's no art to atlas or compress yet. The import Preset is cheap insurance; the atlas grouping is designed when art lands.
- **Addressables** (below) — Tier 1+ only.
- **Sustained-mode / fixed-step tuning** (`guides/09`) — matters when there's enough on screen to heat the phone.
- **Build-size discipline** (`guides/08`) — the build is tiny now; the habit guards against the Tier 1 art/audio influx.

**The anti-pattern this guide exists to prevent:** "optimizing" Tier 0 by importing a pooling system, an atlas pipeline, and Addressables for a gray-box of primitives. That's Tier 1 work dragged into Tier 0, it violates Hard Rule #1, and it's the kind of scope jump to *flag, not freelance* (CLAUDE.md §6 Rule #10).

## Addressables (Tier 1+ — forward guidance only)

Addressables is Unity's asset-management/streaming system: load assets by address, on demand, async, with memory tracked and released; content can ship in the build or be downloaded later (remote content, smaller initial install). It's the right answer for a growing content set — multiple planet zones, enemy archetypes, item art — because it replaces synchronous all-at-once loading (the pattern `Tier0RuntimeSpawner.Build` represents at gray-box scale) with staged, memory-bounded loading.

**But it is explicitly Tier 1+.** DRIFT has no content to stream and a save system intentionally deferred (CLAUDE.md §3). Introducing Addressables now would be infrastructure with nothing to manage. When the content set grows past "fits comfortably in the initial scene," that's the trigger — and that migration is an **ADR** (`library/architecture/ADR-<n>-addressables.md`) with `library-guardian` writing the PRD, not a Tier 0 edit.

## How to "measure" tier discipline

It's a scope check, not a Profiler capture, but make it explicit in every finding:

- **State the tier of the finding.** Must-fix-now (code exists, cost is real) / should-optimize (exists, not yet hurting) / forward-guidance (system doesn't exist yet).
- **Reject Tier 1 infrastructure in a Tier 0 PR.** If a recommendation requires building a framework for a system that isn't in Tier 0, it's forward-guidance — flag it, don't ship it.
- **Tie every "now" finding to existing code** — `file:line` in the repo. If you can't cite an existing cost site, it's forward-guidance by definition.

Source: CLAUDE.md §6 (tier discipline) / §3 (status map); Unity Manual — "Addressables" package / "Optimizing for mobile" / platform requirements (GLES/Vulkan/ASTC support).
