# 04 — Occlusion Culling (Top-Down)

Occlusion **authoring**. Whether it's worth it is `mobile-game-perf-guardian`'s call (Rule #6).

## What occlusion culling does

Frustum culling already skips what's outside the camera view. Occlusion culling additionally skips
static geometry **hidden behind other static geometry** inside the frustum. You author it by:

1. Marking static environment **Occluder Static** (big walls/structure that block view) and
   **Occludee Static** (objects that can be hidden).
2. Baking the occlusion data (Window → Rendering → Occlusion Culling → Bake).
3. Where the level has discrete rooms, placing **Occlusion Areas** to bound the bake.

(Verify the exact bake parameters — smallest occluder, smallest hole, backface threshold — in the
editor against the current Unity 6 version; they're scene-dependent and shouldn't be asserted blind.)

## The top-down calculus (why this is different)

`TopDownFollowCamera` views the play-floor from a fixed angled pitch. At that angle the camera sees
**most of an open floor at once**, so occlusion culling buys far less than it does for a
first-person corridor where walls constantly hide what's beyond them. Occlusion pays off in DRIFT
specifically where:

- the **station** has interior walls and multiple rooms that hide adjacent rooms at the camera angle, or
- there's genuine **vertical structure** (decks, raised sections) hiding geometry below/behind it.

On a flat, open planet-surface zone, occlusion may bake to almost nothing — frustum culling + LOD +
good static batching can do as well or better for less.

## Measure before you bake (Rule #6)

The decision "is occlusion culling worth the bake here?" is a **PERF measurement** owned by
`mobile-game-perf-guardian` (draw-call counts, frame budget, GPU profiler). This Weapon's job is to
**author the scene so occlusion CAN work** — correct static flags, occlusion areas around rooms,
occluder-grade wall mass in the kit — and to flag the rooms where it's likely to pay off. Hand the
profile-and-confirm pass to perf; don't claim a frame win this Weapon can't measure headless.

## Output

An occlusion authoring plan: which kit modules are occluder-grade, which objects are occludee,
where the occlusion areas go, and a handoff note to `mobile-game-perf-guardian` to confirm the win.
Worked example: `examples/03-occlusion-setup-top-down-zone.md`.

## Severity

- **Must-fix:** none intrinsic to authoring (occlusion is an optimization, not correctness).
- **Should-refactor:** baking occlusion on a flat open zone without measuring; static flags missing
  on geometry that should be occluder/occludee.
- **Style:** occlusion-area naming.
