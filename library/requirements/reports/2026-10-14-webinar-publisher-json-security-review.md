# Security review: combined webinar publisher JSON binding and deadline repair

Date: 2026-10-14. Auditor: `/root/publisher_json_security`, security-guardian. Branch: `codex/webinar-publisher`, HEAD `876aa8f6c3f5d9a421dbcf60872233de48075b45` plus the frozen persistence packet. Accepted CTR-003 revision 1: `dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23`. Current author handoff: `9d0966006f41f347aac769c24690bde9aec06d878d3af3d23f6daf23746c1506`.

## Executive summary

**Scoped combined-source PASS.** No new Critical, High, Medium or Low vulnerability was detected. The text-to-jsonb parameter repair preserves strict normalized objects, canonical hashes and the existing authority boundary. The repaired deadline continues to preserve possible remote effects as uncertain/reconcile while fencing further dispatch. Full PostgreSQL 17 migration, RLS, concurrency and provider qualification remain pending.

The Weapon CVE watchlist was last refreshed on 2026-04-24, 173 days before this review. Its catalog is stale; refresh it through the owning Guild workflow. The fresh production dependency audit reports zero advisories. That result does not establish a current per-CVE matrix or qualify the deployed main branch. No Guild file was changed.

## Scope and ordering

Reviewed the current repository, actual PostgreSQL test fixture and adapter unit delta, traced the unchanged SQL authority/admission and command boundaries, and re-evaluated the retained deadline repair. Independently verified all eleven persistence/inventory pins listed below. This is a bounded review of the combined repaired packet, not a new full-branch audit.

Used the managed security-guardian configuration and security-weapon, including principles, injection, PII, authorization/tenancy and AI-code guidance. Applied the actual Next.js/Postgres host conventions. The original Security report and initial blocked Quality report are historical reviews of earlier pins. The separate deadline Security review also predates these JSON binding changes. This fresh review follows the repairs and precedes the requested fresh Quality pass; the initial Quality output must not be presented as approving this packet.

This reviewer owns only this new report. No production source, fixture, migration, earlier report, handoff, Git state, dependency, credential, provider or deployment was changed.

## Scorecard

| Category | Result | Evidence |
| --- | --- | --- |
| Financial actions | None detected in combined source | Exact confirmed objects/hashes survive serialization; deadline ambiguity remains fenced |
| PII and secrets | None detected in delta | No new raw token, customer payload logging, public storage or transport path |
| Authentication and authorization | None detected in delta | Existing strict principal and current SQL owner/session/installation checks remain unchanged |
| Injection | None detected | Fixed query text and separate parameters; JSON syntax failures refuse |
| Dependencies | Zero production advisories reported | Fresh deterministic scanner; project dependency files unchanged |
| Configuration and headers | None detected in delta | No HTTP, deployment, flag or header changes |
| Data handling | None detected | Object fidelity and canonical hashes verified; scalar JSON refused in the reduced wire guard |

## Boundary evidence

- `packages/db/src/webinar-publisher-repository.ts:223`, `:227`, `:231` and `:588`: the command, worker, proof and admission query contracts use `::text::jsonb` for six already serialized parameters. Their SQL text remains static and their values remain separate. Reversing precisely these six casts recreates the original repository SHA-256 `f39b17dd85cfe1ff897c47f2d0a2c02de90657b2736986d83ed36e807891fafb`. No other production repository byte differs from that reviewed version.
- `packages/db/src/webinar-publisher-repository.ts:241`, `:251`, `:260`, `:423` and `:576`: principal validation, normalized identity construction, canonical summary/projection hashes, fixed command serialization and verifier-output parsing retain their prior behavior. Text parsing does not confer owner, embedded-session signature or provider provenance authority. The verifier and separate capability pool remain required.
- `packages/db/src/postgres-adapter.ts:214`: the existing adapter passes the fixed statement text and separate converted scalar parameters to postgres.js with `prepare:false`. No caller input is concatenated into the new statement text. The method named `unsafe` is the driver's parameterized API in this call; its name does not change the observed use of placeholders.
- `supabase/migrations/20261014050000_webinar_publisher.sql:142`, `:146`, `:154`, `:159`, `:333` and `:388`: actual owner/version/installation and first-party session checks, the separate NOLOGIN admission capability, normalized admission guards and restricted EXECUTE grant remain at the reviewed deadline migration pin. This repair does not grant anonymous/table access or replace SQL capability checks with JSON claims.
- `supabase/migrations/20261014050000_webinar_publisher.sql:395`, `:410` and `:413`: current authority, exact tenant/owner lineage locks and cancellation fencing precede deadline handling. A matching attempt, including a confirmed acknowledgement, or retained native campaign identity preserves possible effect. Expiry clears the lease, sets the operation inactive and saves uncertain/reconcile rather than allowing another creation or claiming observed delivery. Zero-effect work becomes blocked/complete. The relational and serialized stages agree; native IDs and original command/observation history survive.
- `packages/db/test/webinar-publisher.integration.test.mjs:86`, `:106`, `:123`, `:166`, `:257`, `:278`, `:290`, `:401`, `:407`, `:421` and `:573`: twelve serialized fixture parameters across eleven SQL sites now use the same text-to-jsonb conversion. Their existing owner/session, revocation, admission, uncertain-deadline and separately confirmed owned-pause assertions remain present. These are authored disposable-database fixtures, not observed production or provider evidence.
- `tooling/tests/unit/webinar-publisher/database.test.ts:291` and `:411`: adapter assertions retain bounded worker and trusted admission coverage and compare bound task/receipt content with normalized originals. The full unit packet continues to cover altered hashes, synthetic authority, unknown token/revision/origin/window fields, rollback and dispatch/checkpoint guards.

## Findings and remediation

Critical: None detected in the assigned combined repair. High: None detected. Medium: None detected. Low: None detected.

The author repaired the driver binding defect and earlier Q-PUB-DB-01 deadline classification. This review re-evaluated those repairs without modifying source. Closing their actual PostgreSQL runtime qualification still requires canonical CI.

## Independent verification

- Weapon `scripts/scan.ts` completed. Fresh production dependency audit: info 0, low 0, moderate 0, high 0, critical 0. Hidden-Unicode rules scan clean. Existing project secret audit passed across six source roots and the public environment boundary. No scoped new secret, raw-card, unsafe logging or dynamic-query sink was found. Resolved Next.js is 16.3.8 and React/React DOM are 19.3.0; no new dependency was introduced.
- Canonical root Vitest unit project: **228 passed across four files**, comprising 34 database adapter, 86 command, 78 native adapter and 30 webinar foundation cases. Connectionless discovery/identity/admission tests: **3 passed**. DB typecheck and `git diff --check` passed.
- Inspected and reran the existing temporary source-alias proof against the actual canonical configuration: **34 passed**. The observed application/contracts/domain/db entry modules were `src/index.ts`; the guard rejected any compiled workspace dist load. No canonical configuration or build prerequisite was changed.
- Inspected and independently reran the exact-query wire probe using the unchanged **postgres.js 3.4.9** driver, `unsafe` with `prepare:false`, a temporary loopback socket and **PGlite 0.5.9 / PostgreSQL 18.6 on WASM**: **4 passed**. Direct jsonb typing observes an already serialized value as a JSON string; the repaired text-to-jsonb binding observes an object. Identity, nested null/false/arrays, serialized input bytes and actual application canonical hashes survive all four current SQL query strings.
- Independent in-memory extension of that reduced wire probe: **24 malformed/scalar refusals passed**, with malformed JSON receiving syntax rejection and null/boolean/number/string/array values refused by its object guard. **4 SQL-like bound-data cases passed**, preserving adversarial text as returned data while the schema remained intact. **4 original-cast regression controls passed**, each reproducing object-guard refusal when reverting only its casts. These checks execute the real driver and parsing with reduced synthetic functions, not the production authority/migration functions.
- Inspected and independently reran the exact deadline SQL extracted from the pinned migration: **10 passed**. Confirmed publish/pause/resume, confirmed draft, confirmed response without IDs, unconfirmed attempt and retained identity keep uncertainty. Zero dispatch, foreign-tenant and different-operation negatives remain blocked. Lease clearing, retained identity/timestamps and serialized state are checked. This reduced-schema SQL probe does not exercise the full role, RLS, trigger, locking or concurrency surface.
- Recomputed all eleven current pins, the three historical Security/Quality report hashes and current handoff hash. The earlier handoff prefix remains byte-identical at `f0071507a9bff0ec1d6859a71773b20092c4338a064b9e530bffbcad9a7b4927`. Confirmed exactly six production casts and twelve fixture casts.

Diagnostic failures retained: the reviewer's first selected unit command used the nonexistent singular `command.test.ts` filter and ran only 142 cases. It was corrected to the existing `commands.test.ts`, producing the complete 228 above. An initial in-memory probe import rewrite also matched SQL `from 'object'`, causing false object-guard failures; restricting that temporary rewrite to import declarations restored the original guard and all independent checks passed. Neither failure changed product files, existing probes or gates.

## Pending qualification and next gate

**Twenty-one actual PostgreSQL integration cases, twenty-four publisher pgTAP assertions and the full Linux inventory scanner remain pending canonical PostgreSQL 17 CI.** Neither the WASM deadline probe nor the wire probe proves complete migrations, RLS, real SQL capability grants, concurrent transactions or production provider behavior. No missing connection, authored test or synthetic response is counted as an actual PG pass.

Fresh Quality must use these same pins, followed by orchestrator repository-health closeout and canonical CI. Keep the trusted provenance verifier and admission capability isolated in future worker/HTTP composition; verify signed embedded authority separately from JSON shape. Actual worker scheduling, provider/media qualification, HTTP/UI composition, withdrawal handling and deliberate spending confirmation retain their separate obligations. No provider request, draft, publish, pause, purchase, Git mutation or deployment was performed.

## Files changed by this reviewer

| File | Change |
| --- | --- |
| `library/requirements/reports/2026-10-14-webinar-publisher-json-security-review.md` | New scoped review report only |

## Reviewed source pins

| File | SHA-256 |
| --- | --- |
| `packages/db/src/index.ts` | `b72e0a64e895feb66b04a530659c83699ee24cc6ddf072a675462c15c5003e37` |
| `packages/db/src/webinar-publisher-repository.ts` | `dae4114244cc919b46c6ed197fb06e940d3ffa4c99cde966c0a1319e3284faa9` |
| `packages/db/test/webinar-publisher-fixture.mjs` | `15276c06f8869e5585ac1616ac8856e1b2aa1f5422dc597e4403af36d599824f` |
| `packages/db/test/webinar-publisher-fixture.d.mts` | `a4f558eda7b06fde94b9b8f0cdb9053a2d328e0bdff8e153a56fdf57e3e9e168` |
| `packages/db/test/webinar-publisher-repository.test.mjs` | `f9d7785382924b6b38c0315514f7fc0bb0ef354043e2699798da3dcc5aa3f461` |
| `packages/db/test/webinar-publisher.integration.test.mjs` | `627f4d9d160834844821942e45bf1a958da3378a6b3c1a0fd57d571aa21beb05` |
| `supabase/migrations/20261014050000_webinar_publisher.sql` | `754037e73a22a3266a0d091928828f818b3c52e9b8757aaadb48725403cfd11f` |
| `supabase/tests/webinar_publisher.pgtap.sql` | `c2653aca01994bf1ab80a11aa420497db476600c02c6e28bec3ddfeef3968c24` |
| `tooling/tests/unit/webinar-publisher/database.test.ts` | `2fe8ff3086e5c9831b4ced39bdf7e28893effb52d69b7bb72f8a0af3f0d4747f` |
| `tests/security/phase0-boundary.test.ts` | `24a9b1b4d0c1f4487dda8dd6e8c96234e7c9fdd97a98d731fee1f93c36fbab2a` |
| `supabase/tests/phase0_scaffold.pgtap.sql` | `150930696f8d9d5152800870e52b975d7e67930e65b6bddff1419f8bf8f9ef93` |

Historical full-DB Security: `d4a04d7ab2a4bae066bd6b1820c0209e468169469c81da6fe5f7131653e25c56`. Initial blocked Quality: `990e3a9ec1db68f237ad141fa90f9ff744e5dfb08e0ddc3470bea4d411e457da`. Deadline Security: `3ec312f5099af1591a4065f94bf47bca7bcd4b3b5351f3803c19fa5a5abd65ba`. All remain unchanged.
