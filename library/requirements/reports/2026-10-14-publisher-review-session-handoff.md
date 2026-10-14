# Publisher review session transplant, October 14, 2026

Author: typescript-node-guardian. Destination: webinar-publisher at base commit 23ce8256d40a05ce21fb31d8ecf6d1d77aa6efcd. Source authority: committed domain revision c5e454051c258de28a2cc417673599073604ed58.

The seven assigned test-harness files were copied byte for byte from the committed domain source. The property copy was not used as source authority. Before copying, the exact seven-path diff from publisher HEAD to the domain source was inspected: it adds actual session capture/reuse, the two visual/webinar preparation consumers, run-scoped private cache lifecycle, corresponding runner declarations and existing fixture tests. No domain Settings image, scaffold, inventory or production source was transplanted.

Actual password POST 200 and the successful workspace selection remain the source of captured session cookies. Every reuse requires a fresh fixed-origin server overview, current seeded identity, role and workspace, and the exact session-bound CSRF token. Invalid, expired, revoked or mismatched candidates clear their browser context and invoke exactly one original real sign-in fallback. Authentication acceptance journeys continue to call the actual sign-in helper directly. No session is manufactured, counter reset, IP header spoofed, timeout increased or production sign-in limit weakened.

The existing cache remains sample-review-only, actor-partitioned and confined to a newly owned private OS temporary directory. It stores only the actual issued cookie, token, actor, origin and capture time. Passwords, email, other cookies, browser storage and repository artifact paths are excluded. Guarded cleanup and its reported failures remain intact. Windows relies on existing user temporary-directory access; POSIX modes do not establish Windows ACLs. Ordinary finally cleanup is not a crash-proof erasure guarantee. The seeded creator and approver are test identities, not new customer role management.

## Source provenance

The committed independent review hashes were reverified against raw source bytes:

- Domain browser fixture Security: d7f679576270f13e2bb670e004a9e1da009e4e60cf743ab0cc06ebcf7c7e34b5.
- Domain browser fixture Quality: 52a4333b75bdd52643d25f46f560e99050d07216b7c167120e4fdd17745c6a89.
- Domain top-bar follow-up Security: 83ef95ac66fc5c8543093996005dddf6ef02eceef46e24467347aef071c7c17d.
- Domain top-bar follow-up Quality: 48b080ad3f7778dc61a5595bbff23ae9ba3eb5282ed3fd1f8bbdad15dd99962a.

Root reports complete domain canonical CI 38566055257: all four jobs succeeded, with 323 actual PostgreSQL cases across 26 files, 163 sample review-browser cases and four real-catalog cases. This is attributed domain evidence for the identical dependency source. It is not publisher current-head CI, local browser execution or approval of this transplantation. Earlier failed property/domain runs remain historical failures; this copy relabels none of them.

## Local verification

- All seven files match the committed source's exact bytes both immediately after copying and after checks.
- Existing session fixture suite passed 22/22: `pnpm exec vitest run --project unit tooling/tests/unit/browser-signin-session.test.ts`.
- Tooling TypeScript passed with `tsconfig.tooling.json`; focused configured oxlint, Prettier and diff whitespace checks passed.
- Existing sample review discovery found 163 tests in 14 files using `playwright.config.ts`, the review project and `--list`. Discovery did not start a browser, server or database and does not prove actual session reuse in publisher.

Only these seven files and this new handoff were authored. No publisher authentication application source, database index, SQL, runtime, image, root ledger, metadata, dependency, credential or provider configuration was modified. The reviewed publisher worker/binding packet and the separate database owner's active authentication packet were preserved. No live app startup, provider action, Git commit/push or deployment occurred. The previously rejected configured-runtime fixture startup was not retried.

## Frozen seven-file inventory

| Path | SHA-256 |
| --- | --- |
| tests/browser/review/helpers/signin-session.ts | f672526e8f8ea700482038b34217178d0b6c5d558d12e0c5bf4419b845f79319 |
| tests/browser/review/helpers/guided-setup-journey.ts | 6e69bfcda55554d8dd6f5041312d9f1ffeeabfc9c15e9ff05ecb546341feb4a9 |
| tests/browser/review/webinar-ads.spec.ts | 6e2dd29c01bf3ccfaa9a0d836b5389b7d4e816c2b1baa91af58ef258a631e248 |
| tests/browser/review/top-bar.spec.ts | d79a556a0ef4de1e5fc0853c121501d4a7bc31277ad0312214b09a09442f8fdc |
| tooling/tests/unit/browser-signin-session.test.ts | 06169c60c27c0ffd060d6a9a2804a030d874459ae6599eb77d3056266706eee9 |
| tooling/scripts/database/review-browser-run.mjs | 5d64029a99d2135e456a3fc2886d99d1e1029ef7bcfb29c238ba7a7a6d4af1a4 |
| tooling/scripts/database/review-browser-run.d.mts | ce502817e94a3e36adaafd4387a5f2e2e2b8e221c3e2fe293e5b9c39d19109a5 |

Released for fresh independent Security then Quality on this publisher transplant. Root owns subsequent repository/PR review, Git operations and current-head canonical CI. This packet does not qualify publisher live deployment, provider execution, browser completion or the overall product release.
