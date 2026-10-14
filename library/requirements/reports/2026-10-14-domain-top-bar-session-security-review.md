# Security review: top-bar session preparation

Date: 2026-10-14. Independent reviewer: security-guardian. Worktree: domain-completion. Base: 3d04fee. Scope: the two frozen test-harness files and author handoff below. Ownership: this report only.

## Executive summary

Scoped source PASS, cleared to proceed to fresh Quality. No Critical, High, Medium or Low finding detected. Top-bar visual/navigation preparation now calls the already reviewed session-reuse helper with the original actual password sign-in as fallback. The shared helper change is exactly a comment replacement; its authentication, proof and cache logic are unchanged.

This is a read-only defensive follow-up, not a whole-branch or deployed authentication clearance. The earlier domain/browser Security and Quality cover earlier packets; this new top-bar delta requires fresh Quality after this report. No source edit, new payload/probe, actual browser/database test, provider request, credential read, Git operation or root ledger change occurred.

The managed Security Weapon and retained integrated authorization, PII and lifecycle procedures govern this review. The CVE watchlist last refreshed 2026-04-24 remains stale beyond 120 days; refresh remains recommended. No latest-advisory or fresh dependency-audit claim is made. The broad scanner's writes/external audit are outside the assigned scope; existing tests, static audits and exact diffs were used instead.

## Surface coverage checklist

### Application and browser preparation

None detected. tests/browser/review/top-bar.spec.ts:95 now invokes signInForReviewPreparation with the same seeded creator email and an explicit fallback calling signInExisting(page, creatorEmail, password). The only other top-bar change imports that helper. Existing viewport, theme, layout, restricted navigation, copy, external-request and accessibility assertions are unchanged. All browser cases still install guardLocalOrigin before preparation. Authentication acceptance journeys and production sources are not edited.

### Authorization and tenancy

None detected in this delta. The unchanged helper validates candidate shape, actor, cookie attributes, lifetime and fixed HTTPS loopback origin. Every accepted candidate requires a fresh server overview response with status 200, exact origin, a single session-bound CSRF token and the current seeded name, role and workspace. The token must match the cached candidate. A wrong, stale or revoked identity clears the candidate and invokes exactly one real password-sign-in fallback; an invalid identity after fallback refuses.

The original signInExisting at guided-setup-journey.ts:221-244 still waits for the actual POST /api/auth/sign-in response, requires status 200, completes the workspace-choice path where needed, and only then captures the actual issued session. The helper does not generate/sign a session, bypass server identity resolution, clear authentication counters, set spoofed IP headers or increase the production 20-attempt/900-second policy. Tests of a signed-in top bar do not substitute for authentication acceptance tests.

### Secrets and environment

None detected. No new secret or environment setting. The reused helper retains sample-review flags, exact owned loopback origin and per-run/actor private OS temporary cache. It projects the one issued session cookie and CSRF token without passwords, email, other cookies, localStorage or browser state. No value is logged or added to screenshots/artifacts by this change. Existing secret audit passes across six source roots and the public environment boundary.

### Webhooks and third-party intake

None detected in the delta. No provider adapter, webhook or external request path changes. The original guarded-local-origin and no-external-request assertions remain in all top-bar browser cases.

### Dependencies and supply chain

None detected in the delta. No dependency, lockfile, loader, runtime configuration, authentication handler or workflow change. Earlier dependency audit evidence retains its own scope; no registry query was performed.

### Headers and transport

None detected. The helper's fixed HTTPS loopback URL and exact origin acceptance remain unchanged. A current server response, rather than a locally fabricated cookie or browser-only role assignment, determines reuse. No production TLS, origin, cookie attributes, redirect or header rule changed.

### AI-generated code and guard preservation

None detected. An exact byte comparison against HEAD, with only the intended documentation string replacement, confirms shared-helper implementation is unchanged. The top-bar diff contains only the import and preparation wrapper. No skipped test, changed expected visual value, weakened role/link assertion, new timeout, baseline replacement or widened guard is present.

### PII, storage and logging

None detected in this delta. Existing actor-partitioned, size-bounded, non-symlink cache and owned cleanup retain their reviewed behavior. The 22 existing tests exercise private files and cleanup under unique temporary paths. Windows remains subject to its existing user temporary-directory access boundary; POSIX mode bits are not a claim of a new Windows ACL. Crash-proof erasure is not established by ordinary finally cleanup. These inherited limits are unchanged by adding a preparation caller.

## Findings detail

Critical: None detected. High: None detected. Medium: None detected. Low: None detected in this assigned delta.

## Remediation summary

| Severity | Count | Fixed by reviewer | Documented source findings |
| --- | --- | --- | --- |
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Low | 0 | 0 | 0 |

Only this report was authored. No existing source, report, image, configuration, ledger or Git state was modified by the reviewer.

## Independent verification

| Check | Result |
| --- | --- |
| Existing session cache/identity/budget/filesystem suite | 22 passed, exit 0 |
| Tooling TypeScript | Passed |
| Focused lint and formatting | Passed |
| Secret audit and diff whitespace | Passed |
| Playwright review discovery | Eight top-bar cases discovered with the actual playwright.config.ts |
| Shared-helper logic | Exact intended comment-only replacement from HEAD verified |
| Eight approved Settings PNGs | Exact bytes match HEAD; no image replacement |
| Two source pins and handoff | Exact raw hashes match |

Unit command: pnpm exec vitest run --project unit tooling/tests/unit/browser-signin-session.test.ts. Discovery used the existing sample review project and --list; discovery did not start a browser or prove the new consumer passes against the database. Controlled proof ports in the unit tests do not manufacture runtime authority or qualify an actual server/browser reuse.

The author's retained canonical CI 38556674879 at 3d04fee reports complete Application/Release gates, 323 PostgreSQL cases, 162 authenticated review cases and four real-catalog cases passing, with the final top-bar visual case blocked at an actual 429 sign-in response before visual assertions, including its original retry. The entire prior run remains failed. Earlier passing Settings/webinar reuse does not qualify this new top-bar preparation call. Current-head canonical browser execution remains necessary.

## Frozen scope

| File | SHA-256 |
| --- | --- |
| tests/browser/review/top-bar.spec.ts | d79a556a0ef4de1e5fc0853c121501d4a7bc31277ad0312214b09a09442f8fdc |
| tests/browser/review/helpers/signin-session.ts | f672526e8f8ea700482038b34217178d0b6c5d558d12e0c5bf4419b845f79319 |
| library/requirements/reports/2026-10-14-domain-top-bar-session-handoff.md | f75be2c5b571422e1e4deeacdc844ef840c59c3b59c15e4571cd2a75d4ff159f |

## Re-evaluation

No Medium-or-above finding required remediation. Final frozen diffs and shared unchanged implementation were read, existing defensive units and static checks passed, and exact source/handoff hashes matched. No source finding prevents this packet from fresh Quality.

## Next step

Invoke fresh quality-guardian on this exact two-file follow-up. Root retains repository-health, PR review, frozen Git receipts and complete current-head canonical CI. Actual browser reuse, remaining domain-hosted qualification and product completion are not established by these unit/discovery checks. No merge, deployment, provider action or production authentication change was performed or cleared here.
