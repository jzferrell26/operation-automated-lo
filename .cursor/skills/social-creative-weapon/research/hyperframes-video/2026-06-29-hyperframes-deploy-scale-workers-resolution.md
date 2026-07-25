---
source_url: https://hyperframes.heygen.com/guides/deploy
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: medium
topic: hyperframes
weapon: social-creative-weapon
---

# HyperFrames deploy + scale - workers, resolution, cloud render

## Summary
HyperFrames offers a browser-preview -> edge-function -> sandboxed-renderer deploy model with official Vercel and Cloudflare templates (copy compositions into `public/compositions/`, deploy via `vercel deploy` or `npm run deploy`). For throughput, local rendering parallelizes with `--workers auto` (three parallel Chrome workers cut render time meaningfully vs single-worker), and an AWS-Lambda self-deploy SDK exists (`lambda deploy`/`render`/`progress`) so one composition can fan out to many renders in your own AWS account. Resolution is set via `--width`/`--height` flags.

## Key quotations / statistics
- Deploy architecture: "browser preview -> edge function -> sandboxed renderer"; official templates = Vercel and Cloudflare.
- Local parallelism: "with --workers auto, three parallel Chrome workers cut render time meaningfully vs. single-worker."
- Lambda path (from README/CLI): `npx hyperframes lambda render ./my-project --width 1920 --height 1080 --wait`; "render at scale in the cloud on Lambda, so one composition becomes a thousand"; it is "a self-deploy SDK - you stand up the Lambda functions in your own AWS account."
- 2026-06-22 release fixed production-render edge cases: shader transitions survive the producer capture path, audio muxing preserves full stream duration, and "CSS variable font declarations no longer trip deterministic font resolution."

## Annotations for weapon-forge
- The render-speed bottleneck (3 min for 30s @1080p local, per the practitioner review) has TWO escape hatches: `--workers auto` for local parallelism, and `lambda render` for cloud fan-out. Document both in `guides/video-hyperframes.md` for when a client needs more than a one-off intro.
- Resolution flags `--width`/`--height` are how you target a square (1080x1080) or vertical (1080x1920) social canvas at render time, independent of the composition's data-width/height.
- The 2026-06-22 CSS-variable-font fix is directly relevant to BRAND FONTS: if the weapon uses CSS variables for the brand font-family, ensure HyperFrames >= that release so font resolution stays deterministic. Pin a recent version.
- For most social-creative use (one branded intro/outro per campaign) local `npx hyperframes render` is sufficient; reserve cloud render for volume. Keep the weapon's default simple.
- Note: the deploy guide's official templates are Vercel/Cloudflare for hosting the renderer service; the Lambda SDK is the at-scale option. Not every client needs either - the local CLI is the baseline.
