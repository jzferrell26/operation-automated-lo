# Domain review browser sign-in budget repair

Date: 2026-10-14. Implementation handoff, pending independent Security then Quality and canonical CI. Root owns Git, CI and the ship gate. No production or provider action was exercised.

## Failure and scope

Run `38544891984`, head `4209bbf323`, completed the PostgreSQL checks and 130 review browser cases before the expected new Settings baseline mismatch and webinar setup failure. The original log at `tmp/domain-final-pg-ci-38544891984-job.log`, around line 2875, records the actual `POST /api/auth/sign-in` returning 429 in webinar `beforeAll` and again on the serial retry. The existing production policy allows 20 attempts per IP per 900 seconds. That policy is unchanged.

Review uses one worker, but a failed case restarts that worker. A module-only session cache would lose earlier password-login sessions after the Settings comparison failure and on webinar retries. The repair captures a legitimate session after the unchanged real password POST 200 and any workspace choice. Only webinar preparation consumes it. Authentication, password change, sign-out and every other journey still call the real sign-in helper.

## Binding and lifecycle

The existing review runner creates one random private OS-temp directory per catalog invocation. It passes the path only to that Playwright invocation and removes it in `finally`, including a failing invocation. Cleanup checks the exact absolute path against the runner's own created-path registry, its real parent, directory type and absence of a symlink before recursive removal. Cleanup failure remains a named run failure without preventing artifact preservation or server teardown. The existing server bindings, timeouts, test selection, failure trace handling and provider flags are unchanged.

The helper accepts only the sample review pass and the exact `https://127.0.0.1:3443` origin. An absent or inappropriate cache context uses a fresh password login. A foreign initial page or unseeded actor is refused. The cache stores only the one actual `__Host-oalo_session` cookie, its session-bound CSRF token, actor label, origin and capture time. It stores no password, email, local storage or general browser storage state. Directory and file modes are 0700 and 0600 on POSIX. Files remain outside the repository and browser artifact directories. These private files are never printed or included in the existing artifact consumer.

Every reuse creates a cloned cookie input in a separate browser context and freshly navigates to the server-rendered overview. It requires the same session-bound HMAC and exact seeded account name, current role and workspace from the account sheet. The production `resolveRuntimeShellSession` verifies the principal, current role binding and installation before rendering that token and identity. An expired, revoked, malformed or mismatched candidate is discarded from the context and causes exactly one real password-login fallback. The existing POST 200 assertion remains intact. A failed fresh identity verification is a named refusal, with no retry loop or secret-bearing diagnostic.

No counter reset, new identity endpoint, manufactured cookie, signing-key access, forwarded IP override, limit increase, fixed delay, provider operation or authentication-policy exception was introduced.

## Verification

Environment: Windows, Node 24.18.0, Playwright 1.63.0. The intended browser channel remains the existing Chromium review project. No local authenticated browser server or actual database-backed browser was launched for this repair because the local Docker PostgreSQL path is unavailable. Actual cookie/server integration remains a canonical CI requirement.

- `pnpm exec vitest run --project unit tooling/tests/unit/browser-signin-session.test.ts tooling/tests/unit/database/review-browser-evidence.test.ts tooling/tests/unit/production-foundation/playwright-browser.test.ts`: 40 passed, including 22 new setup/cache cases. These are fixture-control and real filesystem tests, not a claim of actual browser authentication.
- A simulated exhausted 20-attempt allowance remains at 20 through eight independent setup acquisitions, modeling worker restarts using the shared private run state. Revocation, HMAC mismatch, actor/role/workspace/origin mismatch and invalid cookie attributes exercise the fresh fallback and refusal paths. Actual filesystem tests prove actor/run isolation, malformed-file and symlink refusal, private modes and owned cleanup.
- Four independent mutations in ignored `tmp/run-signin-budget-mutations.mjs` each produce a named failing regression: fresh login for every setup, acceptance of a different session HMAC, ignoring the current role, and sharing mutable cookie state. The last mutation removes both schema cloning and explicit cloning; removing explicit cloning alone remains protected by Zod's clone. The temporary mutation test file was removed, and the production helper stayed unchanged.
- Tooling TypeScript, scoped Oxlint, scoped Prettier, `git diff --check`, the 16-package boundary audit and the source secret audit passed.
- Review project discovery under its existing gate flags: 163 cases in 14 files. Discovery launches no browser and establishes no integration qualification.

The first test invocation intentionally could not resolve the new helper before implementation. That import failure is not counted as a meaningful regression demonstration. The original real CI 429 and the four later executable mutation failures provide the red evidence.

## Frozen source pins

| File | SHA-256 |
| --- | --- |
| `tests/browser/review/helpers/signin-session.ts` | `388465027e3576a381cb2e908364f8dc177ed924be87364ac66538d9b903cecd` |
| `tests/browser/review/helpers/guided-setup-journey.ts` | `6e69bfcda55554d8dd6f5041312d9f1ffeeabfc9c15e9ff05ecb546341feb4a9` |
| `tests/browser/review/webinar-ads.spec.ts` | `6e2dd29c01bf3ccfaa9a0d836b5389b7d4e816c2b1baa91af58ef258a631e248` |
| `tooling/tests/unit/browser-signin-session.test.ts` | `06169c60c27c0ffd060d6a9a2804a030d874459ae6599eb77d3056266706eee9` |
| `tooling/scripts/database/review-browser-run.mjs` | `5d64029a99d2135e456a3fc2886d99d1e1029ef7bcfb29c238ba7a7a6d4af1a4` |
| `tooling/scripts/database/review-browser-run.d.mts` | `ce502817e94a3e36adaafd4387a5f2e2e2b8e221c3e2fe293e5b9c39d19109a5` |

The root-owned Settings inventory correction and independently reviewed eight Settings PNGs are outside this packet. No source from other active owners was edited. After independent Security then fresh Quality, root must apply the GitHub repository-health ship gate and rerun the unchanged real database/browser CI before claiming this repair fully qualified. No commit, push, merge or deployment was performed by this author.
