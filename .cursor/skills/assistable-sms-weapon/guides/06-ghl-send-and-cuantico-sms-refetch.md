# 06 - GHL send-SMS contract and re-fetch targets

Supporting guide for the migration's external write path and the sources weapon-forge flagged for a deeper pull before you author send-SMS code.

Source: `research/ghl-api/2026-06-29-ghl-conversations-send-message-api.md` and `research/research-summary.md` (re-fetch targets).

## The GHL send-SMS call

The cuantico-sms engine delivers an SMS through the GHL Conversations API:

- **`POST /conversations/messages`** - "Post the necessary fields for the API to send a new message." Current iteration tagged **v3**. A 200 means the message was created.
- The Conversations API sends SMS and email, retrieves history, accesses the unified inbox, and triggers AI reply responses, all via API.
- **Auth**: Personal Integration Token (PIT) or JWT. **Use a SUB-ACCOUNT token** so calls act within the correct location context. This aligns with the Assistable `X-Subaccount-Id` pattern: location context travels with the token/header on both sides.
- **V1 end-of-support was 2025-12-31.** Use V2/V3.

The field-level semantics (the exact `type`/SMS selector, `contactId`, `message` body fields, the `Version` header) are gohighlevel-guardian's territory for the catalog. You own the fact that the engine sends through this endpoint and that it needs a sub-account token; route the field catalog to gohighlevel-guardian.

## The native Conversation AI Public API (if the migration rides native)

If the migration chooses to ride GHL's native Conversation AI rather than a fully custom LLM loop, the relevant Marketplace API 2.0 surface is:

- **Agents**: Create, Search, Update, Get, Delete.
- **Actions**: Attach, List, Get, Update, Remove, Update Followup Settings.
- **Generations**: Get Generation Details.

Note the gap: the Public API does NOT expose per-conversation bot enable/disable or off/suggestive/auto mode toggles; those are configured in the workflow / AI-Employee UI, not the API. Flag this for the migration design.

## Re-fetch targets (do before authoring send-SMS code)

> TODO: re-fetch. GHL `POST /conversations/messages` verbatim body schema + the `Version` header. The marketplace docs page is JS-rendered and returned thin via WebFetch. Re-fetch the Stoplight reference (`highlevel.stoplight.io`) or the marketplace page in a browser session for the exact field list before authoring the send-SMS code. (Field semantics are also gohighlevel-guardian's territory.)

> TODO: re-fetch. The GHL Conversation AI Public API (Agents / Actions / Generations) full endpoint specs at `marketplace.gohighlevel.com/docs/ghl/conversation-ai/actions`. Only summarized in research; pull the full spec if the migration rides native Conversation AI.

> TODO: re-fetch. The `cuantico-sms` private repo for the Sprint-0 scaffold shape, the actual inbound-webhook verification code, and any already-ported handlers. This is the authoritative internal source; read it directly rather than reconstructing from memory.

## Why these are flagged, not invented

Per the no-unresearched-assertions rule, the Weapon does not fabricate the exact GHL request body or the Assistable signature scheme. These are real gaps loremaster identified; resolve them by re-fetching the cited sources or reading the private repo, not by guessing.
