# Domain browser fixture security review

Date: October 14, 2026. Auditor: security-guardian, `/root/domain_transport_security`. Base: `4209bbfeea4ce97b2693741afb85e72b6839434e`. Assigned scope: six browser-harness files, the root-owned Settings inventory test and exact eight approved Settings PNGs. Ownership: this report only.

## Executive summary

**Bounded source PASS.** No new Critical, High, Medium or Low issue was detected. The cache reuses an actual server-issued session for webinar setup only, with a fresh server-rendered identity and session-bound token check before acceptance. It changes no production authentication policy, rate limit, session authority or request origin rule.

Independent execution passed 95 existing cases, tooling TypeScript, secret audit and whitespace checks. The cache tests use controlled proof ports and real temporary filesystem operations; they do not establish actual server/browser reuse. Fresh Quality and canonical authenticated PostgreSQL/browser CI remain required. No external requests, new payloads, server probes or actual database/browser integration were performed in this read-only review.

## Method and ordering

Read the managed native configuration, Security Weapon, principles and retained relevant catalogs, repository instructions and current handoffs. Applied authorization, secret handling, transport and lifecycle checks to this test harness. The previous final-source Security and Quality cover unchanged production pins; they do not qualify this new harness delta. No Quality report for the new six-file packet existed at entry, and `library/qa/` is absent. This review precedes fresh Quality.

The existing eight UI/routing source pins from final-source Security remain byte-identical. The dependency manifests, lockfile, workflows, proxy, runtime authentication and production rate-limit code have no delta. The prior production audit and accepted development advisory disposition remain attributed evidence; no fresh registry request or full scanner was run because the assigned scope forbids external requests and new probes. Repository secret scanning and bounded existing tests were executed. The managed CVE watchlist remains stale (April 24, 2026); refresh it separately.

## Scorecard

| Category | Result | New findings |
| --- | --- | --- |
| Financial/payment surface | None detected; no new payment surface | 0 |
| PII, credentials and logs | None detected | 0 |
| Authentication and authorization | None detected in the assigned delta | 0 |
| Injection, paths and cleanup | None detected | 0 |
| Dependencies | No dependency delta; previous audit retained | 0 |
| Transport and headers | No production delta | 0 |
| Data handling, lifetime and artifacts | None detected | 0 |

## Defensive evaluation

### Actual authority and actor separation

None detected. `tests/browser/review/helpers/guided-setup-journey.ts:219-244` retains the actual password POST and exact 200 assertion, then captures only after the successful overview/workspace-selection path. The reuse helper is consumed only by the webinar preparation at `tests/browser/review/webinar-ads.spec.ts:64-73`. Authentication, password change and sign-out journeys still use the real helper.

`tests/browser/review/helpers/signin-session.ts:16-42` strictly validates the exact host-only, Secure, HttpOnly, Lax session cookie and bounded token shape. Candidate acceptance also requires the selected actor, finite capture time, two-hour age and unexpired cookie (`:47-60`). Cookie inputs are cloned per browser context (`:81`). Invalid proof clears the context before exactly one actual sign-in fallback, and a failed fresh identity check refuses rather than looping (`:82-89`). A cached token cannot manufacture session authority.

Every candidate reuse navigates freshly to the fixed HTTPS overview, requires status 200 and the exact origin, then reads the single server-rendered token and account-sheet name, role and workspace (`:185-210`). These must match the selected seeded identity, current expected role/workspace and cached session-bound token (`:61-71`, `:83`). The unchanged production `resolveRuntimeShellSession` independently resolves the authenticated principal before deriving the token from the current principal's session id (`apps/web/src/server/runtime-authentication.ts:623-647`); the displayed role and names come from that principal and current server data (`:650-669`). Browser text checks supplement that existing server boundary, not replace it.

The password attempt policy remains `sign_in_ip: { attemptLimit: 20, windowSeconds: 900 }` at `apps/web/src/server/password-authentication-handler.ts:120`. There is no new manufactured cookie, signing-key read, rate counter reset, IP override, limit increase, bypass endpoint or production configuration exception.

### Private storage and cleanup

None detected. Cache creation requires the existing sample-review flags, exact `https://127.0.0.1:3443` origin and a canonical absolute random directory directly under the real OS temp root (`signin-session.ts:92-119`). It rejects symlinks, wrong directory/type, old runs, and wrong POSIX owner/mode. Windows relies on the existing user temp-directory access boundary; this review does not claim that POSIX mode bits create a Windows ACL.

Loads are fixed actor filenames, bounded to 4096 bytes, regular non-symlink files with POSIX owner/0600 checks and a capture time no earlier than this directory's birth (`:124-144`). Saves use random exclusive temporary files and atomic rename (`:147-150`). The projection stores the one actual cookie, token, actor, origin and time only (`:163-181`), without passwords, email, other cookies or browser storage state. No cached value is logged or added to repository evidence.

The runner creates a new random private directory for each catalog invocation and retains its resolved path in an owned-directory registry (`tooling/scripts/database/review-browser-run.mjs:39-46`). Recursive cleanup checks exact ownership, real parent, expected basename, realpath, directory type and symlink refusal before removal (`:48-65`). The path is passed only to the browser invocation. Its `finally` cleanup reports a fixed failure while continuing artifact preservation and server teardown (`:445-460`). The unchanged artifact copier and workflow uploads select repository `test-results` paths, not OS-temp cache files. Abrupt OS/process termination is outside `finally` guarantees; this packet claims ordinary success/failure teardown, not crash-proof erasure.

### Settings test and image adoption

None detected. The root-owned inventory delta adds only the exact Domains heading/link to the ordered headings and complete sorted link inventory, preserving the Account billing assertion. Application Settings source is unchanged in this packet. Exactly eight Settings PNGs match the frozen whole-original UX report's new hashes and dimensions, and all corresponding previous bytes match the retained backup. No other baseline was adopted by this packet.

The independent report's disclosed inherited `toolCard`/wrapper source-policy discrepancy is preserved; image approval does not waive that source policy. These PNGs are static default-state evidence from the disposable authenticated capture and do not establish connection readiness, provider behavior or whole-workflow success. This reviewer checked exact bytes and metadata, and did not repeat the UX visual inspection or regenerate images.

## Findings and remediation

Critical: None detected. High: None detected. Medium: None detected. Low: None detected.

Only this report was added. No remediation or source/test/image mutation occurred. `git diff --check` passed. There is no newly fixed Medium-or-above issue requiring a remediation cycle.

## Independent executed evidence

| Existing bounded check | Result |
| --- | --- |
| Session cache, browser evidence and Playwright foundation units | 40 passed across three files |
| Legacy Settings workspace-route inventory integration | 17 passed |
| Runtime authentication and authenticated principal units | 38 passed across two files |
| Tooling TypeScript | Passed with `tsconfig.tooling.json` |
| Secret audit and whitespace check | Passed |
| Six source pins, inventory and three handoff/review pins | Matched |
| Prior eight UI/routing source pins | Unchanged |
| Eight new Settings originals and previous backup hashes | All matched; new dimensions matched |

The first TypeScript invocation selected nonexistent `tooling/tsconfig.json` and executed no check. Reading the existing root script identified `tsconfig.tooling.json`; that unchanged configuration passed. Some read-only discovery commands initially named nonexistent adjacent files; discovered paths were used for the actual source checks. No source, timeout, selector or gate was changed for these corrections.

The author's four executable mutation failures and 163-case browser discovery are attributed evidence. No new security payload or mutation probe was created by this reviewer. Real browser reuse, current database role/session invalidation and cross-worker integration require the unchanged canonical gate.

## Frozen provenance

| File | SHA-256 |
| --- | --- |
| tests/browser/review/helpers/signin-session.ts | 388465027e3576a381cb2e908364f8dc177ed924be87364ac66538d9b903cecd |
| tests/browser/review/helpers/guided-setup-journey.ts | 6e69bfcda55554d8dd6f5041312d9f1ffeeabfc9c15e9ff05ecb546341feb4a9 |
| tests/browser/review/webinar-ads.spec.ts | 6e2dd29c01bf3ccfaa9a0d836b5389b7d4e816c2b1baa91af58ef258a631e248 |
| tooling/tests/unit/browser-signin-session.test.ts | 06169c60c27c0ffd060d6a9a2804a030d874459ae6599eb77d3056266706eee9 |
| tooling/scripts/database/review-browser-run.mjs | 5d64029a99d2135e456a3fc2886d99d1e1029ef7bcfb29c238ba7a7a6d4af1a4 |
| tooling/scripts/database/review-browser-run.d.mts | ce502817e94a3e36adaafd4387a5f2e2e2b8e221c3e2fe293e5b9c39d19109a5 |
| apps/web/src/app/(authenticated)/[...workspacePath]/workspace-routes.integration.test.tsx | 3d9bbcfea6b5ca8d6f9be201206b8113086de5c4157b9abf2def281af372a6cc |

Browser handoff: `4cec5471219e1f41ec03c15752d1bc3295ac8f7fe03deed853266eb5a0fdaccc`. Inventory handoff: `cd7df40da4db00bef7c22b8ac3f099ccd5f61b26c5e31fea3c4e6e8da6a809ed`. Exact eight-image approval and full new/prior hash table: `2026-10-14-domain-settings-baseline-review.md`, SHA-256 `c3c386bc5ccd0807db5ad070d97281f6e179a4394c8162c48616636ce845a8e0`. Prior baseline bytes remain in `tmp/settings-prior-before-adoption-4209/`.

Prior final-source Security: `02f709fb6902b769a89b1114cb4bbbd399d68fd0d51cc60639f623715b520508`. Prior final-source Quality: `1424b607261995dce89f0fb10a79d04739c7b2a96697b9ee4f20fbc5df82233f`. Their eight source pins match current bytes; neither report is rewritten or extended into acceptance of this new harness.

## Required next step

Fresh Quality must review this exact packet and the preserved Settings source-policy distinction. Root must then perform repository-health review and current-head canonical CI, preserving the prior real 429 and baseline failures. This source PASS does not turn a failed workflow green, prove actual session reuse or authorize merge, deployment, production changes or provider actions.
