---
source_url: https://docs.zernio.com/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: zernio-publish-states
weapon: social-publishing-weapon
---

# Zernio API docs: DRAFT / SCHEDULED / PUBLISHED post modes

## Summary
THE most important Zernio finding of this run. The arsenal weapon left Zernio's publish-gate semantics as an UNVERIFIED open question ("confirm the platform's actual publish semantics before trusting any scheduled state"). The official Zernio docs RESOLVE it: Zernio supports a true DRAFT mode where the post is saved but NOT published. This means Zernio CAN satisfy the drafts-only invariant natively, unlike GHL where "scheduled" auto-publishes.

## Key quotations / statistics
- "Posts can be saved as DRAFT, SCHEDULED, or PUBLISHED immediately."
- Three modes:
  1. DRAFT: "Use when user says 'draft', 'save for later', 'don't publish'. Post is saved but NOT published."
  2. SCHEDULED: "Use when user says 'schedule', 'in X minutes/hours'. Post is scheduled for future publication."
  3. IMMEDIATE/PUBLISH: "Use when user says 'publish now', 'post now', 'immediately'. Post goes live right away."
- Create post: `content`, `scheduledFor` timestamp, `timezone`, `platforms` array; multi-platform by adding entries to the platforms array.
- Official SDKs: Python (`zernio-sdk` on PyPI, zernio-dev/zernio-python), PHP (zernio-dev/zernio-php), .NET (zernio-dev/zernio-dotnet), JavaScript.
- Make.com integration with 20+ modules; changelog at docs.zernio.com/changelog; platforms overview at docs.zernio.com/platforms.

## Annotations for weapon-forge
- RESOLVES OPEN QUESTION: Zernio HAS a native DRAFT state ("saved but NOT published"). The arsenal's caution is now answered - for Zernio, create with the DRAFT mode and the publish-gate invariant is satisfied by the provider itself. weapon-forge should update the Zernio runbook to specify DRAFT mode as the default, exactly mirroring the GHL `status:"draft"` rule.
- CONTRAST for the publish-gate guide: GHL has draft (safe) and scheduled (AUTO-PUBLISHES, unsafe as an approval gate). Zernio has draft (safe, "not published"), scheduled (future publish), and immediate. The invariant is identical across both: create DRAFT, let the human promote it. weapon-forge should present a unified "always create DRAFT" rule that maps to each provider's draft primitive.
- NEW: official SDKs in 4 languages reduce the need to hand-roll the HTTP client. Note the Python and JS SDKs for the Cuantico stack.
- The mode descriptions are phrased for an AI agent ("use when user says...") which confirms Zernio is built MCP/agent-first - reinforces the agentic-publishing-layer selection row.
