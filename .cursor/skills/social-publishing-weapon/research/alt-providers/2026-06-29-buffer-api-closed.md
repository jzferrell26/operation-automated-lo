---
source_url: https://buffer.com/developers/api
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: buffer
weapon: social-publishing-weapon
---

# Buffer API: effectively closed to new developers (2026)

## Summary
Buffer is in the arsenal's "extensible alternatives" list, but the 2026 reality is that Buffer's API is closed to new third-party developers. This is a DECISION-CHANGING finding: weapon-forge should mark Buffer as not viable for a new integration in 2026, not just "an alternative."

## Key quotations / statistics
- "Buffer is no longer accepting any new developer applications for the Publish API. Buffer stopped accepting new developer app registrations, so you can't get a client_id."
- Two API surfaces: old REST API (OAuth 2.0, but NO new dev app registrations) and a new GraphQL API in public beta with PERSONAL API keys only - third-party OAuth not enabled.
- "The beta is personal-key-only, with third-party app integrations remaining restricted."
- 2026-05-25: Buffer changed how media assets are submitted via the API; mutations using the legacy assets input format now fail.
- Available now: create/fetch/delete posts in queues, create ideas, retrieve accounts/organization/connected channels.

## Annotations for weapon-forge
- SELECTION-TABLE CHANGE: downgrade Buffer from "alternative" to "NOT RECOMMENDED for new integrations (2026)" because you cannot obtain a client_id for third-party OAuth. Only a personal-key GraphQL beta exists, suitable for an agency's OWN single Buffer account, not a multi-client/agency product.
- If an operator already HAS a legacy Buffer dev app, the old REST API still works, but no new ones can be created. Document this as a legacy-only path.
- The 2026-05-25 media-input format change is a live gotcha for anyone on the legacy app: the old assets input format now fails. Quote this in the footgun catalog for legacy Buffer users.
- Net: for the Cuantico factory's use case (agency + multiple clients), Buffer is effectively off the table. Zernio/GHL/Blotato/Ayrshare are the live options.
