# Public report import Security self-review

## Summary

Inline author review before Quality for the [public report import plan](2026-10-15-public-report-import-plan.md). No independent review is claimed. This separate delta follows the earlier session-availability closeout and requires its own Quality pass. No unresolved scoped Critical, High, Medium or Low security finding was detected.

## Scope and evidence

`apps/web/src/server/financing-release-render.ts:4,95,97` changes the Playwright value import to a type-only import plus dynamic import inside the existing bounded browser operation. Browser construction, JavaScript-disabled context, local asset interception, exact canonical-document allowlist, approved font/media validation, PDF extraction and output parity remain unchanged. No fallback renderer or permissive output path is introduced.

The import stays inside try/finally after acquiring the existing two-browser capacity guard. A failed import must release capacity. `financing-release-import-boundary.unit.test.ts:48` attempts a real render three times with the module unavailable and asserts the exact import-error cause each time, so a capacity leak cannot become a later LIMIT refusal. It does not fake a successful output or browser qualification.

At `financing-release-import-boundary.unit.test.ts:21`, actual exported GET, HEAD and inquiry POST imports and configured handlers are exercised with public activation absent. They return existing safe404/503 text, no-store policy, restrictive CSP and an empty HEAD body. No database-pool construction or fetch occurs. The pre-fix test suite failed during the actual renderer import with the unavailable-browser cause; after the fix all three new/existing import-boundary cases pass. The first positive-control assertion was corrected to inspect Vitest's wrapped error cause rather than its generic wrapper wording.

| Category | Result for this delta |
| --- | --- |
| Authorization and tenancy | Unchanged independent configuration, publication, source/evidence and native capability gates. |
| PII, financial data and errors | No changed output fields or exception projection. Disabled requests retain generic text and no identity/token. |
| Injection and unsafe sinks | Static module specifier only; no user-controlled import, command, HTML or destination. |
| SSRF/network and media | Existing request interception and byte/normalization checks unchanged. Boundary refusal makes no fetch or database access. |
| Crypto, storage and concurrency | No crypto/storage change. Import failures release the existing concurrency slot. |
| Dependencies and deployment | No package, lock, waiver, migration, credential or deployment modification. |

## Verification limits

Web types, lint, production web build, formatting, secrets, package boundaries and zero clones pass. The combined runtime/output selection encountered an existing30-second browser-backed runtime-test timeout while a build also ran. That owned run was interrupted after it stopped making progress; no unrelated process was stopped. The subsequent unchanged-timeout serial selection finished:60 pass,4 fail,54 skipped, plus an output-suite setup-hook failure. These are unresolved full-output verification gaps, not a pass. The canonical run on87f7643 predates this delta.

An independent static-document Node probe using the deferred import generated a real PDF in855ms, then completed browser.close at28339ms. A static-import control produced its PDF in366ms and exceeded a15-second close observation bound. Closing the context first completed in4ms but did not remove the browser-close delay. These ignored offline probes loaded no application server, user session, database, provider or remote content. They reproduce local shutdown latency independently of this source import change, but do not rule out every output regression. No production lifecycle code, test ceiling, browser option or assertion was changed to hide the failures. Full output acceptance still requires the canonical supported environment.

This does not establish hosted Chromium/R2 capability, lender authority, public media rights, owner approval/publication UI, QR qualification or actual HighLevel inquiry delivery. No local whole-app fixture startup or external activation occurred.

## Source pins

- financing-release-render.ts SHA256:58ced10ef113b6576381d562cd75606037bbf3a9d0ef8361e1c2243698b8a8ae
- import-boundary regression SHA256:6ff40dac959ad4aa93ea8ad502ae388bbae494c90abbe14ac57eae43b71406a3

No further executable edits are part of this Security pass. Quality must evaluate the exact pinned bytes and preserve unverified requirements as open.
