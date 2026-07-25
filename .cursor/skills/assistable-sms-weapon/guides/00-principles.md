# 00 - Principles and scope

The non-negotiable rules that govern every action in this Weapon. Read this before any other guide.

Source: the Command Brief SUBAGENT CRITICAL DIRECTIVES (`ai-tools/command-briefs/assistable-sms-guardian-command-brief.md`) and the Cuantico-internal contract (`research/cuantico-internal/2026-06-29-assistable-payload-contract-and-cuantico-sms.md`).

## What this Weapon covers

- Parsing, validating, and debugging the **Assistable inbound webhook** payload.
- Wiring and auditing **tool calls** (the agent-to-handler loop): mapping tool name + args to a handler, executing, and returning the Assistable tool-response shape.
- The **incremental migration** to the GHL-native cuantico-sms engine (Next.js + Inngest + Supabase), held behind a stable external contract.
- Deciding **routing**: which sub-tasks are yours and which belong to a peer Guardian.

## What this Weapon does NOT cover

- GHL contact/custom-field **write semantics** (field keys, contact upsert, DATE/SINGLE_OPTIONS rules) -> gohighlevel-guardian.
- The **n8n workflow** that may trigger a send -> n8n-workflow-guardian.
- Generic **TypeScript/Node** backend mechanics (bundling, zod boundaries, ESM, test harness) -> typescript-node-guardian.
- **Supabase** deploy/platform wiring (migrations, RLS, Edge Functions, the access-token hook) -> supabase-platform-guardian; schema design -> db-guardian.
- **Durable-workflow engine** mechanics (Inngest concurrency-key internals, retry tuning) -> durable-workflows-guardian. You own the SMS-contract *reason* for them; they own the mechanics.
- **Voice-AI / telephony** (Retell, Vapi, the Assistable voice path / CUSTOM tools) -> voice-ai-telephony-guardian.

See `04-routing-boundaries.md` for the full table.

## The six critical directives

These are load-bearing. Restate the relevant one in any output where it applies.

1. **Honor the payload contract exactly.** Tool args under `body.args`; `contact_id` / `location_id` under `body.metadata` AND the request headers. Why: looking in the wrong place is the classic Assistable integration bug and it **fails silently** (the handler runs with undefined inputs and the agent simply misbehaves, no error). Evidence: `research/cuantico-internal/2026-06-29-assistable-payload-contract-and-cuantico-sms.md` and `research/assistableai-mcp-schemas.md` (the live MCP `X-Subaccount-Id` header + `subaccount_id`/`location_id` body alias corroborate the header-AND-body duplication).

2. **Validate before acting.** Verify auth/signature AND the expected shape before touching handler logic. Why: an SMS tool handler is an **unauthenticated-by-default external entry point**; anyone who learns the URL can POST to it. Evidence: `research/webhook-arch/2026-06-29-sms-agent-webhook-tool-calling-patterns.md` (HMAC verification is the industry-standard control).

3. **Migrate incrementally behind a stable contract.** Never break the live SMS flow to advance cuantico-sms. Why: SMS is a **live client channel**; a broken cutover is visible to the end customer immediately, with no staging buffer. Evidence: the brief directive #3 and `research/cuantico-internal/...` (Sprint 0 done, cutover not yet).

4. **Route writes and plumbing to the owning Guardian.** GHL writes -> gohighlevel-guardian; n8n plumbing -> n8n-workflow-guardian. Why: you own the SMS-agent contract and migration, not the GHL field catalog or the workflow internals; crossing that line duplicates and desyncs ownership.

5. **Secrets are env-only.** Assistable keys, GHL sub-account tokens, Supabase keys: never logged, never committed. Why: an SMS webhook handler touches **multiple credential sets** at once, so one careless log line leaks several. Evidence: brief directive #5; the GHL sub-account-token rule in `research/ghl-api/2026-06-29-ghl-conversations-send-message-api.md`.

6. **No em dashes.** Not in code comments, docs, or prose. Use a comma, colon, parentheses, period, or semicolon. (Repo-wide rule; see project CLAUDE.md.)

## Examples that exercise these principles

- `examples/01-wire-tool-happy-path.md` shows directives 1, 2, 3, and 5 in a clean tool-wiring run.
- `examples/02-webhook-parse-failure-edge-case.md` shows directive 1's silent-failure trap and the fail-loudly guard.
