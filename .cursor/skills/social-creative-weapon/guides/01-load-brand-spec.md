# 01 - Load the brand spec

ACTION step 1: load the brand spec; pull palette, fonts, voice, and signature lines. Never invent brand facts.

## Why this is step one

A markdown brand spec (hex codes, fonts, logo files, approved photo style, voice/registers, signature lines) is the foundation every generator reads before producing anything. The 2026 frontier is "treating brand guidelines as a data source to be queried, not a document to be read" (`research/brand-spec/2026-06-29-brand-guidelines-as-queryable-data-source.md`). Skip this and every downstream tool produces generic mush.

## What to read out of the spec

Open the client's `BRAND-GUIDE.md` (sometimes called the "Claude design md"). Extract, as structured data your generators can select on:

| Field | Example (Heather Ferrari) | Used by |
|---|---|---|
| Palette hexes | cream `#f9f5f0`, slate `#313d3b`, teal `#567572`, sage `#8aaba8`, gold `#c9a96e`; HF Bomb dark `#161616`, red `#d1410c` | cards, overlays |
| Fonts | Georgia serif (Strategist), Arial Black (HF Bomb); brand TTFs on request | cards, overlays, video |
| Registers / voices | Strategist (elegant, serif, gold accent) vs HF Bomb (bold, all-caps, red accent) | asset selection per beat |
| Signature lines | "Free. Live. No replay.", "HF Bomb - free community" | card footers, overlay subs |
| Approved photo style | warm headshots, keynote/podium, workshop | photo crops, overlays |
| Logo files | logo SVG/PNG paths | video intro/outro, watermark |

## Registers are separate fields, not prose

Store each register as its own structured block (palette subset, font, accent color, copy tone). A generator selects the register deterministically per beat (see `guides/02-asset-cadence.md`); it never blends one register's copy into the other's look. This is the "keep registers separate, no bleed" guardrail in `guides/00-principles.md`.

## One spec, many outputs

The same spec drives the square card (1080x1080), the vertical story (1080x1920), the link preview (1200x628), and the video. Parameterize the canvas size, hold the palette/fonts/voice constant. This is the reproducibility thesis and it is why the spec is read once and reused, never re-typed per asset.

## Missing brand facts

If the spec lacks a needed fact (a font file, an accent hex, a signature line for a new register), do NOT guess. Ask the human, and mark it in the report:

> TODO: open question - needs human decision

## See also

- The verified card generator reads its palette straight from the spec: see the header comment in `examples/01-heather-campaign-generation.md`.
- Source: `research/brand-spec/2026-06-29-brand-guidelines-as-queryable-data-source.md`.
