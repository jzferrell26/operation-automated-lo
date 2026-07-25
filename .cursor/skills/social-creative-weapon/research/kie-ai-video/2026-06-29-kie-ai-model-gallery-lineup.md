---
source_url: https://kie.ai/market
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: medium
topic: kie-ai
weapon: social-creative-weapon
---

# kie.ai model gallery - the unified lineup behind one API

## Summary
kie.ai's value prop is one API key + one REST shape fronting 10+ frontier models across video, image, audio, and LLM. For the social-creative video layer the relevant choices: Veo 3.1 (text+image-to-video, cinematic, native 9:16), Kling 3.0 (multi-shot, native audio, up to 15s), Seedance 2.0 (ByteDance, fast + multi-shot consistency), plus 20+ image-to-video models (Wan, Hailuo, Runway, Grok Imagine). Image side: Nano Banana (Gemini 2.5 Flash Image) and Flux for stills.

## Key quotations / statistics
- "access ... Veo, Kling, Seedance, Runway, Claude, GPT, Gemini, Nano Banana, Suno, and more through a unified API."
- "20+ Image to Video API models, including Google, Kling, Seedance, Wan, Hailuo, Runway, Grok Imagine."
- Veo 3.1: "supports both text-to-video and image-to-video ... high-fidelity, cinematic visuals."
- Kling 3.0: "creates videos from text and images, supports multi-shot storytelling, and produces native audio with cinematic control up to 15 seconds."
- Seedance 2.0: "multimodal AI video model by ByteDance, optimized for fast and realistic video generation with strong multi-shot consistency."
- Nano Banana = "Gemini 2.5 Flash Image Preview ... natural language-driven image generation and editing, ... physics-aware visuals."

## Annotations for weapon-forge
- DECISION MATRIX for `guides/video-kie-ai.md` (pick by beat + budget):
  - Veo 3 Fast (9:16, 8s, $0.40): default short social clip / jab motion.
  - Veo 3 Quality ($2.00): hero "right hook" clip where fidelity matters.
  - Kling (image-to-video, 5/10s, native audio): animate a brand still / longer narrative beat.
  - Seedance: fast multi-shot consistency when you need several coherent shots cheaply.
- Image models (Nano Banana, Flux) are available on the SAME key - useful if a client needs an AI-generated still to feed the card or as a kie.ai image-to-video first frame. But on-brand stills should still prefer the deterministic resvg card path; reserve AI stills for backgrounds/textures.
- The "one key, one REST shape" claim is slightly nuanced by the two endpoint shapes we found (`/veo/generate` vs `/jobs/createTask`) - weapon-forge should note both.
- Keep the weapon vendor-neutral at the abstraction layer: a thin kie.ai client that takes {model, prompt, image, aspect, duration} and hides whether it routes to Veo or Kling, so swapping models is a config change. Mirrors social-publishing-guardian's provider-abstraction stance.
