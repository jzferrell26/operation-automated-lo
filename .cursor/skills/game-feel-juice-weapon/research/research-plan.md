# Research Plan — game-feel-juice-weapon

The sources behind every load-bearing claim and starting value in this Weapon's guides. **Sources are named for the human to pull; no URLs are fabricated here.** Where a value is a guess rather than sourced, the guide flags it "first-pass, tune on device."

This Weapon scaffolds the *feedback* layer of game feel; the final feel call is the human's (CLAUDE.md §7), so this research informs **starting values and mechanisms**, not verdicts.

---

## Anchor references (the named canon)

These are the well-known, real references the guides cite by name. Pull them by title/author; do not trust any URL not verified.

1. **Steve Swink — *Game Feel: A Game Designer's Guide to Virtual Sensation*** (Morgan Kaufmann, 2009).
   - The foundational text. Defines game feel as real-time control of a virtual object in a simulated space, with interactions emphasized by polish.
   - Feeds: `guides/01-the-feel-loop.md` (input → response → feedback; the responsiveness floor), `00-principles.md` (Principle #3), the whole framing.

2. **Jan Willem Nijman (Vlambeer) — "The Art of Screenshake"** (talk, Indigo Classes / available as a recorded GDC-style lecture).
   - The canonical demonstration of stacking cheap feedback (screenshake, hitstop, knockback, particles, sound, permanence) to transform a flat shooter into a juicy one.
   - Feeds: `guides/02-hit-feedback-and-hitstop.md` (the hit-feedback stack), `guides/03-screenshake.md`, `guides/05-particles-and-vfx.md`.

3. **Martin Jonasson & Petri Purho — "Juice it or lose it"** (talk + interactive demo).
   - The accessible primer on tweening, easing, particles, and animation polish as juice.
   - Feeds: `guides/04-tweening.md` (easing/tweening as the core juice tool), `guides/05-particles-and-vfx.md`, `00-principles.md`.

4. **Squirrel Eiserloh — "Math for Game Programmers: Juicing Your Cameras With Math"** (GDC talk).
   - The **trauma model**: a [0,1] trauma value that decays, with shake magnitude ∝ trauma² (or ³), sampled via Perlin noise, capped. The literal basis for `templates/screenshake.cs`.
   - Feeds: `guides/03-screenshake.md` (entire trauma section), `guides/06-camera-feel.md`, `templates/screenshake.cs`.

5. **Unity Manual & Scripting Reference** (official docs — verify the version against the project's Unity 6 / `6000.0.x` pin in `ProjectSettings/ProjectVersion.txt`).
   - **Particle System** (`UnityEngine.ParticleSystem`) — emission, `maxParticles`, lifetime; the overdraw/fill-rate guidance.
   - **`AnimationCurve`**, **`Mathf.PerlinNoise`**, **`Time.timeScale` / `Time.unscaledDeltaTime`**, **`MaterialPropertyBlock`** — the APIs the templates use.
   - Feeds: `templates/*.cs`, `guides/04-tweening.md`, `guides/05-particles-and-vfx.md`, `guides/02-hit-feedback-and-hitstop.md`.

6. **DOTween (Demigiant) — official documentation.**
   - The mature tween library presented as the *alternative* to the custom tween. Pull the docs for: the API surface, the safe-mode / recycling settings, and the mobile GC guidance — needed for the trade-off table.
   - Feeds: `guides/04-tweening.md` (the custom-vs-DOTween trade-off). **Not a dependency of this Weapon** — adding it is a deliberate human call (Hard Rule #8).

---

## Topics & questions per guide

| Guide | Question(s) the research answers | Primary source(s) |
|---|---|---|
| `01-the-feel-loop` | What are the stages of game feel and where does latency live? Why is latency-for-feedback a regression? | Swink |
| `02-hit-feedback-and-hitstop` | What's in a satisfying hit? How long should hitstop be, and how do you freeze the world without eating input? | Vlambeer, Swink; Unity `Time.timeScale`/`unscaledDeltaTime` |
| `03-screenshake` | How do you make shake that scales, decays, and doesn't nauseate on mobile? | Eiserloh (trauma model), Vlambeer; Unity `Mathf.PerlinNoise` |
| `04-tweening` | Custom tween vs DOTween: trade-offs, GC, testability, easing shapes? | Jonasson & Purho; DOTween docs; Unity `AnimationCurve` |
| `05-particles-and-vfx` | Where do particles earn their keep, and what's the mobile overdraw cost? | Vlambeer, Jonasson & Purho; Unity Particle System docs |
| `06-camera-feel` | Follow damping correctness, look-ahead, framing on a top-down camera? | Eiserloh, Swink; existing `TopDownFollowCamera.cs` |
| `07-audio-feedback` | What cues, voice limits, pitch variation, and why audio is additive on mobile? | Swink; Jonasson & Purho |
| `08-mobile-readability` | What changes when the screen is ~6" portrait with thumb occlusion, sunlight, muted? | Project target (CLAUDE.md §1); mobile UX general practice |
| `09-restraint-and-perf-budget` | How much juice is too much, and where's the perf boundary co-owned with perf-guardian? | Vlambeer (stack but serve clarity); `mobile-game-perf-weapon` |
| `10-human-handoff` | Why does the final feel call belong to the human? | CLAUDE.md §7, §4; Hard Rule #4 |

---

## Project-internal "sources" (the real code this Weapon grounds in)

These are not external research but the as-built files every guide cites. Re-read on invocation:

- `Assets/Scripts/Drift/Gameplay/Combat/PlayerMeleeAttack.cs` — the hit moment (`TryAttack`).
- `Assets/Scripts/Drift/Core/Combat/Health.cs` — the `Changed(current,max)` / `Died` hooks feedback subscribes to.
- `Assets/Scripts/Drift/Gameplay/CameraRig/TopDownFollowCamera.cs` — the damped follow we tune + extend.
- `Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs` — the material/tint helper used by the flash.
- `Assets/Scripts/Drift/Gameplay/UI/Tier0Hud.cs` — the IMGUI HUD readability constraint.
- `ARCHITECTURE.md` §2, §7 — the source layout + the EditMode-test conventions every template obeys.
- `CLAUDE.md` §1, §4, §6, §7, Hard Rules #1 #4 — the tier discipline, the signature oxygen meter, and the human-feel boundary.

---

## Verification discipline

- **Every starting value** in a guide/template traces to one of the anchor references above, or is explicitly flagged "first-pass guess, tune on device." No silent numbers.
- **No fabricated URLs.** The references are named (author + title); the human pulls the canonical copy. If a guide ever needs a link, verify it live before adding it.
- **Versions come from the repo**, not memory — the Unity version is pinned in `ProjectSettings/ProjectVersion.txt` (`6000.0.x`); cite that, not a guessed version.
- **This Weapon never sources a "feels good" verdict** — the research informs mechanisms and starting values; the verdict is the human's (CLAUDE.md §7).
