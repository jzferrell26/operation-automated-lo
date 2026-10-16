# QA Report: immutable publisher command authentication

**Plan:** Accepted CTR-003 revision 1 and `2026-10-14-webinar-publisher-authentication-handoff.md`.
**Audit date:** 2026-10-14
**Auditor:** quality-guardian, `/root/domain_final_quality`
**Baseline/head:** `23ce8256d40a05ce21fb31d8ecf6d1d77aa6efcd`, `codex/webinar-publisher`, plus the frozen authentication packet and root scaffold delta.
**Preceding Security:** `2026-10-14-webinar-publisher-authentication-security-review.md`, SHA-256 `74fa1c3c89f0d77f0351cdc1227f242d9f0cc8ad332b277cf10a912038ae3b41`.

## Summary

**Scoped authentication capability PASS; configured producer/consumer wiring remains open.** The immutable original-session record, atomic operation/outbox producer and exact operation-aware resolver match their handoff, with no Critical, Warning or Suggestion found; independent native PostgreSQL passes all fifteen cases including two actual backend PIDs and one competing-session winner. Required cookie/JWT/browser-mutation/current-command verification, separate capability logins, complete producer transaction ownership and operationRef propagation into worker/relay/media remain unfinished integration, and canonical Supabase/Linux CI and pgTAP are still required.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | Assigned additive provenance/reservation/resolver and exact scaffold requirements traced; actual verifier and wiring explicitly open. |
| Correctness | ✅ | Native withdrawal/expiry/rollback/ownership/grant/index/race tests, source-alias and connectionless cases pass. |
| Alignment | ✅ | Existing session/role/installation foundation, serializable capability pattern and sole-owner product retained. |
| Gaps | ✅ | No arbitrary newer-session selection, legacy adoption, caller-context authority or accepting verifier fallback. |
| Detrimental | ✅ | Original publisher packet unchanged; no existing SQL body/grant replacement, live authority or deployed login added. |

## Critical Issues (must fix)

None in this frozen authentication packet. Mandatory trust services in the interface are not implemented authentic-cookie/token verification.

## Warnings (should fix)

None newly found in this packet. The producer's complete transaction ownership and future operation-aware closure requirements must be preserved during integration; they are not waived by this source PASS.

## Suggestions (consider improving)

None.

## Plan Item Traceability

| # | Assigned requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| AUTH-01 | Strict operation/reservation/verified principal identities and current sole owner | ✅ | `packages/db/src/webinar-publisher-authentication-repository.ts:23-85,151-206` | Canonical UUID refs, non-synthetic first_party/embedded modes, bounded version, original times and digest shape. |
| AUTH-02 | Mandatory independent original credential/mutation/request verifier | ✅ | `webinar-publisher-authentication-repository.ts:93-108,167-205` | No default implementation. Shaped claims/digest/test fixture is not verification; current-command port must load real persisted confirmation/source evidence. |
| AUTH-03 | One immutable original authentication per exact tenant/operation, no credential storage | ✅ | `supabase/migrations/20261014130000_webinar_publisher_auth.sql:9-40` | Session/installation/binding/version/lifetime/digest only; unconditional update/delete refusal even for owner. |
| AUTH-04 | Active exact session, binding UUID/version, actor, tenant and installation | ✅ | SQL`:58-84` | Locks current standing; same-version replacement binding cannot substitute. No actor-only newer-session query. |
| AUTH-05 | First-party lifetime from actual session; original embedded issue/expiry bound to exchange session | ✅ | SQL`:100-109` | Integral signed issue and exact 300-second lifetime; original expiry retained. Expired original claim cannot borrow later login. |
| AUTH-06 | Operation/outbox/provenance reserved atomically and rollback after verifier refusal | ✅ | SQL`:110-137`; repository`:211-275` | Existing reservation router invoked in same private transaction; native post-reservation refusal leaves no partial row. |
| AUTH-07 | Canonical request hash, role version, projection and owned decoded result | ✅ | Repository`:175-206,228-239` | Changed command hash refuses before reservation; scalar and JSON bindings remain parameterized/text::jsonb. |
| AUTH-08 | Exact retries keep original immutable row; old operation cannot acquire retroactive provenance | ✅ | SQL`:116-137`; actual native replay/legacy tests | Different original session/installation/binding/mode and expired original record refuse. |
| AUTH-09 | Repeat independent verifier/current-command and same local reservation before commit | ✅ | Repository`:240-275` | Stable canonical verified output, rechecks original expiry after awaited work; no provider effect. |
| AUTH-10 | Context-free private resolver requires operationRef and original actor/location | ✅ | Repository`:286-336`; SQL`:140-163` | Loads only exact recorded operation; verifies ownership/standing and returns original canonical principal. |
| AUTH-11 | Revalidate rejects any changed original principal | ✅ | Repository`:328-336` | Complete canonical equality; newer login rejected even for same person. |
| CAP-01 | Private NOLOGIN/NOINHERIT non-elevated roles, no deployed memberships | ✅ | SQL`:42-55,165-170` | Each capability gets only own function; private locking helper remains inaccessible. |
| CAP-02 | Empty search_path, qualified objects, owner-only forced RLS and FK indexes | ✅ | SQL`:9-40,58-170`; native privilege/index cases | Forged app.* GUCs and ordinary app runtime cannot obtain capabilities/table writes. |
| CAP-03 | Serializable fixed-role transaction and finite lock/statement limits | ✅ | Repository`:118-147`; SQL`:6-7` | Existing 3s lock/10s statement limits and 5s DDL wait; no arbitrary role interpolation. |
| DDL-01 | Additive new table/functions/roles, preserve original publisher source | ✅ | Migration complete scope and frozen old pins | No old body/grant replacement; durable rollback remains a forward migration. |
| SCAF-01 | Exact 37 tenant tables, plan 28 and named auth table, broad guards retained | ✅ | `supabase/tests/phase0_scaffold.pgtap.sql:3,91-104` | Root delta only count/description/one table assertion. pgTAP not executed in this native runner. |
| TEST-01 | Native independent backends and exactly one competing original session/outbox row | ✅ | `packages/db/test/webinar-publisher-authentication.integration.test.mjs:507-585` | Native PID inequality is asserted, one successful reservation, exact winning resolver identity and one auth/outbox row. Zero native skip. |
| NG-01 | No provider, token/cookie signer, customer-role UI or deployed capability default | ✅ | Frozen packet and exports | Current production task stays RUNTIME_UNBOUND. |
| NG-02 | Preserve original thirteen-file source, its failed histories and separate native verdict | ✅ | Matching held pins and prior reports | New authentication does not regrade or replace earlier source acceptance. |
| OPEN-01 | Real verifier and separately provisioned least-privilege logins | 🟦 | Handoff trust seam and required wiring | Actual original cookie/JWT plus CSRF/mutation/source/final confirmation must be verified server-side. |
| OPEN-02 | Complete producer transaction integration | 🟦 | Handoff required wiring | reserve owns entire transaction. Calling through old tx.reserveCommand while its other connection holds launch lock would self-contend; no such integration supplied here. |
| OPEN-03 | OperationRef propagated through auth/relay/worker/media/current-authority closures | 🟦 | Handoff required wiring; existing person-only bindings | No default operation or arbitrary current-person session is safe. |
| OPEN-04 | Current source/raster, persisted media lease, actual durable capture/verifier/runtime/safety schedule | 🟦 | Separate accepted CTR-003 consumers | Source interfaces and private provenance do not complete deployed publisher. |
| OPEN-05 | Canonical Supabase/Linux CI, pgTAP, customer/browser and controlled provider proof | 🟦 | Root integration/release gate | Native Windows qualifies this exact suite, not all deployment environments or provider behavior. |

SQL and Repository abbreviations above refer to the new migration and `packages/db/src/webinar-publisher-authentication-repository.ts`.

## Files Changed

- `supabase/migrations/20261014130000_webinar_publisher_auth.sql` (A): immutable original-operation provenance, narrow private producer/resolver capabilities.
- `packages/db/src/webinar-publisher-authentication-repository.ts` (A): trusted verifier-backed atomic producer and exact original-principal resolver.
- `packages/db/src/index.ts` (M): new classes/error/verifier type export group.
- `packages/db/test/webinar-publisher-authentication-repository.test.mjs` (A): nine connectionless producer/resolver checks.
- `packages/db/test/webinar-publisher-authentication.integration.test.mjs` (A): fifteen original identity/expiry/revocation/rollback/grant/index/race cases.
- `tooling/tests/unit/webinar-publisher/authentication.test.ts` (A): five source-alias cases.
- `tmp/publisher-deadline-probe/authentication-stack.mjs` (ignored): frozen historical WASM diagnostic, counted as seventh assigned pin, not shipped source.
- `supabase/tests/phase0_scaffold.pgtap.sql` (M, root-owned): exact count 37/plan 28 and named new table.

Only this report and a new ignored native raw log were authored by this reviewer. No source, old report/log, threshold, role/grant, fixture, dependency, Git state, ledger or provider configuration was modified. Existing session transplant files and other active work were excluded.

## Independent verification

| Existing executed check | Result |
| --- | --- |
| Source-alias authentication suite | 5 passed |
| Compiled connectionless repository suite | 9 passed, zero skipped |
| Dedicated native PostgreSQL authentication suite | 15 passed, zero failures/skips/cancellations, exit 0 |
| Independent native race | Two distinct backend PIDs, exactly one accepted original session, one authentication/outbox row |
| Database and tooling TypeScript | Passed |
| Focused lint/format, boundary+negative fixture, product types/secrets, diff | Passed |
| Frozen seven-packet pins, root scaffold, handoff and Security/native-runner hashes | Matched |

Native run used unchanged `tmp/native-pg17-root/authentication-stack.mjs`, creating only its fresh random `oalo_test_publisher_auth_native_` database on root's existing loopback 127.0.0.1:55437. All 21 exact migrations were recorded, including the new frozen auth migration. It invoked the dedicated file directly with node --test and actual postgres.js 3.4.9 pools, with no loader, filter or single-backend shim; hook flags were absent. Its finally drops only its own checked-prefix database. Root owns cluster shutdown. Engine reports PostgreSQL 17.11 x86_64-windows/msvc 19.44.35229. Suite duration 7.52 seconds; raw independent log `tmp/native-pg17-root/authentication-quality-native.log`, SHA-256 `1b9110d1f984676ba9c7c6776a637af00139a5ef6a7fef33ce30af26dfe80c14`.

The native 15, source 5 and connectionless 9 are separate existing checks with overlap and are not added to author/Security totals. Tests use synthetic verifier outputs; they prove the capability's handling of trusted-port results, not actual cryptographic/browser mutation verification. No new payload, provider/browser probe, configured app startup or credential access occurred. pgTAP scaffold execution was not performed; source 37/plan 28 assertions do not replace canonical pgTAP.

## Frozen provenance

| File | SHA-256 |
| --- | --- |
| supabase/migrations/20261014130000_webinar_publisher_auth.sql | 5077017e0b8da49e7c6f96262d5a1d32c9bf3bcc87f9cf6dd5f4c801a92bcc55 |
| packages/db/src/webinar-publisher-authentication-repository.ts | e8bd7a50b5da15494a164ccffae2b1494354d751a0ea470f25326936f9e79d98 |
| packages/db/src/index.ts | 130974c2d152845e22996ce604fb88820f15ef4202b375ac2b204ecaed509a67 |
| packages/db/test/webinar-publisher-authentication-repository.test.mjs | 9bbb1344b79b84979eb0d94fcfc329fe2f1b840216b5206ec9cae19d6c6d3764 |
| packages/db/test/webinar-publisher-authentication.integration.test.mjs | dc8e1e93f0d4f6e3d882c0be2a1b9badac02c71eb1552e9b437d003db83ebac6 |
| tooling/tests/unit/webinar-publisher/authentication.test.ts | 3296fe5f2864371c57e34435de873c782f054f02533434f49c419ad07698ba40 |
| tmp/publisher-deadline-probe/authentication-stack.mjs | d1a989d064f92861b477ec31548a807cc09c7d9117b6009e1bf93bb264d2e24f |
| supabase/tests/phase0_scaffold.pgtap.sql | f3cd74999e9c95ee3b2b17b7080ddd6bda06c5d59e62cb38f13129128cd363d1 |
| Authentication handoff | 9ff99c42298bdd679d8a15e4bc39a0e4d9afa76dad4e4f1889a6ee6f8518ec88 |
| Preceding Security | 74fa1c3c89f0d77f0351cdc1227f242d9f0cc8ad332b277cf10a912038ae3b41 |
| Existing native runner | ac2c060f727e57d5dae099e2a8a6e804fe6d631523255160d3b12163d5da63a9 |
| Author native log, preserved | 542b09a93664981eb8630926f5c9e5c08bc1ca31a1c98cfbd49d235e7ce0df02 |

## Retained history and required integration

The author's missing-capability RED, changed-request-hash RED, initial DDL role-creation refusal, one-backend parallel acquisition failure and 14-pass/one-explicit-Emscripten-skip history remain preserved. Fifteen native passes do not rewrite those observations or explain any old preflight admission predicate. The original 13 publisher pins and earlier native/preflight reports remain separate; native re-evaluation 8e9f2c13... resolved only their scoped native verification blocker.

Root must integrate the complete private producer safely, provision/review actual verifier and separate capability login authority, propagate exact operation identity and current original-principal revalidation, then run current-head canonical CI/pgTAP/browser qualification. Default runtime remains unbound, and lender/source/media/native capture/provider/spend qualifications remain outstanding. No whole-app startup, provider action, paid launch, merge, deployment or whole publisher/CTR-003 completion is cleared by this scoped capability PASS.
