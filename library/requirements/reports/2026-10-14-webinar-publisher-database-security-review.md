# Security review: webinar publisher database packet

Date: 2026-10-14. Auditor: `/root/publisher_db_security`, security-guardian. Branch: `codex/webinar-publisher`, HEAD `876aa8f6c3f5d9a421dbcf60872233de48075b45` plus the frozen uncommitted packet. Accepted CTR-003 revision 1: `dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23`. Author handoff: `61aa2f140b5939b68e47b8bfed20ccf7fe230e12340318583ba1830568f1cc9f`.

## Executive summary

**Scoped source PASS.** No Critical, High, Medium or Low vulnerability was detected in the reviewed packet. Provider admission requires a separate SQL capability, strict normalized verifier output, and current owner/installation binding. Caller JSON and mutable application context do not confer that admission privilege. Source approval does not qualify real PostgreSQL execution, embedded-session signatures, provider responses, worker scheduling, HTTP/UI integration or live spend.

The paired Weapon's CVE watchlist was last refreshed on 2026-04-24, 173 days before this review. That intelligence is stale. The current production dependency audit reports zero advisories; this is not a claim that the archived catalog covers every new advisory. Refresh the Weapon through its owning Guild workflow before relying on its catalog as current intelligence. No Guild files were modified.

## Scope and ordering

Reviewed the ten exact source/test files below, the root-owned additive scaffold inventory correction, and the existing tenant transaction wrapper and source authority callers necessary to trace the new boundary. Used managed security-guardian configuration and security-weapon, including authorization/tenancy and AI-code procedures. Applied the actual Next.js/Postgres host conventions rather than upstream SvelteKit/Neon examples.

The older native-adapter and command Quality reports cover earlier packets. No Quality report for this new persistence packet existed on entry. This review precedes its fresh Quality pass. No source, contract, frozen handoff, previous report, credential, provider or deployment was changed by this reviewer.

## Scorecard

| Category | Result | Evidence |
| --- | --- | --- |
| Financial actions | None detected | Current entitlement, exact confirmed projection, bounded action and separate qualified proof |
| PII and secrets | None detected | Strict normalized admission, no raw page token storage or new customer payload logging |
| Authentication and authorization | None detected within assigned trust boundary | Current server authority plus actual SQL owner/version/installation/session checks |
| Injection | None detected | Fixed parameterized SQL, bounded method dispatch, empty SECURITY DEFINER search paths |
| Dependencies | Zero production advisories reported | Fresh `pnpm audit --prod --audit-level=high --json` |
| Configuration and headers | None detected in packet | No HTTP/header or deployment configuration change; runtime flags remain disabled |
| Data handling and uncertainty | None detected | Immutable identities, atomic outbox, fenced leases, persistent attempt history |

## Boundary evidence

- `packages/db/src/webinar-publisher-repository.ts:280`: SERIALIZABLE BEGIN is substituted before existing principal-bound context SQL. `:310` and `:413` resolve and compare current principal before and after command work; callback failure rolls back. Required authority implementations are explicit dependencies, without an in-memory production fallback.
- `supabase/migrations/20261014050000_webinar_publisher.sql:128`: all five new tables enable and force RLS and revoke ordinary app/support/public table access. `:142` checks actual active workspace/user, current sole-owner binding/version and installation under transaction locks. `:159` additionally checks a real unrevoked, unexpired first-party session. GUC context selects scope but is insufficient without those current rows.
- `supabase/migrations/20261014050000_webinar_publisher.sql:328` and `:386`: admission is executable only by the separate NOLOGIN, NOINHERIT `publisher_admission_runtime` capability. No runtime/login membership or direct admission table grant is added. Setting a custom GUC or sending `origin: verified_provider` does not acquire EXECUTE. `packages/db/src/webinar-publisher-repository.ts:566` requires an injected trusted verifier and a separately configured pool, parses only its strict normalized result, then uses fixed placeholders. This capability pool must stay outside request and worker composition.
- `supabase/migrations/20261014050000_webinar_publisher.sql:235`, `:356` and `:360`: admitted selection/proof lookup requires exact current tenant, owner, installation, projection and unrevoked validity. Qualification matches current native account/page, wire hash, daily budget semantics and exact UTC stop. Synthetic application-shaped qualification cannot create an admission through ordinary SQL runtime.
- `packages/db/src/webinar-publisher-repository.ts:372`: normalized request and exact confirmation hashes are reconstructed before reservation. SQL `:281` checks prior request identity/content, `:293` compares current native IDs/CAS/state, `:302` rechecks spending authority/current evidence, and `:321` writes operation plus dedicated outbox atomically. The partial unique index at `:73` constrains active lineage.
- `supabase/migrations/20261014050000_webinar_publisher.sql:312`: cancellation/pause invalidates an older active lease and increments cancellation generation. Possible remote effects remain uncertain. Worker `:411`, `:441` and `:456` enforce active lineage, generation, worker identity, bounded lease/deadline, current evidence and one durable attempt per operation-stage. An abandoned possible write enters reconciliation instead of another creation.
- `packages/db/src/webinar-publisher-repository.ts:513` and `:537`: required trusted dispatch/checkpoint authority runs before SQL mutation. SQL `:474` preserves confirmed parent identity and `:483` matches recorded attempts; `:489` requires separately admitted exact observation for progress/reconciliation. A publish acknowledgement is not declared live. Observation schema also requires all real native and Facebook IDs for live, with unavailable metrics left null.
- `tests/security/phase0-boundary.test.ts:107`: only the exact independently reviewed native transport filename was added. Scanner regex, prior paths, timeout, blocked provider coverage and default-off semantics are unchanged. `supabase/tests/phase0_scaffold.pgtap.sql:94`: exact table count moves from 31 to 36 with five named table assertions and plan 22 to 27. Existing RLS/grant/FK/function checks remain intact.

## Findings and remediation

Critical: None detected. High: None detected. Medium: None detected. Low: None detected. Source remediation: none. The only authored file is this report. The pre-existing source diff and both additive inventory diffs were reviewed; `git diff --check` passed.

## Independent verification

- Weapon `scripts/scan.ts` completed using Node's native TypeScript stripping. Production dependency audit: info 0, low 0, moderate 0, high 0, critical 0. AI-rules hidden Unicode sweep clean. Vulnerable-pattern leads had no match in the new repository/migration packet. Existing project secret audit passed across six roots and the public environment boundary.
- Actual root Vitest configuration, selected DB adapter/command/native tests: **198 passed across three files**, including all 34 new database cases, 86 command cases and 78 native cases. They test missing/current authority, rollback, altered hashes, inadmissible token/revision/origin/window/synthetic/live records, strict checkpoint/dispatch ports and native refusals. They do not execute PostgreSQL.
- Connectionless package discovery/identity tests: **3 passed**. Actual PG tests are included separately in canonical discovery and excluded from unit discovery. DB typecheck passed.
- Initial reviewer command named a nonexistent `tooling/vitest.unit.config.ts` and failed before running tests. Corrected to the existing root `--project unit` configuration, producing the 198 passing cases. No configuration or gate was altered.
- All ten handoff source pins independently recomputed and matched. The separate scaffold pin also matched. Production dependency versions resolve to Next.js 16.3.8 and React/React DOM 19.3.0 in the lockfile, outside the old affected release lines cataloged by the Weapon. The fresh audit found no advisory; no unverified per-CVE current matrix is claimed.
- **15 actual PG cases and 24 new pgTAP assertions remain locally unrun.** The global scaffold now has 27 assertions. Canonical migrated PostgreSQL CI must execute these, including ordinary-role forged admission denial, real session/owner revocation, concurrent reservation, cancellation races, uncertain writes, parent/provenance and current proof expiry. No synthetic result is reported as SQL permission proof.
- The author retained the complete local outbound inventory test's existing five-second timeout before and after its exact path correction. This reviewer inspected its unchanged guard and reran native refusal coverage, without raising its timeout or claiming a full local inventory pass. Linux CI must qualify that guard.

## Required composition and release checks

The trusted server authority still must independently verify signed embedded sessions, real lender/source/media standing and decoded provider responses. SQL `mode: embedded` alone is not a signature; app-runtime SQL credentials and arbitrary SQL access are trusted server capabilities, never browser authentication. This packet does not grant anonymous access or an anonymous-to-private context switch. Keep the new admission pool and real provenance verifier isolated, with no schema-shaped fixture used to implement them.

Fresh Quality should review these same pins next. The orchestrator must run repository-health closeout and canonical PostgreSQL CI before committing a qualified release claim. Keep provider writes disabled until actual wire/media evidence, worker/HTTP/UI composition, Marketplace permission disposition and deliberate spending confirmation are verified. No provider draft, publish, pause, purchase or deployment was performed.

## Reviewed pins

| File | SHA-256 |
| --- | --- |
| `packages/db/src/index.ts` | `b72e0a64e895feb66b04a530659c83699ee24cc6ddf072a675462c15c5003e37` |
| `packages/db/src/webinar-publisher-repository.ts` | `f39b17dd85cfe1ff897c47f2d0a2c02de90657b2736986d83ed36e807891fafb` |
| `packages/db/test/webinar-publisher-fixture.mjs` | `15276c06f8869e5585ac1616ac8856e1b2aa1f5422dc597e4403af36d599824f` |
| `packages/db/test/webinar-publisher-fixture.d.mts` | `a4f558eda7b06fde94b9b8f0cdb9053a2d328e0bdff8e153a56fdf57e3e9e168` |
| `packages/db/test/webinar-publisher-repository.test.mjs` | `f9d7785382924b6b38c0315514f7fc0bb0ef354043e2699798da3dcc5aa3f461` |
| `packages/db/test/webinar-publisher.integration.test.mjs` | `ba2e4a28dc8d79dddcbcb7f613d0db2728a023d2031510660938b855d6512f9c` |
| `supabase/migrations/20261014050000_webinar_publisher.sql` | `e5fca82c1869178e0d8c05bda8fa5de2220276c7dd0e4c7b55908b4125147a82` |
| `supabase/tests/webinar_publisher.pgtap.sql` | `c2653aca01994bf1ab80a11aa420497db476600c02c6e28bec3ddfeef3968c24` |
| `tooling/tests/unit/webinar-publisher/database.test.ts` | `6bb39b3d1236185d99d2f91f3c7bf0d40422b547eb30457b9885f734376ba2ee` |
| `tests/security/phase0-boundary.test.ts` | `24a9b1b4d0c1f4487dda8dd6e8c96234e7c9fdd97a98d731fee1f93c36fbab2a` |
| `supabase/tests/phase0_scaffold.pgtap.sql` | `150930696f8d9d5152800870e52b975d7e67930e65b6bddff1419f8bf8f9ef93` |
