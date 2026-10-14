# Security audit: domain setup UI and CI fixture correction

Date: 2026-10-14. Auditor: `/root/domain_ui_security`, security-guardian. Worktree: `codex/domain-completion`. Committed source base: `bae4fa65f59df7aa0db854f869b5633bc2ff4141`.

## Executive summary

**PASS for fresh scoped Quality of the frozen 18-file packet.** No Critical, High, Medium or Low vulnerability was demonstrated in the assigned UI and test correction. No source remediation was needed or performed. The existing independently reviewed domain server is preserved except for its explicitly superseded test fixture; this audit does not expand the previous server acceptance into hosted qualification.

Coverage is a complete source review of the assigned Next.js/React/TypeScript UI and bounded test changes, with focused executions of adjacent security seams. Actual corrected PostgreSQL, pgTAP and full current-head CI remain pending. Production DNS/TLS/provider provisioning, autonomous rechecks, hostname-root routing and authenticated browser/database writes are not proved here. Synthetic browser fixtures do not establish those outcomes.

The managed CVE watchlist was last refreshed on 2026-04-24, over 120 days ago. Guild intelligence needs refresh. Fresh registry audits supplement that dated catalog: production dependencies have zero advisories; the full audit reports one High advisory under the existing owner-approved development-only exception. No dependency or exception was changed by this packet.

## Surface coverage checklist

### Next.js and React attack surface

None detected. The new page exports metadata and renders `DomainScreen` without serializing a database model or secret. The client uses the constant `/api/funnel-domains`, strict request/response schemas and existing same-origin, no-store, redirect-error helpers (`client.ts:12`, `client.ts:47`, `client.ts:53`). No new Server Action, HTML injection sink, external navigation, dynamic URL or client storage was added. Loading/error routes show fixed text.

### Authorization and tenancy

None detected in the assigned delta. Client capability display is not treated as authority. The unchanged HTTP handler independently resolves a verified read or mutation principal (`funnel-domain-http.ts:31`), uses the existing session-bound browser mutation gate and rejects extra tenant fields through the strict command schema. Existing owner-scoped persistence and custom-host routing remain server responsibilities. UI writes retain the actual saved id/revision, deliberate connection/disconnection confirmation and duplicate-operation exclusion (`domain-screen.tsx:155`, `domain-screen.tsx:430`). A refused or uncertain write requires a current-state reload before another mutation.

### Secrets and environment

None detected. DNS names/values and the ownership challenge are intentional owner-visible verification records, not provider credentials. Clipboard writes copy those exact records and disclose no raw clipboard exception (`domain-screen.tsx:206`). Extended API payloads are refused before display. No environment file, server credential import or public secret variable was introduced. The deterministic Unicode scan is clean; the repository secret audit passes.

### Webhooks and third-party intake

None detected in scope. No new webhook, direct browser provider call, HighLevel operation, purchase or deployment is introduced. Provider attachment remains behind the previously reviewed authenticated server action. The confirmation explains the saved hostname and eventual attachment; DNS is not automatically changed by the UI.

### Dependencies and supply chain

None newly detected. Lock/package/config bytes are unchanged. `pnpm audit --prod --audit-level=high --json` reports zero vulnerabilities. Full `pnpm audit --audit-level=high` exits successfully with `1 high (1 ignored)`, corresponding to the existing GHSA-vfj7-8cjw-p6xm development-only exception at `pnpm-workspace.yaml:51`. Its acceptance, November 3 revisit and exact configuration guard remain intact. The existing 22-case accepted-advisories guard passes. This is not a zero-vulnerability claim for the whole lockfile.

### Headers and transport

None detected in the assigned delta. Existing application headers and nonce CSP are unchanged. The managed scanner only searches a root-level Next configuration and reports none found; manual review located the actual configuration at `apps/web/next.config.ts:5` and nonce flow at `apps/web/src/proxy.ts:51`. The new UI does not create cross-origin requests, alter cookie/CORS settings or weaken custom-host private-path refusal. Existing auth, internal transport, CSP and custom-host negative cases pass.

### AI-generated code patterns and test capability boundaries

None detected. The fixture now explicitly expects SQLSTATE `42501` from the original runtime UPDATE (`funnel-domains.postgres.test.ts:199`). Only afterwards may it invoke the existing sanctioned harness helper, guarded by local environment, loopback host and exact `/oalo_test_` database naming (`funnel-domains.postgres.test.ts:213`). The SQL uses a bound UUID and requires one affected row. The unchanged helper scopes elevation to a transaction and checks role restoration. Cleanup attempts both fixture owners through product commands and surfaces failures (`funnel-domains.postgres.test.ts:95`). No new runtime grant, migration, elevation primitive, skipped case, timeout or threshold change was added.

The scaffold preserves a finite expected count of 32, names `campaign.funnel_domains`, advances the plan to 23 and retains enabled/forced RLS, owner, index and PUBLIC-execution assertions (`phase0_scaffold.pgtap.sql:3`, `:94`, `:98`, `:127`, `:149`, `:192`). Actual SQL execution is still a fresh CI obligation, not inferred from source inspection.

### PII, financial data and logging hygiene

None detected. No new financial model, inquiry, PII logging or persistent browser storage is added. DNS record values are escaped React text nodes (`domain-screen.tsx:73`). API failures map to fixed catalog sentences (`client.ts:60`), and support references remain plain escaped text in the existing collapsed component. Raw provider errors/stack fields are not rendered. A failed refresh marks previously loaded proof unconfirmed and disables writes (`domain-screen.tsx:129`, `:152`).

## Findings detail

Critical: None detected in the assigned packet.

High: None newly detected in the assigned packet. The inherited accepted dependency exception is identified above and remains unchanged.

Medium: None detected in the assigned packet.

Low: None detected in the assigned packet.

## Remediation summary

| Severity | New findings | Fixed this session | Documented only |
| --- | --- | --- | --- |
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Low | 0 | 0 | 0 |

Only this report and ignored scan/probe scratch were authored. No source, frozen report, migration, baseline, ledger, Git state, provider configuration or hosted data was changed. `git diff --check` passes and the assigned source pins were verified.

## Independent verification

| Check | Result |
| --- | --- |
| Domain client and complete user-message catalog | 55 unit cases passed, two files |
| Domain screen and existing Workspace interactions | 35 integration cases passed, two files |
| Adjacent principal, internal API, CSP and custom-host restrictions | 29 unit cases passed, four files |
| Existing privileged-database capability boundary | 4 contract cases passed |
| Existing accepted-advisories configuration guard | 22 unit cases passed |
| Independent hostile-text/error/stale-proof probes | 3 integration cases passed using actual DomainScreen and mocked network/clipboard |
| Web TypeScript | Passed |
| Secrets, package boundaries and product types | Passed; prohibited dependency fixture rejected both edges |
| Managed deterministic scanner | Completed via Node 24 after unavailable `tsx` launcher attempt; ignored `reports/scan-output/` |
| Fresh production registry audit | Zero vulnerabilities; 153 production/optional dependencies |
| Full registry audit | Successful exit with one previously accepted ignored High; 611 total dependencies |
| Actual corrected PostgreSQL/pgTAP, full current-head CI | Not executed by this reviewer; required before release |

The author's four browser cases, production build and 36 original synthetic frames remain attributed author evidence, not independently rerun here. Parent inspected ten original frames; whole-set visual approval is not claimed. Synthetic ready/stale fixtures display null `checkedAt` with a validity timestamp, so they do not demonstrate a realistic verified provider receipt. New and changed Settings baselines still require controlled capture and independent inspection. No canonical PNG was changed.

Independent ignored probes at `tmp/security-domain-ui/` confirmed that hostile record names/values create no `img`, `script` or `iframe` markup and copy only the exact inert value; unknown provider error/stack strings do not reach visible text; and a failed refresh replaces a prior ready badge with unconfirmed state and blocks check/disconnect. The first scratch collection failed before running any test because the root scratch could not resolve the web package's JSX runtime. Adding only an ignored scratch React resolution alias corrected the harness; all three probes then passed. No production source or canonical test was changed.

## Frozen packet and ordering

UI handoff SHA-256: `0546f430ee24e2cc3f23d7d70301eb8c69b20cfcb76913f96369cecba3ba1277`. All 16 listed UI source/spec pins match.

CI diagnosis SHA-256: `5fd69843cf7aac5a5715a9a86705edfc0327dd67af789aa06da03684d5702dd0`. Both correction pins match:

| File | SHA-256 |
| --- | --- |
| apps/web/src/server/funnel-domains.postgres.test.ts | 1089f311827566226c59df87bc3f8495a52a1db58915a02e2c009ae7ce3570b5 |
| supabase/tests/phase0_scaffold.pgtap.sql | c53cf739888013b4357ebb58faa6a16ff056f03b56eb5d3f28ad254a4dd8847d |

Combined 18-file pin-manifest SHA-256: `27ce8b36f92a696cd54556bcfe79fadb22479e1987468366b202b7a1e2a0c4d0`. Computed from sorted `path + space + lowercase SHA-256` records joined by LF with a final LF. The two cited handoffs enumerate its files.

The previous server handoff has 17 unchanged source pins and one expected superseded PostgreSQL fixture pin. Its scoped Security/Quality qualify the earlier server subset; no new UI/fixture Quality had run at entry. `library/qa/` is absent. This review precedes the fresh packet Quality and does not invalidate previous source through remediation.

## Re-evaluation

No Medium-or-above source finding required a fix. Final pin verification and diff review confirm the source remained frozen. Stale CVE intelligence, accepted development advisory, incomplete runtime qualification and pending visual evidence are explicit limits rather than silently waived checks.

## Next step

Proceed to fresh Quality for this exact frozen packet, then orchestrator repository-health review and corrected actual PostgreSQL/pgTAP/full CI. Source acceptance does not authorize or establish deployment, DNS changes, provider provisioning, purchases or complete domain onboarding. Do not declare the full domain criterion complete from this increment.
