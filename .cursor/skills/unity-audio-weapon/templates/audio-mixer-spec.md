# Template — AudioMixer Spec

Fill this in and hand it to the human to author the `.mixer` asset in-editor (it cannot be created
headless). It is the source of truth for the group graph, exposed params, and snapshots.

> Replace every `<…>`. Volumes are **dB** (logarithmic); convert any human slider with
> `Mathf.Log10(linear) * 20` (floor at the silence value — **VERIFY** in editor, commonly -80 dB).

## Mixer asset

- **Asset path:** `Assets/Audio/<MixerName>.mixer`
- **Routed by:** every `AudioSource.outputAudioMixerGroup` (never Master directly)

## Group graph

```
Master
├── Music     [exposed: <MusicVol>]
├── SFX       [exposed: <SfxVol>]
├── Ambient   [exposed: <AmbientVol>]
├── UI        [exposed: <UiVol>]
└── Warning   [exposed: <WarningVol>]   // low-O2 / breach route; normally near-silent
```

## Exposed parameters

| Param | Group | Default (dB) | Driven at runtime by |
|---|---|---|---|
| `<MusicVol>` | Music | `<0>` | adaptive music machine / snapshots |
| `<SfxVol>` | SFX | `<0>` | settings menu |
| `<AmbientVol>` | Ambient | `<0>` | zone snapshots |
| `<WarningVol>` | Warning | `<-80>` | low-O2 blend / breach |

## Snapshots (zone/mood — GDD)

| Snapshot | Ambient | Music | Warning | Transition time |
|---|---|---|---|---|
| `Station` | `<0>` | `<-6>` | `<-80>` | `<1.0s>` |
| `Descent` | `<-3>` | `<-2>` | `<-80>` | `<1.0s>` |
| `Surface` | `<-6>` | `<-8>` | `<-80>` | `<1.0s>` |
| `Raid` | `<-12>` | `<0>` | `<-2>` | `<0.25s>` (snappy alarm) |
| `LowOxygen` (partial blend) | `<-9>` | `<-4>` | `<-6>` | n/a (blended by O2 %) |

## Ducking

- Method: `<snapshot duck | Duck Volume effect>` (default: snapshot duck — see
  `guides/01-audiomixer-routing-snapshots.md`)
- What ducks under what: `<Ambient + Music duck under Warning/Combat>`

## Effects (optional, per group)

| Group | Effect | Notes |
|---|---|---|
| `<Ambient>` | `<Lowpass>` | `<muffle outside-station vs inside>` |
| `<Warning>` | `<none>` | keep the warning clean |

## Boundaries

- The cue *moment* + how loud a hit *feels* → `game-feel-juice-guardian`.
- The hard memory/voice budget → `mobile-game-perf-guardian`.
- The threshold % the LowOxygen blend starts at → `game-balance-guardian`.
- The final mix → the human, on-device (`CLAUDE.md §7`).
