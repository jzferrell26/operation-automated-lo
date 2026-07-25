# Example 01 — Configure a URP asset + quality tiers for mid Android

**Scenario:** "Set up URP quality tiers for DRIFT on mid-tier Android."

**Open with tier discipline:** URP is **not installed** (`Packages/manifest.json` has no
`com.unity.render-pipelines.universal`), Tier 0 has no scene, and the final look is the human's
(`CLAUDE.md §7`). This is **Tier-1/art-phase design** — author when URP lands. The numbers below
are a **neutral baseline to measure from**, not a finished look, and every "is it fast enough"
verdict is `mobile-game-perf-guardian`'s on-device call.

## Step 0 — install (Tier-1 decision, ADR)

Add `com.unity.render-pipelines.universal` (version paired with Unity `6000.0.x` — **verify
in-editor**). Expect existing `Standard` materials to render pink until migrated (`guides/08`).
Record the install as an ADR (`library/architecture/ADR-<n>-install-urp.md`).

## Step 1 — author three URP Render Pipeline Assets

One asset per tier, each assigned to a Unity Quality level (Project Settings → Quality). Settings
from `templates/urp-asset-settings.md`:

| Setting | Low | Mid | High |
|---|---|---|---|
| Render scale | ~0.75 | 1.0 | 1.0 |
| HDR | Off | Optional | On |
| MSAA | Off | 2x (optional) | 2–4x |
| Shadow distance | Short | Modest | Longer |
| Shadow cascades | 1 | 1–2 | 2–4 |
| Depth texture | Off | Off (unless needed) | Off (unless needed) |
| Opaque texture | Off | Off | Off |

**Verify the Unity 6 defaults in-editor** before locking these — render scale default and MSAA
sample counts move between versions.

## Step 2 — assign

- Project Settings → **Graphics** → default Render Pipeline Asset = the Mid asset (a sane default).
- Project Settings → **Quality** → assign Low/Mid/High assets to the matching Quality levels.

**If unassigned, everything renders pink** — the #1 setup failure (`guides/10`). Assigning is a
**must-fix once URP is installed**.

## Step 3 — pick the renderer path

Default the renderer to **Forward** (`guides/03`) — DRIFT's top-down scene is lit by one
directional + baked GI, so there's no large dynamic-light count needing Forward+.

## Step 4 — hand off

- **Look** (exact render scale, whether the high tier gets HDR bloom) → the human (`CLAUDE.md §7`).
- **Cost** (does render-scale 0.75 actually hit 60fps on the reference device; render-scale vs
  MSAA trade) → `mobile-game-perf-guardian`, on-device Profiler (`guides/09`).

## Output

A short note to `library/qa/unity-rendering/<date>-urp-quality-tiers.md`: the three-asset table,
the Forward choice, the assignment steps, the verify-in-editor flags, and the explicit perf
hand-off ("perf to confirm: low-tier frame time at render scale 0.75 on <reference Android>").
