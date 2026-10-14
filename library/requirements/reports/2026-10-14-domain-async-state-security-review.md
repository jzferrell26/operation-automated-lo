# Domain setup: final shared-state security review

Date: October 14, 2026. Reviewer: `/root/domain_final_ui_security`, security-guardian. Worktree: `codex/domain-completion`. Committed base: `50c7e281f8914443f49adb219357fab00dd832d4`.

## Executive summary

**PASS for fresh scoped Quality of the five frozen changed files.** No new Critical, High, Medium or Low vulnerability was detected in the shared-state UI repair, copy corrections or title inventory. No source remediation was needed or performed. The repair preserves the independently reviewed request, confirmation, permission, concurrency and current-proof boundaries.

This is source acceptance of the bounded Next.js/React/TypeScript delta. The inherited server and SQL reviews remain separately scoped. Actual current-head CI, corrected PostgreSQL/pgTAP, the eight Linux Settings baseline approvals, production DNS/TLS and provider qualification remain release obligations. This report does not approve hosted domain onboarding or all FUN criteria.

The managed CVE watchlist was refreshed April 24, 2026, more than 120 days ago. Refresh that Guild intelligence. The executed production registry audit reports zero vulnerabilities; the full audit reports the existing one ignored development-only High under the unchanged owner-approved exception. That exception is not a new finding or a whole-lockfile zero-vulnerability claim. Resolved versions are Next.js 16.3.8 and React/React DOM 19.3.0.

## Scope and ordering

Reviewed the five files pinned below and their immediate `client.ts`, `model.ts`, internal HTTP helper, shared `AsyncState`, authenticated domain handler and capability controls. The parent's three-file copy correction is included through the current screen/browser bytes and title inventory. There is no new source authority, route, command, credential, dependency, migration or database grant in this packet.

The managed Weapon, native Guardian configuration, relevant local terrain, AGENTS instructions, handoff and prior scoped reports were read. The newer integrated Svelte-specific procedure was applied only where its generic authorization, secrets, transport and dependency checks fit this Next.js host. Svelte/WorkOS-specific claims were not substituted for the actual source. Local Next.js catalogs provide the framework coverage.

`library/qa/` is absent. The prior domain UI Quality report is older than the current committed base and covers the superseded packet, not this repair. No Quality report for these five changed pins existed at entry. This review follows independent visual DUV-01 closure and precedes fresh Quality. Historical reports were preserved.

## Scorecard

| Category | Result | New findings |
| --- | --- | --- |
| Financial/payment security | None detected; no new financial or payment surface | 0 |
| PII and logging | None detected | 0 |
| Authentication and authorization | None detected in the assigned delta | 0 |
| Injection and hostile text | None detected | 0 |
| Dependencies | No new findings; inherited accepted development exception retained | 0 |
| Configuration and transport | None detected in the assigned delta | 0 |
| Data handling and recovery | None detected | 0 |

## Surface review

### Framework, injection and state composition

None detected. `domain-screen.tsx:240-278` passes fixed kinds/card surfaces and escaped React text to the existing shared `AsyncState`. The sanitized error string is a `description`, not HTML (`:253`). The unchanged primitive renders description and permission details as React children (`packages/ui/src/components/async-state.tsx:85-124`). There is no new HTML sink, DOM script, URL interpolation, client storage or server-to-client secret serialization.

DNS record names/values remain inert text (`domain-screen.tsx:73-75`). The independent hostile-record probe confirmed that script/image/iframe-shaped strings create no markup and that clipboard writes receive only the exact inert record value. The full record constraints remain strict and bounded in `model.ts`; changing generic state composition does not broaden response acceptance.

### Authentication, permission and tenancy

None detected. UI capabilities remain display and interaction controls, with actual authority resolved independently by the unchanged server (`funnel-domain-http.ts:31-44`). The new permission card explains the current loan officer session and account support. The shared prop named `requiredRole` contains fixed session wording, not a role selection or client authority claim (`domain-screen.tsx:260-269`).

The same `canEdit`, availability, pending-operation and `mustReload` predicates determine mutation eligibility (`:147-158`). Neither the shared permission nor degraded card supplies an action that can bypass those predicates. Connection/disconnection retain deliberate confirmation and exact saved id/revision. A provider-unavailable saved record may still be disconnected only by an editable session, as before. Existing server mutation authorization, synthetic-mode refusal and owner-scoped persistence remain unchanged; this UI review does not independently certify all database policies.

### Recovery, current proof and concurrency

None detected. Initial pending/failed reads expose no mutation action. Failed refresh sets `mustReload` (`:125-130`), so old ready proof becomes unconfirmed (`:152`) and further writes stay blocked. Refused or uncertain mutations retain the same reload fence and permission reduction (`:189-196`). The shared loading card does not clear the `inFlight` guard, alter revision payloads or introduce automatic mutation retries.

Existing interaction tests execute lost responses, conflicts, duplicate confirmation, pending-check/disconnect exclusion, stale proof, cooldown, read-only capability, safe reload and exact CSRF-bearing payloads. An independent probe also confirmed that refusal of a previously ready refresh disables both check and disconnect and hides raw failure text.

### Secrets, PII and errors

None detected. The packet adds no credential, environment import, PII telemetry, payment data or persistent browser storage. Owner-visible DNS ownership records remain the intended verification display. Clipboard failure maps to fixed text (`:206-212`) without rendering the exception. API errors still pass through `domainErrorMessage` and the fixed sentence catalog; extended successful payloads fail strict parsing. Independent raw provider-error/stack probes show neither secret-like strings nor markup in the rendered error state. Support references retain their existing escaped, collapsed presentation.

### Transport, headers and third-party intake

None detected in the delta. The client still uses constant `/api/funnel-domains`, same-origin credentials, no-store requests, redirect refusal and the session-bound CSRF header. Internal API path validation and server authorization were read and exercised through adjacent tests. No new browser provider request, webhook, purchase or external navigation is introduced. Fixed Settings/Campaigns links remain application relative.

No header, CSP, cookie or Next configuration changed. The generic scanner's root-only configuration lookup reports no Next config; the actual unchanged header configuration is `apps/web/next.config.ts:5-14`, with nonce CSP handled by the existing proxy. This is not a claim of newly observed production headers.

### Dependencies and deterministic scan

None newly detected. Package/config/lockfile bytes are unchanged from the base. Managed `scan.ts` completed under Node 24, producing ignored `reports/scan-output/` artifacts; Unicode scan is clean and scoped pattern hits reveal no new sink. The fresh production audit reports zero advisories across 153 production/optional dependencies. Full `pnpm audit --audit-level=high` exits successfully with one High ignored by the existing GHSA-vfj7-8cjw-p6xm development exception (`pnpm-workspace.yaml:51-59`). The existing exact accepted-advisory guard passes; no exception was added or widened. Repository secret audit passes.

## Findings and remediation

Critical: None detected. High: None newly detected. Medium: None detected. Low: None detected.

No source remediation, dependency change, frozen-report edit, image edit, canonical baseline replacement, ledger edit, Git mutation, provider action or deployment occurred. Only this report was added; ignored scanner artifacts were regenerated. There is no Medium-or-above fix requiring another remediation pass.

## Independent executed verification

| Check | Result |
| --- | --- |
| Domain screen and existing Workspace integration cases | 39 passed in two files |
| Domain client, complete refusal catalog and exact title inventory | 63 passed in three files |
| Adjacent authenticated principal, custom-host routing and internal HTTP helpers | 21 passed in three files |
| Existing vocabulary and accepted-advisory guards | 38 passed in two files |
| Shared state primitives | 5 passed |
| Independent hostile text/clipboard, raw error and stale-proof probes | 3 passed against actual DomainScreen with mocked network/clipboard |
| Web and tooling TypeScript | Passed |
| Secret audit and diff whitespace | Passed |
| Managed scanner and production/full dependency audits | Completed, with limits above |
| Frozen pins and unchanged adjacent authority/SQL/package seams | Verified |

The first state-primitive invocation used a nonexistent `states.test.tsx` path and executed no cases. Correcting only the command to the discovered `state-primitives.test.tsx` ran all five successfully. An initial unit command included two nonexistent filter names alongside three real files; only the three real files contributed its 63 cases. The discovered vocabulary guard was then executed separately and is included in the 38-case row. No source, test scope or gate was weakened to correct either command.

The author's eight production-server browser cases and the independent visual review of all 88 original images are attributed evidence, not executions repeated by this reviewer. The browser API fixtures are synthetic and do not prove real DNS, provider calls or database writes. This reviewer did not alter or regenerate any image.

## Frozen provenance

| Changed file | SHA-256 |
| --- | --- |
| apps/web/src/features/domains/domain-screen.tsx | a2498ac1355b8d3aa776be63037615aa28118b62d8e5c8ae473faeab0ec14b73 |
| apps/web/src/features/domains/domain-screen.integration.test.tsx | 090a5003a89f9719954f43d7accf74bec76d262e043438b10f2c20eb7690d210 |
| tests/browser/domain-setup.spec.ts | 04fc61b7a3bcefca205381d6128daf800976cee2f70d633db8dd40f8b55bbbab |
| library/knowledge/private/ux-ui/04-screens/domain-setup.md | ce9b8bf34e36580840cbb44e59dc39d14c1caebdb604ac4e2775119595ab5685 |
| apps/web/src/copy/page-titles.unit.test.ts | 6823f91b6def90a946462a3e429212879d2b7011eea075e6dea417f1b3eeb7f8 |

Author handoff: `3ada1864faab9e6b43dc2d44eac9d815812d78f459e0781617bd5992e4e69598`. Independent DUV-01 visual closure: `c6b5678f07a54317a7002cc347835d7b81843a3022e49ebe1f9bc6147876da09`. Current image manifest: `c5534f0060c027471105120f4adaaa66acd42169fdf5fb5fea60a72aa5ca7dc5`; retained pre-repair manifest: `40080d283c092b234bfbdfed8768e3d9f6df4d570b5575a3d47f8ed195b69448`.

Prior scoped UI Security: `bc9a55d872ce2cdae77dc683c2dbd82503e3020a8fbb0e48decebf08aa2afe73`; prior Quality: `6af7318d02dfc56e7a6f0935d233aae39f3edba913379c088cfdf07d33ccd27e`. Corrected PostgreSQL fixture remains `1089f311827566226c59df87bc3f8495a52a1db58915a02e2c009ae7ce3570b5`; scaffold remains `c53cf739888013b4357ebb58faa6a16ff056f03b56eb5d3f28ad254a4dd8847d`.

## Next step and limits

Proceed to fresh Quality against these exact five pins, followed by orchestrator repository-health review and actual current-head CI. Preserve the independent visual closure and separately obtain the eight Linux Settings baseline approvals. Do not expand this bounded source PASS into complete domain/FUN acceptance, production deployment approval or provider qualification. The stale Guild CVE research and inherited accepted development advisory remain explicit follow-up items.
