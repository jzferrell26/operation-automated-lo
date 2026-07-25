---
source_url: cuantico-internal://operator-memory + private-repo://cuantico-sms (NOT public web)
retrieved_on: 2026-06-29
source_type: internal-prior-art
authority: official
relevance: critical
topic: cuantico-contract
weapon: assistable-sms-weapon
---

# Cuantico-internal contract: Assistable payload + cuantico-sms engine

> PROVENANCE: This is Cuantico-INTERNAL prior art, NOT public-web documentation. It is sourced from operator memory (the "Assistable webhook payload shape" and "Cuantico SMS Engine" memory entries) and the private `cuantico-sms` repo, corroborated by the live `assistableai` MCP schemas (see assistableai-mcp-schemas.md). The public web does NOT document Assistable's specific payload shape; do not expect to find it there.

## Summary

Two authoritative internal contracts the weapon must encode verbatim. (1) The Assistable inbound webhook payload contract: tool arguments arrive under `body.args`; `contact_id` and `location_id` arrive under `body.metadata` AND duplicated in the request headers. Looking anywhere else is the classic Assistable integration bug and it fails SILENTLY. (2) The cuantico-sms engine: Cuantico's own GHL-native AI SMS product built to replace the third-party Assistable dependency; repo `cuantico-sms` (private); stack LOCKED as Next.js + Inngest + Supabase; Sprint 0 scaffold is done.

## Key facts (verbatim from operator memory / repo)

Assistable inbound webhook payload contract:
- Tool args: `body.args`
- `contact_id`: `body.metadata.contact_id` AND request headers
- `location_id`: `body.metadata.location_id` AND request headers
- Corroboration: the live MCP surface uses `X-Subaccount-Id` header + `subaccount_id`/`location_id` body aliases for subaccount routing, matching the "header AND body" duplication.

cuantico-sms engine:
- Purpose: own GHL-native AI SMS to replace Assistable
- Repo: `cuantico-sms` (private)
- Stack: Next.js + Inngest + Supabase (LOCKED)
- State: Sprint 0 scaffold done; concrete post-Sprint-0 milestones are an OPERATOR INPUT (not yet defined)

## Annotations for weapon-forge

- The payload contract is the #1 thing the weapon's webhook-parsing guide must hardcode. Write a parser that reads `body.args` for arguments and resolves `contact_id`/`location_id` from `body.metadata` with the headers as a fallback/cross-check. Add an explicit guard: if these are absent from BOTH locations, FAIL LOUDLY (the whole point is that the classic bug is a silent failure).
- The cuantico-sms stack is locked; the weapon should NOT re-litigate the stack choice. Inngest = durability/orchestration, Supabase = persistence, Next.js = the HTTP/`serve()` surface. The external authorities (Inngest idempotency docs, GHL Conversations API, Supabase pooling) are the public-web backing for this locked stack.
- OPEN ITEMS carried from the brief (resolve per engagement, operator input required):
  1. Migration ownership boundary: does this Guardian own the cuantico-sms BUILD (Next.js/Inngest/Supabase code) or only the Assistable integration + migration DESIGN + handler wiring, handing generic backend mechanics to typescript-node-guardian? Brief default: owns the SMS-agent contract + migration design + handler wiring; hands generic backend to the language Guardian.
  2. Concrete cuantico-sms milestones beyond Sprint 0 = operator input.
  3. Whether the live SMS path runs through n8n or directly to Assistable today determines how much n8n-workflow-guardian is in the loop.
- ROUTING boundaries (from the brief): GHL contact/field WRITES -> gohighlevel-guardian; n8n plumbing that triggers a send -> n8n-workflow-guardian; generic TS/Node backend mechanics -> typescript-node-guardian; Supabase deploy/platform -> supabase-platform-guardian; durable-workflow mechanics -> durable-workflows-guardian. This Guardian owns the SMS-agent contract + the migration.
- SECRETS: Assistable keys, GHL sub-account tokens, Supabase keys are env-only; never logged or committed (Guardian directive #5).
