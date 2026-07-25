# 00 - Principles (the guardrails)

These are the non-negotiable directives for `social-publishing-guardian`, drawn from the Command Brief's SUBAGENT CRITICAL DIRECTIVES and deepened with the research `loremaster` gathered. Every other guide assumes these hold.

## 1. Drafts only. Never auto-publish.

Create every post in its provider's DRAFT primitive. The human promotes it.

- GHL: `status:"draft"`. Forbid `scheduled` / `published` / `active`. Enforce with `status: z.literal("draft")` plus a runtime guard before any create call.
- Zernio: DRAFT mode on the REST `/posts` create, and `is_draft=true` on the MCP create. Never rely on the default.
- The reason this is directive #1: a real client post was one `status:"scheduled"` push from going live unapproved on 2026-06-29; it was caught and deleted before its trigger fired.
- Industry consensus backs this: a human must gate anything involving "money, promises, crises, or your founder's personal voice," and for a client brand voice that is every post (`research/publish-gate/2026-06-29-approval-gate-automation-risk.md`).

See `guides/01-publish-gate.md` for the full mechanics and the dry-run gate.

## 2. No em dashes, ever.

No em dashes (`U+2014`) or en dashes (`U+2013`) in any copy, report, code comment, commit message, or prose. Use a comma, colon, parentheses, period, or semicolon. Regular hyphens are fine. Exempt: verbatim quotes and dashes inside code/JSON/literal data. Scan output before sending.

## 3. Token from env only.

Never log the token, never pass it on the command line (it lands in shell history and process lists), never commit it. Gitignore the env file. A leaked token is a security incident. See `guides/02-auth-token-resolution.md`.

## 4. GHL location endpoints need a SUB-ACCOUNT PIT.

A location/sub-account endpoint requires an "Access Token with user type Sub-Account OR Private Integration Token of Sub-Account." An agency PIT returns `401 {"message":"Token's user type mismatch!"}`. This is publicly confirmed in the official overview (`research/ghl-social-planner/2026-06-29-ghl-social-posting-api-overview-auth.md`). Required scopes: `socialplanner/account.readonly` + `socialplanner/post.write`, both published (`research/ghl-social-planner/2026-06-29-ghl-social-planner-public-api-changelog.md`).

## 5. Verify by read-back, not by the 201.

A `2xx` create does not prove the stored state, and it does NOT prove the post will publish. A created GHL post can still FAIL at publish time for an expired account token, oversized media, duplicate-content-within-12h, or a policy violation (`research/ghl-social-planner/2026-06-29-ghl-failed-post-error-causes.md`). Always GET the post by id and confirm `status=draft`, the account count, and the media count. The `/posts/list` endpoint is flaky and eventually-consistent; trust GET-by-id. See `guides/05-idempotency-manifest.md`.

## 6. Idempotency: manifest + dry-run + resume.

POST is not idempotent by default; a retried create makes a duplicate post (`research/idempotency/2026-06-29-idempotency-keys-rest-api.md`). Neither GHL nor Zernio documents a server-side `Idempotency-Key` header, so a CLIENT-SIDE manifest is the load-bearing defense. Dry-run by default; persist each real post id immediately; resume skips already-pushed posts. See `guides/05-idempotency-manifest.md`.

## 7. Quote the exact API error.

In any finding, quote the verbatim error body. A 422 names the missing or invalid field (`["media must be an array..."]`, `["userId must be a string..."]`). The exact string is the diagnostic; do not paraphrase it.

## 8. Right provider for the channel.

GHL Social Planner for GHL-native clients (their approval queue + CRM). Zernio for platforms GHL cannot reach (X, Threads, Bluesky, Reddit, Pinterest), the agency's own channels, non-GHL clients, and the MCP/agent publishing layer. Forcing one where the other fits creates a parallel-stack mess. See `guides/06-provider-selection.md`.

## Worked example

The full sequence in action: `examples/01-ghl-drafts-push.md` (GHL) and `examples/02-zernio-push.md` (Zernio).
