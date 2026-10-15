# Security review: property browser-session transplant

Date: 2026-10-14. Independent reviewer: security-guardian. Worktree: property-marketing-release. Scope: the seven frozen test-harness files copied from domain commit c5e454051c258de28a2cc417673599073604ed58 and their new handoff. Ownership: this report only.

## Executive summary

Scoped PASS, cleared to proceed to fresh Quality. No Critical, High, Medium or Low finding detected. All seven current files match that committed domain revision byte for byte, and all four prior independent domain review hashes match the handoff. This new report independently reviews the transplant; prior provenance alone does not approve it in the property branch.

The packet captures actual successfully issued review sessions and permits reuse only after fresh server identity/token verification. It introduces no production authentication change, manufactured authority, attempt-counter reset or higher limit. Existing authentication acceptance journeys still use actual password sign-in. Actual property browser execution remains a new canonical CI requirement.

The managed Security Weapon and integrated authorization/PII/lifecycle procedures apply. Its 2026-04-24 CVE intelligence remains beyond 120 days; refresh separately. No external advisory request, new payload/probe, actual browser/database execution, activation, credential read, provider action, source repair, Git operation or ledger change occurred. Broad scanner writes/external audit are outside this brief; existing defensive tests and static checks were used instead. This is a separate packet after the combined public runtime/admission review and before its own fresh Quality.

## Surface coverage checklist

### Application and test preparation

None detected. guided-setup-journey.ts:221-244 preserves the actual password POST response check and exact 200 assertion plus workspace-choice completion. Capture is passive and occurs only afterward. webinar-ads.spec.ts:64-73 and top-bar.spec.ts:92-98 call the reused preparation helper with the same original actual sign-in fallback. Their publication, role, layout, viewport/theme, accessibility, copy and external-request assertions are unchanged. No auth acceptance test is rewritten to accept a fabricated session.

### Authentication and tenancy

None detected. signin-session.ts:16-60 strictly validates the host-only Secure/HttpOnly/Lax cookie, bounded token shape, actor, finite capture time, two-hour age and unexpired cookie. Each context receives a clone. At lines 75-89 a candidate needs a fresh fixed-origin server overview and the current expected name, role, workspace and session-bound CSRF token. Invalid, revoked, stale or mismatched candidates clear the context before exactly one real fallback. Wrong identity after fallback refuses rather than looping or bypassing authentication.

currentProof at lines 185-210 requires actual 200 response and the exact HTTPS loopback origin before reading one server token and the current account-sheet identity. Production continues to supply principal/session-derived values under its unchanged authentication boundary. Cached browser text is not permission. No signing key read, session manufacturing, IP override, counter reset, new identity endpoint, timeout increase or production 20-attempt/900-second policy change is present.

### Secrets, PII and private cache lifecycle

None detected. Cache creation at signin-session.ts:92-120 requires the sample review flags, exact https://127.0.0.1:3443 and a new canonical random directory directly under the real OS temporary root. It rejects symlink, wrong type, old run and inappropriate POSIX owner/mode. Loads are fixed actor filenames, regular non-symlink files bounded to 4,096 bytes, with compatible capture time and POSIX owner/0600 checks. Saves use exclusive random temporary files and atomic rename.

Captured data projects only the actual issued cookie, token, actor, origin and time. Password, email, other cookies, localStorage and browser state are excluded. No value is logged or copied into repository artifacts. Windows keeps its existing user-temp access boundary; POSIX modes are not a new Windows ACL. Ordinary finally cleanup does not establish crash-proof erasure.

review-browser-run.mjs:39-65 creates and registers a private directory per catalog pass. Cleanup requires the exact owned canonical path, real temporary parent, expected basename, directory type and symlink refusal before recursive removal. The browser invocation receives this one path. Finally cleanup at lines 445-450 records a fixed failure without disclosing contents, then retains original artifact preservation and teardown. The session directory is outside the repository artifact upload paths. Existing guards refuse foreign/current-working-directory and substituted-symlink cleanup.

### Webhooks and third-party intake

None detected in the delta. No webhook/provider adapter changes. All preparation callers retain their local-origin request guards. No provider activation, customer message or ad launch is performed by caching a test session.

### Dependencies and supply chain

None detected in the delta. No package, lockfile, loader, production environment, domain source, SQL/scaffold or Settings-image transplant. Seven exact committed-source comparisons and the four prior report hashes pass. Prior dependency evidence is retained; no fresh online audit claim is made.

### Headers and transport

None detected. The helper retains its exact loopback HTTPS origin and current actual response verification. No production TLS, cookie, nonce, CSP, host rule or identity resolver is changed. The runner's existing server/catalog selection remains; this review did not invoke it to start a server. The previously rejected configured public-runtime fixture startup was not retried or repackaged.

### AI-generated code and guard preservation

None detected. Raw transplant comparison and focused diffs show only legitimate capture/reuse, two preparation callers, private run cache/cleanup, declarations and defensive fixture tests. There is no skip, altered visual expectation, weakened role assertion, fabricated provider evidence, delay or new timeout. Discovery is recorded separately from execution.

## Findings and remediation

Critical: None detected. High: None detected. Medium: None detected. Low: None detected in this seven-file packet. Only this new report was authored. No existing source, report, artifact, baseline, secret, ledger or Git state was modified by Security.

| Severity | Count | Fixed by reviewer | Documented source findings |
| --- | --- | --- | --- |
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Low | 0 | 0 | 0 |

## Independent verification

| Check | Result |
| --- | --- |
| Existing session fixture unit suite | 22 passed, exit 0 |
| Tooling TypeScript | Passed |
| Focused lint and seven-file formatting | Passed |
| Secret audit | Passed across six source roots and public environment boundary |
| Runner Node syntax and diff whitespace | Passed |
| Playwright sample review discovery | 163 cases in 14 files; no execution |
| Exact committed domain-source comparison | Seven files byte-identical |
| Four prior independent report hashes | Exact handoff hashes match |
| Seven source pins and new handoff | Exact raw hashes match |

Unit command: pnpm exec vitest run --project unit tooling/tests/unit/browser-signin-session.test.ts. Existing tests cover budget preservation, invalid/stale actor/cookie/proof refusal, one fallback, context cloning, real private temporary files, actor/run separation and guarded cleanup. They use controlled proof ports and filesystem operations, not actual server/browser authority. Playwright --list uses the repository's existing sample review project and starts no browser, database or server.

The author's preserved property CI 38560338247 remains failed: Application passed, 317 PostgreSQL cases passed, and 154 review browser cases passed before actual top-bar/webinar preparation sign-in 429 responses, including retries. Those passing cases do not make that run green or qualify this transplant. Current-head canonical browser execution remains required.

## Frozen scope and provenance

| File | SHA-256 |
| --- | --- |
| tests/browser/review/helpers/signin-session.ts | f672526e8f8ea700482038b34217178d0b6c5d558d12e0c5bf4419b845f79319 |
| tests/browser/review/helpers/guided-setup-journey.ts | 6e69bfcda55554d8dd6f5041312d9f1ffeeabfc9c15e9ff05ecb546341feb4a9 |
| tests/browser/review/webinar-ads.spec.ts | 6e2dd29c01bf3ccfaa9a0d836b5389b7d4e816c2b1baa91af58ef258a631e248 |
| tests/browser/review/top-bar.spec.ts | d79a556a0ef4de1e5fc0853c121501d4a7bc31277ad0312214b09a09442f8fdc |
| tooling/tests/unit/browser-signin-session.test.ts | 06169c60c27c0ffd060d6a9a2804a030d874459ae6599eb77d3056266706eee9 |
| tooling/scripts/database/review-browser-run.mjs | 5d64029a99d2135e456a3fc2886d99d1e1029ef7bcfb29c238ba7a7a6d4af1a4 |
| tooling/scripts/database/review-browser-run.d.mts | ce502817e94a3e36adaafd4387a5f2e2e2b8e221c3e2fe293e5b9c39d19109a5 |

Transplant handoff: 3d30362f5e18973a61f362c7afd5463e3f1f4794ec2d9e00b696dd1375a3fdc0. Prior domain fixture Security: d7f679576270f13e2bb670e004a9e1da009e4e60cf743ab0cc06ebcf7c7e34b5; fixture Quality: 52a4333b75bdd52643d25f46f560e99050d07216b7c167120e4fdd17745c6a89. Prior top-bar Security: 83ef95ac66fc5c8543093996005dddf6ef02eceef46e24467347aef071c7c17d; top-bar Quality: 48b080ad3f7778dc61a5595bbff23ae9ba3eb5282ed3fd1f8bbdad15dd99962a. Those prior reports were independently rehashed, not modified.

## Re-evaluation and next step

No Medium-or-above finding required remediation. Final frozen diffs, helpers and runner were reviewed; existing defensive units/static checks and raw committed-source comparisons passed. Fresh Quality may review this exact seven-file transplant. Root owns repository-health, PR review, exact Git receipts and current-head canonical CI. No actual session-reuse execution, product/production completion, purchase, provider effect, merge or deployment is cleared by this report.
