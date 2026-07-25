# 01 — AudioMixer Routing & Snapshots

The mixer is the backbone of the whole audio system. Get the group graph and snapshots right and
the zone moods (station / descent / surface / raid) fall out for free.

> **VERIFY in editor** any exact default (silence floor dB, snapshot-transition curve shape).
> This guide is authored headless; the structure is sound, the magic numbers need an editor.

## The group graph

A single `.mixer` asset with four buses under Master:

```
Master
├── Music      (exploration / combat / raid layers route here)
├── SFX        (melee, salvage, cache, breach one-shots, enemy 3D)
├── Ambient    (per-zone looping beds)
└── UI         (HUD, menu — Tier 1 when the real UGUI HUD lands)
```

Every `AudioSource.outputAudioMixerGroup` is set to one of these — never to Master directly.
Routing through a bus is what lets a snapshot duck "all ambient" or "all music" in one move.

## Exposed parameters

Right-click a group's **Volume** (and any effect param you want to automate) → **Expose to
script**. Rename it clearly (`MusicVol`, `AmbientVol`, `WarningVol`, `MasterCutoff`). At runtime:

```csharp
mixer.SetFloat("MusicVol", LinearToDb(0.7f));
```

**Volume is dB (logarithmic).** A linear 0–1 slider must convert. The canonical conversion:

```csharp
// 0 -> silence floor; 1 -> 0 dB
static float LinearToDb(float linear) =>
    linear <= 0.0001f ? -80f : Mathf.Log10(linear) * 20f;
```

**VERIFY** the actual silence floor in editor (commonly `-80 dB`). Never expose raw dB to a
human-facing slider — convert.

## Snapshots — the zone/mood backbone

A **snapshot** is a saved set of all mixer parameter values. DRIFT's GDD moods map 1:1:

| Snapshot | Mood (GDD) | Mixer character |
|---|---|---|
| `Station` | safe / hum | Ambient up (station hum), Music low/calm, SFX nominal |
| `Descent` | tense / rush | Ambient = descent rush, Music tension layer in |
| `Surface` | dead / desolate | Ambient = sparse wind, Music sparse/exploration |
| `Raid` | alarm / combat | Ambient ducked, Music combat/raid layers up, Warning route hot |
| `LowOxygen` (partial) | signature tension | Ambient ducked, a warning route lifted as O2 drains |

Transition between them:

```csharp
stationSnapshot.TransitionTo(1.2f);   // crossfade over 1.2s
```

Or weight-blend several with `mixer.TransitionToSnapshots(snapshots, weights, time)`. The
**transition time is a knob** — a station→raid jump wants a fast (≤0.3s) cut for alarm; a
surface mood drift wants a slow (1–2s) fade. Expose these as `[SerializeField]` on the
zone/mood driver so the human tunes them.

## Ducking

Two ways, simplest first:

1. **Snapshot duck** (Tier-1 default) — the `Raid`/`LowOxygen` snapshot simply has `AmbientVol`
   and `MusicVol` lower. Transitioning into it ducks. Zero extra DSP.
2. **Duck Volume effect** — a true sidechain (a send from the warning source pulls down the
   ambient group). More faithful but more setup. **VERIFY** the effect name/availability in
   Unity 6 before specifying it; default to the snapshot duck.

## The low-oxygen tie-in (signature meter)

Oxygen is DRIFT's signature tension meter (`CLAUDE.md §6`, GDD §3). As O2 drains, blend toward a
`LowOxygen` partial snapshot — ducking ambient and lifting a warning route — so the tension is
*audible*. **The threshold % at which it starts is `game-balance-guardian`'s number; the snapshot
and route are yours.** The warning must also read visually (the HUD O2 meter) — audio is
additive (Principle #7).

## What you hand the human

A mixer spec (`templates/audio-mixer-spec.md`): the group graph, the exposed-param list, and the
snapshot table with transition times. The human authors the `.mixer` asset in the editor; you
specify it and wire the runtime `TransitionTo` calls. See `examples/01-audiomixer-zone-snapshots.md`.
