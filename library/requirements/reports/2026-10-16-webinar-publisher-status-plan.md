# Webinar publishing progress increment

Trello: https://trello.com/c/8RpzNj2V. This is the first bounded increment of the open launch/progress/pause card, not fulfillment of the whole card. Branch `codex/webinar-controls-20261016` starts at merged main `ddb0649edb6c11dc169b40af97e189bec8628b4c`.

## Outcome and scope

Give the single loan officer a private view of an existing durable publishing operation: exact campaign, account/page, destination, budgets, state and actual provider observation time. Explicit refresh must never turn a queue acknowledgement or a local read into live-provider evidence. Failed or switched identity must not retain old financial details. This increment does not produce commands or grant new provider authority.

CTR-003 revision 1 remains accepted, with source SHA256 `dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23`. Preserve its native read/authentication boundary. No normative contract, dependency, migration, fixture-server policy, activation, provider setting or spend change. The eight excluded hosted migrations remain excluded. An existing status URL requires an operation reference; the future command producer must link the returned reference here. No generated sample operation is offered as a production record.

## Plan and owned paths

1. nextjs-guardian, inline: add a minimal private DTO, authenticated status GET using the existing native authorized repository read, and a dynamic status page. Own the new `publisher-status*` feature files, `webinar-publisher-status*` server files, `tooling/tests/unit/webinar-publisher/status-http.test.ts`, the two new status routes and this increment's reports only.
2. react-guardian and ux-ui-guardian, inline: use the existing UI primitives/tokens; exercise loading, explicit refresh, malformed/refused responses, actual observation time, missing observation and late response identity changes. No automatic polling or new design system.
3. security-guardian then quality-guardian, inline author reviews, with exact source pins and every NOT_RUN boundary stated. No independent review is claimed. Repository health and PR closeout follow.

The model matrix was read from `~/.claude/model-comparison-matrix.md`. Its Cursor/Claude identifiers have no Codex mapping in that file. Project instructions require sequential inline work, so this run uses the current GPT-6 host for each named responsibility rather than inventing a dispatch model or spawning agents.

Memory recall through the permitted Bash entry failed because this Windows host lacks `/bin/bash`; no unsupported VFS reader was substituted. Current Trello, source, accepted contracts and merged Git evidence were reconciled directly. The unrelated untracked `COMPLETION_RESUME_NOTES.md` remains untouched.

## Acceptance checks

- Authenticated owner reads a minimal status DTO. Unknown/foreign operation is inaccessible; absent/revoked identity and synthetic authority refuse before the repository.
- Stored summary/projection hashes, operation identity and actor/location lineage are checked before projection. Private headers cover success and every failure; raw provider/auth/media/error data never leave the server.
- Missing schema/configuration returns unavailable, not an invented empty/success result. No mutation admission, dispatch, checkpoint or source-evidence method can run in the read-only adapter.
- Provider observations remain distinct from status-read time; queued/uncertain/pause-pending/cancelled states never claim remote success. Estimated total is not called a hard cap.
- Reload failure or an operation change clears the old view, and a late response cannot replace the new operation's view.
- Targeted source/UI checks, types, lint, secrets, duplication and relevant regressions run. Actual native new-route database proof, production-mode requests, deployed mobile/desktop proof and live-provider qualification remain NOT_RUN unless observed. Existing canonical CI does not qualify new bytes.

## Remaining whole-card work

Authenticated owner command producer and exact spending confirmation; provisioned trusted worker/admission/media/installation authority; launch and pause controls; qualified HighLevel draft/readback, live progress and controlled pause/reconciliation. Native worker remains unbound. This plan does not authorize customer messages, ad launches, purchases, deployment or hosted schema changes.
