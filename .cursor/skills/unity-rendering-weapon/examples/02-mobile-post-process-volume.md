# Example 02 — A mobile post-processing volume within budget

**Scenario:** "Add a post-processing volume for the station/planet look."

**Open with tier discipline:** URP isn't installed, there's no camera/scene to attach a volume to,
and the human owns the final grade (`CLAUDE.md §7`). This is the **volume budget design** — author
the profile when URP + scenes land. The fill-rate cost of every effect below is
`mobile-game-perf-guardian`'s on-device measurement.

## Step 1 — a single Global volume

Create a **Global `Volume`** + a **`VolumeProfile`** asset (the base look). One global volume sets
the baseline; local volumes can add area grades later (e.g. a moodier breached-deck profile).
**The camera must have Post Processing enabled** or none of this shows (`guides/07`, `guides/10`).

## Step 2 — the affordable override set (the neutral baseline)

From `templates/post-process-volume-profile.md`:

| Override | Setting | Why it's in budget |
|---|---|---|
| **Tonemapping** | **Neutral** (or ACES — pick one, commit) | Makes HDR read right; one mode only. |
| **Color Adjustments** | Slight exposure/contrast/saturation | The cheap grade knob. |
| **Vignette** | Subtle | Focuses the eye on the top-down character; cheap. |
| **Bloom** | Low iterations, high-quality filtering **off** | A subtle glow, not a bloom bath. |

## Step 3 — the deliberate exclusions

**Do not** add Depth of Field, Motion Blur, SSAO, Film Grain, or heavy Chromatic Aberration on
mobile (especially the low tier) — each is a full-screen pass or extra sampling on a fill-rate-bound
tiled GPU (`guides/05`). If the high tier wants one, it's a per-tier opt-in, **measured by perf**.

## Step 4 — name the two hand-offs explicitly

- **Juice:** a hit-flash, a damage red-pulse, a heal-glow is **`game-feel-juice-guardian`'s
  intent**. This volume is the **budget + base look** that juice lives inside — it does not author
  the flash. Hand the flash intent across.
- **Cost:** "perf to confirm on-device: the full-screen post-process pass at this stack fits the
  low-tier ms budget; if not, drop Bloom first." (`guides/09`,
  `mobile-game-perf-weapon/guides/05`.)

## Output

A note to `library/qa/unity-rendering/<date>-post-process-volume.md`: the global-volume setup, the
in-budget override table, the explicit exclusions, and the juice + perf hand-offs. Flag clearly:
**intensity/color is the human's call.**
