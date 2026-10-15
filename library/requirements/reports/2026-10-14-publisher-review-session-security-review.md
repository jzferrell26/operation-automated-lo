# Security review: publisher browser-session transplant

Date: 2026-10-14. Independent reviewer: security-guardian. Worktree: webinar-publisher. Scope: seven frozen test-harness files copied from domain commit c5e454051c258de28a2cc417673599073604ed58 and their new publisher handoff. Ownership: this report only.

## Executive summary

Scoped PASS, cleared for fresh independent Quality. No Critical, High, Medium or Low finding detected. All seven current files independently match the exact committed domain bytes and the publisher handoff pins. All four committed domain Security/Quality hashes match. Existing session fixture units pass 22/22. This independently reviews the publisher transplant rather than treating prior domain approval as publisher approval.

Captured sessions come from an actual successful password sign-in and workspace choice. Every reuse requires fresh fixed-origin server identity and matching session-bound CSRF proof; invalid candidates fall back once to actual sign-in. No production authentication, counter, limit, role, SQL, image or application runtime changes are included. Actual publisher browser execution and current-head canonical CI remain open.

The managed Security Weapon and integrated authorization/PII/lifecycle procedures apply. Its CVE intelligence last refreshed 2026-04-24 remains beyond 120 days and requires a separate refresh. This delta adds no dependency. Broad scanner external audits/writes are outside this narrow brief; existing defensive tests, exact source comparisons and static audits were used. No new payload/probe, secret read, actual browser/database/application startup, provider action, source repair, Git mutation or ledger edit occurred. Read-only Git object retrieval verified committed provenance. Prior Quality concerns separate packets; fresh publisher session Quality follows this review.

## Surface coverage checklist

### Actual preparation and authentication journeys

None detected. guided-setup-journey.ts:221-244 retains the original password POST, exact 200 assertion and successful workspace-choice completion before passive session capture. webinar-ads.spec.ts:64-73 and top-bar.spec.ts:92-98 use the preparation helper with their original actual sign-in fallback. Authentication acceptance journeys continue to call signInExisting directly. The source comparison confirms original visual, publication, role, layout, accessibility, external-request and product-copy expectations remain the committed reviewed expectations.

The helper is limited to seeded sample-review identities and the fixed HTTPS loopback origin. Existing creator/approver fixtures do not add customer role management to the single-LO product. There is no manufactured session, alternate identity endpoint, forwarding-header override, attempt-counter reset, increased timeout or production rate-policy change.

### Fresh identity, cookie and CSRF authority

None detected. signin-session.ts:14-54 strictly validates the host-only Secure/HttpOnly/Lax cookie and bounded cookie/token shape, exact actor/origin, finite capture time, two-hour age and unexpired cookie. Each installation receives a clone. acquireReviewSession at lines 68-83 accepts reuse only after fresh proof of the expected seeded identity, role, workspace and exact saved CSRF token. Invalid, revoked, expired or mismatched candidates clear the browser context before one real fallback; wrong identity after fallback refuses without looping.

currentProof at lines 187-209 performs a real fixed-origin overview navigation, requires actual 200 and one CSRF meta value, and reads current account-sheet identity. Cached page text is not proof. The saved cookie and token are actual captured outputs after the original sign-in, not fabricated authority. Existing production session and server-derived identity/token boundaries are unchanged.

### Private file lifecycle and PII/secrets

None detected. signin-session.ts:86-113 requires the sample-review flags, exact loopback URL and canonical random directory directly under the real OS temporary root. It refuses wrong type, symlink, stale directory and inappropriate POSIX owner/mode. Loads at lines 115-134 use fixed actor filenames, regular non-symlink files bounded to 4,096 bytes, current-run capture time and POSIX owner/0600 checks. Save at lines 136-141 uses an exclusive random temporary file and atomic rename.

Capture projects only the actual session cookie, CSRF token, actor, origin and capture time. Passwords, email, other cookies, localStorage and general browser state are excluded; values are not logged or placed in repository/browser artifact paths. Windows retains existing user temporary-directory access. POSIX modes do not constitute new Windows ACLs, and finally cleanup is not crash-proof erasure.

review-browser-run.mjs:39-65 creates and records a private directory per invocation. Recursive removal first verifies exact owned canonical path, actual temp-root parent, expected basename, directory type and symlink refusal. The existing fixture suite proves foreign/current-working-directory and substituted-junction cleanup refusals. The per-pass finally cleanup records a fixed safe failure and preserves existing browser output/teardown handling. This review did not invoke the runner to start a server.

### HTTP, provider and financial effects

None detected in this delta. The helper retains fixed loopback origin, fresh server response verification and local-origin guards. Production TLS, cookie policy, CSRF, nonce, CSP, public financing handler, publisher command producer and provider transport are unchanged. No session cache enables a provider call, contact delivery or ad launch. Publisher original-command authentication is a separately reviewed packet and is not qualified or wired by this transplant.

### Dependency and source provenance

None detected. Seven raw committed Git object comparisons pass, as do all seven handoff pins and four prior committed review hashes. No dependency, lockfile, domain Settings baseline, SQL/scaffold, production source, database export, task index, root ledger or runtime flag was copied. Narrow declarations add only the private directory lifecycle functions. Existing syntax, tooling types, configured lint/format and secret audits pass.

### Generated code and verification honesty

None detected. Fresh proof and bounded fallback replace no auth acceptance test. No weakened assertion, fabricated status, hidden counter reset, delay or threshold change was introduced. Discovery and actual execution are recorded separately. Root's attributed domain CI 38566055257 remains domain evidence for identical source, not publisher current-head CI or local execution. Earlier failures are not relabeled successful.

## Findings and remediation

Critical: None detected. High: None detected. Medium: None detected. Low: None detected in the assigned scope. No source remediation required. Only this new report was authored. Existing defensive units created and cleaned their disposable temporary fixture files; no cached actual authentication was captured by this review.

| Severity | Count | Fixed by reviewer |
| --- | --- | --- |
| Critical | 0 | 0 |
| High | 0 | 0 |
| Medium | 0 | 0 |
| Low | 0 | 0 |

## Independent verification

| Check | Result |
| --- | --- |
| Existing session fixture unit file | 22 passed, exit 0 |
| Tooling TypeScript | Passed |
| Runner syntax | Passed |
| Focused configured oxlint/Prettier | Passed |
| Secret audit | Passed across six source roots and public environment boundary |
| Current files versus exact domain commit c5e454 | Seven byte-for-byte matches |
| Current files versus handoff SHA inventory | Seven matches |
| Prior domain independent review hashes from that commit | All four match |
| Correct sample-review Playwright discovery | 163 cases in 14 files, list only |

The initial discovery invocation omitted the review selection environment and correctly refused the unavailable review project; it ran no tests and started no browser/server. With only the existing sample-review discovery flags selected, playwright.config.ts and --list found all 163 cases. Discovery is not execution. No server, database, production setting, browser baseline or screenshot was touched.

## Frozen seven-file inventory

| File | SHA-256 |
| --- | --- |
| tests/browser/review/helpers/signin-session.ts | f672526e8f8ea700482038b34217178d0b6c5d558d12e0c5bf4419b845f79319 |
| tests/browser/review/helpers/guided-setup-journey.ts | 6e69bfcda55554d8dd6f5041312d9f1ffeeabfc9c15e9ff05ecb546341feb4a9 |
| tests/browser/review/webinar-ads.spec.ts | 6e2dd29c01bf3ccfaa9a0d836b5389b7d4e816c2b1baa91af58ef258a631e248 |
| tests/browser/review/top-bar.spec.ts | d79a556a0ef4de1e5fc0853c121501d4a7bc31277ad0312214b09a09442f8fdc |
| tooling/tests/unit/browser-signin-session.test.ts | 06169c60c27c0ffd060d6a9a2804a030d874459ae6599eb77d3056266706eee9 |
| tooling/scripts/database/review-browser-run.mjs | 5d64029a99d2135e456a3fc2886d99d1e1029ef7bcfb29c238ba7a7a6d4af1a4 |
| tooling/scripts/database/review-browser-run.d.mts | ce502817e94a3e36adaafd4387a5f2e2e2b8e221c3e2fe293e5b9c39d19109a5 |
| library/requirements/reports/2026-10-14-publisher-review-session-handoff.md | 17237fef07cbb47a054ff493b6b483986f2dd0a259f5ba51409d7da19c63a49d |

Committed domain Security/Quality provenance matches d7f679576270f13e2bb670e004a9e1da009e4e60cf743ab0cc06ebcf7c7e34b5, 52a4333b75bdd52643d25f46f560e99050d07216b7c167120e4fdd17745c6a89, 83ef95ac66fc5c8543093996005dddf6ef02eceef46e24467347aef071c7c17d and 48b080ad3f7778dc61a5595bbff23ae9ba3eb5282ed3fd1f8bbdad15dd99962a. These retained reports do not replace this publisher review or fresh publisher Quality.

## Handoff and limits

Proceed to fresh independent Quality at these exact pins, then root-owned canonical current-head CI and Git/release closeout. Actual publisher sample/real-catalog browser runs remain required. Native publisher authentication/worker verification, historical HOLD/scoped native resolution, configured runtime, actual provider capture, customer flow and overall product release remain separate dispositions. No live effect, deployment, merge or completed publisher outcome is cleared here.

Automatic approval review previously rejected configured whole-app startup using fixture DB/R2 hooks and an activation flag as "blocked by policy." That action remains unrun and was not repackaged or retried. List-only discovery and existing fixture units are separate verification.
