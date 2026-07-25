# 07 - Video: branded HTML-to-MP4 via HeyGen HyperFrames

ACTION step 7 (extension): author a HyperFrames HTML scene for a branded logo reveal/intro/outro. The SAME brand spec drives both the static cards and the video.

HyperFrames is the static-card pipeline's video sibling: Claude Code authors the HTML/CSS the same way it authors the SVG cards, so the brand spec carries straight into the composition. The scene skeleton stub is `templates/hyperframes-scene.template.html`; the worked short is `examples/02-branded-short-video.md`.

> TODO: open question - the video layer is a per-client spike. HyperFrames launched 2026-04-17 and is new; treat it as a spike before committing per client, and pin a recent version (>= 2026-06-22, see the font note below).

## What HyperFrames is

HeyGen HyperFrames (`github.com/heygen-com/hyperframes`, Apache 2.0, released 2026-04-17) turns HTML + CSS + media + seekable animations into deterministic MP4. The renderer seeks each frame in headless Chrome (Puppeteer) and encodes with FFmpeg; same input always produces the same video. No API keys, no cloud, no per-render fees: it runs entirely locally, which makes it safe to commit into a client repo (`research/hyperframes-video/2026-06-29-hyperframes-readme-render-model.md`).

Use it for branded logo reveals, intros, outros, lower-thirds, and motion graphics. It is simpler than Remotion (which is the heavier React/TS option for a full video product).

## Prerequisites (bake in)

- **Node.js 22 or higher.**
- **FFmpeg** installed as a system dependency.

Both are hard requirements (`research/hyperframes-video/2026-06-29-hyperframes-readme-render-model.md`).

## The CLI loop

```bash
npx hyperframes init my-video      # scaffold a project
cd my-video
npx hyperframes preview            # browser preview with live reload
npx hyperframes lint               # static HTML check
npx hyperframes validate           # runtime check in headless Chrome
npx hyperframes render             # render to MP4
```

Full CLI surface: `init`, `preview`, `render`, `lint`, `inspect`, `validate`, `publish`, `doctor`, plus the cloud path `lambda deploy` / `lambda render` / `lambda progress`. The CLI is non-interactive by default, so it is CI/script friendly. Install reusable scenes with `npx hyperframes add <block>` from the 50+ registry blocks, or install HyperFrames as an agent skill with `npx skills add heygen-com/hyperframes`.

## The HTML composition schema (data-* attributes)

Plain HTML, not React-dependent, no build step. The stage and every animated element carry data attributes:

```html
<div id="stage" data-composition-id="intro" data-start="0"
     data-width="1080" data-height="1080">
  <img class="clip" data-start="0" data-duration="3"
       data-track-index="0" src="logo.png">
  <h1 id="title" class="clip" data-start="0.5"
      data-duration="2.5" data-track-index="1">Heather Ferrari</h1>
  <audio data-start="0" data-duration="3"
         data-track-index="2" data-volume="0.5" src="sting.wav"></audio>
</div>
```

- `data-start` (seconds), `data-duration`, `data-track-index` (layer order)
- `data-composition-id`, `data-width` / `data-height` (px)
- `class="clip"` marks an element as seekable

For social, set `data-width`/`data-height` to the SQUARE (1080x1080) or VERTICAL (1080x1920) canvas, not 1920x1080. The card palette and fonts carry straight into the HTML (`research/hyperframes-video/2026-06-29-hyperframes-readme-render-model.md`).

## The seekable timeline contract (paused:true + window.__timelines)

Animations must be frame-accurately seekable. Author a GSAP timeline `paused: true` and register it on `window.__timelines`; the framework drives the playhead:

```javascript
const tl = gsap.timeline({ paused: true });
tl.from("#title", { opacity: 0, y: 40, duration: 0.8 }, 0.5);
window.__timelines = window.__timelines || {};
window.__timelines.intro = tl;
```

Adapters: GSAP (primary), CSS animations, Lottie, Three.js, Anime.js, WAAPI. `frame = floor(time * fps)`.

## The determinism rules (the agent contract)

HyperFrames ships its own CLAUDE.md with the exact agent authoring contract. The load-bearing rules (`research/hyperframes-video/2026-06-29-hyperframes-agent-authoring-rules-determinism.md`):

1. Every animated element: `class="clip"` + `data-start` / `data-duration` / `data-track-index`.
2. GSAP timeline: `gsap.timeline({ paused: true })` registered on `window.__timelines.<id>`.
3. **Determinism is mandatory.** NO `Date.now()`, NO unseeded `Math.random()`, NO runtime network fetch during composition execution. These break frame-accurate seeking and produce non-reproducible output. Bundle assets (fonts, logos) LOCALLY; do not reference remote URLs. (This is the same lesson as the resvg no-network-font rule.)
4. `npx hyperframes lint` (static) then `npx hyperframes validate` (runtime in headless Chrome) BEFORE `render`. Both must pass. This is the video review gate, analogous to the static `preview.html`.
5. Install reusable scenes via `npx hyperframes add <block>` from the registry.

HyperFrames' own `design.md` / `frame.md` creative-direction convention is the in-tool mirror of `BRAND-GUIDE.md`: hand HyperFrames a `design.md` derived from the same brand spec so the video stays on-brand.

## Render speed and the escape hatches

Local render is roughly 3 minutes for 30s at 1080p (practitioner figure). Two escape hatches when a client needs more than a one-off intro:

- `npx hyperframes render --workers auto` runs three parallel Chrome workers and cuts render time meaningfully.
- `npx hyperframes lambda render ./my-project --width 1080 --height 1080 --wait` fans out to AWS Lambda in your own AWS account ("one composition becomes a thousand"). It is a self-deploy SDK; you stand up the Lambda functions.

Resolution at render time is set via `--width` / `--height`, independent of the composition's `data-width`/`data-height`. For most social use (one branded intro/outro per campaign), local `npx hyperframes render` is enough; reserve cloud render for volume (`research/hyperframes-video/2026-06-29-hyperframes-deploy-scale-workers-resolution.md`).

## The 2026-06-22 font-determinism fix (pin this)

The 2026-06-22 release fixed several production-render edge cases, including: "CSS variable font declarations no longer trip deterministic font resolution." If the composition uses CSS variables for the brand font-family, ensure HyperFrames >= 2026-06-22 so font resolution stays deterministic. Pin a recent version (`research/hyperframes-video/2026-06-29-hyperframes-deploy-scale-workers-resolution.md`).

## The packages

- `@hyperframes/core` (parsing + types)
- `@hyperframes/engine` (Puppeteer + FFmpeg wrapper)
- `@hyperframes/producer` (full capture -> encode -> audio-mix pipeline)
- `@hyperframes/player` (`<hyperframes-player>` web component)

## How it pairs with kie.ai

Use HyperFrames for the deterministic, on-brand bookends (logo intro/outro, lower-thirds) and kie.ai for the premium AI clip in the middle. The brand spec drives both. See `guides/08-video-kie-ai.md` and the full short in `examples/02-branded-short-video.md`.

## See also

- Scene skeleton: `templates/hyperframes-scene.template.html`.
- The premium clip layer: `guides/08-video-kie-ai.md`.
- Worked branded short: `examples/02-branded-short-video.md`.
- Sources: `research/hyperframes-video/2026-06-29-hyperframes-readme-render-model.md`, `research/hyperframes-video/2026-06-29-hyperframes-agent-authoring-rules-determinism.md`, `research/hyperframes-video/2026-06-29-hyperframes-deploy-scale-workers-resolution.md`.
