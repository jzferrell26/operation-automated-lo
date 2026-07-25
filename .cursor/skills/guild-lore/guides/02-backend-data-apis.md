# Pillar 2: Backend, Data & APIs

## CRITICAL DIRECTIVES

Before acting in this domain you MUST load these skills via the Skill tool:

- `db-weapon`: owns PostgreSQL schema design, indexing, zero-downtime migrations, and ORM/platform selection; the design authority every other backend weapon in this pillar defers to for data shape.
- `supabase-platform-weapon`: owns DEPLOYING what db-weapon designs (Edge Functions, Auth hooks, Realtime/Storage RLS, the token-only CLI workflow) when Supabase is the platform.
- `python-weapon`: owns Django/FastAPI/Celery/Channels architecture, ORM discipline, and migration policing for Python backends.
- `http-rest-fundamentals-weapon`: owns the protocol layer underneath every API: method safety/idempotency, status-code honesty, header correctness, CORS.
- `api-docs-weapon`: owns documenting the API surface once designed (OpenAPI enrichment, SDK generation, hosted docs).
- `auth-weapon`: owns end-to-end authentication implementation (provider selection, OAuth, MFA, RBAC, session hardening).
- `payments-weapon`: owns Stripe (non-Connect) integration: Checkout, Subscriptions, webhooks, idempotency.
- `crm-integration-weapon`: owns bi-directional CRM sync design (HubSpot, Salesforce, Pipedrive, Attio) and the native-vs-Merge.dev trade-off.
- `cron-scheduling-weapon`: owns cron expression correctness, platform limits, and exactly-once distributed execution.
- `discord-bot-weapon`: owns Discord bot backend architecture (discord.js, discord.py, gateway-vs-HTTP, sharding).
- `telegram-bot-weapon`: owns Telegram Bot API backend architecture (grammY, aiogram, webhook vs polling, Mini Apps).
- `slack-app-weapon`: owns Slack app backend architecture (Bolt SDK, Events API, OAuth multi-workspace install).
- `asset-weapon`: owns the Universal Asset Registry, the code-to-DB sync that keeps first-class platform assets (Features, Routes, FeatureFlags, Entitlements) in lockstep with the schema `db-weapon` designs.

---

## What this pillar collectively knows

This pillar is the server side of the stack: how data is shaped and stored, how it is exposed over HTTP, how identity and money move through the system, and how third-party platforms (CRMs, chat platforms, cron infrastructure) are wired in. The organizing principle is a **design-then-deploy split that repeats across the pillar**: a weapon that decides the shape of something is a different weapon from the one that ships it live.

### Disambiguation table

| Situation | Weapon that owns it | Not this one |
|---|---|---|
| Schema design, indexing strategy, migration shape, ORM choice | `db-weapon` | `supabase-platform-weapon` (deploys it, doesn't design it) |
| Pushing migrations/Edge Functions to a live Supabase project, RLS wiring, the access-token hook | `supabase-platform-weapon` | `db-weapon` (designs the migration content) |
| Django/FastAPI/Celery architecture, N+1 prevention, expand-backfill-contract discipline | `python-weapon` | `db-weapon` (schema itself) |
| Is this status code right, why is CORS failing, PUT vs PATCH | `http-rest-fundamentals-weapon` | `api-docs-weapon` (documents the contract, doesn't audit correctness) |
| OpenAPI spec enrichment, SDK generation, hosted docs renderer choice | `api-docs-weapon` | `docs-site-weapon` (see Pillar 7, general docs platform not API-spec-driven) |
| Picking an auth provider, wiring Google OAuth, MFA/passkeys, RBAC | `auth-weapon` | none |
| Stripe Checkout/Subscriptions/webhooks | `payments-weapon` | `crm-integration-weapon` (adjacent money-adjacent data, not billing) |
| HubSpot/Salesforce/Pipedrive bi-directional sync, contact-vs-lead taxonomy | `crm-integration-weapon` | `gohighlevel-weapon` (see Pillar 8, GHL-specific) |
| Cron expression authoring, exactly-once execution, DST safety | `cron-scheduling-weapon` | none |
| Discord/Telegram/Slack bot backend | `discord-bot-weapon` / `telegram-bot-weapon` / `slack-app-weapon` respectively | each other (platform-specific, no cross-coverage) |
| Registering a new Feature/Route/FeatureFlag as a first-class platform asset | `asset-weapon` | `db-weapon` (the asset registry is a specific catalog on top of the schema) |

### Canonical multi-weapon sequences

1. **Schema-touching feature (canonical):** `db-weapon` designs the schema/indexing/migration shape (expand-backfill-contract for anything non-trivial) → the implementation weapon (`python-weapon`, `react-weapon` from Pillar 1, etc.) implements the ORM/data-access side → `asset-weapon` registers any new first-class assets and verifies code-to-DB sync → close out via Pillar 3's security-then-quality loop.
2. **Supabase cutover:** `db-weapon` designs the migration → `supabase-platform-weapon` runs the token-only deploy workflow (`db push`, `functions deploy`, enabling the access-token hook via the Management API) → verify RLS with `security-weapon` from Pillar 3.
3. **Stripe payments enablement:** `payments-guardian`'s domain (`payments-weapon`) designs the Stripe surface → `auth-weapon` confirms RBAC on Customer Portal session creation → `db-weapon` designs the `processed_webhook_events` and entitlement tables (idempotency keys, transactional dedup) → Pillar 3 security-then-quality close-out audits secret handling and webhook signature verification.
4. **API surface release:** `http-rest-fundamentals-weapon` audits method/status correctness → `api-docs-weapon` enriches and publishes the OpenAPI spec and generates SDKs.

### Load-bearing hard rules and gotchas

- **`supabase-platform-weapon` refuses to invent schema.** It deploys what `db-weapon` designed; if no design exists yet, route there first, do not let the platform weapon improvise a migration.
- **Zero-downtime migrations follow expand-backfill-contract**, never a single destructive ALTER on a live table, per `db-weapon` and `python-weapon` both.
- **The custom access-token hook must be defined in a migration AND enabled via the Supabase Management API** — defining it alone does not activate it, a common half-done state per `supabase-platform-weapon`.
- **Webhook idempotency is mandatory for Stripe** — `payments-weapon` treats a webhook handler without idempotency-key dedup as an unfinished implementation, not an edge case.
- **CORS preflight failures are almost always a missing or misconfigured `Access-Control-Allow-Methods`/`Vary` header**, not a browser bug, per `http-rest-fundamentals-weapon`.
- **Bot platforms (Discord/Telegram/Slack) do not share wiring** despite surface similarity (slash commands, webhooks, OAuth) — always load the platform-specific weapon rather than generalizing from one to another.

---

## Cross-references to sibling pillars

- Security audit of auth flows, payment webhooks, and RLS policies is **Pillar 3: Security, Quality & Code Review**.
- CI/CD pipeline wiring and container builds around this backend live in **Pillar 4: Deploy & Live Operations**.
- The cognitive/AI layer that may sit on top of this backend (RAG, prompt cascades, coach routing) is **Pillar 5: AI & Cognitive Systems**.
- GoHighLevel-specific CRM work (as opposed to generic CRM sync) is **Pillar 8: Cuantico Operator**.
- Frontend consumption of these APIs lives in **Pillar 1: Frontend & Design Systems**.
