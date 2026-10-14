# QA Report: Customer-domain server subset

**Plan document:** `library/requirements/in-work/prd-010-campaign-recovery/custom-domain-onboarding.md`
**Scoped assignment:** `DOMAIN_COMPLETION_LEDGER.md:16-28`
**Audit date:** 2026-10-14
**Base branch:** `origin/main`, reviewed combined increment `82cf5a2` and reused PR87 primitives
**Head:** `codex/domain-completion`, `6b7afbeca41c66f3c271ca28e5145f904b3c714c` plus the 18 frozen source files below
**Auditor:** quality-guardian

## Summary

PASS for the assigned server source subset, with no Critical, Warning or Suggestion findings. Independent review verified principal-bound commands, exact TXT proof, compare-and-swap lifecycle, fixed provider scope, hostname-bound publication reads and same-origin visitor submissions; 90 focused tests and eight existing independent actual-handler probes passed, and web/tooling type checks passed. This is a source handoff only: the new migration and six PostgreSQL/11 pgTAP cases remain unexecuted here, while guided setup UI, automatic rechecks, hostname-root routing and an owned-host visitor journey remain pending.

### Ordering and verification

Fresh Security preceded this audit. Its report `library/requirements/reports/2026-10-14-domain-server-security-review.md` matches SHA-256 `8d9ce4002dca93f5ac92931754c9a68b4b06b5497388915e8941927e216fc843`, reports no findings and pins this exact 18-file snapshot. The root-transcribed source handoff `2026-10-14-domain-server-handoff.md` matches `8aff479172ed14d8d0ed30344990051617b33553301d80268f004e9a8531c4bc`. All 18 hashes matched before verification and were rechecked at release.

Independent commands executed serially:

- `pnpm exec vitest run --project unit --maxWorkers=2 apps/web/src/features/domains/model.unit.test.ts apps/web/src/server/funnel-domain-provider.unit.test.ts apps/web/src/server/funnel-domain-store.unit.test.ts apps/web/src/server/funnel-domain-routing.unit.test.ts apps/web/src/proxy.domains.unit.test.ts apps/web/src/server/funnel-public.unit.test.ts apps/web/src/server/funnel-handler.unit.test.ts apps/web/src/server/funnel-delivery.unit.test.ts apps/web/src/proxy.unit.test.ts apps/web/src/proxy.shared-report.unit.test.ts apps/web/src/server/authenticated-principal.unit.test.ts`: **90 passed, 11 files**.
- `pnpm exec vitest run --config test-results/security-domain-server/probe.config.ts`: **8 passed, 1 file**. This reviewer independently reran the Security-authored probes; these are not eight newly authored Quality cases.
- `pnpm --filter @oalo/web typecheck`: **PASS**.
- `pnpm exec tsc --noEmit -p tsconfig.tooling.json`: **PASS**.
- `git diff --check`: **PASS** before report authoring and at release.

Ignored evidence is under `test-results/quality-domain-server/`: `source-pins.json`, `focused-tests.log`, `handler-probes.log`, `web-types.log` and `tooling-types.log`. The probes exercise real HTTP/proxy entry points with refused requests; they do not substitute a database and do not qualify successful durable writes. The focused lifecycle tests use in-memory CAS/provider fixtures. Production PostgreSQL authority and concurrency need the actual database cases.

The handoff's author-run build and 67-case results and Security's scanner/audit results remain attributed to those reviewers. This audit did not execute a whole application build, full coverage run, database migration, live provider call, DNS change, browser journey or deployment. Parent CI success at `82cf5a2` does not validate this new migration. No whole FUN criterion, PRD, project or hosted completion is claimed.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | PASS within assigned source subset | Commands, store, provider, routing consumers and additive migration/test source are present. Full domain feature remains partial. |
| Correctness | PASS for inspected source and executed seams | 90 tests, eight probes and two type checks passed. Real database behavior is unqualified. |
| Alignment | PASS | Exact owner, fixed provider scope, current-host checks, immutable publisher ownership and sole-LO controls agree with the plan. |
| Gaps | Explicit pending consumers and execution gates | Guided UI, autonomous recheck, root default redirect, setup timing, actual PG/pgTAP and owned-host qualification remain open. |
| Detrimental Patterns | None found in scope | No caller-selected tenant, invented DNS target, browser credential, source weakening or new role-management surface found. |

## Critical Issues (must fix)

None in the assigned source subset. Pending database/runtime gates prevent declaring the entire domain feature shipped.

## Warnings (should fix)

None in the assigned source subset. The incomplete criteria below are declared remaining work, not waived requirements.

## Suggestions (consider improving)

None.

## Plan Item Traceability

Source-plan coordinates refer to `custom-domain-onboarding.md`; ledger rows define the implemented subset.

| # | Plan Requirement | Status | Implementation Location | Notes |
| --- | --- | --- | --- | --- |
| FUN-005/server | Saved, publisher-specific claim and strict setup commands | PASS, source | `apps/web/src/features/domains/model.ts:16-115`; `apps/web/src/server/funnel-domain-http.ts:24-74`; `apps/web/src/server/funnel-domain-store.ts:36-102` | Hostnames are normalized and bounded; caller state/tenant/challenge fields are rejected. Challenges and revisions are server-generated. GET derives owner from the authenticated principal; synthetic mutation is refused. |
| Authority-13 | Exact signed-in publisher TXT proof, even if hosting provider already verifies the hostname | PASS, source | `apps/web/src/server/funnel-domain-provider.ts:142-150`; `apps/web/src/server/funnel-domain-store.ts:111-129` | Application proof precedes claim and provider attachment. TXT parts must join to the exact application challenge. Missing and uncertain DNS yield different persisted states. |
| FUN-006/claim | No global pending reservation; one proved current owner; immutable tenant/user binding | PASS, source; DB pending | `supabase/migrations/20261014060000_funnel_domains.sql:17-27`, `:33-75` | Pending rows have claimed=false. Partial unique index and hostname advisory lock serialize proved claims. Owner context, active bindings, row locks and expected revision are repeated inside SQL. Actual parallel race test is authored but unrun. |
| Authority-15/provider | Dedicated server token and explicit project/team; no transfer, purchase, nameserver/MX change or redirect overwrite | PASS, source | `apps/web/src/server/funnel-domain-provider.ts:14-25`, `:110-195` | Fixed API host and GET/POST project-domain operations only. Existing project/name/branch/redirect/environment conflicts refuse. No live account evidence. |
| Authority-15/DNS | Current recommended records; ownership, routing and certificate states remain separate | PASS, source | `apps/web/src/server/funnel-domain-provider.ts:191-222`; `apps/web/src/server/funnel-domain-store.ts:120-133` | Ranked provider recommendations supply A/CNAME values. Uncertain outcomes persist attention and deny readiness. UI presentation of these instructions remains pending. |
| Authority-15/TLS | Public address qualification, original SNI, certificate verification and no credentials | PASS, source | `apps/web/src/features/domains/model.ts:119-136`; `apps/web/src/server/funnel-domain-provider.ts:73-107`, `:224-246` | Both DNS families are checked for unsafe answers. TLS uses the previously resolved IPv4 address with original SNI and a bounded socket timeout. Synthetic tests are not a certificate test on a live hostname. |
| FUN-006/public | Unknown, stale, disconnected or foreign owner cannot obtain funnel publication or private pages | PASS, source; DB pending | `apps/web/src/server/funnel-domain-routing.ts:31-94`; `apps/web/src/proxy.ts:36-50`, `:88-94`; `supabase/migrations/20261014060000_funnel_domains.sql:87-105` | Private routes refuse before rendering, including prefetch and former asset exclusions. Public content reads repeat exact current claim and immutable publication location/user checks. Proxy is not the content authorization boundary. |
| FUN-004/FUN-009/host | Actual Host supplies public read authority; origin-matching visitor submission and current owner acceptance | PASS, source; successful DB submission pending | `apps/web/src/app/(public)/f/[id]/[[...step]]/page.tsx:18-28`; `apps/web/src/server/funnel-public-http.ts:128-211`; `apps/web/src/server/funnel-public-store.ts:133-177`; `supabase/migrations/20261014060000_funnel_domains.sql:106-113` | Forwarded-host/tenant hints are not authority. Customer POST requires its exact origin and hostname. SQL locks the claim through acceptance and delegates to existing encrypted inquiry capability. |
| Authority-13/platform | Preserve platform URLs, immutable snapshot, existing authentication, encrypted capture and receipts | PASS, inspected diff and legacy tests | `apps/web/src/server/funnel-public-http.ts:145-155`, `:177-211`; `apps/web/src/server/funnel-public-store.ts:85-130`; `apps/web/src/proxy.ts:51-85` | Canonical-origin callers retain existing read/accept capabilities. Encryption, consent/receipt hashing and receipt validation are preserved in the diff; existing public/delivery/auth/proxy tests passed. No new live HighLevel delivery proof. |
| Authority-17/disconnect | Immediately stop local routing, independent of provider configuration; stale network check cannot undo it; new connection gets fresh proof | PASS, source; DB pending | `apps/web/src/server/funnel-domain-http.ts:47-52`; `apps/web/src/server/funnel-domain-store.ts:104-135`; `supabase/migrations/20261014060000_funnel_domains.sql:53-63` | Disconnect occurs before provider availability check. CAS refuses late finish. Server reconnect generates a fresh random challenge. Six actual PG cases cover durable claim, race, disconnect, role/caller fields, expiry and exact-owner inquiry/receipt. |
| Authority-17/export | Existing revocation and inquiry export retain their provider-independent path | Preserved source boundary | Public HTTP/store diff and existing delivery tests | This packet adds no provider dependency to the existing export/revocation handlers. A custom-domain export browser journey was not run. |
| Authority-17/recheck | Bounded autonomous recheck schedule | PARTIAL, pending consumer | `supabase/migrations/20261014060000_funnel_domains.sql:62-82`; `apps/web/src/features/domains/model.ts:5-6` | Cooldown, ready/ownership expiry and nextCheckAt exist. No automatic scheduler/worker exists in this packet; timestamps are not evidence of executed rechecks. Manual checks cannot silently renew expired proof. |
| FUN-005/FUN-008/UI | Guided Settings Domains, enter hostname, instructions, accessible retry/disconnect and saved reload | PENDING | `DOMAIN_COMPLETION_LEDGER.md:21`; plan `:9`, `:21` | Server route is wired; guided UI and actual browser proof are outside this source packet. No new customer role management is introduced. Existing creator compatibility does not imply multiple-LO onboarding. |
| Default hostname | Default kind at customer hostname root | PENDING | `apps/web/src/server/funnel-domain-routing.ts:54-71` | defaultKind is persisted, but root path is currently refused. No hostname-root redirect is implemented. |
| FUN-011 | Honest setup timing separated from DNS/hosting propagation | PENDING | `DOMAIN_COMPLETION_LEDGER.md:22` | Needs the guided flow and measured browser evidence. |
| Completion-21/tests | Cross-tenant/stale/unverified/disconnect/SSRF and actual runtime tests | PARTIAL | Unit/probe commands above; `apps/web/src/server/funnel-domains.postgres.test.ts`; `supabase/tests/funnel_domains.pgtap.sql` | 90 unit and eight handler probes passed. Six actual PG and11 pgTAP assertions were inspected, but neither was run here. Root must execute them against the migrated actual database in CI. |
| Completion-21/hosted | Owned hostname publication, synthetic visitor, receipt and follow-through | PENDING external qualification | `DOMAIN_COMPLETION_LEDGER.md:24`; plan `:21` | Provider configuration or synthetic TLS is insufficient. No live DNS/TLS/visitor claim. |
| Access-25 | Respect access/provider constraints and source ownership | PASS for this audit | Scope and source hashes below | Historical access problems are not current environment assertions. No source edits, provider effects, migrations, commits or deployment occurred. |

## Files Changed

The audited packet contains the following 18 source/test files. M means modified from frozen HEAD; A means an untracked addition in the supplied snapshot. Each was inspected directly or through its relevant consumer/test seam.

- `apps/web/src/app/(public)/f/[id]/[[...step]]/page.tsx` (M): Actual Host supplied to the public snapshot consumer.
- `apps/web/src/app/api/funnel-domains/route.ts` (A): Node runtime GET/POST handler wiring.
- `apps/web/src/features/domains/model.ts` (M): Strict claim/state model, freshness and public-address qualification.
- `apps/web/src/features/domains/model.unit.test.ts` (M): Model and hostile-input coverage.
- `apps/web/src/proxy.domains.unit.test.ts` (A): Private-host/prefetch refusal and platform security preservation.
- `apps/web/src/proxy.ts` (M): Domain authority and path refusal before nonce/CSP response.
- `apps/web/src/server/funnel-domain-http.ts` (A): Principal-bound lifecycle API and safe error mapping.
- `apps/web/src/server/funnel-domain-provider.ts` (M): Fixed-scope API, exact DNS proof and address-pinned TLS.
- `apps/web/src/server/funnel-domain-provider.unit.test.ts` (A): Provider recommendations, conflicting destinations and unsafe addresses.
- `apps/web/src/server/funnel-domain-routing.ts` (A): Exact actual authority, finite public paths and current binding reader.
- `apps/web/src/server/funnel-domain-routing.unit.test.ts` (A): Host/path/disabled-routing checks.
- `apps/web/src/server/funnel-domain-store.ts` (A): Principal-bound SQL store, challenges and CAS check progression.
- `apps/web/src/server/funnel-domain-store.unit.test.ts` (A): Check states and concurrent-disconnect fixture.
- `apps/web/src/server/funnel-domains.postgres.test.ts` (A): Six actual database lifecycle/owner/receipt cases, unexecuted.
- `apps/web/src/server/funnel-public-http.ts` (M): Current-host read and visitor submission integration.
- `apps/web/src/server/funnel-public-store.ts` (M): Three domain capabilities and owner-bound public reads.
- `supabase/migrations/20261014060000_funnel_domains.sql` (A): Owner claims, forced RLS, CAS and exact-owner public SQL capabilities.
- `supabase/tests/funnel_domains.pgtap.sql` (A): Eleven schema/privilege assertions, unexecuted.

Root-owned ledger, source handoff and preceding Security report were read only. This reviewer authored only this Quality report and ignored verification artifacts. Source, tests, plan, ledger, configuration and baselines were not changed. Commit, current-main ancestry/mergeability, actual CI and release decisions remain with root.

### Frozen source pins


| Path | SHA-256 |
| --- | --- |
| apps/web/src/features/domains/model.ts | f0d9de4c4a2c74b2e0e889ec098d9116298f1f98c2dcdc9028ff79fad28ea892 |
| apps/web/src/features/domains/model.unit.test.ts | 46a91a06d44b1c7d6c6a7de5b5117026808460bf6b0010f6e1cdba926d122193 |
| apps/web/src/server/funnel-domain-provider.ts | 6285b349935133927283c8a8c46860aa5a7d4f82859619c02a69fcb80b75d279 |
| apps/web/src/server/funnel-domain-provider.unit.test.ts | d5df298916285b308db1cfe3f3edaab64c08a104c76474c7428018247488aebe |
| apps/web/src/server/funnel-domain-store.ts | fbdd97fd032a4f4fb630f6986a6d42db3488f739f132b0c2e5ae1c5112493e92 |
| apps/web/src/server/funnel-domain-store.unit.test.ts | a47ca5a44e5e28a7058fa69756f08a227c22e41d57f9e111206231e35c94c50f |
| apps/web/src/server/funnel-domain-http.ts | 2117ca07fbbe81b8d47e78e473fa779595777e51cfee58a0ce5d8cb41717f1c4 |
| apps/web/src/server/funnel-domain-routing.ts | 646c32155c7c65d4344f95613c01180579fc55d5ffe1fb8f0e791e069072218e |
| apps/web/src/server/funnel-domain-routing.unit.test.ts | 37342048ee76622ecf35089109fa0a02bea799deed98490273d822f297dccf87 |
| apps/web/src/server/funnel-domains.postgres.test.ts | 29f6e2d7bd2818a08d8dfc366545bb530c5b1e78dc3bf49335f27453a1888337 |
| apps/web/src/server/funnel-public-store.ts | 013836eeb96f8673fdcaffb3a3d62d0c27c0798ada7acb87a51384e324207360 |
| apps/web/src/server/funnel-public-http.ts | f7f96ab84d6465339fbd2219b39def27427e017eccddc4a7f998e45d4fe9b7d2 |
| apps/web/src/proxy.ts | f5fb924e00d8a4d71220f1f990eef8f14ceab3c3d1eadab939482ea5d15f3782 |
| apps/web/src/proxy.domains.unit.test.ts | 50627fa3cb2fe870f8fb081fa421cc896b6dd9964f9f73842577e7e13ef639b6 |
| apps/web/src/app/api/funnel-domains/route.ts | e36802c36661b9d515d084ef19b9e51ca38a2931bbc9160d79c924fbad948b3d |
| apps/web/src/app/(public)/f/[id]/[[...step]]/page.tsx | a75362ba56cf9b622fba9fe89b0cec05ffb83f0d2cd67f080c26d2f382c0fb92 |
| supabase/migrations/20261014060000_funnel_domains.sql | a8c2f463a5a9289601a780b3e919b3109d8b72b99d750f5f4169d9d7a2b391cd |
| supabase/tests/funnel_domains.pgtap.sql | ac043996cb3c28cbf5e3da83d4fe52719d8320edda1ef8415890fb646928b300 |
