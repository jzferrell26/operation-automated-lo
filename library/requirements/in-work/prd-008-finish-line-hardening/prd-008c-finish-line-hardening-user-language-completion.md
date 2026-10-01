# PRD-008c: Finish-Line Hardening - User-Language Completion

> **Parent:** [PRD-008](./prd-008-finish-line-hardening-index.md)
> **Status:** Draft
> **Priority:** P1
> **Schema changes:** None
> **Owner Guardians:** `technical-writing-craft-guardian` (the copy), `typescript-node-guardian` (the guard and the key-based copy move)

## Goal

Every sentence a signed-in loan officer can read passes the PRD-006b user-language contract. The guard proves this by reaching every module whose strings reach a screen, with no temporary exclusion left.

## Background (honest)

The source guard is `tooling/tests/unit/user-language/forbidden-vocabulary.test.ts`. Its term list is `apps/web/src/copy/forbidden-vocabulary.ts`. The rendered guard is `apps/web/src/app/(authenticated)/review-surface-sweep.ts`. Three gaps remain at `131c7f4`:

1. **The homeowner report server module is not scanned.**
   - `apps/web/src/server/homeowners/**` builds refusal messages that reach the screen through `http.ts` (around line 90) and `apps/web/src/features/homeowners/use-home-workspace.ts` (lines 61-70, which read only `message`).
   - Two of them are administrator instructions shown to a loan officer: `runtime.ts:140` "Set the report website address before sharing." and `runtime.ts:154` "The report website address must be a secure origin."
   - `http.ts:104-105` pairs a machine code (`IDEMPOTENCY_CONFLICT`) with its message. The client reads only `message` today, so the code does not render. 008C-AC-004 is a regression guard that keeps it that way, not a red-first fix.
2. **A term the list does not hold.** `apps/web/src/features/workspace/workspace-screen.tsx:310` reads "A valuation adapter is configured for this workspace" on `/settings/routing` and `/automations`.
3. **One temporary exclusion is still open.** `packages/application/src/reporting.ts` is excluded at `forbidden-vocabulary.test.ts:95-97`. Its sentences include "The provider connection has expired." and "A lead could not be delivered through the approved route." The exclusion names its own removal condition: the file renders through the copy module. The same move closed the `campaign-workspace-read.ts` exclusion on 2026-09-21.

## Scope

- `apps/web/src/server/homeowners/**` message text.
- `apps/web/src/copy/` (term list and sentences).
- `apps/web/src/features/workspace/workspace-screen.tsx`.
- `packages/application/src/reporting.ts`.
- The two guard files and the rendered sweep.

## Non-Goals

- New copy for features that do not exist yet.
- Changing machine codes in API responses. Only what renders changes.

## Acceptance criteria

| ID | Criterion |
|---|---|
| 008C-AC-001 | The source guard's scan list includes `apps/web/src/server/homeowners/`. A recorded red run, or a fixture test, shows the extended guard failing on the `131c7f4` text of `runtime.ts:140` and `:154`. |
| 008C-AC-002 | The term list holds "adapter" and the engineering sense of "origin", with any legitimate exclusion recorded with its reason. A recorded red run, or a fixture test, shows the guard failing on the `131c7f4` text of `workspace-screen.tsx:310`. |
| 008C-AC-003 | Every string flagged by 008C-AC-001 and 008C-AC-002 is rewritten in PRD-006b language. Each rewrite tells the loan officer what is true and what they can do. No setup instruction meant for an administrator is shown to a loan officer as their own task. The source guard passes. |
| 008C-AC-004 | No homeowner report response renders a machine code such as `IDEMPOTENCY_CONFLICT` to the person. A component or browser test asserts that the code text is absent for at least the conflict and unavailable-sharing refusals. |
| 008C-AC-005 | `packages/application/src/reporting.ts` returns keys rather than sentences, and its sentences live in `apps/web/src/copy/` in PRD-006b language. The `reporting.ts` exclusion entry is deleted from `forbidden-vocabulary.test.ts`, and no other temporary exclusion remains. |
| 008C-AC-006 | The rendered sweep covers the homeowner report management, create, and report detail screens in review mode, plus the shared report page, and passes. |
| 008C-AC-007 | `technical-writing-craft-guardian` reviews every rewritten sentence with no blocking finding. The review is recorded in PRD-008's `qa/` folder. |

## Files expected to change

- `tooling/tests/unit/user-language/forbidden-vocabulary.test.ts`
- `apps/web/src/copy/forbidden-vocabulary.ts`
- `apps/web/src/copy/user-language.ts` (or the module that holds sentences)
- `apps/web/src/server/homeowners/runtime.ts`, `http.ts`, and any sibling that builds refusal text
- `apps/web/src/features/workspace/workspace-screen.tsx`
- `packages/application/src/reporting.ts` and its consumers' tests
- `apps/web/src/app/(authenticated)/review-surface-sweep.ts`

## Test plan

- **Unit:** the source guard, including the red-then-green proof (008C-AC-001, 008C-AC-002, 008C-AC-005).
- **Component or browser:** no machine code rendered (008C-AC-004); the rendered sweep over the homeowner screens (008C-AC-006).

## Open questions

- [ ] None blocking.

## Related

- [PRD-006b user-language contract](../../in-work/prd-006-first-party-sign-in-and-guided-experience/prd-006b-first-party-sign-in-and-guided-experience-user-language.md)
- [User-language contract standard](../../../knowledge/private/standards/user-language-contract.md)
