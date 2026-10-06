# Campaign studio: security self-review

Date: October 6, 2026. Reviewer: Chief, direct sequential self-review before quality review. This is not independent-agent certification. Scope: `chief/ux-campaign-studio-2026-10-06`, against `0d2187a5`, Home and property-preparation UI plus narrow inherited dependency repairs.

## Executive summary

No new Critical or High application-code finding was detected in the reviewed UI diff. The new studio links do not authorize a mutation. The local summary renders fields already in the authenticated form and adds no request, stored draft, public projection or financial calculation.

A fresh production dependency audit found one High advisory in inherited `source-map-js@1.2.1` through Next/PostCSS. The full dependency audit additionally found Critical `proxy-addr` advisory GHSA-jqcg-44mw-7w3h in the development-only Trigger CLI tree. Narrow overrides and a regenerated lockfile take their published `1.2.2` and `2.0.8` patches. Frozen installation and both post-repair audits now pass: no known production vulnerabilities, and only the previously accepted development-only `braces` exception in the full graph. No advisory was newly ignored. The final application/database/visual qualification remains in the QA closeout, not implied by an audit pass.

## Categories reviewed

| Category | Finding and evidence |
| --- | --- |
| Authority / tenant isolation | `apps/web/src/server/home-reads.ts:259` derives the presentation flag from the authenticated role; `home-studio-hero.tsx:52-81` selects only two fixed internal paths. The existing create/save/package handlers are unchanged and remain the authority. Viewer and approver unit cases return false. |
| Injection / unsafe markup | `property-form-summary.tsx:30-58` renders address, description and partner identity as React text. An integration case verifies HTML-like text remains literal and no image node appears. No dynamic HTML, URL parsing, external media fetch or arbitrary navigation target is added. |
| PII / client storage | `property-campaign-form.tsx:286-294` passes only existing local form fields and the already-readable saved partner/brand to the summary. No new localStorage/sessionStorage, console payload log or network request is introduced. The typing test asserts zero saves. |
| Financial / payment operations | No rate, APR, payment, credit, fee, Stripe, Meta or HighLevel mutation code changes. The hero explicitly describes private draft outputs, not the pending financing/five-funnel feature. |
| Configuration / secrets | No environment, CSP, origin, session, DNS, credential, database or hosted setting changes. New artwork is local CSS and shared icons; no remote resource or client-restricted asset. |
| Supply chain | High transitive advisory fixed as described below. No new UI package, framework upgrade or release-age exception. Production and full-policy audits were run again after repair. |
| Source and template rights | Only original abstract document composition and synthetic test values are added. No private flyer, client photo, Canva collaboration URL, source correspondence or restricted template entered the repository. |

## Critical finding, dependency repaired

**SEC-UX-002: inherited `proxy-addr` IP spoofing advisory.** Full audit reports `apps/tasks > trigger.dev > @modelcontextprotocol/sdk > express > proxy-addr` (including the rate-limit dependency path). This is development-tool reachability, not proof that the new Home or property form has an authentication bypass. The published patch is `2.0.8`; a version-scoped override, registry integrity check, frozen installation and clean full-policy audit confirm the dependency repair. The patch-floor test also covers this package and disallows suppressing the advisory. No new release-age exception was needed.

Source checked October 6: [GitHub advisory GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), updated October 5, 2026. The release repairs trusting arbitrary IPv4 addresses under certain IPv4-mapped IPv6 proxy-subnet configurations. No application proxy-trust configuration is changed as part of the dependency repair.

## High finding, remediated

**SEC-UX-001: inherited `source-map-js` denial-of-service advisory.** The initial production audit resolved `apps/web > next > postcss > source-map-js@1.2.1`. The current GitHub advisory identifies versions `>=1.0.0 <1.2.2` as affected and `1.2.2` as patched. The risky behavior is processing malformed indexed source-map section offsets, not the new form UI. No public input path to source-map processing was established during this narrow review, but the released patch removes the vulnerable dependency rather than relying on a reachability assumption.

Remediation: `pnpm-workspace.yaml` adds only `source-map-js@<1.2.2: 1.2.2`; `pnpm-lock.yaml` resolves its existing production and test consumers to that version. No unrelated dependency changed. Registry metadata confirmed the release, repository and integrity before installation. Frozen-lockfile installation then passed. `tooling/tests/unit/dependencies/source-map-patch.test.ts` guards the patch floor and ensures the advisory was not added to ignored advisories.

Source checked October 6: [GitHub advisory GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), last updated October 5, 2026; [maintainer release](https://github.com/7rulnik/source-map-js/releases/tag/v1.2.2). Minimal release-blocking dependency repairs are the only expansion beyond the UI scope.

## Medium findings

No new Medium finding detected in the UI change. Existing product-level data lifecycle, creation quota and live-provider release restrictions remain in the earlier PRD-010 reviews. Making the interface easier to use does not close or waive them.

## Low findings and coverage limits

The canonical skill's static CVE watchlist was last refreshed April 24, 2026 and is stale. Its threshold scan was not represented as complete current vulnerability intelligence. Fresh package-advisory results and the directly inspected current advisory informed the repair.

The general scanner's Next configuration lookup is not monorepo-aware. Existing configuration was not changed; the scan was used for pattern triage, not as proof of hosted runtime behavior. Local self-review is not a penetration test, external audit, full-product release qualification or owner approval.

## Verification and execution notes

Canonical `security-weapon/scripts/scan.ts` ran. The secret, raw-card, SQL-template, command-injection, prototype-pollution and API-payload-log sweeps reported no new UI finding. Existing hits are negative tests, skill templates or the unchanged static theme bootstrap. Raw outputs are in ignored `tmp/ux-security-scan/`.

The first broad unit run overlapped moving scanner output from `reports/scan-output` into `tmp`, causing its working-tree allowlist scan to read a file after it had moved. That was execution interference, not a product defect. No safety test was weakened; the broad gate was rerun after the scan completed.

After both repairs, pinned Node 24.18.0 / pnpm 11.15.1 frozen installation, production audit and full-policy audit passed. `tmp/ux-audit-prod-final.log` reports no known vulnerabilities; `tmp/ux-audit-full-final.log` reports one ignored High finding, the unchanged owner-approved development-only exception. Both blocking findings above are repaired rather than silently downgraded. Quality and Linux visual comparison evidence are recorded separately after this review. This branch is not merged or deployed to production by the review.
