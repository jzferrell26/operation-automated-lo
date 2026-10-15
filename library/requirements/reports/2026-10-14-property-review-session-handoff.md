# Property review session transplant, October 14, 2026

The seven assigned test-harness files were copied byte for byte from committed domain revision c5e454051c258de28a2cc417673599073604ed58 into property-marketing-release at base 5f48bb2408d4c11f215d9194cd2fc036ae16e4a7. Before copying, the exact seven-path diff was inspected. It changes only legitimate session capture/reuse, the two visual/webinar preparation callers, run-scoped private cache creation/passing/cleanup, declarations and existing fixture tests. No domain Settings image, inventory, scaffold, production domain code, authentication handler, runtime packet or database file was transplanted.

Actual successful password POST 200 remains the only source of captured session cookies. Every reuse requires a fresh fixed-origin server overview with current seeded identity, role, workspace and session-bound token. Invalid, expired, revoked or mismatched candidates clear their browser context and invoke exactly one original real sign-in fallback. Authentication acceptance journeys continue to use the actual sign-in helper directly. No session was manufactured, authentication counter reset, IP header spoofed, delay inserted, timeout increased or production 20-attempt/900-second policy weakened.

The cache remains actor-partitioned, sample-review-only and limited to a newly owned private OS temporary directory. It stores only the actual issued cookie, CSRF token, actor, origin and capture time; no password, email, other cookie or browser storage state. Its guarded cleanup remains outside repository artifact paths. Existing Windows user-temp access and ordinary finally-cleanup limits are preserved, without claiming POSIX modes are Windows ACLs or cleanup is crash-proof.

## Prior independent provenance

All four source review reports were read and their raw hashes verified in domain-completion. They are provenance for the source, not independent approval of this transplantation:

- Browser fixture Security: d7f679576270f13e2bb670e004a9e1da009e4e60cf743ab0cc06ebcf7c7e34b5.
- Browser fixture Quality: 52a4333b75bdd52643d25f46f560e99050d07216b7c167120e4fdd17745c6a89.
- Top-bar follow-up Security: 83ef95ac66fc5c8543093996005dddf6ef02eceef46e24467347aef071c7c17d.
- Top-bar follow-up Quality: 48b080ad3f7778dc61a5595bbff23ae9ba3eb5282ed3fd1f8bbdad15dd99962a.

## Local verification

All seven copied files match the committed revision's exact raw bytes. Existing session fixture tests passed 22/22. Tooling TypeScript with tsconfig.tooling.json, focused lint and formatting passed. Actual Playwright review discovery found 163 tests in 14 files using the existing sample-review configuration. Discovery did not start a browser, database or server and does not establish actual session reuse.

The failed property CI run 38560338247 remains failed and its raw log tmp/property-pg-ci-38560338247.log was preserved unchanged. Its Application gate passed, actual PostgreSQL cases passed 317, and review browser passed 154 cases before top-bar and webinar preparation encountered actual password sign-in 429 responses, including retained retries. This transplant does not relabel that run successful. Fresh current-head canonical execution is required after independent Security, then Quality and root repository/PR checks.

No dependency, secret, production auth/configuration, public runtime, database, image, provider, deployment, Git commit/push or root ledger was changed by this task. The previously rejected configured-runtime fixture startup was not retried. Other agents' frozen and active work was preserved.

## Frozen seven-file packet

| Path | SHA-256 |
| --- | --- |
| tests/browser/review/helpers/signin-session.ts | f672526e8f8ea700482038b34217178d0b6c5d558d12e0c5bf4419b845f79319 |
| tests/browser/review/helpers/guided-setup-journey.ts | 6e69bfcda55554d8dd6f5041312d9f1ffeeabfc9c15e9ff05ecb546341feb4a9 |
| tests/browser/review/webinar-ads.spec.ts | 6e2dd29c01bf3ccfaa9a0d836b5389b7d4e816c2b1baa91af58ef258a631e248 |
| tests/browser/review/top-bar.spec.ts | d79a556a0ef4de1e5fc0853c121501d4a7bc31277ad0312214b09a09442f8fdc |
| tooling/tests/unit/browser-signin-session.test.ts | 06169c60c27c0ffd060d6a9a2804a030d874459ae6599eb77d3056266706eee9 |
| tooling/scripts/database/review-browser-run.mjs | 5d64029a99d2135e456a3fc2886d99d1e1029ef7bcfb29c238ba7a7a6d4af1a4 |
| tooling/scripts/database/review-browser-run.d.mts | ce502817e94a3e36adaafd4387a5f2e2e2b8e221c3e2fe293e5b9c39d19109a5 |

Released for fresh Security, then Quality. Parent owns root ledgers, repository-health review, Git state and the canonical CI rerun. This packet provides no production or full-property release qualification.
