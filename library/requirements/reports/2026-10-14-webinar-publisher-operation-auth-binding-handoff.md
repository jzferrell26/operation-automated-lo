# Publisher operation authentication binding handoff

October 14, 2026. Author: typescript-node-guardian. Worktree: webinar-publisher. Entry base: 23ce8256d40a05ce21fb31d8ecf6d1d77aa6efcd; root committed the released authentication/session dependencies during this work, current base 2ea83449b7a09cee60f49e32fcc1e66b1636b560. Root owns Git, independent Security then Quality, CI and deployed qualification.

## Delivered operation scope

The runtime command authentication identity now requires `{operationRef,actorId,locationId}`. It obtains the operation reference from the parsed task inside the verified signed delivery envelope. Missing operation data is rejected by the strict envelope schema; changing it without a matching signature rejects before authentication or persistence access. The binding validates the exact identity schema and passes only those three fields to command authentication.

Every execute invocation freezes its own operation identity and original principal. The principal's canonical hash includes the original session, mode, installation, actor, tenant, role and version. The runtime creates per-execution native transport and immutable authentication closures, with no mutable shared last-operation or last-principal variable. It re-resolves the same operation before and after asynchronous owner/source qualifiers, media retrieval, native token/authority/transport work, capture verification, admission mapping and admission verifier work. Any changed principal rejects rather than selecting a newer login. Expiry and revocation remain enforced by the actual database resolver on each lookup, not a cached principal.

The generic publisher repository interface remains unchanged. Each execute passes an operation-scoped database authority closure. It compares supplied and re-resolved principals against the original hash, guards exact record operation on dispatch/checkpoint and keeps the repository's existing tenant SQL, source, lease, fencing, commit and rollback checks. Worker current/media/capture ports also require the same record operation. The separately privileged admission connection rechecks after connection acquisition and before/after admission execution, releases on refusal and retains the existing independent verifier requirement.

Only the two runtime files, their two assigned unit files and this new handoff were authored. The worker, relay, SQL, database index, authentication repository, seven browser-session files, provider compiler/media implementations and prior reports were not changed.

## Concrete private resolver factory

`createPostgresWebinarPublisherRuntimeBindings(configuration, ports)` in `apps/tasks/src/core/webinar-publisher-runtime-bindings.ts` constructs the actual frozen `PostgresWebinarPublisherAuthenticationResolver`. Its required `authenticationResolverPool` must be distinct from request persistence and admission pools. The actual class calls `campaign.webinar_publisher_resolve_authentication($1::text,$2::uuid,$3::uuid)` under `publisher_authentication_resolver`, using the exact signed operation, actor and location. No fallback principal or actor-only session selection is supplied.

The factory still requires the trusted source evidence, stored media reader, current source qualifier, native authority/token transport, independent capture verifier, response admission builder and independent admission verifier. A shaped `app_test` record is not a capability or proof. The existing signing configuration remains explicit. The default task still throws `RUNTIME_UNBOUND`; the factory is an explicit source composition, not an activated deployed accessor. The internal module exposes the new factory without changing the package index or startup wiring.

The immutable authentication dependency remains unchanged at SHA-256 e8bd7a50b5da15494a164ccffae2b1494354d751a0ea470f25326936f9e79d98. Its prior independent Security is 74fa1c3c89f0d77f0351cdc1227f242d9f0cc8ad332b277cf10a912038ae3b41; Quality is bcd9ca10d6daf5fca7200a89bf39ebb57bc27741ee6d23e18b31cd88da2b35f5. Parent reports 15 actual native PostgreSQL dependency cases verified. Those are attributed dependency results, not actual database execution of this new runtime composition.

## Pending and relay authority remains separate

Pending scans have no operation reference. They retain the separately mandatory trusted current authenticated-owner read capability at `databaseAuthority.currentPrincipal(originalPrincipal)`. It must resolve actual current authentication read-only, preserve the exact original session/mode/installation/binding/version and reject withdrawal. The binding compares its returned principal with the supplied immutable original and validates canonical references, owner role and supported authentication mode. Missing capability refuses setup. It does not call the operation resolver with a guessed or empty reference.

Relay remains unchanged and separately requires its trusted `currentPrincipal({actorId,locationId})` bootstrap plus current database authority. No native owner-read bootstrap implementation, producer authentication verifier or resolver login provisioning was invented. The concrete pending/relay bootstrap remains an engineering integration gap. The needed capability is a server-authenticated, read-only resolver for the original pending-scan principal and current session/installation/binding, plus a separately authenticated owner bootstrap for the relay. Arbitrarily choosing another active login would not satisfy it. Existing controlled pending/relay tests establish source compatibility, not actual login qualification or operational scheduling.

## Verification and evidence limits

- The operation-forwarding assertion first failed because the old runtime passed only actor/location. Implementation then passed the exact operation and current rechecks.
- Temporarily removing only the immutable principal comparison caused the dispatch-suppression test to fail because dispatch SQL was recorded after session withdrawal. Exact original source bytes were restored, then the complete compatibility suite passed. No guard, timeout, threshold or source assertion was weakened.
- Final compatibility: 337 tests passed across ten existing publisher/native/database/command/admission/task-composition files. The two assigned files contain 57 passing cases (22 runtime, 35 binding/relay), preserving the original 55 worker and 33 binding/relay cases while extending the operation seam.
- New cases cover missing and tampered signed operation references, expired original authority, newer sessions, changed mode, media/capture withdrawal, native token/authority withdrawal before fetch, dispatch qualifier withdrawal before dispatch SQL, foreign record operation and overlapping same-owner executions that finish B before A with distinct original session UUIDs. Actual concrete SQL resolver query, capability role, operation parameters and commit are exercised through controlled SQL transport; missing/aliased resolver pools and absent owner-read capability refuse.
- Task and tooling TypeScript, focused configured oxlint, Prettier, diff whitespace, boundary, product-type and secret checks passed. `pnpm --filter @oalo/tasks... build` passed all ten task dependency projects, including database and tasks. No server was started.
- The configured broad duplication gate remains failing on four unchanged clones outside this packet: worker lines 337-352 versus 532-547; database integration test lines 477-495 versus 657-675, 485-506 versus 834-855, and 785-795 versus 855-865. Those frozen sources and zero threshold were preserved. A scoped scan with the same 10-line/60-token/zero-threshold settings found zero clones in the two changed runtime files. Scoped success does not clear the broad gate.

Native transport tests use synthetic PNG/token/proof data and controlled callbacks to reach refusal boundaries. SQL/query tests use controlled wire results. None establishes real provider capture, source qualification, immutable operation reservation through an actual web request, a live provider effect or deployed login/connection privileges. No source-only shaped record is called actual provenance. Actual original-cookie/signed-embedded-token verifier, browser mutation gate, producer integration, capability login provisioning, owner-read bootstrap, current native services and whole deployed task qualification remain required. No live provider, environment write, ad spend, purchase, deployment, Git commit/push or rejected configured-startup retry occurred.

## Frozen packet

| Path | SHA-256 |
| --- | --- |
| apps/tasks/src/core/webinar-publisher-runtime.ts | 46c804195f3be7fb0f083d1570001c189b600157b9a6e315a0b2f2e51a14e396 |
| apps/tasks/src/core/webinar-publisher-runtime-bindings.ts | 502495da541fa8522884138efdd2876bf05af086cf83eca76e69cd47ab9b3fd2 |
| tooling/tests/unit/task-workers/webinar-publisher-runtime.test.ts | 06ebbce1adf850efa26e17510473b165cb2d280ebfbad526a2139d27e9ab63d6 |
| tooling/tests/unit/task-workers/webinar-publisher-bindings-relay.test.ts | 8e7f9fa2b51e1bba7c17fa7e421443b863a5a901651ee6a5cc834f267fc640d6 |

The earlier runtime/binding hashes and reports remain historical. These changed hashes require fresh independent Security then Quality before root Git/CI work. No full branch, pending login, live provider, deployment or overall product completion is claimed by this packet.
