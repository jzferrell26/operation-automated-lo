---
source_url: https://deepwiki.com/n8n-io/n8n-docs/6.1-public-rest-api
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: rest-api-put
weapon: n8n-workflow-weapon
---

# n8n Public REST API: workflow endpoints (DeepWiki mirror of n8n-io/n8n-docs)

## Summary
DeepWiki's indexed rendering of the official `n8n-io/n8n-docs` public REST API reference. Used because the live docs.n8n.io API-reference page 404s the WebFetch tool. Confirms the canonical endpoint paths, the create/update body schema, and the `X-N8N-API-KEY` auth header.

## Key quotations / statistics (verbatim)

Core workflow endpoints:
| HTTP Method | Endpoint Path | Purpose |
|---|---|---|
| POST | `/api/v1/workflows` | Create new workflow |
| GET | `/api/v1/workflows` | List workflows with filtering |
| GET | `/api/v1/workflows/{id}` | Retrieve specific workflow |
| PUT | `/api/v1/workflows/{id}` | Update workflow definition |

Body schema (verbatim): a `WorkflowObject` containing `name`, `nodes`, `connections`, `settings`. "The documentation indicates these are the updateable fields via PUT operations as well."

Authentication (verbatim):
> "Include the API key in the header of every request" using the header parameter `X-N8N-API-KEY`.

Self-hosted Swagger playground (verbatim):
> "a built-in Swagger UI playground at `N8N_HOST:N8N_PORT/N8N_PATH/api/v1/docs`"

Related endpoints referenced: `GET /credentials/schema/{credentialTypeName}` and `/audit`.

## Annotations for weapon-forge
- This corroborates the gist source on the allowed update body (`name`, `nodes`, `connections`, `settings`) and the `/api/v1/workflows/{id}` path, raising confidence to "official".
- Tell the operator: every Cuantico/voyze self-hosted instance exposes its OWN live Swagger UI at `.../api/v1/docs` — that is the ground-truth contract for THAT instance's version, and the Guardian should prefer it over any blog when an edit 4xxs.
- The activate/deactivate endpoints are not in this index page; they are documented in the separate activate/deactivate source.
