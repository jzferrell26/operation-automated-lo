# Security review: financing fixture, import and privilege inventory repairs

Date: 2026-10-14. Reviewer: independent security-guardian. Worktree: property-marketing-release. Starting HEAD: 87480c429848b7108aefa011c4c89aa0304bf07a.

## Executive summary

PASS for the five frozen source files listed below, cleared to proceed to fresh Quality. No Critical, High, Medium or Low source finding detected in this assigned delta. Coverage is a reduced, read-only review of released repairs using existing defensive tests, static reading and artifact hashes. It is not a whole-branch or public-service clearance.

The prior Security 057b1a1a077d1f15df7eb4df81803ce660028fc4cf2d640330a58cefe5e1975a and Quality 842600f9f9e0a877deada6bdd702ceecebea2c9a7ff49b13c83ac846172df8b0 concern the earlier packet and remain historical. This new Security pass precedes the explicitly required fresh Quality. No source remediation was performed by this reviewer.

Managed security-weapon and integrated procedures were read. The watchlist last refreshed 2026-04-24 exceeds 120 days; refresh remains recommended. No external advisory lookup, online dependency audit, new security payload, new database probe, provider action or secret access occurred. The bundled broad scanner was not run because it writes outside the assigned report ownership and performs external/dependency work excluded by this brief. Supported local audits and scoped source checks were used instead. Imported Svelte/Neon examples were applied only where relevant to this actual Next.js/PostgreSQL project.

## Surface coverage checklist

### Application surface

None detected. The output fixture at apps/web/src/server/financing-release-output-fixture.js:2 now resolves the same real calculation and hash exports through the existing @oalo/application namespace instead of requiring dist before build. No calculator substitute, package export, loader or dependency was added. The new test at financing-release-output-clean-import.unit.test.ts:28 copies the actual fixture files to its own unique OS temporary directory, checks dist is absent, invokes actual exports and verifies computed rows and hashes. Cleanup removes only that generated directory. It supplies synthetic data and grants no source or release authority.

The only customer-facing delta, apps/web/src/features/http/user-messages.ts:32, maps INVALID to a fixed description and next step. It emits no exception, identifier, query, hash, token or provider diagnostic. Existing vocabulary and message inventory checks remain intact.

### Authorization and tenancy

None detected. packages/db/test/financing-release-repository.integration.test.mjs:39 refuses a database pathname outside the exact disposable oalo_test_ lowercase pattern before fixture pool acquisition. Existing host/TLS handling and transaction-scoped elevation remain in the unchanged sanctioned helper.

At lines 55-115, close retires only the generated location and actor with exact IDs plus synthetic display markers, and revokes the exact recorded binding with location/user checks. Each result must contain exactly one expected ID. All three mutations share the existing owner transaction; cleanup errors fail the test rather than silently passing. No installation is seeded or altered. Immutable campaign, source, admission and release evidence remains. Setup registers cleanup after successful seed, and afterEach handles remaining registered fixtures. Shared-pool fixtures retire their own identities without closing another fixture's pool. Existing role assumptions and grant boundaries are unchanged.

The real integration regression at line 242 checks the second tenant remains active, the first tenant's evidence remains, its principal is retired/revoked, and its repository operation refuses. Existing anonymous-scope, cross-tenant, expiry, revocation, ciphertext, bounded retention and concurrency assertions remain present. This review did not execute a database probe.

### Secrets and environment

None detected. Existing secret audit passes across six source roots and the public environment boundary. These changes add no credential, environment setting, deployment flag or secret-return path.

### Webhooks and third-party intake

None detected in the delta. No webhook, provider request or HighLevel/Meta delivery adapter changed. These surfaces were not freshly qualified by this review.

### Dependencies and supply chain

No new dependency or resolution detected. apps/web/package.json and pnpm-lock.yaml match their previous reviewed pins, 3d009dd3f93dec0921036e5f1df9405a148a250e37904bf91517f9d0cc6a998b and eae2bc37f24180a04f24d414f93a13c25e1931d59e3d1bfafe816309a01db231. Source declares Next.js 16.3.8 and React/React DOM 19.3.0. The prior audit snapshot is unchanged; this report makes no fresh latest-CVE or zero-advisory claim.

### Headers and transport

None detected in the delta. No route/header/CSP/host policy or transport implementation changed in the reviewed five-file packet. Deployed enforcement and new public HTTP work are outside this pass.

### AI-generated code and privilege inventory

None detected. tests/security/database-privilege-escalation-boundary.test.ts:40-73 recognizes the entire exact read-only scheduler capability query together with its adjoining exact denied-membership assertion. Only the matching migration_owner occurrence position is ignored by the harness inventory. No source text is masked and no path is exempted. CRLF normalization is limited to that comparison.

The raw patterns and shipped-source scan at lines 109-124 are unchanged. The harness scan at lines 126-139 still requires campaign-integration-support.mjs to be the sole privileged holder. Trigger and replication patterns receive no exception. Existing released defensive cases at lines 141-181 require rejection of adjacent or preceding role assumption, grant, disable/enable trigger and replication switches, plus positive/missing denial, changed role subject and additional SQL text. These are string-input assertions; no capability SQL is executed by the inventory tests. The original helper restoration and private export checks remain.

### PII, financial data and logging

None detected. Synthetic fixture retirement is not customer erasure. No inquiry ciphertext is decrypted by the repair and no financial or personal data is added to logs, URLs or client storage. The real canonical financing calculator remains the fixture's source. The original renderer, financial parity, PDF policy, private store and retention source pins remain unchanged.

## Findings detail

Critical: None detected. High: None detected. Medium: None detected. Low: None detected in the assigned delta. Intelligence freshness and unbuilt or unqualified consumers are coverage limits, not inferred source vulnerabilities.

## Remediation summary

| Severity | Count | Fixed by reviewer | Documented source findings |
| --- | --- | --- | --- |
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Low | 0 | 0 | 0 |

Only this report was authored. Source, existing reports, artifacts, baselines, ledgers, Git state and provider configuration were not modified by this reviewer.

## Independent verification

| Check | Result |
| --- | --- |
| Existing import/messages/application/SQL unit suites | 169 passed in four files |
| Existing output/storage/retention/delivery unit suites | 88 passed in four files, including actual positive Chromium output and existing defensive policy cases |
| Released privilege inventory contracts | 14 passed, after owner release of the final pin |
| Compiled connectionless adapter cases | 21 passed, overlap with source adapter cases above |
| Web and tooling typechecks | Passed |
| Canonical full lint and focused formatting | Passed |
| Secrets, boundary and product-type audits | Passed |
| Integration fixture Node syntax and diff whitespace | Passed |
| All 43 original artifacts | Exact byte sizes and hashes match, zero mismatches |
| Previous sixteen-file Security pin inventory | Fourteen unchanged; only the assigned output fixture and PG fixture have the reviewed replacement pins |

Commands used the repository's existing Vitest unit/contracts projects and actual compiled adapter runner. No timeout, assertion, coverage threshold, migration, driver or runner configuration changed. An attempted focused lint invocation referenced an absent .oxlintrc.json and failed before linting; the repository's canonical pnpm lint was then run successfully. That failed invocation is not represented as a pass.

The author's retained PostgreSQL 17.5 diagnostic reports all 19 actual postgres.js cases passing, zero active fixture locations, then unchanged seeder results of 10 inserts and zero on the idempotent rerun. Its log hashes match the released handoff. This is attributed evidence, not an independently executed database run. Its ignored single-backend loader reduces connection capacity and releases/reacquires the raw helper reservation after COMMIT. The tracked helper remains unchanged with its original reservation semantics and canonical maxConnections 4. This diagnostic does not qualify independent races, lock waiting or the canonical same-reservation public-scope proof. Earlier diagnostic failures remain failures. Current-head canonical PostgreSQL and browser CI are still required.

## Frozen scope and handoffs

| File | SHA-256 |
| --- | --- |
| apps/web/src/server/financing-release-output-fixture.js | 739b1c3bbb6146afb4c3caa71106ec2ddb1700c0b81d1bef368b0f33ea01612f |
| apps/web/src/server/financing-release-output-clean-import.unit.test.ts | 5c0215907813576276cd1c63465f75e10b63640fe3430ac0491d229da5a6ce0e |
| apps/web/src/features/http/user-messages.ts | 613d49196d1da68cb15b30c5d82e2b12f3182d4b987c89eee77c01ce498de2d2 |
| packages/db/test/financing-release-repository.integration.test.mjs | 0830011cd2afe5490d5a4ff0c8d00bb07c7e9f3c0f8005728d66b6f3e896050c |
| tests/security/database-privilege-escalation-boundary.test.ts | d07269398cdbb10ac894a015f79885665e2e57ade5351016750e847f7cf57401 |

Import handoff: 036471958727e7c44f0d3fadb86c4371c4a2dd6a29ffdce8f5ac7215a832a082. Fixture cleanup handoff: 03f98a1fe8931492f8cd038dc3775dc4c76b192d76112a382ea50a451a4006b4. Privilege inventory handoff: 84d0410cb8c7f13bdbcdc23a7b37dfdf228c5f1d70a65f28a1991667faf7f9fc. Original manifest: 58df4b90c460e8c4e55bb597e3acd325ea0b2a6617eef3a8a9336f2db9375663, 43 entries unchanged.

## Re-evaluation

No Medium-or-above findings required reviewer fixes. After the inventory owner released its final pin, the final source diff was read and all fourteen existing defensive contracts passed. The five reviewed pins and three handoffs were verified. No open finding prevents this scoped packet from proceeding to Quality.

## Next step

Invoke fresh quality-guardian on this exact five-file packet and retained evidence. Root owns repository-health, PR review, exact Git receipts and current-head canonical CI before commit/push. Earlier public serving, inquiry binding, source admission, UI, delivery, one-page flyer, hosted Chromium/R2 and HighLevel QR qualification remain separate work. A concurrently authored financing-release-public-http.ts was observed and explicitly excluded; no clearance for that file or its future consumers is implied. No live release, purchase, provider write, merge or deployment occurred.
