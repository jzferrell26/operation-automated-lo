# Customer domain server Security review

Date: 2026-10-14. Reviewer: `/root/publisher_command_security`, security-guardian. Worktree: `codex/domain-completion`. Base HEAD: `6b7afbeca41c66f3c271ca28e5145f904b3c714c`.

## Executive summary

**PASS for fresh scoped Quality of this exact 18-file server packet.** No Critical, High, Medium or Low vulnerability was demonstrated in the reviewed source. The review covers domain lifecycle/provider/routing, the authenticated domain API, independent public publication/inquiry binding, the additive migration, and its authored database tests. No source remediation was needed or performed.

This source assessment does not establish actual PostgreSQL execution, real DNS/TLS/provisioning, a deployed host, or complete customer setup. Six actual PostgreSQL cases and 11 pgTAP checks are authored and inspected but locally unrun because the database runtime is unavailable; canonical CI must execute them before release. Guided setup UI, an autonomous recheck consumer and hostname-root redirect remain future increments. Source inspection does not replace those consumers or hosted qualification.

The managed CVE watchlist is dated 2026-04-24, more than 120 days old. Refresh its intelligence through the Guild owner. A fresh production registry audit returned no advisories. No domain-specific Quality report existed at entry; inherited reports cover earlier packets and are not treated as review of these edits.

## Scope and authority

Read the managed security-weapon/configuration, domain product plan, root ledger, complete source/test packet, additive migration and pgTAP test, existing authentication/mutation gate, public encryption/receipt functions and proxy behavior. Root's transcribed handoff independently matches SHA-256 `8aff479172ed14d8d0ed30344990051617b33553301d80268f004e9a8531c4bc`. Every one of its 18 source pins matches current bytes, recorded below. Its claimed build and focused test results remain attributed author evidence; independent executions are listed separately.

No dependencies, package scripts, framework configuration, existing encryption/key derivation, publication snapshots or HighLevel delivery adapter were changed. The base contains the reused PR87 primitives. No domain/provider calls, purchases, DNS changes, deployment or migration execution were performed during this review.

## Scorecard

| Category                                | Result                            | Findings                                                                                                                    |
| --------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Financial and inquiry handling          | OK in scope                       | None detected; existing encrypted inquiry, receipt and consent path retained                                                |
| PII and secret exposure                 | OK in scope                       | None detected; provider token remains server configuration, safe errors and owner-scoped challenges                         |
| Authentication and tenant authorization | OK in source                      | None detected; independent API principal/CSRF and exact publication/domain owner checks                                     |
| Injection, host spoofing and SSRF       | OK in scope                       | None detected; strict host/command shapes, fixed provider host/project/team, public address checks and pinned TLS           |
| Dependency security                     | OK current registry               | Zero production advisories; package/lock bytes unchanged                                                                    |
| Configuration and headers               | OK in source                      | Exact customer path restriction runs for static/prefetch requests too; existing nonce and public no-store behavior retained |
| Database/race handling                  | Source inspected, runtime pending | RLS/grants, ownership uniqueness, CAS, expiry and capture locks inspected; actual database checks not executed locally      |

## Critical findings

None detected in the assigned packet.

## High findings

None detected in the assigned packet.

## Medium findings

None detected in the assigned packet. Stale vulnerability intelligence and unfinished release consumers are explicit qualification limits, not invented newly exploitable findings.

## Low findings

None detected in the assigned packet.

## Security evidence and limits

### Principal, mutation and lifecycle

`apps/web/src/server/funnel-domain-http.ts:31` independently resolves an authenticated read or mutation principal using the existing runtime session infrastructure. Mutations go through the existing exact browser host/origin and session CSRF checks; caller tenant/role hints are not authentication. Synthetic principals cannot mutate and receive only an unavailable empty read projection at `:35`. Mutation permission is rechecked at `:42`; strict JSON content type and 2,000-byte bounded parse precede command execution at `:44`. Errors use finite safe codes at `:65`, not provider response bodies, tokens or stacks. Responses are private/no-store. Disconnect executes before provider-configuration eligibility, so a provider outage does not prevent local removal.

`apps/web/src/features/domains/model.ts:17` restricts customer input to normalized finite hostnames, excluding URLs, path syntax, IPs, wildcards and reserved/local/platform host suffixes. The browser command cannot supply challenge, claimed/ready state, tenant or provider scope. `apps/web/src/server/funnel-domain-store.ts:85` creates server UUIDs and a fresh cryptographically random 32-byte challenge, with a 72-hour expiry and no immediate claimed state.

The lifecycle at `funnel-domain-store.ts:105` reserves a current revision before network work, proves the exact server-issued TXT record before claim or provider attachment, then separately checks hosting, DNS and certificate. Missing ownership never attaches the domain. Missing or uncertain checks persist an ineligible state. Every persisted step uses the latest revision; a concurrent disconnect conflict propagates rather than restoring ready state. Network operations occur outside database transactions, preserving bounded lock ownership. Repeated checks have the persisted 30-second cooldown. Autonomous renewal is not implemented; the SQL refuses readiness after the proof expires even when a next-check timestamp is retained.

### Provider and SSRF boundary

`apps/web/src/server/funnel-domain-provider.ts:14` requires explicit server-held credential, fixed project/team IDs and explicit feature enablement. `:120` sends only GET/POST to `https://api.vercel.com`, with an eight-second signal, no-store, redirect refusal and a 64,000-byte response limit. It never derives the provider base or project from customer input.

`:142` checks `_automatedlo.<exact host>` and requires an exact joined TXT value. DNS absence is distinguished from uncertain DNS failure. `:152` reads the existing project domain before adding a missing one, and validates both initial and post-verify host/project identity. Redirect, branch or custom-environment destinations refuse; no transfer, force move, domain purchase, DNS/MX edit or deletion endpoint is present. Verification refusal retains actual provider TXT instructions. Routing values use actual current provider recommendations; no remembered CNAME is substituted. These injected wire tests do not qualify the provider response schema against a real account.

`:224` resolves both A and AAAA answers, refuses mixed private/special addresses, and invokes TLS only after qualification. IPv4 excludes private, loopback, link-local, carrier NAT, reserved/documentation/benchmark and multicast ranges. IPv6 is restricted to accepted global-unicast syntax and rejects the listed transition/special blocks; mapped IPv4, local/link-local and documentation values refuse. The actual TLS connector at `:89` connects to the already resolved public IPv4 on 443 with original hostname SNI, `rejectUnauthorized: true`, a three-second socket timeout and socket cleanup. No second hostname lookup, HTTP request or credential is sent to the customer address. The unit test proves the exact original-host/public-address invocation; it does not establish a live certificate outcome.

### Customer host and public inquiry

`apps/web/src/server/funnel-domain-routing.ts:35` uses actual URL authority and compares the Host header when present. Forwarded-host and caller tenant headers do not choose an owner. Only the configured canonical platform origin gets platform routing; custom hosts require explicit enablement, HTTPS, no nonstandard port and normalized hostname. Its path allowlist at `:57` permits only the finite `/f/<UUID>` journey, narrowly scoped static/hero/favicon paths and the exact inquiry POST. Auth/dashboard/private/report paths refuse.

`apps/web/src/proxy.ts:35` applies this restriction before issuing a response on customer hosts. The matcher includes all paths at `:88`, removing prior static-extension and prefetch exclusions. An existing authenticated cookie or spoofed forwarding header cannot make a private customer-host path render. Public path admission alone does not authenticate a publication; the actual consumers repeat owner authorization in SQL. Existing platform CSP nonce behavior and public no-store/referrer controls remain.

The public page supplies the actual Host header to `publicSnapshot`. `apps/web/src/server/funnel-public-http.ts:128` reconstructs only a validated authority and requests an owner-bound snapshot on custom hosts. `handleVisitor` at `:161` derives actual origin, requires the matching Origin header and bounded strict visitor JSON, and selects the domain-specific acceptance capability. Platform origin cannot authorize a customer-host POST. A customer host cannot supply a tenant through the visitor schema. Existing encryption, request-bound receipt and consent derivation remain unchanged, and errors remain sanitized. Public inquiry requests need no authenticated LO session, as intended; they still require current public publication and domain owner eligibility.

### Database source and authored race tests

`supabase/migrations/20261014060000_funnel_domains.sql:23` enables and forces RLS. Runtime has owner-scoped SELECT only on the new table, with no direct INSERT/UPDATE grant. Security-definer functions use empty search paths, revoke PUBLIC execution, and grant only the server runtime. Browser roles cannot invoke claim commands or read challenges.

The command at `:36` verifies active current location/user and unrevoked allowed internal binding. Tenant and actor IDs come from current server transaction context, not command input. Per-owner serialization and one active owner-row index prevent parallel connections for the same LO. Pending claims have no global hostname uniqueness; the separate claimed-host index at `:21` and advisory lock at `:68` serialize actual ownership. Claiming clears only expired prior owners and refuses a still-current foreign owner. All network-result writes enforce row revision and disconnected state at `:57`. Disconnect clears claimed/ownership/readiness in the same row update. A new later connection uses a new challenge. Challenge and ownership freshness are bounded at 72 hours.

Public binding at `:89` checks current domain claim, readiness, expiry, location/user activity and unrevoked role. Snapshot at `:98` compares both location and user against the immutable publication before delegating to the existing public snapshot function. Acceptance at `:106` locks the claimed hostname against disconnect/reassignment, rechecks the owner-bound snapshot, and only then calls the existing encrypted capture capability. It accepts no caller-selected tenant. Parameterized server calls at `funnel-public-store.ts:133` and the domain store contain no interpolated SQL identifiers or untrusted expression construction.

The six authored real PostgreSQL cases cover pending duplicate-host claims, concurrent proved-owner races, disconnect and stale CAS, forbidden/caller-tenant writes, expiry/cooldown and exact immutable publication/inquiry/receipt ownership after reassignment. The 11 pgTAP checks cover forced RLS, grants, definer/search-path posture and indexes. **These are inspected test source, not passing database evidence.** Their migration and concurrency behavior must pass the actual disposable PostgreSQL runner in CI before release.

## Independent verification

| Execution                                                             | Observed result                                                                                      |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Eight selected domain and legacy unit files                           | 77 passed, 14.42 seconds, exit 0                                                                     |
| Existing proxy, shared-report proxy and authenticated-principal tests | 13 passed across 3 files, 1.81 seconds, exit 0                                                       |
| Eight additional actual-handler/proxy refusal probes                  | 8 passed, 2.62 seconds, exit 0                                                                       |
| Web typecheck and tooling TypeScript typecheck                        | Passed, exit 0                                                                                       |
| Secret audit, package boundaries and product-type audit               | Passed; negative package fixture rejected both prohibited edges                                      |
| Current `pnpm audit --prod --json`                                    | Empty advisory object; 0 vulnerabilities across all severities, 153 production/optional dependencies |
| Managed deterministic scanner                                         | Completed; AI rules hidden Unicode clean                                                             |
| Explicit changed-source/test Oxlint and 16 TypeScript-file Prettier   | Passed                                                                                               |
| All 18 source hashes, handoff digest and `git diff --check`           | Matched; no unrelated source changes by this reviewer                                                |

Focused command:

`pnpm exec vitest run --project unit apps/web/src/features/domains/model.unit.test.ts apps/web/src/server/funnel-domain-provider.unit.test.ts apps/web/src/server/funnel-domain-store.unit.test.ts apps/web/src/server/funnel-domain-routing.unit.test.ts apps/web/src/proxy.domains.unit.test.ts apps/web/src/server/funnel-public.unit.test.ts apps/web/src/server/funnel-handler.unit.test.ts apps/web/src/server/funnel-delivery.unit.test.ts`

Additional legacy command:

`pnpm exec vitest run --project unit apps/web/src/proxy.unit.test.ts apps/web/src/proxy.shared-report.unit.test.ts apps/web/src/server/authenticated-principal.unit.test.ts`

Independent probe command:

`pnpm exec vitest run --config test-results/security-domain-server/probe.config.ts`

The probes exercise the actual handlers/proxy without database substitution: hosted lifecycle rejects unauthenticated caller tenant/role headers with no fetch; malformed page Host reconstruction refuses before SQL; platform-origin customer inquiry refuses; actual Host mismatch refuses despite forwarded-host spoofing; formerly excluded auth, prefetch and image-extension private paths cannot bypass customer-host restriction. Only ignored scratch was created. The first probe collection failed because root scratch could not resolve the web-only `next/server.js` dependency; no tests ran. Corrected only the scratch import to the installed web package, then all eight passed. A preceding orchestration syntax error prevented any shell invocation and is not counted as verification. Production source/test bytes were not changed for either correction.

Scanner output is ignored `reports/scan-output/`; independent probes are ignored `test-results/security-domain-server/`. Broad scanner matches outside the assigned packet do not establish a fresh whole-repository audit. No full coverage, whole application build, real database, provider account or browser/DNS journey was executed by this reviewer. The author's build and 67-case claims remain attributed in the handoff. This review's independent selected set is the 77 cases above.

## Dependencies and framework qualification

The inherited lock resolves Next.js 16.3.8 and React/React DOM 19.3.0; package and lock bytes are unchanged. The fresh registry audit supplements the stale managed watchlist, but does not invent a new version-advisory matrix or repeat the preceding foundation's full framework review.

## Frozen source pins

| Path                                                    | SHA-256                                                          |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| apps/web/src/features/domains/model.ts                  | f0d9de4c4a2c74b2e0e889ec098d9116298f1f98c2dcdc9028ff79fad28ea892 |
| apps/web/src/features/domains/model.unit.test.ts        | 46a91a06d44b1c7d6c6a7de5b5117026808460bf6b0010f6e1cdba926d122193 |
| apps/web/src/server/funnel-domain-provider.ts           | 6285b349935133927283c8a8c46860aa5a7d4f82859619c02a69fcb80b75d279 |
| apps/web/src/server/funnel-domain-provider.unit.test.ts | d5df298916285b308db1cfe3f3edaab64c08a104c76474c7428018247488aebe |
| apps/web/src/server/funnel-domain-store.ts              | fbdd97fd032a4f4fb630f6986a6d42db3488f739f132b0c2e5ae1c5112493e92 |
| apps/web/src/server/funnel-domain-store.unit.test.ts    | a47ca5a44e5e28a7058fa69756f08a227c22e41d57f9e111206231e35c94c50f |
| apps/web/src/server/funnel-domain-http.ts               | 2117ca07fbbe81b8d47e78e473fa779595777e51cfee58a0ce5d8cb41717f1c4 |
| apps/web/src/server/funnel-domain-routing.ts            | 646c32155c7c65d4344f95613c01180579fc55d5ffe1fb8f0e791e069072218e |
| apps/web/src/server/funnel-domain-routing.unit.test.ts  | 37342048ee76622ecf35089109fa0a02bea799deed98490273d822f297dccf87 |
| apps/web/src/server/funnel-domains.postgres.test.ts     | 29f6e2d7bd2818a08d8dfc366545bb530c5b1e78dc3bf49335f27453a1888337 |
| apps/web/src/server/funnel-public-store.ts              | 013836eeb96f8673fdcaffb3a3d62d0c27c0798ada7acb87a51384e324207360 |
| apps/web/src/server/funnel-public-http.ts               | f7f96ab84d6465339fbd2219b39def27427e017eccddc4a7f998e45d4fe9b7d2 |
| apps/web/src/proxy.ts                                   | f5fb924e00d8a4d71220f1f990eef8f14ceab3c3d1eadab939482ea5d15f3782 |
| apps/web/src/proxy.domains.unit.test.ts                 | 50627fa3cb2fe870f8fb081fa421cc896b6dd9964f9f73842577e7e13ef639b6 |
| apps/web/src/app/api/funnel-domains/route.ts            | e36802c36661b9d515d084ef19b9e51ca38a2931bbc9160d79c924fbad948b3d |
| apps/web/src/app/(public)/f/[id]/[[...step]]/page.tsx   | a75362ba56cf9b622fba9fe89b0cec05ffb83f0d2cd67f080c26d2f382c0fb92 |
| supabase/migrations/20261014060000_funnel_domains.sql   | a8c2f463a5a9289601a780b3e919b3109d8b72b99d750f5f4169d9d7a2b391cd |
| supabase/tests/funnel_domains.pgtap.sql                 | ac043996cb3c28cbf5e3da83d4fe52719d8320edda1ef8415890fb646928b300 |

## Files changed and handoff

Only this report and ignored audit scratch were authored. No source fix, ledger edit, PRD edit, baseline change, commit, push, provider call, deployment or migration execution occurred. Exact source and report ownership are released for fresh scoped Quality. Root retains repository-health review before commit/push, current-main mergeability and actual CI gates.

The server packet is not the whole domain feature. Guided setup UI, bounded autonomous rechecks, hostname-root default routing and controlled actual-host publication/inquiry/certificate evidence still require their assigned consumers. Until actual PostgreSQL and hosted qualification pass, do not claim customer-domain completion. No unimplemented consumer or unavailable provider credential is substituted for source evidence, and no Security finding is waived by this handoff.
