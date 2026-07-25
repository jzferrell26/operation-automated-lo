# 02 — LOD Groups

When (and whether) DRIFT props need Levels of Detail. Field names **in-editor-verify**.

## The DRIFT-specific truth: a fixed-zoom orthographic camera

`TopDownFollowCamera` is **orthographic, fixed-zoom, top-down**. That changes the LOD calculus
fundamentally: with an orthographic camera at a fixed size, props occupy a **near-constant screen
size** regardless of distance from the camera plane. Classic multi-tier LOD — swap to a coarser
mesh as the object shrinks on screen — buys little, because objects don't shrink with distance.

So the default stance is: **don't add LODGroups speculatively** (Hard Rule §8). Adding three LOD
meshes per prop in a top-down game that never sees them shrink is wasted authoring and asset
size with no measured win.

## The two cases that DO earn LODs here

1. **Cull-only (the common one).** A LODGroup with a single LOD0 and a **Culled** threshold lets
   you drop a prop entirely when it's far enough / off the visible play area. This is the useful
   form for a top-down game: not "show a cheaper mesh," but "stop drawing it." Set the LODGroup's
   last transition so the object culls past the visible frame.
2. **Genuinely large / dense scenes** where a perspective element or a big planet-surface vista
   is involved and props *do* span a depth range worth a coarse LOD1. Rare in Tier 0; possible
   in a Tier-1 planet zone.

Whether either earns its keep is a **perf measurement** — hand the draw-call / culling question
to `mobile-game-perf-guardian` (`guides/09`). This Weapon authors the LODGroup *correctly*; perf
decides if it's needed.

## If you do set up a LODGroup

- **LOD meshes:** author LOD1/LOD2 as decimated versions of LOD0 in the DCC tool (the human's
  job per `CLAUDE.md §7`); import each as its own mesh via the model Preset (`guides/01`).
- **Screen-relative transition height:** the LODGroup uses screen-relative height (fraction of
  screen the object occupies) for transitions. For an orthographic camera, set these
  deliberately and **verify in-editor** — the default perspective-tuned thresholds may not behave
  as expected under orthographic projection.
- **Cross-fade:** prefer **None** on mobile. Cross-fade renders two LODs during the blend, adding
  overdraw — a fill-rate cost `mobile-game-perf-guardian` will flag. Use "Speed Tree" / dithered
  cross-fade only with a measured reason.
- **Last threshold = Culled:** set the final band to Culled so far/off-screen props stop drawing.

## DRIFT note

No LODGroup exists in the repo. The first place LODs matter is a Tier-1 planet-surface zone with
many scattered props. Until then: cull-only at most, and only when perf shows a win. See
`templates/lod-group-setup.md` and `examples/02-lod-group-setup.md`.
