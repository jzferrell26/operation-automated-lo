# Pillar 8: Cuantico Operator (GHL / n8n / live events / recon)

## CRITICAL DIRECTIVES

Before acting in this domain you MUST load these skills via the Skill tool:

- `gohighlevel-weapon`: owns the GoHighLevel/LeadConnector V2 REST API surface: opportunities, contacts, pipelines, custom-field fieldKey resolution, OAuth 2.0 vs Private Integration Token, pagination, rate limits, webhooks, and write-back correctness.
- `n8n-workflow-weapon`: owns n8n workflow build/audit/safe-edit mechanics across MCP, REST, and the Workflow SDK: credential-binding integrity, draft-vs-publish, PUT payload hygiene, error handling, idempotency, Data Tables.
- `live-event-ops-weapon`: owns RUNNING the live-event deploy on n8n: the pre-flight go/no-go gate, the exact-command deploy sequence, post-deploy verification against real execution data, and the deactivate-then-restore rollback.
- `contact-enrichment-weapon`: owns the enrichment PATTERN: the batched SplitInBatches loop, the waterfall provider-fallback, Normalize/Merge reconciliation, typed GHL write-back, and re-run idempotency.
- `assistable-sms-weapon`: owns the SMS-AI-agent surface: the Assistable inbound webhook payload contract, tool-call wiring, and the incremental migration to the GHL-native SMS engine behind a stable contract.
- `email-marketing-weapon`: owns deliverability-first email programs: the SPF/DKIM/DMARC go/no-go preflight, spam-safe HTML, launch/webinar sequences, GHL send wiring, and the pluggable per-client brand-voice pack.
- `social-publishing-weapon`: owns the API layer that pushes finished posts to connected social accounts as approval-gated DRAFTS (GHL Social Planner, Zernio, and alternatives), with idempotent push manifests and read-back verification.
- `social-creative-weapon`: owns generating the on-brand creative itself from a markdown brand spec: quote/value cards, photo crops, gradient-overlay cards, the preview review gate, and branded video.
- `competitor-recon-weapon`: owns evidence-first competitor teardowns: authenticated UI walkthroughs, public-artifact archaeology, JS-bundle mining, and per-surface gap tables that feed PRDs and strategy verdicts.

---

## What this pillar collectively knows

This pillar is the client-operations arsenal for an agency running GoHighLevel and n8n automation for live-event clients. It splits into four bands: **the GHL API substrate** (gohighlevel-weapon, the system-of-record layer everything else writes into), **workflow engineering and operation** (n8n-workflow, contact-enrichment, live-event-ops: build the workflow, encode the enrichment pattern, run the event), **client-facing channels** (assistable-sms, email-marketing, social-publishing, social-creative: SMS agents, email programs, and the creative-then-publish social chain), and **intelligence** (competitor-recon, feeding product decisions with verified evidence).

A defining property of this pillar: most of its weapons mutate LIVE client state (workflows, SMS handlers, social accounts, deploys during a running event), so several are explicitly **on-demand only**: invoke them deliberately or via a peer hand-off, never as a silent default.

### Disambiguation table

| Situation | Weapon that owns it | Not this one |
|---|---|---|
| Resolving a GHL fieldKey, a write-back 400ing, OAuth vs PIT, pagination/429 | `gohighlevel-weapon` | `crm-integration-weapon` (Pillar 2, generic multi-CRM) |
| Building/wiring/auditing an n8n workflow node by node, credential rebind, draft vs published | `n8n-workflow-weapon` | `contact-enrichment-weapon` (the enrichment pattern, not node mechanics) |
| Designing or cloning a waterfall enrichment loop, DATE field writing blank, re-run safety | `contact-enrichment-weapon` | `gohighlevel-weapon` (fieldKey resolution routes there) or `n8n-workflow-weapon` (SDK/node mechanics route there) |
| Taking the live event live, go/no-go pre-flight, verifying the deploy, rolling it back | `live-event-ops-weapon` | `n8n-workflow-weapon` (edits workflow STRUCTURE; live-event-ops only OPERATES it) |
| Parsing the Assistable webhook, wiring an SMS agent tool, the SMS-engine migration | `assistable-sms-weapon` | `gohighlevel-weapon` (GHL writes and Conversations-SMS route there) |
| Email deliverability preflight, launch/webinar sequences, a send bounced or got suspended | `email-marketing-weapon` | `assistable-sms-weapon` (SMS channel) or `newsletter-platform-weapon` (Pillar 6, platform selection for a newsletter product) |
| Pushing/scheduling posts to social accounts via API, a post auto-published without approval | `social-publishing-weapon` | `social-creative-weapon` (makes the asset, never publishes) |
| Generating on-brand cards/crops/overlays/video from a brand guide | `social-creative-weapon` | `social-publishing-weapon` (pushes the finished asset) or `design-system-weapon` (Pillar 1, product design systems) |
| Tearing down a competitor product, gap analysis, capturing their UI with evidence | `competitor-recon-weapon` | `code-forensics-weapon` (Pillar 6, legal/damages investigation) |

### Canonical multi-weapon sequences

1. **Enrichment build (the three-layer split):** `contact-enrichment-weapon` designs the waterfall pattern (batching, provider fallback, provenance, idempotency) → `gohighlevel-weapon` resolves the exact fieldKeys and write-back semantics for the typed custom-field writes → `n8n-workflow-weapon` handles the node/SDK mechanics, credential rebinding after MCP edits, and publish. Each layer explicitly routes to the next; do not let one weapon improvise another's layer.
2. **Live event go-live:** `n8n-workflow-weapon` builds or fixes the workflow structure beforehand → `live-event-ops-weapon` runs the four-phase operate sequence: pre-flight gate (correct LIVE workflow id, bound credentials, published/active, export-before-deploy snapshot) → deploy → verification loop against real execution data → rollback via deactivate-then-restore if it breaks.
3. **Social content chain:** `social-creative-weapon` generates the on-brand assets from the brand guide and stops at the browsable preview review gate → a human approves → `social-publishing-weapon` pushes them as DRAFTS to the connected accounts, resolves the post-owner userId, and read-back-verifies by GET-by-id. Strategy and copy upstream of both belong to Pillar 6's `social-media-marketing-organic-weapon`.
4. **Email program run:** `email-marketing-weapon` runs the deliverability preflight as a hard gate → authors the sequence in the client's brand-voice pack → wires the GHL send → monitoring stays active through the send window.
5. **Recon-to-build:** `competitor-recon-weapon` produces the verified per-surface gap table → PRD authorship routes to Pillar 7's `library-weapon` → strategy verdicts route outside this pillar entirely.

### Load-bearing hard rules and gotchas

- **Drafts-only publish gate** (`social-publishing-weapon`): posts are pushed with draft status and a human publishes. The scheduled status AUTO-PUBLISHES in GHL, and the Zernio MCP defaults to scheduled: both are documented footguns. A post without the required post-owner userId 422s.
- **`social-creative-weapon` never publishes.** Preview before publish is its one rule; the hand-off to `social-publishing-weapon` is the only path to a live account.
- **`email-marketing-weapon` never green-lights a send without aligned SPF/DKIM/DMARC authentication and active monitoring.** The deliverability preflight is a go/no-go gate, not a recommendation. DMARC p=reject on a mis-wired sending domain is a documented footgun.
- **Typed GHL custom-field write-back gotchas** (`contact-enrichment-weapon` + `gohighlevel-weapon`): DATE fields take no `Z` suffix (a `Z` writes blank), and SINGLE_OPTIONS must match a configured option value exactly.
- **Credential rebind after MCP edits** (`n8n-workflow-weapon`, `contact-enrichment-weapon`): an MCP workflow update can strip credential bindings; re-verify bindings after every MCP edit, and remember MCP saves a draft that must be published to go live.
- **Export before deploy** (`live-event-ops-weapon`): the pre-flight gate requires a snapshot export of the live workflow before any change, because rollback is deactivate-then-restore-from-snapshot. Also verify you are operating the LIVE workflow id, not an archived clone.
- **The Assistable payload contract** (`assistable-sms-weapon`): tool args live under `body.args`; `contact_id`/`location_id` live under `body.metadata` AND the request headers. Handlers must be idempotent.
- **Recon verification across account states** (`competitor-recon-weapon`): a finding observed in one account state is unverified until checked in another; the weapon is on-demand only because captures run authenticated under the target's terms of service and corpora may contain PII (never mutate live target data; use throwaway records).
- **Sub-account vs agency token rule** (`gohighlevel-weapon`, `social-publishing-weapon`): token scope must match the operation's level; the `Version: 2021-07-28` header is required on GHL V2 calls.
- **GHL V1 API reached end-of-support 2025-12-31.** `gohighlevel-weapon` is V2-only; any V1 endpoint reference in older code or docs is stale and must be migrated.

---

## Cross-references to sibling pillars

- Generic (non-GHL) CRM integration is **Pillar 2: Backend, Data & APIs** (`crm-integration-weapon`); the SMS engine's backend stack (Next.js/Inngest/Supabase mechanics) also routes to Pillar 2.
- Security review of credentials, webhooks, and PII handling in any of these live integrations is **Pillar 3: Security, Quality & Code Review**.
- General deploy mechanics and runbook craft are **Pillar 4: Deploy & Live Operations**; this pillar's `live-event-ops-weapon` is the event-specific operate-and-verify specialization, and Pillar 4's `release-deploy-weapon` owns Vercel/Supabase app cutovers.
- Organic social strategy and copy are **Pillar 6: Business, Growth & GTM** (`social-media-marketing-organic-weapon`); legal/damages investigation is Pillar 6's `code-forensics-weapon`.
- PRD authorship fed by recon output is **Pillar 7: Product Process & Documentation** (`library-weapon`).
- The mobile app layer (Expo/React Native) that some client builds need is **Pillar 1: Frontend & Design Systems** (`expo-react-native-weapon`).
