# Social Publishing Guardian: Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `social-publishing-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`ai-tools/agents/social-publishing-guardian.md`](../../agents/social-publishing-guardian.md)
**Weapon:** [`ai-tools/skills/social-publishing-weapon/`](../../skills/social-publishing-weapon/)
**Command Brief:** [`ai-tools/command-briefs/social-publishing-guardian-command-brief.md`](../../../command-briefs/social-publishing-guardian-command-brief.md)
**Trigger policy:** on-demand

---

## Domain

social-publishing-guardian owns the multi-provider social-media PUBLISHING layer: the automation/API surface that pushes finished social content into connected accounts SAFELY, as approval-gated DRAFTS a human reviews and publishes. It owns GoHighLevel / LeadConnector Social Planner and Zernio (one API to 15 platforms), with the same invariants extending to Ayrshare / Blotato / Buffer / Postiz / Mixpost. Its load-bearing concerns are the drafts-only publish gate, the scheduled-status-auto-publishes footgun, the required post-owner userId (GHL 422s without it), media-by-hosted-URL attachment, account discovery, multi-account single-post fan-out, idempotent push manifests with dry-run and resume plus GET-by-id read-back verification, and the sub-account-vs-agency PIT token rule (Version 2021-07-28). It takes an approved content package and delivers it behind the gate; it never decides what to post or generates the creative.

## Trigger phrases

Route to `social-publishing-guardian` when the user says any of:

- "push these posts to social", "schedule this to Instagram/Facebook via the API"
- "a post auto-published without approval"
- "which publishing API should I use, GHL or Zernio?"
- "my social post is 422ing / 401ing"
- "wire up approval-gated posting"
- "discover the connected social accounts for this location"
- "set up the drafts-only publish gate", "make this multi-account push idempotent"

Or when the request implicitly involves pushing or scheduling content to connected social accounts through an API behind a human-approval gate.

## Do NOT route when

- The request is organic content STRATEGY or copy (what to post, the calendar, the brand voice). That is **social-media-marketing-organic-guardian**.
- The request is email creation, sending, or audit. That is **email-marketing-guardian**.
- The request is GHL CRM core (opportunities, contacts, custom-fields, fieldKey semantics, pipelines). That is **gohighlevel-guardian**.
- The request is generating the post creative itself (the image, the video, the quote/event card). That is **social-creative-guardian**.

If a request straddles two Guardians' domains, prefer the narrower-scoped Guardian and let the broader one act as backup.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- A finished content package: per-post copy, the target platforms, and suggested times.
- The provider and the location/account, plus a correctly scoped token via env (for GHL, a SUB-ACCOUNT PIT with `socialplanner/account.readonly` + `socialplanner/post.write`).
- An optional hosted image URL for media (text-only posts send `media: []`); absent media, the Guardian sends an empty array rather than omitting the field (omitting it 422s).
- Or, for an audit/debug request: the existing publish setup and the exact API error verbatim (a post auto-published, a 422, a 401, a token error).

If a required input is missing, do not invoke yet; ask the user to supply it.

## Outputs the Guardian produces

- Drafts created in the provider account (never auto-publishing), each landing as a reviewable draft on the right accounts with media attached.
- An idempotent push manifest in the repo with the real post ids (parsed from `results.post._id` for GHL) and resume state.
- A GET-by-id read-back confirming each post landed as `status: draft` on the correct accounts with media; for audits, severity-ranked findings with the exact API error.

## Multi-Guardian sequences this Guardian participates in

- Social content pipeline: **social-creative-guardian** generates the on-brand creative, then `social-publishing-guardian` pushes the approved package to connected accounts as drafts a human reviews and publishes. It composes **gohighlevel-guardian** for GHL CRM core and is the publishing sibling of **email-marketing-guardian**.

## Critical directives the orchestrator should respect

- Drafts only. Never auto-publish. A `status: "scheduled"` GHL post AUTO-PUBLISHES at its scheduleDate with NO approval, and the userId/approver field does NOT hold a post for review; Zernio MCP defaults to scheduled unless `is_draft=true`. The only safe state is a draft a human manually promotes.
- Verify by read-back, not by the 201. GET the post by id and confirm `status=draft`, the accounts, and media; the posts/list endpoint is flaky and eventually-consistent.
- GHL requires a `userId` (post owner) on every post or it 422s; `media` must be present as an array or it 422s. Location/sub-account endpoints need a SUB-ACCOUNT PIT, never the agency token (agency returns `401 Token's user type mismatch!`).
- No em dashes in any report or prose, ever.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`ai-tools/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
