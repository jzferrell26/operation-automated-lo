# Security self-review: five-funnel studio

Date: October 6, 2026. Reviewer: Chief, direct sequential self-review before QA. Not independent security certification.
Scope: field-only funnel studio on `chief/five-funnel-studio-2026-10-06`, against `37fc0566`.

## Executive summary

The reviewed implementation keeps template drafts and photos private to the authenticated author/workspace. It does not introduce public lead collection, lender decisions, billing, messages or domain management. The new database table is additive and has forced RLS plus server-owned author identifiers. Fresh production dependency audit found no known vulnerabilities; the full audit retains the same previously accepted development-only `braces` advisory, with no new exception or dependency change.

Potential unsafe URL handling during an unsaved preview and a SQL missing-property check were found and fixed before this report. These are described below, rather than treating save-time validation as proof that every preview path is safe. Passing this scoped review does not authorize general customer release while the listed rate-limit and data-lifecycle work remains.

## Boundary review

| Area | Evidence |
| --- | --- |
| Authentication and role | `apps/web/src/server/funnel-http.ts:63-72` resolves the existing verified mutation session and role before content type or request body; both save/photo endpoints call it. Reads use the verified read path. Real PostgreSQL tests cover unauthorized, missing-CSRF, wrong-origin, unbranded and read-only cases. |
| Object access | `funnel-store.ts:79-105` uses the principal-bound transaction, actual workspace/actor parameters, and a per-author/template advisory lock. Forced RLS independently denies other authors even when a test read omits the author predicate. |
| Data model / SQL | `supabase/migrations/20261006120000_funnel_studio.sql:1-24` has a fixed five-kind check, author/workspace primary key, bounded JSON, private-only flag/revision invariant, forced row policies, no runtime DELETE and no support/public grant. Statements bind values; no user text reaches SQL construction. |
| Concurrency | `funnel-store.ts:58-68` checks last request ID/hash and expected revision. Simultaneous first writes return one revision; changed replay and stale-tab writes are conflicts rather than overwrites. |
| Image processing | `packages/rendering/src/funnel-photo.ts` decodes actual bytes, rejects non-raster/multiframe files, caps compressed size and pixels, strips metadata and re-encodes oversized/non-normalized content. Metadata-free normalized WebP is fully decoded but preserved byte-for-byte on later text-only edits. |
| Browser content | Strict fields are rendered as React text, not HTML. Unsaved links are checked again before they become href/src; no arbitrary embed code or SVG reaches the template. A malicious text fixture produces literal text, not an image/script node. |
| External resources / CSP | Known player hosts are allowed only on the finite authenticated funnel paths in `proxy.ts`. Default pages keep their existing CSP. Video players load only after explicit action. Arbitrary frame hosts, inline scripts and broader connect permissions were not enabled. Booking/resource URLs are client-side destinations, not server fetch targets. |
| Sensitive input | The form design has disabled personal fields and creates no contact. The editor accepts no borrower financial identity, credentials or payment data. Stored profile/media material still remains private personal data and is subject to the lifecycle follow-up below. |
| Response and logging | Private/no-store/noindex response headers, bounded bodies and mapped error codes are retained. No payload logging, user financial examples, private source correspondence or client collaboration tokens were added. |

File names in the table without a root prefix are under `apps/web/src/server/`.

## High findings addressed

**SEC-FUN-001: unsaved destination field could otherwise become an unvalidated navigation target.** Model/save validation alone did not protect the live editor preview. `features/funnels/surface.tsx` now applies `safeDestination` at `Destination` and before choosing a video URL; its helper excludes non-HTTPS, credentials, nonstandard ports, local/IP hosts and control characters. Tests enter `javascript:` before saving, switch preview pages, and assert no unsafe link/video source is rendered. Known-player parsing separately requires exact approved hosts and strict video IDs. This change is necessary even though React and the existing CSP offer additional defenses.

**SEC-FUN-002: nullable SQL CHECK semantics could admit a missing private flag.** The final table check wraps the complete private flag, kind and matching-revision predicate in `IS TRUE`, so an absent field cannot pass as SQL NULL. The new pgTAP file tests both explicit public authorization and missing-property attempts, plus row/content revision mismatch; all are refused. No application publication authority is created by storing these private drafts.

## Critical findings

No new Critical exploit was detected in the reviewed final diff. The media processor reuses the existing patched Sharp package; this feature adds no package, dependency override, leaked secret or public write path. This conclusion is scoped, not an audit of the complete inherited product.

## Medium follow-ups and release restrictions

**SEC-FUN-003: distributed resource limits remain open.** `funnel-http.ts` limits two simultaneous photo-upload processors per process and bounds each request. The save path also decodes supplied photo content but there is not yet a distributed per-workspace request quota. Before unrestricted hosted use, add or prove edge/account limits for save/upload operations, including concurrent-instance behavior. At most five bounded current drafts per author limits storage growth per author but does not eliminate CPU abuse.

**SEC-FUN-004: personal-data lifecycle remains inherited work.** The new draft includes images and professional identity. This increment adds no deletion/export/retention UI, public-consent record or distributed expiry controls. Keep the inherited real-customer-data restriction; do not treat a private working editor as consent/retention compliance or activate public forms without that work.

Safe syntactic HTTPS validation is not a guarantee that an owner-supplied booking/video/resource site is trustworthy or available. The user must explicitly choose those destinations; no server follows them. Final live delivery needs its own allowlist/ownership, consent, redirect and failure tests. The direct-video caption/transcript and external booking-confirmation experience also require real supplied assets for qualification.

## Scans and test evidence

The canonical security scanner ran before the final regression sequence. Its Unicode, hardcoded-secret, unsafe execution/SQL and API logging outputs were inspected; matches in negative tests, theme helpers and inherited skill templates were not classified as new runtime exploits. Raw output is in ignored `tmp/funnel-security-scan/`. The skill's April 24 static CVE list is stale and was not represented as current full vulnerability intelligence; fresh registry/advisory audits were used.

Observed locally: production audit exit 0 with no known vulnerabilities; full-policy audit exit 0 with one previously ignored High development dependency. Six exported-route tests passed against the task-owned PostgreSQL instance. All twelve new pgTAP assertions passed, including same-workspace author isolation, cross-workspace denial and private-flag/revision enforcement. Dedicated photo tests cover metadata/orientation, dimension/size caps, SVG/MIME spoof rejection, decompression-sized images and unchanged normalized bytes on repeat save.

No live Supabase migration, DNS mutation, provider configuration, financial calculation, ad spend, registration, booking, or customer message was performed. Remaining UI/whole-repository qualification is recorded in QA after this report rather than inferred from a passing security scan.

## Resumed closeout

The interrupted verification stopped because the photo unit test lived in the rendering package's shipped source tree without a declared test-runner dependency. The test now lives in `tooling/tests/unit/rendering/funnel-photo.test.ts` and imports the existing rendering export. All three assertions pass and the package-boundary audit passes without a new dependency, ignored edge or changed threshold. The extra Vitest package-source inclusion was removed. Runtime photo code is unchanged.

The resumed visual review moved the photo-edit button clear of the decorative caption, preserved the full mobile book-cover frame, removed repeated booking copy and duplicate external-link glyphs, and added a real-browser click/focus assertion for replacing the cover from the preview. Those are presentation changes, not new destinations, writes or expanded permissions. The six exported-route PostgreSQL cases passed again against the same task-owned isolated database. Sixteen clean pgTAP logs contain 759 passing assertions and no `not ok` or SQL error, including all twelve new funnel assertions. This supplements, not replaces, the canonical seeded CI qualification.

An actual Vercel preview read then exposed an availability defect hidden by a full local development install: importing the rendering barrel for photo normalization loaded its Playwright test dependency in the serverless function, where the browser package manifest was absent. The photo utility now has a dedicated `@oalo/rendering/funnel-photo` export and the funnel server imports only that entry. No browser runtime/file is copied into production to mask the failure, no package is added, and a new import-boundary test protects the narrow entry. The hosted smoke test must pass on the corrected deployment before that availability defect is closed.

### Verified preview closeout

After resuming the existing branch at `5e895cf3`, authorized Vercel CLI requests returned HTTP 200 for `/marketing/campaigns/funnels` and for all five saved-preview route shapes: `live-webinar/preview`, `on-demand/preview`, `buyer/preview`, `refinance/preview` and `lead-magnet/preview`. Each response contained its expected funnel component and no function-invocation error. This closes the observed serverless-import availability defect on the corrected preview deployment. Logs are the ignored `tmp/funnel-preview-current.log` and `tmp/funnel-host-*.log` files.

The requests reused authorized deployment access; they did not remove Vercel protection, alter application authentication, write a customer draft or exercise the still-unapplied hosted migration. The deployment's dashboard-preview context remains read-only. HTTP success proves the designs render in that environment, not that hosted persistence, public registration or HighLevel delivery is active. No runtime code or permission boundary changed during this closeout.
