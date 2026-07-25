# Research Plan: social-creative-weapon

- **Depth tier:** deep
- **Time window:** 2025-12-29 back to 2026-06-29 (6 months), extend to 12 months for stable library docs (resvg-js, sharp) that change slowly
- **Page budget target:** thousands (deep tier); weighted heavily toward the LEAST-PROVEN video layer (HyperFrames + kie.ai) per the brief, with corroboration passes on resvg-js + sharp
- **Source breadth target:** official docs (resvg-js GitHub + npm, sharp pixelplumbing, HyperFrames GitHub, kie.ai), practitioner blogs, GitHub READMEs/source, changelogs, comparison reports
- **Tooling note:** Firecrawl + Exa are NOT connected in this environment. Using WebSearch + WebFetch instead. Primary sources fetched directly via WebFetch where possible.

## Calibration from the Command Brief

The core recipes (resvg cards, sharp crop, sharp overlays, preview) are ALREADY built + verified on a real client (heather-brand-engine, 2026-06-29) and documented in the canonical hand-authored weapon at `~/.claude/skills/social-creative-weapon/SKILL.md`. This run does TWO things:
1. **Corroborate** the resvg-js + sharp recipes against their official docs (font loading, fitTo, gravity, attention strategy, EXIF strip, composite) so weapon-forge builds from primary evidence, not memory.
2. **Deepen** the video layer (HeyGen HyperFrames + kie.ai) far beyond the for-now weapon: install/CLI/API, render model, pricing/credits, Veo/Kling endpoints. This is the spike the brief flags.

FILL GAPS, do not duplicate the hand-authored SKILL.md.

## Initial queries (from session-zero / backlog entry 9)
- "@resvg/resvg-js SVG to PNG rasterize Node social card 1080x1080 2026"
- "sharp Node crop to square cover gravity composite SVG overlay EXIF strip 2026"
- "programmatic on-brand social media graphics generation brand guide palette fonts 2026"
- "HeyGen HyperFrames HTML CSS JS to MP4 logo reveal intro outro branded video 2026"
- "kie.ai unified API Veo 3.1 Kling AI video generation 2026"
- "jab jab right hook social content cadence value vs CTA image mix 2026"
- "generate branded quote card gradient scrim text overlay photo Node pipeline 2026"

## Expansion queries (authored by loremaster, deep-tier)

### Branch from resvg-js
- resvg-js font loading custom TTF fontFiles fontDirs defaultFontFamily 2026
- resvg-js fitTo mode width/zoom/height rendering options API 2026
- satori vs resvg-js social card og image generation 2026
- resvg-js text not rendering / font fallback gotchas 2026

### Branch from sharp
- sharp composite gravity / position SVG over image 2026
- sharp resize fit cover position attention/entropy strategy 2026
- sharp EXIF / metadata strip keep orientation rotate 2026
- sharp extract crop region region-of-interest 2026

### Branch from HyperFrames (least proven - heaviest)
- HeyGen HyperFrames install npm render CLI usage 2026
- HeyGen HyperFrames API render HTML to MP4 headless browser 2026
- HeyGen HyperFrames vs Remotion vs Puppeteer screen-record video 2026
- github.com/heygen-com/hyperframes README features license

### Branch from kie.ai (least proven - heavy)
- kie.ai pricing credits Veo 3.1 Kling endpoints API key 2026
- kie.ai Veo 3 / Veo 3.1 video generation API request body 2026
- kie.ai Kling 2.x/3.0 image-to-video API 2026
- kie.ai unified API models list (Seedance, Runway, GPT image) 2026

### Branch from brand-spec / cadence
- markdown brand guide as design source palette fonts voice for automation 2026
- Gary Vaynerchuk jab jab jab right hook content strategy still relevant 2026

## File organization
- `resvg-cards/` - resvg-js rasterization + font loading + fitTo
- `sharp-photos-overlays/` - sharp crop/cover/gravity/composite/EXIF
- `brand-spec/` - markdown-brand-guide-as-source + programmatic graphics generation
- `hyperframes-video/` - HeyGen HyperFrames HTML-to-MP4
- `kie-ai-video/` - kie.ai unified video API (Veo/Kling)
- `content-cadence/` - jab/jab/right-hook image mix
- One source = one file. `<YYYY-MM-DD>-<slug>.md`. index.md updated after each write.
