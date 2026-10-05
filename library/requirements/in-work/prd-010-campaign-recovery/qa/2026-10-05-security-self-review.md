# Security self-review: property campaign preparation

Date: October 5, 2026. Reviewer: Chief, sequential self-review using the repository security checklist. This is not an independent-agent audit. Scope: PRD-010 Batch A on `chief/campaign-recovery-2026-10-05`, against `adeed9e0`.

## Executive summary

No new Critical or High finding was detected in the reviewed diff. The new route authenticates and authorizes before accepting or saving input, uses the existing tenant-bound persistence layer, and performs no provider operation. This is a local implementation review, not permission to release the feature with real customer data: database qualification, retention/export/deletion decisions, endpoint quotas, and provider gates still need their named evidence.

The production dependency audit reports no vulnerabilities. The full dependency audit retains the existing owner-accepted development-only high advisory for `braces`, `GHSA-vfj7-8cjw-p6xm`; this branch neither adds nor expands that exception. The security skill's April 24 CVE watchlist is stale and must not be represented as a current comprehensive vulnerability assessment.

## Scorecard

| Category | Result | Evidence and limits |
| --- | --- | --- |
| Financial / payment security | No new finding | `property-campaign-handler.ts:41-49` returns publication unauthorized; `property-campaign-save.ts:169-185` disables Meta, zeroes budgets, and records missing routing. No billing, spend, message, or provider operation is added. |
| PII exposure | No new finding in the diff | `property-campaign-context.ts:56` projects only partner ID, name, and company; `property-campaign-save.ts:117` hashes only that identity, not private partner contact details. No raw customer payload logging, browser persistence, SSN, or payment fields are added. |
| Authentication / authorization | Checked locally | `property-campaign-handler.ts:30-35` authenticates, checks the mutation role, then reads input. The save function repeats authority checks at `property-campaign-save.ts:62-70`. Signed viewer and approver sessions are refused before storage access; browser-origin refusal reuses the existing session policy. |
| Injection | No new finding | Strict schemas reject extra authority fields. User text is rendered as React text, not HTML. No SQL string interpolation, arbitrary fetch target, process execution, or dynamic evaluation is introduced. |
| Dependencies | Existing exception retained | Fresh production audit is clean; full audit has one previously accepted development-only high advisory. No package or lockfile change. |
| Configuration / headers | Existing controls preserved | `apps/web/next.config.ts:6-12` retains transport, content-type, referrer and origin controls. The new response adds `no-store`; `internal-api.ts` retains same-origin credentials and refused redirects. No wildcard CORS or environment change. |
| Data handling | Follow-up required | Tenant-bound PostgreSQL adapters are reused, but this new route's real-PostgreSQL qualification is outstanding. Policy and quota limitations are listed below. |

Paths without a root prefix in this report are under `apps/web/src/server/` unless identified otherwise.

## Critical findings

None detected in the reviewed change. This does not certify the entire inherited product.

## High findings

No new High finding detected. Existing accepted dependency exception: `pnpm-workspace.yaml:42-51` documents the owner decision, development-only reachability, exact advisory, and revisit date. It remains visible rather than being reported as zero vulnerabilities in the full dependency graph.

## Medium findings / release follow-up

**SEC-010-01, authenticated storage abuse:** `property-campaign-handler.ts:30-45` bounds each request and rejects unauthorized roles, but adds no per-actor or per-workspace creation quota. An authorized actor can generate fresh request IDs to create many drafts. Before general release, add or prove deployment-level rate limiting plus workspace limits and test their rejection behavior. This feature does not incur provider spend, which limits the immediate financial impact but does not remove storage risk.

**SEC-010-02, inherited data lifecycle:** the README's existing data-entry restriction and the finish-line operator checklist remain in force. This batch adds no export, retention, or deletion implementation. Do not treat the new property form as authorization to collect customer data before those existing decisions and controls are settled.

## Low findings / coverage limits

**SEC-010-03, stale security reference:** `/cos-test/the-neeson/skills/security-weapon/research/cve-watchlist.md:3` was last refreshed April 24, 2026, over 120 days before this review. Its static threshold table is not current proof of safety for Next.js 16.3.6 / React 19.3.0. Fresh package-advisory checks were run instead, but a full current advisory review remains part of release qualification. No dependency was changed on the basis of a stale table.

## Dependency and deterministic scans

Commands executed with pinned Node 24.18.0 and pnpm 11.15.1:

- Canonical `security-weapon/scripts/scan.ts`: completed. Production audit JSON reports zero advisories; rules-file Unicode sweep reports no zero-width or bidi characters. No hardcoded secret, prototype-pollution sink, SQL template query, process-injection shape, or API payload log was found by its pattern sweep.
- `pnpm audit --prod`: exit 0, no production vulnerabilities reported.
- `pnpm audit --audit-level high`: exit 0 under the existing policy; one high advisory reported as ignored by the previously accepted exact exception. Not a globally clean report.
- `pnpm audit:boundaries`: passed across 16 packages and correctly rejected the two forbidden fixture edges.
- `pnpm audit:secrets`: passed across six source roots and the public-environment boundary.

Ephemeral evidence: `tmp/recovery-security-scan/`, `tmp/recovery-audit.log`, and `tmp/recovery-audit-prod.log`. The generic scanner does not understand every monorepo path: its root-level Next configuration check did not locate `apps/web/next.config.ts`; that file was inspected separately. Pattern matches in skill templates, negative security tests, and the pre-existing static theme bootstrap were triaged, not counted as newly introduced exploit findings. No scanner output or credential is committed.

## Defensive changes and review focus

`property-campaign-handler.ts` now checks the mutation role immediately after authentication, before constructing a persistence adapter or accepting a body. `property-campaign-handler.unit.test.ts` covers signed roles and hostile browser origin through the existing signed-session fixture, in addition to spoofed tenant/actor/brand fields, invalid input, unknown partners, exact retries, and altered retries.

`property-campaign-save.ts:71-84` scopes a request ID to the verified tenant and actor and compares its canonical content hash on retries. Sequential retries are proven against the real local store. Concurrent first-writes and subsequent reads must still be qualified against real PostgreSQL before release; no local filesystem test is claimed as evidence of production transaction behavior.

The updated campaign-route allowlist retains an exact finite set. It adds `property` draft persistence, not a launch endpoint; all existing no-provider-publication scans remain active. The source-language guard's property exception is limited to four named preparation/projection files. CRM bans and all library-ad property bans remain active and have explicit tripwire tests.

## Ordering and release position

This review precedes the PRD-010 QA report. The work remains a draft recovery change, not a merged or deployed release. No independent review, hosted database check, live provider test, lender approval, data-rights approval, or production certification is claimed.
