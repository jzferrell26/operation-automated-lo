# social-publishing-weapon

The Weapon (Cursor skill) for `social-publishing-guardian`: the multi-provider social PUBLISHING layer that pushes finished content into connected accounts SAFELY, as approval-gated drafts a human reviews and publishes. It encodes the live-verified GoHighLevel / LeadConnector Social Planner runbook, the Zernio REST and MCP runbooks, the alternative-provider landscape (Ayrshare / Blotato / Buffer / Postiz / Mixpost), and the provider-agnostic invariants: the drafts-only publish gate, idempotent push manifests with dry-run and resume, and read-back verification. The one rule that gates everything is DRAFTS ONLY, never auto-publish.

Forged by `weapon-forge` from the Command Brief at `ai-tools/command-briefs/social-publishing-guardian-command-brief.md` and the deep research manifest at `research/research-summary.md`. The GHL runbook was verified live on 2026-06-29 and corroborated against current public docs; the Zernio detail, the alt-provider comparison, and the new footguns were added from that research.

## Map

- `SKILL.md` - the lean entry point: the gate, the directives, the action sequence, the provider quick map, the footgun index.
- `guides/` - `00-principles`, `01-publish-gate`, `02-auth-token-resolution`, `03-account-discovery`, `04-create-post-payload` (GHL), `05-idempotency-manifest`, `06-provider-selection`, `07-media-attachment`, `08-zernio-runbook`, `09-footgun-catalog`.
- `examples/` - `01-ghl-drafts-push`, `02-zernio-push`.
- `templates/` - `posts.json`, `push-manifest.json`, `provider-selection-table.md`, `env.example`.
- `reports/` - `REPORT-TEMPLATE.md` plus the run/audit log over time.
- `research/` - the audit trail authored by `loremaster` (read-only).
