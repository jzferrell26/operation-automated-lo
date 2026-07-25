---
source_url: https://github.com/heygen-com/hyperframes/blob/main/README.md
retrieved_on: 2026-06-29
source_type: github-readme
authority: official
relevance: critical
topic: hyperframes
weapon: social-creative-weapon
---

# HyperFrames README - render model, install, CLI, HTML format

## Summary
HyperFrames (heygen-com/hyperframes, Apache 2.0, released 2026-04-17, ~6,600 stars) is an open-source framework that turns HTML + CSS + media + seekable animations into deterministic MP4 video. The engine seeks each frame in headless Chrome (Puppeteer), captures it, and pipes through FFmpeg to encode. Same input always produces the same video. No API keys, no cloud, no telemetry, no per-render fees: it runs entirely locally. This is the static-card pipeline's video sibling: Claude Code authors the HTML/CSS the same way it authors the SVG cards, so the brand spec drives both.

## Key quotations / statistics
- "converts HTML, CSS, media, and seekable animations into deterministic MP4 videos" - same-input-same-output determinism.
- Render model verbatim: "The renderer seeks each frame in headless Chrome and encodes results with FFmpeg" using `beginFrame`.
- Requirements: "Node.js 22 or higher" and "FFmpeg: Required as a system dependency."
- License: "Apache 2.0 ... no per-render fees or commercial-use thresholds. The system is self-contained and can run entirely locally." API keys "Not required."

## Exact install + CLI (verbatim)
```bash
npx hyperframes init my-video
cd my-video
npx hyperframes preview      # browser preview with live reload
npx hyperframes render       # render to MP4
```
Agent skill install:
```bash
npx skills add heygen-com/hyperframes
npx hyperframes add <block-name>   # install catalog components
```
Full CLI surface: `init`, `preview`, `render`, `lint`, `inspect`, `validate`, `publish`, `doctor`, plus AWS Lambda cloud render path: `lambda deploy`, `lambda render`, `lambda progress`. CLI is "non-interactive by default" -> CI/script friendly.

## HTML input format (verbatim example)
```html
<div id="stage" data-composition-id="launch" data-start="0"
     data-width="1920" data-height="1080">
  <video class="clip" data-start="0" data-duration="6"
         data-track-index="0" src="intro.mp4" muted playsinline></video>
  <h1 id="title" class="clip" data-start="1"
      data-duration="4" data-track-index="1">Launch day</h1>
  <audio data-start="0" data-duration="6"
         data-track-index="2" data-volume="0.5" src="music.wav"></audio>
</div>
```
data attributes: `data-start` (seconds), `data-duration`, `data-track-index` (layer order), `data-composition-id`, `data-width`/`data-height` (px), `class="clip"` (marks seekable elements). Plain HTML, NOT React-dependent, no build step.

## Animation timeline (verbatim GSAP example)
```javascript
const tl = gsap.timeline({ paused: true });
tl.from("#title", { opacity: 0, y: 40, duration: 0.8 }, 1);
window.__timelines = window.__timelines || {};
window.__timelines.launch = tl;
```
Timelines must be seekable (frame-accurate) and `paused: true`; the framework drives the playhead. Adapter-based: GSAP, CSS animations, Lottie, Three.js, Anime.js, WAAPI, custom frame adapters.

## Programmatic packages
- `@hyperframes/core` (parsing + types)
- `@hyperframes/engine` (Puppeteer + FFmpeg wrapper)
- `@hyperframes/producer` (full capture -> encode -> audio-mix pipeline)
- `@hyperframes/player` (`<hyperframes-player>` web component)
Output: MP4 default; resolution via data-width/height (commonly 1920x1080); fps configurable (30/60); some blocks render transparent overlay formats (lower-thirds).

## Annotations for weapon-forge
- This is the AUTHORITATIVE replacement for the thin video bullet in the for-now SKILL.md. weapon-forge should add a `guides/video-hyperframes.md` with: the `npx hyperframes init/preview/render` loop, the data-* HTML schema, the `paused: true` seekable-timeline rule, and Node 22 + FFmpeg as the install prereqs.
- For the social-creative use case (1080x1080 or 9:16 vertical logo reveals/intros/outros), set `data-width`/`data-height` to the square or vertical canvas, not 1920x1080. The card SVG palette/fonts carry straight into the HTML composition.
- The `npx skills add heygen-com/hyperframes` path means the Guardian can install HyperFrames as an agent skill - worth a worked example in the weapon.
- Determinism + local-only + Apache 2.0 makes this safe to commit into a client repo; pair with kie.ai for the premium AI clip (see kie-ai-video/).
- No contradiction with the for-now weapon; this DEEPENS it with exact install, CLI surface, data-attribute schema, and the seekable-timeline contract that were not in the canonical copy.
