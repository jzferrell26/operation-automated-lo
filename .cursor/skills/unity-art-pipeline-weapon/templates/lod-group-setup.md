# Template — LOD Group Setup

Fill-in spec for a DRIFT LODGroup. Captures `guides/02`. Field names **in-editor-verify**.

```
Prop:               SM_____________
Why LODs here?      [ ] cull-only (default for orthographic camera)
                    [ ] multi-tier (Tier-1 large/dense scene ONLY — justify: __________)
Perf win measured?  [ ] yes by mobile-game-perf-guardian   [ ] no → DON'T add (Hard Rule §8)

── LODGroup component (on prop root) ─────────────────────
LOD0:   renderer(s): ______________   screen-relative transition height: ______
LOD1:   renderer(s): ______________   screen-relative transition height: ______   (multi-tier only)
        LOD1 mesh: SM_____________ _LOD1  (decimated; human-authored, guides/01)
Last band:          [ Culled ]   ← always; cull off-screen / far props
Cross-fade:         [ None ]     ← default on mobile (cross-fade adds overdraw, guides/02)
                    [ Cross Fade ] only if perf measures the pop as worse than the overdraw

⚠ Orthographic note: TopDownFollowCamera is orthographic fixed-zoom — props don't shrink with
  distance, so verify screen-relative heights VISUALLY in-editor; perspective defaults mislead.
```

**Default stance:** don't add LODGroups speculatively. **Handoff:** cull/draw-call/static-batching
verdict → `mobile-game-perf-guardian` (`guides/09`). **Verify in a real editor — forged headless.**
