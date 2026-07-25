# Research Summary: social-creative-weapon

Authored by loremaster, 2026-06-29.

## Depth tier consumed
**deep** (confirmed in both the Command Brief YAML `research_depth: deep` and backlog entry 9). Run was deliberately weighted, per the brief's instructions, toward the LEAST-PROVEN video layer (HeyGen HyperFrames + kie.ai), with focused corroboration passes on the already-verified resvg-js + sharp recipes. The core static-card recipes were already built + verified on a real client (heather-brand-engine, 2026-06-29); this run fills GAPS against primary docs rather than re-deriving them.

## Time window covered
2026 content, primarily within the last ~3 months (HyperFrames launched 2026-04-17; kie.ai docs are current; the HyperFrames 2026-06-22 release was captured). Stable library docs (resvg-js, sharp, satori) are version-agnostic and current.

## Tools used
WebSearch + WebFetch. Firecrawl and Exa were NOT connected in this environment (the brief's tooling note anticipated this). Primary sources were fetched directly via WebFetch where the host allowed it. Note: kie.ai's marketing domain (kie.ai/pricing, kie.ai/v3-api-pricing) and npmjs.com returned HTTP 403 to WebFetch (bot guard); their content was recovered via the docs.kie.ai subdomain (which served cleanly) and via WebSearch result extracts. No auth failures, no silent tool fallbacks.

## Files written: 15 source files across 6 subfolders
- hyperframes-video/ (5), kie-ai-video/ (4), resvg-cards/ (2), sharp-photos-overlays/ (2), brand-spec/ (1), content-cadence/ (1). Plus research-plan.md, index.md, this summary.

## The 5 most influential sources

1. **`hyperframes-video/2026-06-29-hyperframes-agent-authoring-rules-determinism.md`** (HyperFrames CLAUDE.md). THE highest-value gap-fill. Gives the exact agent authoring contract: `class="clip"`, GSAP timelines `paused` + registered on `window.__timelines`, determinism rules (no `Date.now()`, no unseeded `Math.random()`, no runtime network fetch), and the `lint` -> `validate` -> `render` gate. weapon-forge: this is the spine of `guides/video-hyperframes.md`.

2. **`kie-ai-video/2026-06-29-kie-ai-veo3-generate-api-contract.md`** (docs.kie.ai). The exact Veo 3/3.1 request/response contract: `POST /api/v1/veo/generate`, Bearer auth, full param table (model/aspect_ratio 9:16/duration/resolution/imageUrls), taskId + poll/callback. weapon-forge: the worked kie.ai example builds directly from this.

3. **`kie-ai-video/2026-06-29-kie-ai-pricing-getting-started-gotchas.md`** (docs.kie.ai). The operational guardrails the for-now weapon only guessed: 200=created-not-done, rate limit 20/10s (429 not queued), and the CRITICAL 14-day file retention (must download the MP4 promptly). Plus exact pricing ($0.005/credit, Veo Fast $0.40, Veo Quality $2.00).

4. **`sharp-photos-overlays/2026-06-29-sharp-resize-cover-gravity-attention-extract.md`** + **`...-sharp-composite-svg-overlay-gradient-scrim.md`** (sharp official). Corroborate the crop + overlay recipes exactly AND add `sharp.strategy.attention`/`entropy` auto-framing (an automatic alternative to hand-tuned cx/cy) and the `over` blend / overlay<=base / resize-before-composite rules. weapon-forge: hardens `guides/photos-sharp.md` and `guides/overlays-sharp.md`.

5. **`resvg-cards/2026-06-29-resvg-js-api-font-loading-fitto.md`** (resvg-js official). Closes the for-now weapon's open TODO on brand fonts: `font.fontFiles: ['./Brand.ttf']` + `loadSystemFonts:false` for fidelity, and the silent-failure gotcha (resvg has no network font fallback - any font named in the SVG must be loaded locally or glyphs render wrong without erroring).

## Query coverage (vs the brief's 6 + deep-tier refinements)
- resvg-js SVG->PNG 1080x1080: COVERED (official API + font object + fitTo + Satori-vs-raw-SVG decision).
- sharp crop/cover/gravity/composite/EXIF: COVERED (official resize + composite docs; added attention/entropy + .rotate orientation note).
- programmatic on-brand graphics from a brand guide: COVERED (brand-guidelines-as-queryable-data, the "Claude design md" model).
- HyperFrames HTML->MP4: HEAVILY COVERED, far beyond the for-now weapon - README/render model, official intro, the CLAUDE.md agent contract, the vs-Remotion practitioner review with render-speed numbers, and the deploy/scale path.
- kie.ai Veo 3.1 / Kling: HEAVILY COVERED, far beyond the for-now weapon - two endpoint shapes (`/veo/generate` and `/jobs/createTask`), exact params, pricing, rate limits, retention, model gallery.
- jab/jab/right hook cadence: COVERED (source-cited the doctrine behind the asset-selection rule).

## NEW video-layer detail beyond the for-now weapon (the brief's headline ask)
HyperFrames: the full CLI surface (init/preview/render/lint/validate/inspect/publish/doctor/lambda*), the data-* HTML schema (data-start/duration/track-index/composition-id/width/height + class="clip"), the seekable `paused:true` + `window.__timelines` timeline contract, the determinism rules (no Date.now/random/fetch), `frame=floor(time*fps)`, the `@hyperframes/core|engine|producer|player` packages, Node 22 + FFmpeg prereqs, render-speed reality (~3 min/30s@1080p local) with `--workers auto` and `lambda render` escape hatches, and the 2026-06-22 CSS-variable-font determinism fix.
kie.ai: the two REST shapes, exact Veo + Kling request bodies, 9:16 native vertical, taskId+poll/callback, $0.005/credit pricing, 20/10s rate limit, and the 14-day retention rule (download promptly).

## Open questions that survived (for the user / human, not for weapon-forge to invent)
1. **Brand TTF files are a per-client input.** resvg can load them via `fontFiles`, but the actual .ttf/.otf for each client (e.g. Heather's exact brand serif vs the operator-approved Georgia system substitute) must be supplied by the client. Default remains system fonts; swap to brand TTFs on request. (Carried from the brief's TODOs, now with the exact mechanism.)
2. **Video layer is a per-client SPIKE.** HyperFrames is new (April 2026) and kie.ai pricing/endpoints should be re-verified live at build/use time. The endpoint paths captured here (`/api/v1/veo/generate`, `/api/v1/jobs/createTask`) and pricing were current 2026-06-29 but the brief explicitly flags treating video as a spike before committing per client.
3. **kie.ai 14-day retention** means the pipeline needs a re-host/download step for any kept video; where that hosted MP4 lives (client repo, GHL media, Supabase storage) is a per-deployment decision the human/social-publishing-guardian owns.
4. **Marketing-domain access:** kie.ai/pricing and npmjs.com 403'd WebFetch. Pricing here came from docs.kie.ai + search extracts; weapon-forge should confirm live pricing from kie.ai/pricing in a browser at build time if exact current numbers matter.

## Sources weapon-forge should re-fetch with deeper context at build time
- `docs.kie.ai` "Get Video Details" / record-info polling endpoint (we have the create + callback shapes; the exact poll endpoint path/params should be pulled fresh when authoring the worked kie.ai client example).
- HyperFrames `/guides/rendering` and the `/hyperframes-core` timing-contract skill (referenced by the CLAUDE.md) for the complete data-* timing spec if a complex multi-clip composition is needed.
- kie.ai/pricing (live, in a browser) for exact current per-model credit costs at the moment of a client commit.
