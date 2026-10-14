# Runtime acquisition Security review

Audit date: October 13, 2026, America/Chicago. Auditor: independent security-guardian. Branch: `codex/authenticated-runtime-diagnosis`, stacked on patched parent `5eb7fef829e6e17eaf147256f564704e46a23a7b`. Scope: the eleven source/test files pinned below, their immediate principal, tenant-transaction and Postgres.js reservation seams. This is a bounded runtime review, not a whole-product security certification or hosted recovery acceptance.

## Executive summary

PASS for fresh Quality handoff after one Medium shutdown-rejection finding was fixed and the complete bounded source scope re-evaluated. No Critical, High or remaining Medium/Low findings detected in this scope. Mandatory authentication continues to fail closed; diagnostic logs contain no credentials, session identifiers, customer data, SQL or raw exceptions.

The managed CVE watchlist was last refreshed April 24, 2026, more than 120 days ago. Its older catalogs are not current advisory proof. This pass supplemented them with current production registry audit and primary maintainer advisory pages. Refresh the Weapon intelligence through its owning Guild workflow; no Guild files were changed here. Local Node is 24.18.0 and pnpm is 11.15.1. Installed and locked versions are Next.js 16.3.8 and React/React DOM 19.3.0, inherited from PR90.

Security ran before the fresh runtime Quality pass. Inherited historical and PR90 Quality reports cover different changes; they do not verify this runtime increment.

## Scorecard

| Category | Result | Findings |
| --- | --- | --- |
| Financial/payment security | Clear in this scope; no payment changes | None detected |
| PII and secrets | Clear; reconstructed allowlisted log DTO | None detected |
| Authentication/authorization | Clear; failure never establishes a principal | None detected |
| Injection | Clear; no query, URL or shell input added | None detected |
| Dependency security | Current production registry audit clear | Zero vulnerabilities |
| Configuration and transport | Diagnostic opt-in exact; TLS and transaction budgets unchanged | None detected |
| Data and resource handling | Clear after shutdown fix | One Medium fixed |

## Findings and remediation

Critical: None detected.

High: None detected.

Medium M1, FIXED: `apps/web/src/server/campaign-persistence-runtime.ts:109`. The inherited cache replacement used `void previous?.close()` without a rejection handler. The new diagnostic-mode fingerprint adds another replacement condition; a rejected old-pool shutdown could therefore escape into an unhandled background rejection. Root coordinated ownership of this module and its existing unit test before remediation. The replacement now attaches a catch and emits only an allowlisted `cleanup_failed` marker through the new configuration's observer. No exception detail is logged. The marker uses zero elapsed milliseconds as a fixed cleanup marker, not a measurement of driver shutdown time. Direct callers awaiting `PostgresDatabasePool.close()` retain its original failure behavior.

The test first failed on the previous cache code, with eight healthy/control cases passing, then all nine cache cases passed after the fix. The regression checks replacement remains available and the private exception is absent from emitted data. The selected combined suite reported no unhandled rejections. The RED probe is evidence of the missing failure handler/diagnostic, not evidence of a hosted process crash.

Low: None detected. No unresolved finding is waived.

Only `campaign-persistence-runtime.ts` and its existing unit test were changed by this reviewer. The final diff was inspected for unrelated changes. No commit, push, configuration activation, deployment, provider operation or live data mutation occurred.

## Authorization, cleanup and privacy evidence

- `packages/db/src/postgres-adapter.ts:79` derives the acquisition deadline from the strictly validated existing connection budget, default ten seconds, allowed integer range one through thirty. TLS refusal, parameter handling, prepared-statement restrictions and statement/idle transaction timeouts remain unchanged.
- `packages/db/src/postgres-adapter.ts:120` clears the timer and pending-close callback at settlement. Both reservation continuations remain attached. Late reservation success releases once; late failure is handled. Closure marks the pool closed and rejects all pending callers before awaiting the retained driver shutdown. New closed-pool callers are refused. Observer exceptions cannot change acquisition or cleanup.
- `apps/web/src/server/authenticated-principal.ts:401` wraps the existing resolver without replacing its session, current-binding, identity or mutation checks. The acquisition test supplies the actual public pool to the real read-principal resolver and proves timeout occurs before binding or identity reads.
- `apps/web/src/server/runtime-authentication.ts:635` refuses shell authentication when principal resolution fails. Optional display and verification reads retain their existing neutral fallback only after a principal exists; the diagnostic wrapper records failure before the fallback. No identity or verified-email claim is manufactured.
- `apps/web/src/server/ad-brand-read.ts:71` observes the actual tenant-bound preference read and rethrows failure. It does not convert failure into saved brand, samples or success.
- `apps/web/src/server/runtime-timing.ts:5` requires exact string `true`; false, uppercase and missing values stay silent. The event schema allows only six fixed stages, seven fixed outcomes and a nonnegative safe integer elapsed value. The emitter reconstructs the object and catches sink failures. Runtime extras, invalid outcomes and invalid elapsed values are excluded. No output, raw error, SQL, URL, actor, location, session, contact or brand value is included.
- Campaign and authentication cache fingerprints include the exact diagnostic-enabled boolean. The new cache regression proves uppercase input reuses the silent pool while exact true selects and reuses a different pool. Authentication composition has no analogous asynchronous background-close call; no additional source edit was needed there.

## Verification

| Independent check | Result | Ignored evidence under `test-results/security-runtime/` |
| --- | --- | --- |
| Managed portable deterministic scanner | Completed; only output path relocated into ignored scratch | `scan.log`, `scan-output/` |
| Current production dependency audit | Zero info, low, moderate, high and critical findings, 153 total dependencies | `scan-output/npm-audit.json` |
| Rules Unicode scan | No hidden Unicode detected | `scan-output/unicode-scan.txt` |
| Scoped Windows path-aware pattern sweep and full source read | Log allowlist confirmed; test fixture Object.assign is not an untrusted merge | Manual source evidence above |
| Test-first cache probe | One regression RED, eight controls GREEN | `cache-close-red.log` |
| Seven-file focused runtime/authorization suite | 105 tests passed, no unhandled rejection report | `focused-green.log` |
| Final cache-source check after observer reuse/format | Nine tests passed | `cache-close-final-green.log` |
| DB dependency build and four offline DB suites | Build passed; nineteen tests passed | `db-build.log`, `db-offline-green.log` |
| Web and tooling TypeScript | Passed | `web-typecheck.log`, `tooling-typecheck.log` |
| Scoped oxlint, Prettier, diff whitespace | Passed after formatting correction | `lint.log`, `format.log`, `source-format.log` |

No production build was run by this reviewer, avoiding overlap with the webinar build. Actual PostgreSQL integration was unavailable locally. Previous implementer test-first and offline evidence is documented in [implementation handoff](2026-10-13-runtime-acquisition-implementation.md); the independent results above are distinct.

Current primary checks: [Next.js advisory index](https://github.com/vercel/next.js/security/advisories), [React advisory index](https://github.com/react/react/security/advisories). Next's current image-generation advisory specifies a 16.3.6 fix, below the installed 16.3.8. [Maintainer ImageResponse advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j). The current production registry audit is zero; the maintainer SSRF page reviewed rendered a redacted patch version, so this report does not infer an exact version from that page. [Maintainer image-optimization advisory](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4). No dependency changes were made by this reviewer.

## Limits and required follow-up

The installed Postgres.js source has no reservation-queue cancellation method; this patch bounds application caller waiting and releases an eventual reservation, not the lifetime or size of the driver's queued entry. Driver shutdown, SQL statements and whole-request duration are separate budgets. Event-loop starvation can delay timers. Concurrent stage logs have no application correlation identifier and can interleave. Authentication cache replacement is not a hot-configuration lifecycle facility; the production environment is assumed stable.

The observed production timeouts are attributed in [read-only live diagnosis](2026-10-13-live-library-timeout-review.md). Their stalled stage and root cause remain unproven. Diagnostics were not enabled in hosting. Real PostgreSQL, current-head CI, current-main reconciliation, MERGEABLE status, an authorized deployment and repeated signed-in live verification remain separate required evidence. Fresh Quality must consume these final pins; the root should complete its repository-health/PR gate before committing or pushing.

## Final source pins

| File | SHA-256 |
| --- | --- |
| `packages/db/src/postgres-adapter.ts` | `2ca171f6507bce359f64d02bea2067aa454996d3568133d442c9fa394127d45f` |
| `packages/db/src/index.ts` | `bc9101eca17eeddfa9d43d7426e1963bf9b22f07955165e7de871b101d521ceb` |
| `tooling/tests/unit/postgres-acquisition.test.ts` | `01c07a48e0ed1f513a0c587548b903387de3af9e67617efb87f231e66ea6a199` |
| `apps/web/src/server/runtime-timing.ts` | `c4d4786d8ad294e8fb7e828f08a7dae6d98e66a02982b4ab9e099992c745a1da` |
| `apps/web/src/server/runtime-timing.unit.test.ts` | `0865c9fbe1fa682760c79d966900df10e95610de75e29966904b594e28550464` |
| `apps/web/src/server/authenticated-principal.ts` | `310794a3a7aed57810e112fd626463d430c720d70736990fcc89e1379cfe203a` |
| `apps/web/src/server/runtime-authentication.ts` | `da6be8a73e1bb61741edddd215a6588c6daca6260fc393b10ce9969f5ef1fce8` |
| `apps/web/src/server/runtime-authentication.unit.test.ts` | `4041cb1482b6a4f92879cec2a93cd0af5250432f8e930fdd33c7f21def5dc923` |
| `apps/web/src/server/campaign-persistence-runtime.ts` | `a7af324703dc559c6ef9aa3a08ede9268141776c6def29466c1274d44e00458f` |
| `apps/web/src/server/campaign-persistence-runtime.unit.test.ts` | `afc0132e51dbf58640dbc628687d739e06f6428983b712b87ea2e164075b6b17` |
| `apps/web/src/server/ad-brand-read.ts` | `2490dc198eeafc01d8b2e670e543efcc4c0357b8991f373ef1d2081213a2132b` |

