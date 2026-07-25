---
source_url: https://www.blotato.com/pricing
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: blotato
weapon: social-publishing-weapon
---

# Blotato: API, pricing, MCP, platforms

## Summary
Blotato is a creator-focused social automation tool with an MCP-ready API. The arsenal weapon lists it as an extensible alternative without detail. This source gives pricing, platform coverage, the MCP endpoint, and a valuable 2026 per-platform API-cost breakdown (the real underlying platform fees any unified API abstracts).

## Key quotations / statistics
- Pricing: Starter $29/mo, Creator $97/mo, Agency $499/mo; 7-day free trial on every plan. API included on every paid plan from $29/mo.
- MCP: "MCP-ready for Claude, Claude Code, and Claude Cowork/Desktop"; MCP server at `https://mcp.blotato.com/mcp` - any MCP-compatible agent can publish directly.
- Platforms (9): X, Instagram, LinkedIn, TikTok, YouTube, Threads, Facebook, Pinterest, Bluesky.
- 2026 underlying-platform API cost reality (from Blotato's own blog, broadly useful):
  - X: pay-per-use, ~$0.20 per post with a URL.
  - Meta (IG/FB/Threads): free but gated by App Review.
  - LinkedIn Community Management API: requires MDP partner approval.
  - TikTok: forces a sandbox audit.
  - YouTube: priced in quota units.
  - Reddit: ~$12,000/year for commercial use.
  - Bluesky: free, 5,000 points/hour rate cap.
  - Pinterest: free, rate-limited per category.
- Value prop: "covers 9 platforms from one endpoint and skips every review queue."

## Annotations for weapon-forge
- SELECTION-TABLE INPUT: Blotato is the cheapest MCP-enabled entry ($29/mo) and creator-oriented. Has MCP like Zernio. Knocked by Zernio for "no SOC 2" and "posting-only" - if true, Blotato lacks the DM/comment/analytics breadth of Zernio. weapon-forge should present Blotato as a low-cost MCP posting option, Zernio as the broader unified layer.
- HIGH-VALUE CROSS-CUTTING FACT: the per-platform API-cost table is gold for the "why use a unified provider at all" rationale. The unified providers (GHL/Zernio/Ayrshare/Blotato) exist precisely because direct platform integration means App Review queues, MDP partner approval, sandbox audits, and Reddit's ~$12k/yr commercial fee. weapon-forge should put this in a guide explaining WHY the publishing layer abstracts these.
- PUBLISH-GATE: Blotato is "posting-only" per the Zernio knock; verify whether it has a draft/hold state. Same drafts-only caution applies.
