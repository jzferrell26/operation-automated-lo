# 05 — Post-processing volumes within a mobile budget

URP post-processing is the **Volume framework**, not the old Built-in stack.

## How it works

- A **`Volume`** component (Global, or Local with a collider) references a **`VolumeProfile`**
  asset. The profile holds **Volume Overrides** (Bloom, Tonemapping, Vignette, etc.).
- Volumes **blend** by weight + priority; a Global volume sets the base look, Local volumes add
  area-specific grades (e.g. a moodier breached-deck zone).
- **The camera must have Post Processing enabled** for any of it to apply. A common failure is a
  beautifully authored profile that never shows because the camera toggle is off
  (`guides/10-failure-modes.md`).

## The mobile budget: affordable vs expensive

Tiled mobile GPUs are **fill-rate bound** — full-screen passes are the cost.

**Affordable (the baseline):**
- **Tonemapping** — pick **one** mode (**Neutral** for a flatter, controllable look, or **ACES**
  for filmic contrast) and commit. Needed for HDR to look right.
- **Color Adjustments** — exposure, contrast, saturation, color filter. The cheap grade knob.
- **Vignette** — cheap, focuses the eye on a top-down character.
- **Bloom** — keep iterations low, high-quality filtering off; a subtle glow, not a bloom bath.

**Expensive — usually skip on mobile (especially the low tier):**
- **Depth of Field**, **Motion Blur**, **Screen-Space Ambient Occlusion** (a Renderer Feature),
  **Film Grain**, heavy **Chromatic Aberration**. Each adds a full-screen pass or extra sampling.

## The neutral baseline (then hand off)

Author a **Global volume** with **Tonemapping + Color Adjustments + Vignette + a cheap Bloom** as
a neutral, measurable base (`templates/post-process-volume-profile.md`,
`examples/02-mobile-post-process-volume.md`). Then:

- **The human art-directs intensity/color** (`CLAUDE.md §7`) — don't ship a strong opinion on the
  final grade.
- **Post-fx as JUICE** — a hit-flash, a damage-pulse, a heal-glow — is **`game-feel-juice-guardian`'s
  intent**. This Guardian owns the **volume stack + the budget ceiling** that juice lives inside;
  juice-guardian decides what flashes and when.
- **Fill-rate cost is co-owned with `mobile-game-perf-guardian`** — they measure the post-process
  pass on-device (`guides/09`); never assert a ms number headless.

## Tier discipline

No camera/scene to attach a volume to in Tier 0, and URP isn't installed. The volume stack is
**Tier-1/art-phase forward-guidance** — design the budget now; author the profile when URP lands.

## Verify-in-editor flags

- Whether SSAO is a Renderer Feature vs a Volume Override in this URP version — **verify in-editor.**
- Default Bloom quality/iteration cost — **verify in-editor**; pair with a Profiler capture (perf).

Sources: Unity 6 Manual "Post-processing in URP", "Volumes", "Volume Profile", the Bloom /
Tonemapping / Vignette / Color Adjustments override pages; `game-feel-juice-weapon` (juice intent);
`mobile-game-perf-weapon/guides/05-overdraw-and-fillrate.md` (the fill-rate cost).
