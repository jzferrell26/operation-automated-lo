# Webinar publisher command Security review

Date: 2026-10-14. Reviewer: `/root/publisher_command_security`, armed with the managed security-weapon and native security-guardian configuration. Worktree: `codex/webinar-publisher`. Base HEAD: `7f144e9f4fe35a499c555f1d2e170e6a40e6f49c`.

## Executive summary

**PASS for fresh scoped Quality on the six exact source pins below.** No Critical, High, Medium or Low vulnerability was demonstrated in this frozen application-command and schema packet. Current authority, exact saved evidence, action confirmation, identity-preserving replay and safe operation/outbox DTO boundaries were inspected and independently exercised. No production source was modified.

This is a review of application orchestration through required trusted interfaces. It is not a qualification of concrete database transactions, leases, remote mutations, HTTP exposure, UI, actual App Test, advertising spend or hosted behavior. The managed CVE intelligence remains dated 2026-04-24, more than 120 days old; refresh it through the Guild owner. A fresh production registry audit supplements that stale matrix and returned no advisories. No command-specific Quality report existed at entry; prior foundation Quality covers the preceding immutable producer packet, not this increment.

## Scope and governing evidence

Read the complete command application module, strict schemas, additive barrel diffs and both new test files; traced the existing principal freezer, approval regeneration, canonical hashing, current webinar evidence and native projection/qualification seam. The accepted CTR-003 revision 1 digest independently matches `dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23`. The complete author handoff independently matches `095018a732a8a23795139935a5f26b2bd7d580355569af1ae8f106b575075fbe`.

No dependency, configuration, private financing source, native transport source or existing test was altered by this packet. The application package still has no dependency on the GHL implementation; its authority and repository ports are required server dependencies. Synthetic fixture data, including fixture proofs labeled `app_test`, establish no real App Test. The production consumer must verify their provenance independently.

## Scorecard

| Category                         | Result            | Scoped findings                                                                                                                        |
| -------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Financial and spending controls  | OK                | None detected: source-derived approved USD values and end, separate exact action confirmation, no mutation from summary creation       |
| PII and credential exposure      | OK                | None detected: no tokens, customer contact fields, secret leases or raw provider bodies in operation/task/result DTOs                  |
| Authentication and authorization | OK                | None detected: current sole-owner/session/installation identity and lineage checks before new commands and successful retries          |
| Injection and data integrity     | OK                | None detected: strict unknown-input schemas, no SQL, shell execution or HTML sink in the new source                                    |
| Dependency security              | OK                | Zero current production registry advisories; lockfile and package dependencies unchanged                                               |
| Configuration and headers        | Unchanged         | No new HTTP, cookie, CORS, framework configuration or environment boundary in scope                                                    |
| Persistence and worker handling  | Interface checked | Atomic reservation and fenced checkpoint obligations declared; concrete implementation and real PostgreSQL verification remain unbuilt |

## Critical findings

None detected in the assigned packet.

## High findings

None detected in the assigned packet.

## Medium findings

None detected in the assigned packet. The stale intelligence note is a tooling qualification limit, not a newly demonstrated product vulnerability.

## Low findings

None detected in the assigned packet.

## Authorization and integrity evidence

- `packages/application/src/webinar-publisher-command.ts:155` freezes both supplied and freshly resolved principals, rejects changed actor, tenant, installation or session identity, requires the existing internal sole-owner authority value, and refuses synthetic authentication by default. The fresh role-version provenance is recorded at `:586`; an older supplied role version is not reused as current authority. These internal controls introduce no customer role management UI.
- `:203` loads current campaign evidence through the required transaction, checks tenant, creator, campaign/version, current approval, preflight, actor and timestamps, rechecks current CTR-002 evidence, and independently regenerates the original approval snapshot. The existing approval implementation also recomputes the manifest digest. Browser hints cannot supply copy, source UUID, budget, end, pixel receipt or approval authority.
- `:254` resolves opaque asset/place selections server-side and enforces exactly one selected native geography per approved manifest place, the exact square asset, matching account/page references and include-only selections. It derives immutable projection data from the saved approved version. Native account-to-installation and discovery ownership remain duties of the mandatory server resolver and lineage authority; this module does not invent those bindings.
- `:361` persists only a schema-validated summary with matching canonical hashes, initial row version/state and null remote IDs. Summary creation writes no provider task. `:412` binds confirmation to the exact action, full immutable summary/projection hashes and confirmed native IDs.
- `:508` rechecks current principal, accessible projection, immutable hashes and owned lineage before any replay success. Draft/publish/resume regenerate current source and selection; `:430` validates action-appropriate current capability data. The trusted provider authority must verify the actual evidence record and installation, not accept a syntactically valid proof alone. Local synthetic proof is accepted only through explicit offline dependency injection, inaccessible through the strict browser command schema.
- `:542` binds the original normalized request identity, expected row version, confirmation, summary, projection, action and native IDs at confirmation on replay. Lifecycle row changes do not rewrite the original command identity. Different content under the same request UUID refuses. New commands separately check lineage CAS version, current confirmation and eligible state before reservation.
- `:577` creates one initial reserved operation and `:602` one compact strict outbox task. `:613` calls atomic reservation and verifies the returned immutable operation exactly. The required transaction must roll back on a callback exception, including this final mismatch. Its interface is not evidence that rollback, contention, cancellation fencing or a durable outbox exists in production.
- `:444` separates pause/cancel control authority from expired creative. Pause validates current transport proof against exact campaign/account/tenant/projection and current proof expiry; cancel consults current trusted control authority without requiring creative qualification. The module returns a reserved operation, not remotely observed cancellation, pause or live delivery.
- `packages/contracts/src/webinar-publisher-command.ts:172` limits tasks to supported contract/schema/kind, opaque operation/location refs, projection hash, action and correlation. `:194` defines positive worker generation and expected-stage checkpoint fields. A schema alone cannot enforce lease expiry, tenant ownership, generation CAS or stage-transition legality; the actual worker/repository must implement and verify these before dispatch.

No new source performs provider fetches, SQL queries, customer-data logging, client storage, unsafe merge, dynamic execution, serialization of credentials or remote deletion. Arbitrary port exceptions are allowed to propagate as infrastructure failures here; a future HTTP boundary must sanitize them through the existing bounded mutation/error boundary rather than return their message or stack.

## Independent verification

All commands ran from the reviewed worktree without changing thresholds, timeouts or existing tests.

| Check                                                                                                                                                                                                             | Observed result                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm exec vitest run --project unit tooling/tests/unit/webinar-publisher/commands.test.ts tooling/tests/unit/webinar-publisher/native-adapter.test.ts tooling/tests/unit/webinar-ads/webinar-foundation.test.ts` | 194 passed across 3 files, 3.46 seconds: 86 command, 78 native adapter, 30 actual webinar foundation |
| `pnpm exec vitest run --project contracts tooling/tests/contracts/webinar-publisher-command.test.ts`                                                                                                              | 20 passed, 1.17 seconds                                                                              |
| Independent ignored scratch probes                                                                                                                                                                                | 5 passed, 2.56 seconds; exact command below                                                          |
| Contracts and application package typechecks plus `tsc --noEmit -p tsconfig.tooling.json`                                                                                                                         | Passed, exit 0                                                                                       |
| Managed `scripts/scan.ts`                                                                                                                                                                                         | Completed; hidden rules Unicode clean; broad regex hits do not occur in the six new packet files     |
| `pnpm audit --prod --json`                                                                                                                                                                                        | 0 info, low, moderate, high and critical advisories across 153 production/optional dependencies      |
| `pnpm audit:secrets`                                                                                                                                                                                              | Passed across 6 source roots/public environment boundary                                             |
| `pnpm audit:boundaries`                                                                                                                                                                                           | 16 package boundaries passed; negative fixture rejected both prohibited edges                        |
| `pnpm audit:product-types`                                                                                                                                                                                        | Passed, no explicit any, CommonJS require or swallowed catch                                         |
| Explicit packet source/test Oxlint and six-file Prettier                                                                                                                                                          | Passed                                                                                               |
| `git diff --check`, additive barrel diff, all six source and handoff hashes                                                                                                                                       | Passed, exact reviewed bytes retained                                                                |

Independent probes used the existing actual producer fixture in ignored `test-results/security-publisher-command/probe.test.ts`, through an ignored configuration selecting only that scratch file. Command: `pnpm exec vitest run --config test-results/security-publisher-command/probe.config.ts`.

The five probes independently establish: current synthetic login authority refuses before repository entry; current role version is recorded instead of stale supplied provenance; rejection by the real-evidence authority prevents reservation even with App-Test-shaped fixture bytes; expired/withdrawn local cancel returns only reserved and a later foreign-lineage replay refuses without another task; and a draft confirmation cannot authorize publish even when native IDs and row version now permit publishing. They are injected seam tests, not real transaction/provider outcomes.

Managed scanner output is local scratch in `reports/scan-output/`. Its whole-repository regex sweep contains existing test/catalog and static theme-bootstrap matches outside this packet; these do not certify a new whole-repository audit. The first exploratory read requested nonexistent `tooling/package.json`, and the ordering lookup found absent `library/qa/`; neither was counted as a passing test. The subsequent command-report lookup found no command-specific Quality output.

## Dependency and framework qualification

The lock resolves Next.js 16.3.8 and React/React DOM 19.3.0 inherited from the independently reviewed foundation. Those dependencies were not changed. This audit neither repeats the prior framework advisory review nor treats an old minor-version patch table as proof about future releases. Current registry audit returned an empty advisory object. No network call to HighLevel, installation discovery, media upload, actual App Test or ad spend was performed.

## Frozen source pins

| File                                                        | SHA-256                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/contracts/src/webinar-publisher-command.ts`       | `274aa98b8528cff12c68758b93e7f19d5564e4b6a303874df402edf0d1bfb813` |
| `packages/contracts/src/index.ts`                           | `21a05ffe6dd8db257876c3f01eef0eb7df5783d2a02b554dd81a69b7f4f01737` |
| `packages/application/src/webinar-publisher-command.ts`     | `78687130a9cba438b4175b88deb05cabaceb586a2d0e509f914bd43c2e525d65` |
| `packages/application/src/index.ts`                         | `19c2555dcf583dbd64150eca5b70028a7b985598d9276e90a1709c1d61b88ca3` |
| `tooling/tests/unit/webinar-publisher/commands.test.ts`     | `1fcd1fa0195a4e2d1a4b450eb998860cbc55f28a6f47e9744ce0a753c5a99359` |
| `tooling/tests/contracts/webinar-publisher-command.test.ts` | `cf8fff6d65754fbe04a7608861e8357e40a7bc35a263472fd5e55f901799f491` |

## Files changed and next consumer obligations

Only this report and ignored audit scratch were authored by Security. No remediation was needed or performed. Ownership is released for fresh Quality on these exact pins. Root must load repository-health review before source commit/push and retain current-main mergeability/CI obligations; this review does not declare a branch shippable.

Concrete consumers still require tenant-scoped serializable authority/evidence/lineage locks, exact identity/CAS/outbox rollback and contention tests; trusted current installation/discovery/qualification provenance; fenced bounded leases and cancellation races; actual provider-stage checkpoints/readback/uncertainty reconciliation; independently authorized best-effort withdrawal pause; sanitized HTTP/session/origin/throttle handling; deliberate exact spend confirmation UI and actual no-spend/provider qualification. Existing source reports remain truthful about those unfinished portions. No waived finding or invented production success substitutes for them.
