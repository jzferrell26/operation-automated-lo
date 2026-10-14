# Security review: repaired webinar publisher deadline

Date: 2026-10-14. Auditor: `/root/publisher_deadline_security`, security-guardian. Branch: `codex/webinar-publisher`, HEAD `876aa8f6c3f5d9a421dbcf60872233de48075b45` plus the frozen persistence packet. Accepted CTR-003 revision 1: `dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23`.

## Executive summary

**Scoped repaired-source PASS, with real PostgreSQL qualification pending.** The author repair addresses the source-level Q-PUB-DB-01 deadline failure: a confirmed provider acknowledgement or retained campaign identity no longer becomes a false blocked/complete result. No new Critical, High, Medium or Low vulnerability was detected in this delta. Any possible effect remains uncertain/reconcile, the expired lease cannot dispatch again, and the original identities and observations remain readable.

This review does not qualify a complete migration, production provider behavior, automatic reconciliation or live spend. Twenty-one actual PostgreSQL integration cases and twenty-four publisher pgTAP assertions remain unrun locally. The full Linux outbound inventory scanner remains a CI check.

## Scope and ordering

Reviewed the repaired migration and six added actual PostgreSQL regression cases, traced the unchanged concrete repository and command/control boundaries, and independently verified all eleven original persistence/inventory pins with exactly two replacements below. This is a bounded re-evaluation, not a second full-branch security claim.

The initial Security report (`d4a04d7ab2a4bae066bd6b1820c0209e468169469c81da6fe5f7131653e25c56`) preceded the initial Quality report (`990e3a9ec1db68f237ad141fa90f9ff744e5dfb08e0ddc3470bea4d411e457da`). Quality correctly blocked the former source. This fresh Security review follows the repair and must precede a fresh Quality review. Neither older report is rewritten or presented as reviewing this repair. The appended author handoff is `f0071507a9bff0ec1d6859a71773b20092c4338a064b9e530bffbcad9a7b4927`.

Used the managed security-guardian configuration and security-weapon, including its principles, authorization/tenancy and AI-generated-code guidance. Applied the actual Next.js/Postgres host and the parent's report-only ownership. No source, frozen report, handoff, Git state, provider, credential or deployment was modified.

## Scorecard

| Category | Result | Evidence |
| --- | --- | --- |
| Financial actions | None detected in repaired source | Possible publish, pause and resume effects remain uncertain; no repeat dispatch is granted |
| PII and secrets | None detected | No new payload logging, token handling or storage change; secret audit passed |
| Authentication and authorization | None detected in delta | Current authorization and lineage locks precede deadline handling; inactive/cancelled generations remain fenced |
| Injection | None detected | Static tenant/operation-scoped predicates and updates; no new dynamic SQL or SQL identifier |
| Dependencies | Zero production advisories reported | Fresh deterministic scanner and pnpm audit; no project dependency change |
| Configuration and headers | None detected in delta | No route, header, deployment or provider-flag change |
| Data handling | None detected in repaired source | Existing command/attempt/native identity and timestamps survive; finite deadline retained |

## Repair boundary evidence

- `supabase/migrations/20261014050000_webinar_publisher.sql:395-411`: current authority, exact owned installation/lineage/operation locks and cancellation generation checks precede mutations. The read method remains available before the inactive-operation fence, so expired uncertainty can be inspected without granting dispatch authority.
- `supabase/migrations/20261014050000_webinar_publisher.sql:412-419`: the ordinary pre-deadline unconfirmed-attempt predicate remains intact. Inside the deadline branch, an attempt for the exact tenant and operation counts even when confirmed. A retained native campaign identity also counts. Another tenant's or operation's attempt does not satisfy this predicate.
- `supabase/migrations/20261014050000_webinar_publisher.sql:420-426`: expiry sets `active=false`, clears the lease and preserves `uncertain/reconcile/WRITE_UNCERTAIN` when effect evidence exists. The relational stage and serialized operation stage agree. Only a record with neither an attempt nor a retained campaign identity becomes blocked/complete. Existing native IDs, command identity and provider observation fields are not overwritten.
- `supabase/migrations/20261014050000_webinar_publisher.sql:428-449`: ordinary claims retain the one-to-sixty-second lease and original deadline cap. Existing generation/worker/stage checks remain intact. Expiry does not extend the work budget or permit a replacement worker to repeat a possible mutation.
- `supabase/migrations/20261014050000_webinar_publisher.sql:463-507`: dispatch recording and confirmed acknowledgement history remain unchanged. Progress still requires a separately admitted observation; a confirmed transport request is not itself live/paused delivery evidence.
- `packages/db/test/webinar-publisher.integration.test.mjs:318-518`: six added real-database cases cover acknowledged publish/pause/resume, confirmed draft creation, confirmed response without retained IDs and retained lineage before current dispatch. They assert uncertainty, original native/command/hash identity, observation timestamp, cleared lease, fenced retry, preserved attempt history and no repeated pending task. The publish case reserves and claims a separately confirmed owned pause using its own admitted proof. These are authored synthetic fixtures, not observed provider calls or locally executed SQL privilege proof.

## Findings and remediation

Critical: No new finding. The author's Q-PUB-DB-01 source repair was independently re-evaluated as described above; actual PostgreSQL execution remains required before closing its runtime qualification.

High: None detected. Medium: None detected. Low: None detected. No remediation was made by this reviewer. The only authored file is this report.

## Independent verification

- Re-executed the inspected temporary PGlite probe against the exact extracted deadline SQL from the current migration: **10 cases passed** on **PostgreSQL 18.6, PGlite 0.5.9, WASM**. Cases include confirmed publish/pause/resume, confirmed draft, confirmed response without IDs, unconfirmed dispatch, retained campaign without current attempt, zero dispatch, foreign tenant and different operation. They check retained IDs/identity/timestamp, lease clearing and effect classification. This reduced schema probe does not execute the full migration, authorization wrapper, RLS, triggers, role grants, concurrency or PostgreSQL 17 server behavior. The author's earlier 6-fail/4-pass reproduction is historical evidence, not rerun by this reviewer.
- Canonical root Vitest unit project: **198 passed across three files**, including 34 database adapter, 86 command and 78 native adapter cases. These are source/port tests, not PostgreSQL execution.
- Connectionless canonical discovery/identity/admission tests: **3 passed**. DB typecheck, Node syntax check for the actual PG file, secret audit and `git diff --check` passed.
- Weapon `scripts/scan.ts` completed. Production dependency audit: info 0, low 0, moderate 0, high 0, critical 0. AI-rule hidden-Unicode sweep clean. Its vulnerable-pattern leads have no match in the new publisher repository/migration delta. Existing source secret audit passed across six roots and the public environment boundary.
- Independently recomputed all eleven persistence/inventory pins. Nine retained original pins matched; only migration and actual PG regression pins changed. Appended handoff and preserved initial Security/Quality hashes matched the parent's brief.
- **Twenty-one actual PG integration cases, twenty-four publisher pgTAP assertions and the full Linux inventory scanner remain pending canonical CI.** No unexecuted test, unavailable PostgreSQL server or synthetic provider fixture is reported as a pass.

## Dependency and CVE qualification

The lockfile resolves Next.js 16.3.8 and React/React DOM 19.3.0; these are outside the old affected release lines in the archived catalog. The Weapon watchlist was refreshed on 2026-04-24, 173 days before this review, so its intelligence is stale. The fresh production audit found no advisory. This report does not claim an independently refreshed per-CVE matrix or complete coverage of later advisories. Refresh the Weapon through its owning Guild workflow; no Guild files were modified.

## Reviewed source pins

| File | SHA-256 |
| --- | --- |
| `packages/db/src/index.ts` | `b72e0a64e895feb66b04a530659c83699ee24cc6ddf072a675462c15c5003e37` |
| `packages/db/src/webinar-publisher-repository.ts` | `f39b17dd85cfe1ff897c47f2d0a2c02de90657b2736986d83ed36e807891fafb` |
| `packages/db/test/webinar-publisher-fixture.mjs` | `15276c06f8869e5585ac1616ac8856e1b2aa1f5422dc597e4403af36d599824f` |
| `packages/db/test/webinar-publisher-fixture.d.mts` | `a4f558eda7b06fde94b9b8f0cdb9053a2d328e0bdff8e153a56fdf57e3e9e168` |
| `packages/db/test/webinar-publisher-repository.test.mjs` | `f9d7785382924b6b38c0315514f7fc0bb0ef354043e2699798da3dcc5aa3f461` |
| `packages/db/test/webinar-publisher.integration.test.mjs` | `27ff75f60ca0cbf95fa0b766670fab1a0f5484c56d8611d122eb045ebd9617bb` |
| `supabase/migrations/20261014050000_webinar_publisher.sql` | `754037e73a22a3266a0d091928828f818b3c52e9b8757aaadb48725403cfd11f` |
| `supabase/tests/webinar_publisher.pgtap.sql` | `c2653aca01994bf1ab80a11aa420497db476600c02c6e28bec3ddfeef3968c24` |
| `tooling/tests/unit/webinar-publisher/database.test.ts` | `6bb39b3d1236185d99d2f91f3c7bf0d40422b547eb30457b9885f734376ba2ee` |
| `tests/security/phase0-boundary.test.ts` | `24a9b1b4d0c1f4487dda8dd6e8c96234e7c9fdd97a98d731fee1f93c36fbab2a` |
| `supabase/tests/phase0_scaffold.pgtap.sql` | `150930696f8d9d5152800870e52b975d7e67930e65b6bddff1419f8bf8f9ef93` |

## Required follow-up

Fresh Quality must review these exact repaired pins next, followed by repository-health closeout and canonical PostgreSQL 17 CI. Remaining worker/HTTP/UI composition must preserve truthful uncertain status and actual separately qualified observations; inactive expired work does not authorize blind mutation retries. Provider calls remain disabled and require real qualification plus the user's deliberate spending action. No provider, purchase, credential, commit, push or deployment action occurred in this review.
