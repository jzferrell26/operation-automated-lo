# Example 02 - Branded short (HyperFrames bookends + kie.ai clip)

The video extension end to end: a HyperFrames on-brand logo intro and outro bookending a premium kie.ai clip, all driven by the SAME brand spec. This demonstrates `guides/07` (HyperFrames) and `guides/08` (kie.ai). It is the edge-case/spike example: the video layer is a per-client spike, so this run carries live-verify TODOs and treats nothing as committed until checked at build time.

> TODO: open question - the video layer is a per-client spike. Re-verify HyperFrames version (>= 2026-06-22) and kie.ai endpoints/pricing live before committing this per client.

## The shape of the short

A 14-second vertical (1080x1920) short:

1. **0.0-3.0s** HyperFrames intro: logo reveal + name, on-brand, deterministic.
2. **3.0-11.0s** kie.ai Veo clip: an 8s premium hero clip (the "right hook").
3. **11.0-14.0s** HyperFrames outro: CTA card + url, on-brand, deterministic.

The brand spec drives all three; the bookends and the clip share palette, fonts, and voice.

## Step 1 - Author the HyperFrames intro (guide 07)

Prereqs: Node 22+, FFmpeg. Scaffold and author the scene from the same Strategist palette (`#f9f5f0`, `#313d3b`, `#c9a96e`) and Georgia serif:

```bash
npx hyperframes init heather-intro
cd heather-intro
```

```html
<div id="stage" data-composition-id="intro" data-start="0"
     data-width="1080" data-height="1920">
  <img class="clip" data-start="0" data-duration="3" data-track-index="0" src="./assets/logo.png">
  <h1 id="name" class="clip" data-start="0.5" data-duration="2.5" data-track-index="1"
      style="font-family: Georgia, serif; color: #313d3b;">Heather Ferrari</h1>
</div>
<script>
  const tl = gsap.timeline({ paused: true });
  tl.from("#name", { opacity: 0, y: 40, duration: 0.8 }, 0.5);
  window.__timelines = window.__timelines || {};
  window.__timelines.intro = tl;
</script>
```

Determinism: the logo is bundled locally in `./assets/` (no remote fetch), no `Date.now()`, no unseeded `Math.random()`. Gate before render:

```bash
npx hyperframes lint && npx hyperframes validate    # both must pass
npx hyperframes render --width 1080 --height 1920    # -> intro.mp4
```

`lint` + `validate` is the video review gate, analogous to the static `preview.html`. Author the outro the same way (`design.md` derived from the brand spec keeps it on-brand).

## Step 2 - Generate the kie.ai hero clip (guide 08)

Native vertical, image-to-video so the clip stays on-brand by starting from a cropped brand frame. API key from an env var only:

```js
const res = await fetch("https://api.kie.ai/api/v1/veo/generate", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.KIE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    prompt: "warm, confident keynote energy, soft brand light, slow push-in",
    imageUrls: ["https://.../photo-warm-1080.png"], // a sharp-cropped brand frame
    model: "veo3_fast",          // $0.40/8s default; veo3 ($2.00) for a true hero
    aspect_ratio: "9:16",
    duration: 8,
    resolution: "1080p",
  }),
});
const { data } = await res.json();   // { code: 200, ... } means CREATED, not done
const taskId = data.taskId;
```

Then POLL (200 = created, not done). Store the taskId, make the poll idempotent, and back off (rate limit 20/10s, 429 not queued):

```js
// pseudo-poll: GET the kie.ai "Get Video Details" endpoint by taskId until resultUrls is set
let resultUrl;
while (!resultUrl) {
  await sleep(5000);
  resultUrl = await getVideoDetails(taskId); // re-confirm the exact poll path from docs.kie.ai at build time
}
```

### The 14-day retention step (do not skip)

The moment the clip finishes, DOWNLOAD it and re-host/commit it. The kie.ai resultUrl expires in 14 days:

```js
const mp4 = await (await fetch(resultUrl)).arrayBuffer();
await fs.writeFile("./assets/hero.mp4", Buffer.from(mp4)); // then commit or push to the chosen host
```

> TODO: open question - the kie.ai 14-day retention needs a re-host destination (client repo, GHL media, Supabase storage). Decide it per deployment before generating clips you intend to keep; social-publishing-guardian / the human owns where the kept MP4 lives.

## Step 3 - Stitch the short

Concatenate `intro.mp4` + `hero.mp4` + `outro.mp4` (FFmpeg concat, all at 1080x1920). The result is one on-brand vertical short: deterministic branded bookends around a premium AI hero clip, the whole thing driven by the one brand spec.

## What this example shows

- The two video shapes chain: HyperFrames for deterministic on-brand bookends, kie.ai for the premium clip.
- The determinism rules (local assets, no Date.now/random/fetch, lint+validate gate) make the bookends reproducible.
- The kie.ai async contract (200 = created, poll/callback, download within 14 days, throttle to the rate limit) is enforced, not assumed.
- The same brand spec carries across cards, overlays, and video, which is the reproducibility thesis.

## See also

- Guides demonstrated: `guides/07-video-hyperframes.md`, `guides/08-video-kie-ai.md`.
- Scene skeleton: `templates/hyperframes-scene.template.html`.
- Sources: the four files in `research/hyperframes-video/` and `research/kie-ai-video/`.
