---
source_url: https://marketplace.gohighlevel.com/docs/ghl/conversations/send-a-new-message/ ; https://help.gohighlevel.com/support/solutions/articles/155000006639-conversation-ai-public-api ; https://grow-highlevel.com/post/gohighlevel-api
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: ghl-conversations-api
weapon: assistable-sms-weapon
---

# GoHighLevel Conversations + Conversation AI API (2026, v2/v3)

## Summary

The GHL Marketplace API is the EXTERNAL authority the cuantico-sms engine writes through to actually deliver an SMS and to drive the native Conversation AI. Two relevant surfaces: (1) the Conversations API send-message endpoint (`POST /conversations/messages`) used to send an SMS to a contact; (2) the Conversation AI Public API (Marketplace API 2.0) used to create/manage AI Agents and Actions programmatically. Auth is via Personal Integration Tokens (PIT) or JWT, and the critical rule is to use a SUB-ACCOUNT token so calls act within the correct location context. V1 APIs reached end-of-support on 2025-12-31; migrate to V2/V3.

## Key quotations / statistics

- Send message: "**POST** `/conversations/messages`" -- "Post the necessary fields for the API to send a new message." Current iteration tagged **v3** (alternative versions 2023-02-21, 2021-07-28, 2021-04-15). A 200 means "Created the message."
- "The Conversations API allows you to send SMS messages, send emails, retrieve conversation history, access the unified inbox, and trigger AI reply responses -- all via API."
- Conversation AI Public API endpoint families: **Actions** (Attach, List, Get, Update, Remove, Update Followup Settings); **Agents** (Create, Search, Update, Get, Delete); **Generations** (Get Generation Details). "create and manage Conversation AI Agents," "configure and update AI Actions programmatically," "retrieve AI conversation generation data."
- Auth: "Personal Integration Tokens (PIT) and JSON Web Tokens (JWT)"; "Use a Sub-Account token so calls act within the correct location context." Version: "Marketplace API 2.0."
- "V1 APIs has reached end-of-support as on 31-December-2025 ... Developers should migrate to API V2 for ongoing support and new features."

## Annotations for weapon-forge

- `POST /conversations/messages` is the concrete send-SMS call the cuantico-sms engine (or any GHL-native sender) makes. The send-message guide should capture: method + path, the `type`/SMS message-type selector, `contactId`, `message` body fields, the `Version` header, and a Bearer sub-account token. The live docs page is JS-rendered (thin via fetch); weapon-forge should re-fetch the Stoplight reference (`highlevel.stoplight.io`) or the marketplace page in a browser for the exact field list before authoring code. (Flagged in research-summary as a re-fetch target.)
- The Conversation AI Public API (Agents + Actions + Generations) is how you'd drive GHL's native bot programmatically -- relevant if the migration chooses to ride native Conversation AI rather than a fully custom LLM loop. Note: the Public API does NOT (per the help-doc) expose per-conversation bot enable/disable or off/suggestive/auto mode toggles; those are configured in the workflow/AI-Employee UI, not this API. Flag this gap for the migration design.
- SUB-ACCOUNT token rule is load-bearing and aligns with the Guardian's secrets directive and with the Assistable `X-Subaccount-Id` pattern: location context travels with the token / header on both the Assistable and GHL sides.
- ROUTING: per the brief, the actual GHL contact/field WRITE semantics (custom field keys, contact upsert) belong to gohighlevel-guardian. This Guardian owns the SMS send/AI-contract call; it hands the field catalog to gohighlevel-guardian. Keep that boundary in the guide.
