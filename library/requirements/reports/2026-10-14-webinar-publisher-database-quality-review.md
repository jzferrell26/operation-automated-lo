# QA Report: webinar publisher database increment

**Plan document:** `library/knowledge/private/contracts/CTR-003-webinar-highlevel-publisher.md`, accepted revision 1
**Audit date:** 2026-10-14
**Base branch:** `origin/main`, with previously reviewed native adapter and command increments excluded from this new audit
**Head:** `876aa8f6c3f5d9a421dbcf60872233de48075b45` plus the frozen uncommitted database packet
**Auditor:** `/root/publisher_db_quality`, quality-guardian
**Assigned scope:** concrete database repository, separate admission capability, durable worker persistence APIs, assigned migration and exact inventory corrections

## Summary

**Blocked: one Critical lifecycle gap.** The scoped persistence implementation matches the accepted authority, immutable evidence, atomic reservation, admission and cancellation requirements, but an acknowledged publication can become `blocked/complete` at its deadline while provider delivery remains unobserved. Repair that source path, add actual PostgreSQL regression coverage and run fresh Security then Quality; this report establishes neither real SQL qualification nor completion of the remaining worker, HTTP, UI or provider work.

Security preceded this review. Its exact report SHA-256 is `d4a04d7ab2a4bae066bd6b1820c0209e468169469c81da6fe5f7131653e25c56`, and its reviewed source pins independently match this snapshot. The author handoff is `61aa2f140b5939b68e47b8bfed20ccf7fe230e12340318583ba1830568f1cc9f`; the separate inventory handoff is `0010a27ec1c4e1edd4e071539cb0a7118610b939ae9f520e6e57fbcf20c418c4`. Accepted CTR-003 revision 1 SHA-256 is `dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23`.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ⚠️ | Assigned APIs are present; deadline classification omits confirmed requests with unresolved delivery. Full consumers remain explicitly outside this increment. |
| Correctness | ❌ | Confirmed publish acknowledgement followed by unobserved progress can be finalized as blocked. |
| Alignment | ✅ | Additive accepted CTR-003 boundary, sole-owner internal authority, existing transaction pool, strict schemas and reserved migration ID. |
| Gaps | ⚠️ | Authored deadline case covers zero attempts only; acknowledged publish timeout needs a real PostgreSQL regression. |
| Detrimental | ✅ | No new broad grants, default verifier, synthetic production fallback, blind creation, raw-token persistence or threshold relaxation found. |

## Critical Issues (must fix)

- [ ] **Q-PUB-DB-01: deadline loses acknowledged publication uncertainty**: `supabase/migrations/20261014050000_webinar_publisher.sql:412-418`, with the reachable acknowledgement transition at `:470` and attempt confirmation at `:483-487`.

  CTR-003 section 5.6 (`CTR-003-webinar-highlevel-publisher.md:125`) explicitly requires a publish acknowledgement to remain `publish_queued` until observation and exhausted polls to leave truthful pending/uncertain state. Section 5.7 requires applied publish/pause/resume to be observed rather than replayed. The SQL deadline predicate counts only attempts whose status is not `confirmed`. A successful publish acknowledgement records its attempt as confirmed and advances to `progress/publish_queued`; without a later observation, the deadline branch therefore chooses `blocked`, `complete`, `EVIDENCE_CHANGED` and `active=false`. This is a source-level control-flow finding, not a claimed PostgreSQL reproduction or evidence that a live ad was launched.

  ```sql
  select exists(select 1 from campaign.webinar_publisher_attempts
    where location_id=o.location_id and operation_ref=o.operation_ref
      and status<>'confirmed') into has_effect;
  if o.deadline_at<=clock_timestamp() then
    -- false selects blocked/complete although publish delivery is still unknown
    update campaign.webinar_publisher_operations set active=false,lease_expires_at=null,
  ```

  Suggested remediation: distinguish unresolved provider effect/delivery from an unconfirmed transport response. Preserve truthful pending or uncertain status, confirmed IDs, observation freshness and reconciliation visibility when acknowledged publish/pause/resume has not been resolved. Preserve finite work budgets and fencing; do not fix this by extending the deadline, pretending the provider failed, or repeating the mutation.

  Required regression for the original author: in the disposable PostgreSQL fixture, seed or establish an owned draft-ready launch with confirmed native IDs, reserve an exactly confirmed publish command, claim it, record its dispatch and checkpoint the decoded acknowledgement to `progress/publish_queued`. Use only the existing privileged disposable fixture to establish an expired deadline before insertion, or an appropriately bounded real deadline path; do not weaken the immutable deadline trigger. With no separately admitted delivery observation, exercise the deadline and assert that launch and operation remain pending/uncertain, confirmed IDs and original command/attempt identity remain readable, no provider-failed or evidence-withdrawn outcome is invented, no repeat publish is permitted, and reconciliation/explicit owned pause can be pursued. Add corresponding acknowledged pause/resume timeout cases. Retain the zero-dispatch deadline case, which should still block finite queued work.

  Existing `packages/db/test/webinar-publisher.integration.test.mjs:276-312` checks an expired draft with zero attempts. It cannot detect this acknowledged-publication branch. A source repair invalidates the current Security and Quality pins and requires fresh closeout.

## Warnings (should fix)

None beyond the Critical finding. Runtime qualification limitations below are explicit outstanding checks, not reported as successful implementation evidence.

## Suggestions (consider improving)

None.

## Plan Item Traceability

This table covers every assigned persistence obligation from CTR-003 and the parent brief. Other contract parties are listed explicitly as outside this increment; no full-contract acceptance is inferred.

| # | Plan Requirement | Status | Implementation Location | Notes |
| --- | --- | --- | --- | --- |
| DB-01 | Current authenticated sole owner; reject synthetic/foreign identity | ✅ | `packages/db/src/webinar-publisher-repository.ts:235-257,310-324`; SQL `:142-166` | Required trusted resolver plus actual active owner/version/installation/session rows. Embedded signature verification remains the resolver's responsibility. |
| DB-02 | Recheck current authority before work and before commit | ✅ | Repository `:310-324,411-421,433-452` | Principal comparison and retained SQL locks; no historic serialized role used alone. |
| DB-03 | Current owned immutable campaign/version, passing preflight, sole-owner decision and publication standing | ✅ | Repository `:330-339,411-412`; SQL `:168-197,302-307,446-452` | Source registry/raster/lender standing is an explicit required trusted port; not fabricated in this packet. |
| DB-04 | Exact server-admitted selection and location/account/page binding | ✅ | Repository `:342-355`; SQL `:234-243` | Admission validity and actual stored HighLevel location checked. |
| DB-05 | Immutable projection/summary and canonical integrity | ✅ | Repository `:260-274,356-370`; SQL `:101-126,245-258` | Summary and projection hashes reconstructed; exact source identity retained. |
| DB-06 | Tenant/actor/request UUID identity, different-content conflict and exact confirmed replay | ✅ | Repository `:372-407`; SQL `:260-290`; existing command `packages/application/src/webinar-publisher-command.ts:527-563` | Existing command revalidates current evidence/capability before duplicate success; reserve reconstructs confirmation and normalized request. |
| DB-07 | CAS and one active lineage | ✅ | SQL `:73,293-301,311-324` | Partial uniqueness and current native IDs/state/row checks. Real concurrency execution is pending. |
| DB-08 | Atomic immutable command and strict separate outbox | ✅ | SQL `:278-279,321-324`; repository `:280-296` | Same SERIALIZABLE transaction; no tokens/source content in task. |
| DB-09 | Current paid authority for new spend; pause/cancel survive expired creative/entitlement | ✅ | SQL `:204-214,302-310,446-455` | Stop control uses exact independent pause proof. |
| DB-10 | Trusted artifact admission separate from ordinary runtime and browser input | ✅ | Repository `:117-148,179-183,566-603`; SQL `:328-349,386-388` | Required verifier and separate pool; NOLOGIN role receives no login membership or runtime grants. |
| DB-11 | Exact current qualification for wire, assets, UTC stop and budget | ✅ | SQL `:352-383`; repository `:456-470` | Missing/expired/revoked/synthetic proof refuses. Actual wire qualification remains unrun. |
| DB-12 | Bounded pending tasks and fenced lease with current lineage/cancellation | ✅ | Repository `:476-512`; SQL `:223-231,395-443` | Limit 50, lease 1 to 60 seconds, generation and exact task identity. |
| DB-13 | Record unique operation-stage attempt before possible dispatch | ✅ | Repository `:513-535`; SQL `:444-458,86-98` | Required dispatch authority, actual current SQL evidence and unique durable attempt. Consumer must commit before sending. |
| DB-14 | Checkpoint exact worker/generation/stage, confirmed parent IDs and independently decoded response | ✅ | Repository `:537-548`; SQL `:441-443,464-500` | No arbitrary parent replacement; required response verifier and separate observation admission. |
| DB-15 | Lost/invalid response remains uncertain; no blind repeated creation | ✅ | Repository `:550-561`; SQL `:426-434,459-463` | Replacement worker reconciles unresolved dispatch; unique stage attempt prevents repeated mutation. |
| DB-16 | Acknowledgement is queued, live requires actual linked observation and IDs | ✅ | SQL `:470,489-494`; repository observation schema `:82-113` | Live admission requires distinct native and Facebook IDs; unavailable metrics stay null. Deadline exception is DB-17. |
| DB-17 | Exhausted poll/deadline retains truthful pending/uncertain delivery | ❌ | SQL `:412-418,470,483-487` | Q-PUB-DB-01. Confirmed acknowledgement currently removes the ambiguity predicate. |
| DB-18 | Cancel before send and during possible write fences old workers and never claims remote recall | ✅ | SQL `:311-319,411,430-434` | Original identity/attempt history remains; possible remote effect becomes uncertain. |
| DB-19 | Expand-only reserved migration and private RLS/function capability | ✅ | SQL `:1-7,128-138,386-388,509-510` | Five new tables; no new broad ordinary table privileges. |
| DB-20 | Exact scaffold and outbound inventory without guard weakening | ✅ | `supabase/tests/phase0_scaffold.pgtap.sql:3,94-103`; `tests/security/phase0-boundary.test.ts:107-109` | 31 to 36 tables; five named assertions; plan 22 to 27; one exact reviewed transport path. Scanner/timeouts unchanged. |
| DB-21 | Meaningful adapter, actual SQL and permission/race tests | ⚠️ | `tooling/tests/unit/webinar-publisher/database.test.ts`; `packages/db/test/webinar-publisher.integration.test.mjs`; `supabase/tests/webinar_publisher.pgtap.sql` | 34 adapter cases independently pass; 15 SQL cases and 24 pgTAP assertions authored but locally unrun; acknowledged-deadline regression missing. |
| NG-01 | Preserve CTR-002 manifest and default-disabled provider traffic | ✅ | New repository/migration and exact inventory diff | No approved manifest, native transport, provider flag or previous contract edited. |
| NG-02 | No customer role management, second reviewer, direct Meta or deletion | ✅ | Repository authority and migration capabilities | Internal infrastructure roles remain internal. |
| NEXT-01 | Real provenance verifier, signed session and actual lender/media/provider admission | 🟦 | Repository required authority/verifier ports | Next composition work; fixture verifier does not qualify release. |
| NEXT-02 | Executing durable worker, polling/backoff, automatic withdrawal pause | 🟦 | Persisted APIs only | No consumer, watcher or scheduler completion claimed. |
| NEXT-03 | HTTP/UI actions, exact spend confirmation journey and truthful reporting | 🟦 | Existing command boundary only | Not implemented by this database packet. |
| NEXT-04 | Provider App Test, Marketplace permission, deployed migration and live spend | 🟦 | Contract release obligations | No provider/deployment action performed or authorized by this source review. |

## Files Changed

The broader `origin/main...HEAD` diff contains prior independently reviewed increments. New audit scope is the following eleven frozen source/test files only; prior baseline images, root ledger, contracts and reports were read where necessary and not edited.

- `packages/db/src/index.ts` (M): additive repository/admission API exports.
- `packages/db/src/webinar-publisher-repository.ts` (A): concrete command repository, mandatory authority, admission service and worker persistence APIs.
- `packages/db/test/webinar-publisher-fixture.d.mts` (A): typed synthetic fixture declarations.
- `packages/db/test/webinar-publisher-fixture.mjs` (A): labeled synthetic normalized and actual SDK source/approval fixture.
- `packages/db/test/webinar-publisher-repository.test.mjs` (A): three connectionless identity/discovery tests.
- `packages/db/test/webinar-publisher.integration.test.mjs` (A): fifteen disposable PostgreSQL cases, locally unrun.
- `supabase/migrations/20261014050000_webinar_publisher.sql` (A): five private persistence tables, immutable identities, finite command/admission/worker functions.
- `supabase/tests/phase0_scaffold.pgtap.sql` (M): root-owned exact five-table inventory extension with all existing assertions retained.
- `supabase/tests/webinar_publisher.pgtap.sql` (A): twenty-four privilege, RLS, capability and uniqueness assertions, locally unrun.
- `tests/security/phase0-boundary.test.ts` (M): exact independently reviewed native transport inventory addition.
- `tooling/tests/unit/webinar-publisher/database.test.ts` (A): thirty-four adapter and strict-boundary cases.

### Independent verification and limits

- Selected real root Vitest unit configuration: **228 tests passed across four files**, comprising 34 database, 86 command, 78 native adapter and 30 webinar foundation cases. No timeout, threshold, skip or configuration was changed.
- `node --test packages/db/test/webinar-publisher-repository.test.mjs`: **3 passed**, zero skipped. This confirms actual test discovery separation and strict identity/admission behavior, not SQL privileges.
- `pnpm --filter @oalo/db typecheck` and `pnpm exec tsc --noEmit -p tsconfig.tooling.json`: passed. `git diff --check`: passed.
- All eleven source SHA-256 values match Security and handoff independently. The accepted contract and three review/handoff hashes above also match.
- Focused coverage figures (96.71% statements, 90.32% branches, 100% functions, 97.26% lines) are retained author evidence, not a separately rerun coverage claim. These passing adapter tests cannot exercise the new PL/pgSQL deadline branch.
- The full local outbound inventory scan's retained five-second timeout is not a local pass. Linux source CI must qualify the exact path correction without relaxing its guard.
- Docker/PostgreSQL was unavailable locally. No new migration/pgTAP/race case was executed by this reviewer. Prior CI at `876aa8f` included the old migrated database suite only and cannot qualify this uncommitted migration. Canonical disposable PostgreSQL CI remains required after repair and fresh closeout.
- No Git mutation, source change, provider request, token operation, purchase, live spend or deployment was performed. Only this assigned report was authored.

### Reviewed source pins

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
