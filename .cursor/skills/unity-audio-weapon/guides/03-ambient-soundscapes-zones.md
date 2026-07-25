# 03 — Ambient Soundscapes & Zones

Ambient beds carry the *mood* of each place. DRIFT has four moods (GDD): station (safe/hum),
descent (tense/rush), surface (dead/desolate), raid (alarm/combat). One looping bed per zone,
swapped on zone entry, ducked by the mixer when combat/warning takes over.

## One bed per zone

| Zone | Bed character | Trigger |
|---|---|---|
| Station | warm low hum, life-support thrum | inside `LifeSupportZone` / `Tier0LoopPhase.StationHub` |
| Descent | rising rush, atmospheric entry | `Tier0ShuttlePad.TryDescend` → `PlanetSurface` |
| Surface | sparse dead wind, desolation | on the planet, outside any powered zone |
| Raid | alarm underbed (music carries the combat) | `Tier0RaiderAssault.BeginAssault` → `RaidActive` |

The loop state machine that owns these transitions already exists:
`Tier0LoopPhase = StationHub → PlanetSurface → RaidActive → StationHub`
(`ARCHITECTURE.md §5`). The ambient driver **subscribes to the phase change** and the
`LifeSupportZone` boundary — it does not poll, and it does not author the loop.

## Beds are looping sources, not one-shots

An ambient bed is a single `AudioSource` with `loop = true`, routed to the **Ambient** group,
2D (`spatialBlend = 0`). Swapping zones crossfades beds (fade the old source out, the new in) —
*not* a `PlayOneShot` per anything. An ambient implemented as repeated `PlayOneShot` is a
**should-refactor** (Principle #5).

## Zone swaps via snapshots (preferred) or crossfade

Two layers cooperate:

1. **Mixer snapshot** (`01-audiomixer-routing-snapshots.md`) — transitioning to the zone's
   snapshot sets the overall balance (ambient up/down, music character, warning route).
2. **Bed crossfade** — the actual *clip* swap (station hum → surface wind) is a short crossfade
   between two ambient sources.

Use the snapshot for *balance*, the crossfade for *content*. The `LifeSupportZone` boundary is
the cleanest hook: stepping out of the powered station deck (where O2 starts draining) is exactly
where the bed and snapshot should shift from `Station` to `Surface`.

## The station-vs-outside contrast is the high-value moment

The single most affecting ambient transition is **leaving the sealed station** — the hum cuts,
the dead-surface wind comes up, and (once O2 drains) the warning route looms. That contrast *is*
the survival tension made audible. Align it exactly to `LifeSupportZone` entry/exit so audio and
the O2 meter tell the same story.

## EditMode note

The ambient driver's *decision* (which zone → which bed/snapshot) is `Configure(...)` +
a `Step`/event handler and is testable: assert "on `RaidActive`, target = Raid snapshot + raid
bed." Playback is engine-side, mocked. Mirror the music state machine's testability
(`04-adaptive-music-states.md`).

## Handoff

Bed clips, their loudness, and the crossfade feel are the human's to finalize (`CLAUDE.md §7`).
You design the zone→bed/snapshot mapping, the hooks, and the crossfade knobs.
