# Security review: original publisher command authentication

Date: 2026-10-14. Independent reviewer: security-guardian. Worktree: webinar-publisher. Scope: the seven frozen source/test/diagnostic pins in the authentication handoff, root's exact scaffold integration, and supporting native qualification runner. Ownership: this report only.

## Executive summary

Scoped PASS, cleared for fresh independent Quality. No Critical, High, Medium or Low finding detected in this increment. Independent execution passes five source-alias units, nine connectionless repository cases and all fifteen dedicated native PostgreSQL cases, with zero native skips. The native competing-session case verifies distinct backend PIDs and exactly one immutable winning session/outbox record.

The new private producer persists original command authentication in the same transaction as existing operation/outbox reservation. The resolver requires exact operation identity, retains the originating session and expiry, and rechecks current standing. Mandatory trusted verifier/current-command ports have no accepting production default. This source capability is not deployed authentication or completed web/worker wiring.

The managed Security Weapon and integrated authorization/PII procedures apply. Its CVE intelligence last refreshed 2026-04-24 remains beyond 120 days and requires a separate refresh; no new dependency is introduced here. Broad scanner external audits/writes are outside this narrow brief. Existing defensive tests, source reads and static audits were used. No new payload, browser/hosted probe, credential read, actual provider action, configured application startup, source repair, Git mutation or ledger edit occurred.

Previous Quality reports concern separate frozen packets. New authentication Quality has not yet run. The original thirteen publisher source pins all independently match their prior Security inventory. Historical HOLD and failed WASM evidence remain preserved; native Quality 8e9f2c13ea017c16921ea5d2a466ebbf8f82c2f46c0572562df79df0f6b03eeb resolves only the original packet's scoped native verification blocker without determining the earlier failure cause. This report neither rewrites that history nor expands its qualification.

## Surface coverage checklist

### Original authentication and mandatory trust seam

None detected. webinar-publisher-authentication-repository.ts:23-85 strictly validates operation identity, reservation, verifier output, canonical UUID references, sole-owner authority, supported authentication mode, integral role version, original timestamps and digest shape. Lines 151-158 require canonical actor/location and UUID-backed session/installation references; synthetic named sessions and local_synthetic mode cannot acquire this capability.

Lines 93-108 require an independent verifier of the actual original cookie or signed embedded token, exact browser mutation gate and request identity. The separate current-command port must load owned persisted source/lender/approval/final-confirmation evidence. These ports are called before and inside reservation; required method presence is not proof of production verification. A shaped digest, principal object, accepted JSON or test fixture cannot substitute for implementing those trusted services.

Existing inbound-session.ts:25-43 and embedded-session.ts:237-291 provide signed-token, issuer/audience, original lifetime and current backing session/role checks. Their existing implementation is supporting terrain, not a newly wired producer. This increment reads no cookie, signs no token and provisions no deployed login authority.

### Immutable SQL authority and current standing

None detected. 20261014130000_webinar_publisher_auth.sql:9-40 creates one row per exact tenant/operation, with restrictive foreign keys, role/lifetime/digest constraints, enabled and forced RLS, owner-only policy, explicit runtime revocation and unconditional update/delete refusal. Stored metadata excludes cookies, bearer tokens, claim nonce, email, raw request and credentials. All FK prefixes have indexes; the new native suite verifies them.

The private helper at SQL:58-84 locks current active location, actor, original installation, exact active binding and exact UUID session. It checks session role/version, original binding UUID, revocation, issue/expiry and embedded_exchange linkage. A replacement binding with the same timestamp/version cannot substitute for the original UUID. Operational revocation may change standing; immutable session identity/lifetime is retained by the existing first-party-session migration.

The resolver at SQL:140-163 loads only the recorded operation/tenant/actor authentication and rechecks original expiry, exact binding/version, backing-session expiry, installation and owned operation/launch lineage. It never selects an arbitrary active or newer session. Repository current requires operationRef and verifies returned actor/location; revalidate at lines 328-336 compares the complete canonical original principal. Identity and authority are not inferred from mutable app.* GUCs.

### Atomic producer and idempotency

None detected. Repository:175-206 recomputes the strict normalized command hash, checks expected row version and binds operation, principal, role version and projection before any connection. Lines 211-239 submit parameterized scalars plus text-bound JSON and validate the returned owned command identity. Credentials remain only in the verifier input and never enter SQL.

SQL:100-109 checks recent verification metadata and original session authority. First-party lifetime comes from the actual immutable session row. Embedded mode requires the original integral signed issue time and exactly 300 seconds, bounded by its UUID-backed exchange session. At SQL:110-137 the owned launch/operation are locked before calling the unchanged native reservation router and inserting authentication within the same transaction. Existing operations without provenance refuse; exact retries retain their original immutable record. Expired original provenance refuses even when a newer login or token exists.

Repository:240-275 repeats independent verification/current-command checks and compares stable canonical verification output, then repeats the same idempotent local reservation to check expiry after asynchronous work. Refusal rolls back operation, outbox and authentication together. No provider effect occurs inside this producer. The new reserve method owns its complete transaction; future code must not invoke it through the old held tx.reserveCommand transaction while that transaction holds the same launch lock across a different pool connection.

### Private capabilities and SQL injection

None detected. SQL:42-55 creates or validates private NOLOGIN/NOINHERIT roles without elevated attributes. It grants schema usage only, no login membership. SQL:165-170 revokes public/app/support/admission function access and gives each private capability only its own producer or resolver function. The locking helper remains inaccessible to callers. Ordinary application roles with forged tenant/actor context cannot obtain these functions; native tests verify denials and direct-table refusal.

Security-definer functions use an empty search_path with schema-qualified objects. Repository values are parameterized; JSON uses text::jsonb wire semantics. The role interpolation at repository:124-139 is limited to the two closed server role literals. Transactions use serializable isolation and bounded three-second lock/ten-second statement limits. Migration waits are bounded to five seconds. The migration is additive and grants no new role to a deployed login.

### PII, financial effects and error handling

None detected. New persistent authentication contains limited provenance and verification-event digest rather than session secrets. No logging, client serialization, provider transport or customer financial record is added. Fixed PUBLISHER_AUTHENTICATION_UNAVAILABLE errors replace raw parser/driver/verifier failures. Current source, lender, exact spend confirmation and native qualification remain mandatory integration responsibilities, not manufactured by a valid authentication row.

Native tests use synthetic independent verifier responses and generated fixtures solely in a fresh disposable loopback database. Fixture retirement targets generated tenant/actor/installation and tracked binding identities and retains immutable rows until the owned disposable database is dropped. No immutable evidence trigger is disabled by this new suite.

### Scaffold, dependencies and preserved runtime boundaries

None detected. Root's phase0_scaffold.pgtap.sql sets the exact expected tenant inventory to 37, plan to 28 and adds the named webinar_publisher_authentications assertion. The generic table-owner, enabled/forced RLS, leading FK index and PUBLIC function-denial assertions remain present and broad. This is inventory reconciliation, not a bypass or new exemption. Scaffold source was inspected; its pgTAP suite was not executed in this native runner.

No manifest, lockfile, existing publisher worker/native transport/task runtime or original thirteen-file source pin changes. The six tracked authentication files export the new classes and verifier type; the seventh frozen pin is the ignored diagnostic runner. The default task runtime remains unbound. Operation-aware relay/worker/media/current-authority closures, actual verifier-backed web producer, current source service, persisted media lease and durable independently verified native capture remain engineering obligations. No provider activation, App Test PASS, external wire qualification or spend authorization follows from these private functions.

## Findings and remediation

Critical: None detected. High: None detected. Medium: None detected. Low: None detected in the assigned scope. No source remediation required. Only this new report was authored; existing build/tests produced ignored compiled output and disposable database state.

| Severity | Count | Fixed by reviewer |
| --- | --- | --- |
| Critical | 0 | 0 |
| High | 0 | 0 |
| Medium | 0 | 0 |
| Low | 0 | 0 |

## Independent verification

| Check | Result |
| --- | --- |
| Existing source-alias authentication unit file | 5 passed |
| Existing compiled connectionless repository suite | 9 passed |
| Dedicated native authentication suite | 15 passed, zero failed/skipped, exit 0 |
| Actual competing-session qualification | Distinct backend PIDs, one successful session, one authentication/outbox row |
| DB TypeScript build | Passed |
| Tooling TypeScript | Passed |
| Focused configured oxlint and Prettier | Passed |
| Package boundary audit | 16 packages passed; two prohibited fixture edges rejected |
| Product-type and secret audits | Passed |
| Handoff source/support/native artifact table | All 14 raw SHA-256 pins match |
| Handoff and root scaffold hashes | Match assigned freeze |
| Original publisher inventory | All 13 prior source pins match |

Independent native execution used the unchanged ignored tmp/native-pg17-root/authentication-stack.mjs on parent-owned 127.0.0.1:55437. It created a fresh random oalo_test_publisher_auth_native_ database, applied all twenty historical migration bytes plus the one new frozen migration, and invoked the dedicated integration file with its actual standard postgres.js pools and no loader hook, filter or pooling substitution. The guarded runner drops only its own generated database in finally. Parent server lifecycle was untouched.

Actual engine reported PostgreSQL 17.11 on x86_64-windows, compiled by msvc-19.44.35229, 64-bit. Existing driver is postgres.js 3.4.9. Historical migrations emit their existing role-membership notices and nested-transaction warnings; no warning, source or timeout was changed to obtain the result. This establishes this suite's native Windows behavior. Canonical Supabase/Linux CI, pgTAP, deployed capability logins, authentic cookie/JWT verification and actual configured application/provider behavior remain distinct requirements.

The earlier WASM diagnostic, one-backend acquisition failure, explicit Emscripten skip and RED evidence are retained as attributed history. They neither qualify independent backend behavior nor establish an earlier failure cause. No new negative payload or test was authored by this reviewer.

## Frozen inventory

| File | SHA-256 |
| --- | --- |
| supabase/migrations/20261014130000_webinar_publisher_auth.sql | 5077017e0b8da49e7c6f96262d5a1d32c9bf3bcc87f9cf6dd5f4c801a92bcc55 |
| packages/db/src/webinar-publisher-authentication-repository.ts | e8bd7a50b5da15494a164ccffae2b1494354d751a0ea470f25326936f9e79d98 |
| packages/db/src/index.ts | 130974c2d152845e22996ce604fb88820f15ef4202b375ac2b204ecaed509a67 |
| packages/db/test/webinar-publisher-authentication-repository.test.mjs | 9bbb1344b79b84979eb0d94fcfc329fe2f1b840216b5206ec9cae19d6c6d3764 |
| packages/db/test/webinar-publisher-authentication.integration.test.mjs | dc8e1e93f0d4f6e3d882c0be2a1b9badac02c71eb1552e9b437d003db83ebac6 |
| tooling/tests/unit/webinar-publisher/authentication.test.ts | 3296fe5f2864371c57e34435de873c782f054f02533434f49c419ad07698ba40 |
| tmp/publisher-deadline-probe/authentication-stack.mjs | d1a989d064f92861b477ec31548a807cc09c7d9117b6009e1bf93bb264d2e24f |
| supabase/tests/phase0_scaffold.pgtap.sql, root integration | f3cd74999e9c95ee3b2b17b7080ddd6bda06c5d59e62cb38f13129128cd363d1 |
| library/requirements/reports/2026-10-14-webinar-publisher-authentication-handoff.md | 9ff99c42298bdd679d8a15e4bc39a0e4d9afa76dad4e4f1889a6ee6f8518ec88 |
| tmp/native-pg17-root/authentication-stack.mjs, unchanged reviewed native runner | ac2c060f727e57d5dae099e2a8a6e804fe6d631523255160d3b12163d5da63a9 |
| tmp/native-pg17-root/authentication-native.log, author evidence retained | 542b09a93664981eb8630926f5c9e5c08bc1ca31a1c98cfbd49d235e7ce0df02 |

## Release limits and handoff

Proceed to fresh independent Quality on these exact pins and canonical current-head CI. Provision and review separate capability logins and the actual verifier/browser mutation/current-command service before producer admission. Wire exact operationRef through resolver callbacks, relay, worker, media and current-authority closures; no default operation or newer-session fallback is acceptable. Preserve full producer transaction ownership and original approval/final-confirmation/evidence checks. Default production runtime stays unbound until these further reviewed capabilities exist.

No purchase, live provider effect, customer message, merge, deployment or whole-publisher completion was performed or cleared here. Parent retains all Git, CI, runtime wiring and release responsibilities.

Automatic approval review previously rejected configured whole-app startup using fixture DB/R2 hooks and an activation flag with the stated reason "blocked by policy." That action remains unrun and was not repackaged or retried. The authorized standalone native database suite is separate from that application startup.
