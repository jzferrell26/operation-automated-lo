# QA Report: guided domain setup UI and bounded CI fixture correction

**Plan document:** `library/knowledge/private/ux-ui/04-screens/domain-setup.md`, implementing the guided Settings portion of `library/requirements/in-work/prd-010-campaign-recovery/custom-domain-onboarding.md` and FUN-005/FUN-012 in `turnkey-five-funnel-product.md`.
**Audit date:** 2026-10-14
**Base branch:** `origin/main`, with scoped committed server base `bae4fa65f59df7aa0db854f869b5633bc2ff4141`
**Head:** `codex/domain-completion`, frozen uncommitted 18-file packet
**Auditor:** `/root/domain_ui_quality`, quality-guardian

## Summary

**PASS for the scoped source/UI increment, with one open verification Warning and one test-evidence Suggestion.** The guided controls, strict client boundary, current-state reload, deliberate confirmation, provider-independent disconnect and narrowly privileged disposable test fixture match the assigned plan; no Critical source issue was demonstrated. This report does not qualify the whole domain outcome or declare the branch shippable: independent visual acceptance, corrected actual database/full CI, automatic rechecks, hostname-root routing and owned-host DNS/TLS/visitor qualification remain open.

Security preceded this audit. `2026-10-14-domain-ui-security-review.md` has SHA-256 `bc9a55d872ce2cdae77dc683c2dbd82503e3020a8fbb0e48decebf08aa2afe73` and reports no new source vulnerability. UI handoff `0546f430ee24e2cc3f23d7d70301eb8c69b20cfcb76913f96369cecba3ba1277` and CI diagnosis `5fd69843cf7aac5a5715a9a86705edfc0327dd67af789aa06da03684d5702dd0` enumerate all 18 source pins. Every pin matched at entry and final verification. The combined sorted manifest is `27ce8b36f92a696cd54556bcfe79fadb22479e1987468366b202b7a1e2a0c4d0`. Seventeen previous server pins remain governed by the prior server review; its PostgreSQL fixture is explicitly superseded here.

Independent execution:

| Check | Result and limits |
| --- | --- |
| Domain screen and Workspace interactions | 35 PASS across two integration files |
| Domain client and complete error-code inventory | 55 PASS across two unit files in a serial rerun |
| Adjacent domain model/provider/store/routing | 42 PASS in the initial six-file unit selection |
| Privileged database capability boundary | 4 PASS in a serial rerun |
| Web TypeScript | PASS, exit 0 |
| Diff whitespace | PASS |
| Source/security pins | All 18 match; no source remediation |
| Representative original image inspection | Desktop Light DNS and mobile Dark disconnect originals inspected without alteration; no blocker demonstrated in those two images |
| Actual corrected PostgreSQL/pgTAP and current-head CI | Not executed by this reviewer; required before release |
| Browser rerun and whole-set UX acceptance | Not performed by this reviewer; author's four synthetic cases and 36 final originals remain attributed evidence |

The initial concurrent run retained three failures: two 5-second filesystem-inventory timeouts in `user-messages.unit.test.ts:162,171` and one 5-second source-inventory timeout in `database-privilege-escalation-boundary.test.ts:78`. It also passed 95 unit and three privilege cases. After the concurrent integration/TypeScript checks completed, the affected selections passed serially with unchanged source, test limits and worker configuration. This suggests local concurrency contributed to the timeout result; it does not prove that explanation or erase the initial failures.

Inventory used `git status`, uncommitted diffs and `git diff origin/main...HEAD --name-only`. The full branch has 415 inherited changed paths; this report intentionally owns and audits only the 18 frozen UI/fixture paths listed below, rather than granting new acceptance to inherited source.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | Assigned guided-screen behaviors and fixture corrections are present; wider domain criteria remain explicitly outside this increment |
| Correctness | ✅ | Focused behavior tests, client schema checks, exact payloads and existing privilege boundary pass |
| Alignment | ✅ | Existing UI wrappers/tokens, strict relative API, field-only setup and truthful publication wording are preserved |
| Gaps | ⚠️ | Independent complete visual/baseline proof and corrected actual database/full CI remain outstanding |
| Detrimental | ✅ | No demonstrated new source regression, secret sink, customer role manager, runtime grant, changed timeout or weakened threshold |

## Critical Issues (must fix)

None demonstrated in the assigned source packet. Missing wider domain consumers remain unaccepted work, not a clean full-product verdict.

## Warnings (should fix)

- [ ] **WQ-DOM-01: Complete visual and canonical Settings qualification before release**: `tests/browser/domain-setup.spec.ts:12-19`, `apps/web/src/features/workspace/workspace-screen.tsx:50-58`.

  The browser selection captures 1440 and 390 in both themes, and the Settings composition gains a Domains card. The 1180/768 responsive checks, whole-set independent UX inspection and eight changed authenticated Settings canonical captures are not supplied by this packet. Complete the controlled capture and independent approval before treating visual acceptance or full release as verified; preserve existing canonical images until that review approves replacements. No canonical PNG was modified by this audit.

  ```ts
  // Production-rendered UI with synthetic API fixtures. No DNS or provider request is made.
  for (const width of [1440, 390])
    for (const theme of ["light", "dark"] as const) {
  ```

  Corrected actual PostgreSQL/pgTAP and full CI are separately mandatory release checks. The historical run passed the 11 new domain pgTAP assertions and four domain PostgreSQL cases, but failed two fixture cases and the old 31-table inventory. Source correction and passing capability scans do not establish those corrected SQL outcomes.

## Suggestions (consider improving)

- [ ] **SQ-DOM-01: Use coherent timestamps for synthetic verified-state images**: `apps/web/src/features/domains/domain.test-support.ts:19-23`, `tests/browser/domain-setup.spec.ts:81-84`.

  The fixture defaults `checkedAt` to null, while the browser patch supplies a ready status and a future validity timestamp. This intentionally synthetic combination produces a passed-check badge alongside "Not checked yet" and does not resemble a real saved verification receipt. A later test-only update could supply explicit checked/challenge/freshness timestamps for verified states and retain malformed-state coverage separately. This is an evidence improvement, not a demonstrated production receipt bug; the server and existing readiness model are unchanged in this packet.

  ```ts
  checkedAt: null,
  readyUntil: null,
  challengeExpiresAt: "2035-01-01T00:00:00.000Z",
  nextCheckAt: null,
  ...patch,
  ```

## Plan Item Traceability

The screen specification is extracted manually because it uses prose requirements rather than numbered user stories. Each applicable sentence group and non-goal is represented. Wider custom-domain requirements are explicitly marked as prior source or pending wider work, preserving their full-product status.

| # | Plan requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| UI-01 | Settings links to Domains; one named heading and local loading/error states | ✅ | `workspace-screen.tsx:50-58`; `settings/domains/page.tsx:1-7`; `loading.tsx:1-3`; `error.tsx:1-13`; `domain-screen.tsx:225-245` | Authenticated route group retained |
| UI-02 | Read strict current-owner state before writes | ✅ | `client.ts:12-55`; `domain-screen.tsx:111-148` | Relative constant endpoint; schema refuses added fields |
| UI-03 | Recommend subdomain, identify apex, validate hostname | ✅ | `domain-screen.tsx:214-221,230-232,277-303` | Existing server/model normalization reused |
| UI-04 | Exact hostname confirmation; eventual attachment explained; no DNS edit or purchase promised | ✅ | `domain-screen.tsx:169-175,429-455`; integration tests `:83-127` | Confirmation precedes mutation; Escape restores focus |
| UI-05 | Reconnect retains kind; new claim compatibility default; no root selector/promise | ✅ | `domain-screen.tsx:173,420-425`; integration tests `:213-224` | Existing saved kind retained, new default live-webinar |
| UI-06 | Show exact server-issued ownership and provider recommendations | ✅ | `domain-screen.tsx:57-94,344-384` | Escaped text and exact independent name/value copying |
| UI-07 | Clipboard failure provides manual recovery and hides raw exceptions | ✅ | `domain-screen.tsx:206-212`; integration tests `:170-194` | No raw provider or clipboard exception rendering |
| UI-08 | Distinguish control, hosting, routing and HTTPS; no stale success | ✅ | `domain-screen.tsx:16-51,152-154,316-340,386-392` | Failed reload marks last record unconfirmed; Security independently probed that seam |
| UI-09 | Cooldown countdown, authoritative server enforcement and no propagation promise | ✅ | `domain-screen.tsx:149-150,158,395-408` | Existing server's persisted cooldown remains authoritative |
| UI-10 | Unavailable/read-only states; editable disconnect survives provider absence | ✅ | `domain-screen.tsx:250-263,403-415`; integration tests `:195-212,225-231` | Internal capability is not a customer role-management UI |
| UI-11 | Pending requests exclude duplicate operations | ✅ | `domain-screen.tsx:108,112-114,155-162`; integration tests `:26-47,94-114` | Check, disconnect and reload cannot overlap through the screen |
| UI-12 | Refused/uncertain writes require reload, preserve input and use current revision | ✅ | `domain-screen.tsx:118-130,176,189-196`; integration tests `:232-275` | Lost network/schema/conflict cases covered |
| UI-13 | Refresh is a real GET | ✅ | `client.ts:47-49`; `domain-screen.tsx:119,236` | Same-origin, redirect-error, no-store helper |
| UI-14 | Existing wrappers, semantic tokens, field labels, focus/target and accessible status/error | ✅ | `domain-screen.tsx:2,239-248,277-299,429-455`; `domains.module.css:1-107` | Wrapper behavior preserved; author's scoped axe evidence remains attributed |
| UI-15 | Wrapping single-column forms/records; no sticky actions | ✅ | `domains.module.css:3-7,32-45,74-99` | Two representative originals inspected; remaining visual proof WQ-DOM-01 |
| UI-16 | Link only to existing published-funnel workspace; domain readiness differs from publication | ✅ | `domain-screen.tsx:36-39,420-425` | No invented hostname-root or custom-host link |
| UI-17 | Interaction coverage for all seven statuses, parsing, conflict, uncertainty, clipboard, read-only, cooldown and confirmation | ✅ | `client.unit.test.ts:5-82`; `domain-screen.integration.test.tsx:25-275` | 55 unit and 35 integration PASS independently |
| UI-18 | Synthetic browser evidence clearly labeled, no provider/DB claim or automatic canonical changes | ✅ | `tests/browser/domain-setup.spec.ts:12-45`; handoff original-evidence section | Four cases/36 final originals attributed; wider approval remains open |
| CI-01 | Preserve runtime UPDATE denial, use sanctioned disposable-only artificial expiry | ✅ | `funnel-domains.postgres.test.ts:199-228` | Exact SQLSTATE 42501, local/loopback/oalo_test guard, bound UUID, one affected row |
| CI-02 | Cleanup both owners even after assertion failure and report failures | ✅ | `funnel-domains.postgres.test.ts:91-104` | Product disconnect, Promise.allSettled and AggregateError |
| CI-03 | Exact finite table inventory with named domain table and retained RLS/owner/index protections | ✅ | `phase0_scaffold.pgtap.sql:3,94-98,124-149,192-214` | 23 planned assertions, exact 32 tables; SQL execution pending |
| NG-01 | No new customer role manager, QR manager, credentials UI or financial calculation | ✅ | Assigned 18-file inventory | No such consumer or dependency introduced |
| NG-02 | No root-live promise, invented provider record or generic CNAME | ✅ | `domain-screen.tsx:379-382,423-425` | Uses actual API records, explicit root limitation |
| NG-03 | No token/global-style/dependency/server-model/database change by UI | ✅ | UI handoff 16-file inventory; source diffs | Two separate CI fixtures intentionally included, no production grant/migration change |
| FUN-005 remainder | Bounded automatic rechecks, default-root consumer and actual owned-host HTTPS visitor qualification | 🟦 | `custom-domain-onboarding.md:17-21`; `domain-screen.tsx:423-425` | Outside assigned increment and still required before full criterion acceptance |
| FUN-006 | Exact-owner binding and host/isolation safeguards | 🟦 | Prior server handoff and ordered server Security/Quality | Prior server source acceptance retained; no new hosted proof granted |
| FUN-012 | No claim that five journeys are complete/live/proven without implementation and hosted evidence | ✅ | Screen publication wording and this report | Full domain criterion remains open |
| NG-04 | No Git/provider/DNS/deploy/purchase/customer communication during audit | ✅ | Audit execution | Only this report authored |

## Files Changed

Paths below are the exact assigned packet. Entries marked M were uncommitted modifications; A were untracked additions at entry. Frozen handoffs/security reports, inherited server source and root ledger were read only.

- `apps/web/src/app/(authenticated)/settings/domains/error.tsx` (A): fixed recovery boundary and Settings return.
- `apps/web/src/app/(authenticated)/settings/domains/loading.tsx` (A): loading status.
- `apps/web/src/app/(authenticated)/settings/domains/page.tsx` (A): page metadata and guided screen.
- `apps/web/src/copy/page-titles.ts` (M): named Domains title.
- `apps/web/src/features/domains/client.ts` (A): strict API parsing, write certainty and safe refusal copy.
- `apps/web/src/features/domains/client.unit.test.ts` (A): client and hostile/extended response coverage.
- `apps/web/src/features/domains/domain-screen.integration.test.tsx` (A): guided states, confirmation and reload behavior.
- `apps/web/src/features/domains/domain-screen.tsx` (A): guided current-record UI and consequential actions.
- `apps/web/src/features/domains/domain.test-support.ts` (A): explicitly synthetic fixture.
- `apps/web/src/features/domains/domains.module.css` (A): wrapping semantic-token layout.
- `apps/web/src/features/http/user-messages.ts` (M): six domain refusal sentence pairs.
- `apps/web/src/features/http/user-messages.unit.test.ts` (M): domain messages within complete route inventory.
- `apps/web/src/features/workspace/workspace-screen.integration.test.tsx` (M): Settings navigation coverage.
- `apps/web/src/features/workspace/workspace-screen.tsx` (M): Domains Settings card.
- `apps/web/src/server/funnel-domains.postgres.test.ts` (M): exact denial, disposable fixture expiry and cleanup.
- `library/knowledge/private/ux-ui/04-screens/domain-setup.md` (A): scoped screen specification.
- `supabase/tests/phase0_scaffold.pgtap.sql` (M): exact 32-table inventory plus named table assertion.
- `tests/browser/domain-setup.spec.ts` (A): labeled synthetic state/frame, keyboard, overflow and axe coverage.
