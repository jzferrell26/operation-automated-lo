# Security review: webinar publisher pending-query alias repair

Date: 2026-10-14. Auditor: `/root/publisher_alias_security`, security-guardian. Branch: `codex/webinar-publisher`, baseline HEAD `54aad03372503f72e1faf81ee79b11cd16de0a4a`. Accepted CTR-003 revision 1 remains the governing build contract. Author handoff: `8c84db075f373e9706f34a4a075fc8857a54b25bcbc8535c4bc8350cc87fab7c`.

## Executive summary

**Scoped source PASS.** No new Critical, High, Medium or Low vulnerability was detected in the alias repair or added regression. Reversing only the four relation aliases recreates every baseline migration byte. Current owner, tenant, installation, source, admission, spending, deadline and uncertain-effect controls therefore retain the reviewed behavior.

Independently executing all twenty complete migrations and the actual repository regression suite on PostgreSQL 17.5 WASM produced **22 passed, zero failed or skipped**. The baseline migration produced **14 passed and eight failed**, all SQLSTATE `42702`, against the same current regression file. The single-backend diagnostic does not qualify independent-backend races, native PostgreSQL locking, pgTAP, hosted deployment or provider behavior. Fresh canonical CI remains required.

The Weapon watchlist was last refreshed on 2026-04-24, 173 days before this audit. Refresh it through the owning Guild workflow. The current production dependency audit reports zero advisories; this review does not claim a newly researched per-CVE patch matrix or close deployed-main exposure.

## Scope, procedure and ordering

Loaded the managed security-guardian configuration and security-weapon, principles, scan procedure, vulnerability catalogs, CVE tracker, integrated authorization/tenancy and AI-code guidance, report template and applicable repository instructions. Applied the actual Next.js/Postgres host conventions rather than the upstream Svelte/Neon examples. This is a bounded delta review, not a full-branch security audit.

Read the author handoff, actual migration, regression, unchanged repository contracts and prior combined JSON/deadline Security report. Checked the prior persistence/inventory pins. The previous Quality report approves an older packet and does not approve this alias delta. This fresh Security review precedes the requested fresh Quality pass. No source remediation was necessary. This reviewer owns only this new report and temporary ignored scan evidence.

## Scorecard

| Category | Result | Findings |
| --- | --- | --- |
| Financial actions | Existing confirmations and effect fences unchanged | None detected in delta |
| PII and secrets | No new data exposure, logging, storage or token path | None detected |
| Authentication and authorization | Current SQL checks and tenant/owner predicates retained | None detected |
| Injection | Static SQL with separate parameters; aliases are literal identifiers | None detected |
| Dependencies | Dependency files unchanged; fresh production audit clean | Zero production advisories |
| Configuration and headers | No HTTP, flag, transport or header changes | None detected in delta |
| Data handling | Bounded pending payloads, processed/active filters and cancellation preserved | None detected |

## Boundary evidence

- `supabase/migrations/20261014050000_webinar_publisher.sql:218` declares launch record `l`, operation record `o` and JSON projection `p`. The baseline pending SELECT used overlapping aliases. At `:225`, the replacement uses `pending_rows`, `outbox_row`, `operation_row` and `launch_row`, preserving all relation joins, tenant/owner/installation predicates, active and processed filters, ordering, payload projection and limit. No compiler preference or caller-controlled identifier was added.
- `supabase/migrations/20261014050000_webinar_publisher.sql:222` still authorizes before pending discovery. `:224` retains the SQL limit range 1 through 50. `packages/db/src/webinar-publisher-repository.ts:476` retains normalized task decoding, the corresponding bound limit and scoped current-principal transaction. Pending tasks remain internal repository data, not an implemented public or customer HTTP endpoint.
- `supabase/migrations/20261014050000_webinar_publisher.sql:128`, `:142`, `:148`, `:150`, `:152`, `:156` and `:160` retain forced RLS, revoked ordinary table access, active tenant/person, actual role version, installation and first-party session checks. Reversal equality establishes that all these checks and associated grants are byte-identical to the prior Security packet.
- The migration's separate NOLOGIN admission capability and restricted routine EXECUTE grants, current qualified proof, ownership/source locks, cancellation generation, lease fencing and retained-effect deadline behavior are unchanged. Confirmed acknowledgements still require independent standing before claiming live delivery. Expired possible effects remain uncertain/reconcile, with no blind recreation or claimed recall.
- `packages/db/src/webinar-publisher-repository.ts:223`, `:227`, `:231` and `:588` retain fixed `::text::jsonb` parameter contracts. The six serialized production parameters were not altered. Strict principal/hash/receipt validation and required trusted verifier/dispatch/checkpoint authority remain at the previous reviewed repository pin.
- `packages/db/test/webinar-publisher.integration.test.mjs:18`, `:225` and `:232` add an optional shared test pool with ownership-aware cleanup and one regression. Two synthetic authorized tenants alternate requests against the same pool; exact payload assertions exclude the foreign task, processed work, canceled lineage and completed cancel work. This checks repository scoping and transaction-context restoration. Canonical calls retain the existing four-connection pool. Neither test data nor the fixture's synthetic provider authority constitutes live qualification.

## Findings and remediation

Critical: None detected. High: None detected. Medium: None detected. Low: None detected in the assigned delta.

The author repaired the SQL ambiguity without changing the security predicates. This reviewer made no production or test changes. Prior Security reports remain historical evidence of their exact packets. The unchanged broader obligations are not silently promoted to complete by this source PASS.

## Independent verification

1. Verified current migration, regression and handoff hashes against the frozen parent assignment. Programmatically reversed only the four alias names and compared the resulting UTF-8 bytes with `git show HEAD:supabase/migrations/20261014050000_webinar_publisher.sql`. Exact equality holds, recreating SHA-256 `754037e73a22a3266a0d091928828f818b3c52e9b8757aaadb48725403cfd11f`. Verified all nine other persistence/inventory pins from the previous JSON Security report unchanged.
2. Inspected the ignored diagnostic runner and its single-connection load hook before execution. The runner applies all twenty sorted migration files in transactions, logs hashes, and runs the unchanged compiled repository through postgres.js 3.4.9 wire traffic against disposable PostgreSQL 17.5 WASM, using the already installed PGlite 0.3.15/socket 0.0.20 tooling. The hook changes only the ignored harness connection count, with an exact source-shape assertion. It does not rewrite assertions, SQL, roles, parameters or migration bytes.
3. Independently ran the current full migration diagnostic: **22 passed, zero failed, zero skipped**. It reaches actual pending discovery, source/owner/session/installation refusals, ordinary-role admission refusal, cancellation, lost responses, parent identity and independently admitted observation, rollback/replay and all six retained-effect deadline scenarios. The Promise.all reservation case passes with serialized single-backend traffic; independent backend race correctness is not established by this run.
4. Independently reran with the exact baseline migration and the current regression file: **14 passed, eight failed**, each with `42702`, `o.location_id` ambiguous. The added direct pending-work case fails on that baseline, establishing a meaningful regression rather than a tautological assertion. The original seven failures reproduce as well. The local failure log remains in ignored `tmp/publisher-alias-security-scan/independent-red.log`.
5. Canonical root unit project: **228 passed across four files** (34 database, 86 command, 78 native-adapter and 30 webinar-foundation cases). Connectionless discovery/identity/admission: **3 passed**. DB typecheck, project secret audit across six source roots and `git diff --check` passed.
6. Ran the unchanged Weapon `scripts/scan.ts` on an ignored scratch copy of the two changed source/test files, unchanged repository, root dependency metadata and current rules/AGENTS files. Scoped pattern and hidden-Unicode sweeps were clean. Production audit both there and from the real root reported info 0, low 0, moderate 0, high 0, critical 0. No new package, lockfile, environment, browser storage or raw financial/customer payload was added. This isolated scan intentionally omits unrelated source and private local environment files; its missing root Next config is not a product-header finding.

Minor diagnostic issues retained: the first selected unit command included a nonexistent webinar foundation path and ran the three real publisher files, 198 cases. The correct existing foundation file was subsequently run, adding its 30 passing cases. The scratch copy command named absent root `CLAUDE.md`; all existing requested files copied, the scan completed, and no product source was affected.

## Dependencies and version check

Resolved project declarations remain Next.js **16.3.8**, React/React DOM **19.3.0**. Dependency files have no delta. Fresh production advisory counts are all zero. The stale Weapon matrix is recorded above; no framework upgrade, advisory refresh or new package was performed in this narrow review.

## Frozen pins

| File | SHA-256 |
| --- | --- |
| `supabase/migrations/20261014050000_webinar_publisher.sql` | `cdfc972760809bb881c04cfbb1d9acd86b1a37afe761f069d3902a8139f4fe5e` |
| `packages/db/test/webinar-publisher.integration.test.mjs` | `4685de79478c1f380ff2e15a298c3a49ba097b44549f98a8524ff66bab86e696` |
| `packages/db/src/webinar-publisher-repository.ts` | `dae4114244cc919b46c6ed197fb06e940d3ffa4c99cde966c0a1319e3284faa9` |
| `supabase/tests/webinar_publisher.pgtap.sql` | `c2653aca01994bf1ab80a11aa420497db476600c02c6e28bec3ddfeef3968c24` |
| `supabase/tests/phase0_scaffold.pgtap.sql` | `150930696f8d9d5152800870e52b975d7e67930e65b6bddff1419f8bf8f9ef93` |
| `library/requirements/reports/2026-10-14-webinar-publisher-sql-alias-handoff.md` | `8c84db075f373e9706f34a4a075fc8857a54b25bcbc8535c4bc8350cc87fab7c` |
| Ignored `tmp/publisher-deadline-probe/full-stack.mjs` | `8da09f08e92708d2329d2e13f9d5ca58e26fac460ae2de3e91442e2f13ebe525` |
| Ignored `tmp/publisher-deadline-probe/single-connection.mjs` | `2ec95a7cc36137e74e2e4042d012ffefaad23ca1bfd7dacd8ad93ec39ea9da3c` |

## Remaining qualification and next gate

Canonical CI run `38536992320` failed seven actual PostgreSQL integration cases on the previous migration. Its pgTAP success is baseline evidence, not a pass for this repair. Run fresh Quality at these exact pins, then orchestrator repository-health closeout and fresh canonical PostgreSQL 17 CI. Preserve actual multi-connection locks, role/RLS negatives, all publisher pgTAP assertions and the full tenant catalog inventory; do not increase timeouts or weaken assertions to obtain a pass.

Concrete worker, HTTP/UI consumers, current trusted provider/source qualification, controlled hosted proof and deliberate paid launch remain separate implementation and operational work. No provider request, purchase, live draft/publication/pause, deployment, credential change, Git commit or push was performed by this reviewer.

## Reviewer changes

Only `library/requirements/reports/2026-10-14-webinar-publisher-sql-alias-security-review.md` was added to tracked-source scope. All earlier reports, handoffs, migration/test files and active agent work were preserved.
