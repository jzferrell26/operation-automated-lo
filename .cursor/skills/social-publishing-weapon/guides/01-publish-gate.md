# 01 - The publish gate (drafts only) and the dry-run

This is the load-bearing guide. The one rule that gates everything: every post is created as a DRAFT, and a human promotes it. This guide explains why the obvious-looking "safe" states are traps, and how the dry-run is the gate that catches a mistake before a single create call fires.

## Why "scheduled" and "approved" are NOT safe

The intuition that a `scheduled` post or an `approver`-assigned post is "held for review" is wrong on every provider studied. The unsafe behavior is the DEFAULT.

- GHL `status:"scheduled"` AUTO-PUBLISHES at its `scheduleDate`. The `userId`/approver field is the post OWNER, not an approval hold; it does not route the post to a held queue. Confirmed live 2026-06-29 by nearly auto-publishing a client post, then deleting it before its trigger.
- Zernio MCP DEFAULTS to scheduled, 60 minutes out. An agent that creates a Zernio MCP post WITHOUT `is_draft=true` will auto-publish in an hour with no approval (`research/zernio/2026-06-29-zernio-mcp-server-default-scheduled-footgun.md`).
- Even in tools with tiered approval CHAINS, "once the approval chain completes, posts publish automatically without requiring manual intervention." So "approved" means "queued to auto-publish," not "held for a human to press publish" (`research/publish-gate/2026-06-29-approval-gate-automation-risk.md`).

The ONLY truly safe state across providers is a DRAFT that a human manually promotes.

## Why even a perfect post must wait behind the gate

Auto-publishing without a human gate carries documented 2026 risks (`research/publish-gate/2026-06-29-approval-gate-automation-risk.md`):

- TIMING: a cheerful promotional post can fire "right as a major crisis dominates the news cycle." Always keep a human able to pause the queue.
- COMPLIANCE/LEGAL: regulated-industry automation that shares data without controls is "serious legal exposure."
- PLATFORM POLICY: aggressive automation can violate ToS and suspend the account.

The recommended 2026 posture is "autonomous with guardrails": the Guardian does the API mechanics autonomously, but always stops at the draft gate for human promotion.

## The draft primitive per provider

| Provider | Safe draft | Unsafe (forbidden) |
|---|---|---|
| GHL Social Planner | `status:"draft"` | `scheduled`, `published`, `active` |
| Zernio REST | DRAFT mode ("saved but NOT published") | `scheduledFor` set without draft, immediate/publish |
| Zernio MCP | `is_draft=true` | default (scheduled 60 min), `publish_now=true` |
| Ayrshare / Blotato / Postiz / Mixpost | verify live | scheduled/immediate until verified |

Zernio's native DRAFT state ("saved but NOT published") means Zernio can satisfy the drafts-only invariant natively, exactly mirroring GHL `status:"draft"` (`research/zernio/2026-06-29-zernio-docs-draft-scheduled-published.md`).

> TODO: open question - needs human decision before next refresh. Does Zernio's REST `/posts` create accept the same `is_draft` flag the MCP exposes, and does a Zernio DRAFT ever auto-publish? The docs assert "saved but NOT published"; verify live before trusting it as the gate, the same discipline applied to GHL. Source: `research/research-summary.md` open question 1.

> TODO: open question - needs human decision before next refresh. Ayrshare / Blotato / Postiz / Mixpost draft-vs-scheduled semantics are NOT individually verified. Live-test each before trusting its provider runbook for the drafts-only gate. Source: `research/research-summary.md` open question 2.

## The dry-run is the gate

Before any create call, print the full plan and STOP. The dry-run is the high-stakes preview that catches a wrong status before it can fire (`research/idempotency/2026-06-29-dry-run-checkpoint-resume-pattern.md`).

The dry-run plan must show, for every planned post:

- the target `accountIds` (resolved to platform names)
- the media URL(s) (or `[]` for text-only)
- the resolved `status` / draft flag - which MUST read `draft` for every post

If any planned post shows `scheduled` / `published` / `immediate`, the dry-run itself is the gate: it surfaces the mistake before a single create fires. A run that cannot prove every post is a draft does not proceed.

## Enforcement in code

- GHL: `status: z.literal("draft")` in the payload schema, plus a runtime guard that throws if `status !== "draft"`.
- Zernio MCP: always set `is_draft: true`; a guard that refuses any create where `is_draft` is unset or `publish_now` is true.
- A shared pre-flight assertion: "every post in this batch has status === draft (or is_draft === true)" must pass before the batch leaves dry-run.

## See also

- `guides/00-principles.md` (directive 1)
- `guides/09-footgun-catalog.md` (the "went live unapproved" entries)
- `examples/01-ghl-drafts-push.md` (dry-run shown in a real run)
- `examples/02-zernio-push.md` (the `is_draft` safety)
