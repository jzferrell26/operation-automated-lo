# QA Report: final domain setup source packet

**Plan documents:** `DOMAIN_COMPLETION_LEDGER.md`, `library/knowledge/private/ux-ui/04-screens/domain-setup.md`, and the bounded transport and AsyncState handoffs listed below.
**Parent requirement:** `library/requirements/in-work/prd-010-campaign-recovery/custom-domain-onboarding.md`
**Audit date:** 2026-10-14
**Base/head:** `50c7e281f8914443f49adb219357fab00dd832d4`, branch `codex/domain-completion`, plus the eight frozen source files below.
**Auditor:** quality-guardian, `/root/domain_final_quality`
**Preceding Security:** `2026-10-14-domain-platform-transport-security-review.md`, SHA-256 `02f709fb6902b769a89b1114cb4bbbd399d68fd0d51cc60639f623715b520508`.

## Summary

**Scoped source PASS; release qualification HOLD.** The final guided UI, shared status states, copy/title correction and local HTTPS gateway authority match the assigned packet, with no Critical, Warning or Suggestion found. Current-head canonical CI, eight newly rendered Settings baseline originals and the remaining whole-domain requirements must be qualified separately before declaring the feature complete or shippable.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | All requirements of the eight-file final source packet are traced; broader FUN work is explicitly open. |
| Correctness | ✅ | Independent interaction, refusal, routing, copy and actual native HTTP checks pass. |
| Alignment | ✅ | Shared wrappers, existing tokens, field-only product and sole-LO wording preserved. |
| Gaps | ✅ | Pending, failed-read, stale-proof, cooldown, uncertain-write and independent disconnect paths remain covered. |
| Detrimental | ✅ | No source regression found; production/custom-host authority and adjacent proxy/auth checks remain strict. |

## Critical Issues (must fix)

None in the assigned source packet. The release HOLD below remains mandatory and is not converted into source completion.

## Warnings (should fix)

None in the assigned source packet. Historical probe timeouts, canceled hosted jobs and missing new Settings baselines remain recorded as qualification limits, without a fabricated cause.

## Suggestions (consider improving)

None.

## Plan Item Traceability

| # | Plan requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| UI-01 | Guided Settings Domains entry and current-state read before changes | ✅ | `apps/web/src/features/domains/domain-screen.tsx:111-144,224-238`; existing Settings entry | Strict current-state client; no invented ready result. |
| UI-02 | Recommend a subdomain and preserve existing website/email | ✅ | `domain-screen.tsx:230-233,304-318` | Explicit apex identification is separate from the deferred hostname-root funnel selector. |
| UI-03 | Validate hostname before deliberate exact-host confirmation | ✅ | `domain-screen.tsx:214-221,285-324,444-477` | Integration checks invalid input, normalization, confirmation and duplicate exclusion. |
| UI-04 | Reconnect retains stored default kind; new claim uses compatibility default | ✅ | `domain-screen.tsx:167-176` | Existing `live-webinar` compatibility default; no new root-address consumer claim. |
| UI-05 | Server-issued TXT and actual recommended hosting records shown as inert text | ✅ | `domain-screen.tsx:57-94,359-399` | No remembered CNAME inserted by the UI. Fixture recommendations are labeled synthetic evidence. |
| UI-06 | Independent record name/value copy and safe fallback | ✅ | `domain-screen.tsx:78-91,206-212` | Clipboard failure exposes manual-copy guidance, not the underlying error. |
| UI-07 | Distinguish ownership, hosting, DNS, HTTPS and attention | ✅ | `domain-screen.tsx:16-50,359-409` | Success describes current checks, not publication or provider completion. |
| UI-08 | Current proof and accurate stale/unconfirmed state | ✅ | `domain-screen.tsx:145-154,331-355`; `apps/web/src/features/domains/model.ts:109-117` | Expired proof and reload-required state cannot display verified success. |
| UI-09 | Cooldown controls checking; DNS propagation has no promised duration | ✅ | `domain-screen.tsx:149-151,158,410-424` | Existing server enforcement remains authoritative. |
| UI-10 | Editable saved record can disconnect when setup/provider unavailable | ✅ | `domain-screen.tsx:155-158,271-278,425-431,444-477` | Deliberate confirmation with id/revision; no reliance on provider availability. |
| UI-11 | Pending operation excludes duplicate writes and competing changes | ✅ | `domain-screen.tsx:108-114,155-165,198-203` | Pending-check integration case verifies disconnect and refresh exclusion. |
| UI-12 | Conflict or uncertain write requires GET recovery and retains typed input | ✅ | `domain-screen.tsx:119-129,189-196,292-302`; `apps/web/src/features/domains/client.ts:26-88` | Fresh revision is used after recovery; no automatic replay of an uncertain write. |
| STATE-01 | Shared loading card with busy/status semantics | ✅ | `domain-screen.tsx:240-247`; `domain-screen.integration.test.tsx:26-38` | Actual pending GET tested; controls cannot write. |
| STATE-02 | Shared error card with sanitized failure and support seam | ✅ | `domain-screen.tsx:248-256`; `domain-screen.integration.test.tsx:39-48` | GET-only recovery, no raw secret detail. |
| STATE-03 | Shared permission card with current LO session/support wording | ✅ | `domain-screen.tsx:260-270`; `domain-screen.integration.test.tsx:49-69` | No customer role administration or role chooser. Wrapper's requiredRole field describes the session. |
| STATE-04 | Shared degraded card alongside saved host and safe disconnect | ✅ | `domain-screen.tsx:271-278`; `domain-screen.integration.test.tsx:70-81` | Card rendered directly, not nested in another Card. |
| UI-13 | Existing accessible controls, Escape and focus return retained | ✅ | `domain-screen.tsx:292-324,444-477`; integration confirmation cases; `tests/browser/domain-setup.spec.ts:68-81,127-135` | No new overlays or control primitives. Full independent visual closure is attributed separately. |
| COPY-01 | Customer copy passes existing vocabulary gate | ✅ | `domain-screen.tsx:19,29,49,283,363-364`; existing language guards | Five rejected internal terms replaced; guard or exceptions not weakened. |
| COPY-02 | Domains title explicitly included in exact 16-title inventory | ✅ | `apps/web/src/copy/page-titles.unit.test.ts:32-63` | Existing title metadata remains authoritative. |
| PROOF-01 | Complete synthetic states at four shared frames in Light/Dark | ✅ | `tests/browser/domain-setup.spec.ts:14-170` | 88 frozen whole originals and manifest verified. Actual blocked GET and failed-read recovery are present. |
| PROOF-02 | Synthetic browser evidence cannot imply actual provider/tenant qualification | ✅ | `domain-setup.spec.ts:13,23-43`; `domain-setup.md:25` | API fixtures, scoped axe and external-host/error assertions are explicit. |
| TLS-01 | Recognize exact canonical local HTTPS gateway across Next loopback normalization | ✅ | `apps/web/src/server/funnel-domain-routing.ts:39-60` | Local environment, HTTPS, fixed loopback aliases, explicit ports and exact raw Host required together. |
| TLS-02 | Return configured canonical origin for consumers | ✅ | `funnel-domain-routing.ts:59-60`; transport unit origin case | Incoming internal port and forwarded-host cannot become consumer authority. |
| TLS-03 | Reject credentialed URL and unsupported/foreign authority | ✅ | `funnel-domain-routing.ts:39,62-74`; `funnel-domain-platform-transport.unit.test.ts:35-94` | Negative production/preview/staging/unset, non-loopback, HTTP, wrong/missing Host and credentials cases pass. |
| TLS-04 | Preserve customer finite-path policy, prefetch denial and proxy CSP | ✅ | `funnel-domain-routing.ts:77-98`; `apps/web/src/proxy.ts:36-109`; transport and existing proxy cases | No production fallback, arbitrary forwarded-host trust or customer private-page override. |
| TLS-05 | Actual credential-free production-build native HTTP probe and own-child cleanup | ✅ | `tooling/tests/funnel-domain-platform-transport.production-probe.mjs:1-159` | Native request sends exact Host; bounds unchanged. Reexecuted serially with success below. |
| NG-01 | No customer roles, QR manager, editor, dependency or provider changes in this packet | ✅ | Eight-file diff and immediate seams | Customer session authority still exists; no role management is introduced. |
| NG-02 | No manufactured public-host/root links or publication completion | ✅ | `domain-screen.tsx:435-441` | Existing published-funnel workspace link only; root address explicitly unavailable. |
| OPEN-01 | Current-head full CI including authenticated browser journeys | 🟦 | `DOMAIN_COMPLETION_LEDGER.md`, final qualification section | Not satisfied by unit/source checks or old-head PG success. Required after commit. |
| OPEN-02 | Newly captured eight canonical Settings originals and independent approval | 🟦 | Parent baseline workflow and current Settings baseline inventory | Canceled capture retained old images byte-identical to previous baseline; no adoption approved. |
| OPEN-03 | Bounded autonomous domain rechecks | 🟦 | `custom-domain-onboarding.md:19,23`; root ledger | Required by whole feature, deferred outside this final UI/transport packet. |
| OPEN-04 | Hostname-root default routing and whole five-funnel visitor completion | 🟦 | Root ledger; `domain-screen.tsx:438-441` | No implementation or complete FUN acceptance claimed by this audit. |
| OPEN-05 | Controlled owned-host DNS/TLS/publication/visitor proof and setup timing | 🟦 | `custom-domain-onboarding.md:23`; root ledger FUN-011 and hosted proof rows | Static loopback test is not a real TLS handshake, domain ownership test or HighLevel delivery. |

## Files Changed

The full branch versus origin/main inventory was inspected to establish inherited work. This audit evaluates only the following final eight source pins; inherited implementation reports remain attributed evidence, and the root ledger is not reviewer-owned.

- `apps/web/src/copy/page-titles.unit.test.ts` (M): explicit Domains title and 16-item inventory.
- `apps/web/src/features/domains/domain-screen.integration.test.tsx` (M): shared-state composition and preserved behavior regressions.
- `apps/web/src/features/domains/domain-screen.tsx` (M): plain customer copy and four shared AsyncState card views.
- `apps/web/src/server/funnel-domain-platform-transport.unit.test.ts` (A): exact local gateway authority and strict negatives.
- `apps/web/src/server/funnel-domain-routing.ts` (M): bounded local HTTPS loopback normalization and URL credential refusal.
- `library/knowledge/private/ux-ui/04-screens/domain-setup.md` (M): explicit shared-state and sole-session composition contract.
- `tests/browser/domain-setup.spec.ts` (M): actual blocked-read/error states within the complete synthetic frame matrix.
- `tooling/tests/funnel-domain-platform-transport.production-probe.mjs` (A): isolated exact-Host native HTTP probe.

Only this new report was written by the reviewer. No source, prior report, original image, baseline, provider, configuration, Git state or deployment was changed.

## Independent verification

| Executed check | Result |
| --- | --- |
| Transport, routing, domain/legacy proxy, runtime authentication, domain model/client and title units | 95 passed across eight files |
| Customer language and governed-controls/hand-built-layers guards | 48 passed across four files |
| Domain screen integration | 26 passed |
| Shared state primitive component checks | 5 passed |
| Web TypeScript, separate explicit invocation | Exit 0, no diagnostics |
| Frozen eight source hashes and four security/handoff/visual hashes | All matched |
| Current image set | 88 hashes and byte sizes matched; zero mismatches |
| Preserved pre-AsyncState images | 72 hashes and byte sizes matched; zero mismatches |
| Native production HTTP probe | Passed serially without source, timeout or gate changes |
| Owned child/port cleanup | Child stopped; port 3100 has no listener |
| Diff whitespace check | Passed |

There are 174 executed test cases across the four selections above; those counts overlap earlier authors/reviewers and must not be added to their totals. The initial serial shell group returned exit 1 only because its final PowerShell listener query found no listener. Its integration suite passed, TypeScript had no diagnostics and the native probe printed every expected result. TypeScript was then reexecuted independently with explicit exit 0; no test failure was suppressed or fixed by changing source.

| Actual native Host / protocol hint | HTTP | CSP | MIME | Bytes |
| --- | --- | --- | --- | --- |
| `127.0.0.1:3100` / absent | 404 | absent | absent | 0 |
| `127.0.0.1:3443` / `https` | 200 | present | `image/webp` | 143808 |
| `hostile.example.org` / `https` | 404 | absent | absent | 0 |

This reviewer did not reexecute actual PostgreSQL, hosted authenticated browser journeys or image-producing Playwright capture. The prior Security report's two initial unchanged five-second probe timeouts and subsequent successful retries remain preserved, with no established cause. The transport handoff corrects the older Node fetch probe because fetch replaced its supplied Host; only the native HTTP probe establishes the actual raw Host on the wire.

The independent UX closure records literal review of all 88 originals with all ten axes scored 3 and DUV-01 closed. Its image and source hashes match this packet. That is attributed independent visual evidence, not a new visual judgment by this Quality reviewer; it does not approve the separate canonical Settings images.

## Frozen provenance

| File | SHA-256 |
| --- | --- |
| apps/web/src/features/domains/domain-screen.tsx | a2498ac1355b8d3aa776be63037615aa28118b62d8e5c8ae473faeab0ec14b73 |
| apps/web/src/features/domains/domain-screen.integration.test.tsx | 090a5003a89f9719954f43d7accf74bec76d262e043438b10f2c20eb7690d210 |
| tests/browser/domain-setup.spec.ts | 04fc61b7a3bcefca205381d6128daf800976cee2f70d633db8dd40f8b55bbbab |
| library/knowledge/private/ux-ui/04-screens/domain-setup.md | ce9b8bf34e36580840cbb44e59dc39d14c1caebdb604ac4e2775119595ab5685 |
| apps/web/src/copy/page-titles.unit.test.ts | 6823f91b6def90a946462a3e429212879d2b7011eea075e6dea417f1b3eeb7f8 |
| apps/web/src/server/funnel-domain-routing.ts | 95aefbc8b6174239f2d2207061cbb6fb44c3c47d5988fa624275f651c6a99c64 |
| apps/web/src/server/funnel-domain-platform-transport.unit.test.ts | 036daffd60a73da5fd9a0e30eec5c3916e15b5de17cd30b2b90a67d250610b3a |
| tooling/tests/funnel-domain-platform-transport.production-probe.mjs | e927fdd96701c81ecc019da91ba9a148a1879c0d229b66ce7244a9ad988a1fb6 |

- Transport handoff: `7395baf718b3c8768f66368dbdbc2ab121067c334b2a7caddb228a6d55da4c10`.
- AsyncState handoff: `3ada1864faab9e6b43dc2d44eac9d815812d78f459e0781617bd5992e4e69598`.
- Final preceding Security: `02f709fb6902b769a89b1114cb4bbbd399d68fd0d51cc60639f623715b520508`.
- Independent visual closure: `c6b5678f07a54317a7002cc347835d7b81843a3022e49ebe1f9bc6147876da09`.
- Current image manifest: `c5534f0060c027471105120f4adaaa66acd42169fdf5fb5fea60a72aa5ca7dc5`.
- Preserved earlier image manifest: `40080d283c092b234bfbdfed8768e3d9f6df4d570b5575a3d47f8ed195b69448`.

## Release qualification HOLD

Parent supplied the completed historical CI log: run `38531611437` at `50c7e281` passed 3180 unit cases before the two copy/title failures repaired here. The database job passed all 20 domain-branch pgTAP files and 323 actual PostgreSQL cases in 26 files, including six domain cases, then timed out/canceled at its 90-minute limit during the 163 authenticated review-browser suite. That does not qualify this uncommitted source or explain the browser timeouts.

Baseline run `38531604133` canceled at its 100-minute limit. Parent verified its downloaded artifact contains eight Settings PNGs byte-identical to the prior baselines, including the older three-card desktop composition without Domains. Those artifacts are not newly rendered Settings proof and must not be adopted as approval. Rerender and inspect the eight intended Settings originals at the current committed head, obtain current canonical CI, and keep autonomous rechecks, root-default routing and controlled owned-host proof open. This bounded PASS authorizes continuing that qualification, not release, live provider effects or whole-FUN completion.

The completed baseline log additionally records Docker registry `toomanyrequests: Data limit exceeded` errors before its browser phase (`tmp/domain-baseline-ci-38531604133-complete.log:711-723,765-769,1449-1450`). The local routing repair cannot be claimed as the sole cure for the historical job. Both downloaded raw logs were independently hash-checked: database/browser log `b7f017163e8484a1a8ad6ccfe7c18a7e4702c5684984bd9d83aa9fda5a3b421b`; baseline log `221acf5e4377d3ac28f299653e960f9a6d1c63d3a32ca6b3317ac29659f62057`.
