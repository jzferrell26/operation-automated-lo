# Reference-funnel release: security self-review

Date: October 7, 2026. Chief, direct sequential security review before quality review. Scope: PR #85, base `e14c4603`, recovered reference-led designs and bounded public inquiry delivery. This is not an independent audit or lender/legal approval.

## Result

The reviewed application introduces an explicit public-publishing capability, not an automatic conversion of private drafts into public data. New collection requires the publication switch, an independent encryption key, a verified author session, a reviewed saved revision and the required destination/policy fields. Every anonymous submission is bounded, origin-checked, consented and durably acknowledged before its next-page receipt is issued.

The canonical scanner and current dependency audits were run. Two inherited High dependency advisories were patched, not suppressed. Production audit now reports no known vulnerabilities; the full-policy audit retains only the existing owner-accepted development-only `braces` exception. No new Critical or High application finding remains in the reviewed diff. Hosted cutover and actual account validation remain separate evidence; neither follows automatically from this review.

## Boundaries reviewed

| Boundary | Implementation and verification |
| --- | --- |
| Author and workspace | `server/funnel-public-http.ts` resolves the existing principal and mutation-role policy; `funnel-public-store.ts` uses principal-bound transactions. Forced RLS and SQL predicates restrict listing, publication, revocation and export to the originating author/workspace. Cross-tenant/viewer cases run against real PostgreSQL. |
| Public authority | The anonymous route accepts a publication UUID, not a user ID, tenant, brand, arbitrary redirect, SQL or workflow. SQL functions have fixed empty search paths and are callable only by the server role. A public read rechecks active account, location, allowed binding and unexpired active publication. |
| Draft and published content | Saved drafts remain private. A reviewed revision is copied into a separate snapshot; ordinary runtime cannot overwrite its snapshot column. Edits require another explicit review and publication. Reopening the review dialog clears its confirmation. |
| Contact privacy | AES-256-GCM with a fresh IV encrypts the whole request; AAD binds it to publication and request. Only hashes of request/IP/receipt/consent remain outside ciphertext. The independent 32-byte key is not stored in SQL or sent to a browser. The public response contains acceptance, not submitted contact details. |
| Access receipt | A secret-derived receipt is stored only as a hash in SQL and as a scoped HttpOnly, SameSite cookie with Secure on HTTPS. The landing projection strips recording/resource/booking/join destinations until the receipt is validated. Guessed receipts and direct next-page requests fail closed. |
| Abuse and retries | The schema/body are bounded; supplied extra authority, missing consent and populated trap fields are refused. Database rate limits and serial publication locks work across server instances. Exact retries reuse the receipt and record; changed retries cannot overwrite it. A separate request requires an explicit visitor action. |
| Visitor and owner recovery | Closed events and request limits receive meaningful errors rather than a success state. Pausing public collection does not remove owner export/offline controls or stop retention. Missing database configuration returns a sanitized retention error. |
| Retention | Inquiry access expires after 30 days. A narrowly authorized scheduler function deletes expired ciphertext in bounded batches. It does not decrypt records and continues when new publication is disabled. The rollout must verify its real scheduling credential and runtime role. |
| Browser safety | The new editor/public clients use the existing same-origin HTTP helper. CSP remains nonce based with a finite video-frame allowlist. Static photos are local; user photos are normalized raster data with metadata stripped. Copy and testimonials are React text, not HTML. No personal fields are stored in browser persistence. |
| CRM delivery | A separately enabled server-only map must match the platform's saved HighLevel location. Only the fixed contacts/upsert endpoint is called. Email-only matching avoids silently joining separate email/phone records. No DND, subscription, tag, workflow or existing phone setting is overwritten. Response identity is checked before recording delivery. Timeout/uncertain writes are not automatically repeated. |

The relevant new tests are `funnel-public.postgres.test.ts`, `funnel-delivery.unit.test.ts`, `capture.integration.test.tsx`, the publication pgTAP file and the signed-in publisher/anonymous visitor browser journey. Pattern and contract scans retain their positive allowlists. The one added outbound exception names the exact provider host and path; the new default-off and mismatched-tenant tests prove its additional conditions.

## Findings repaired

**SEC-REF-001: review-run encryption continuity.** Both browser passes share one disposable database. Their independent random data keys would make earlier accepted records unreadable after a server restart. The runner now creates one random key per database run and supplies it to both passes. Independent runs still get independent keys; malformed keys are refused. No test fixes a reusable live secret in source.

**SEC-REF-002: private-data lifecycle under a paused feature.** Export, record listing, revocation and scheduled deletion originally depended on public collection being enabled. They are now separate from authority to accept new inquiries. Tests show that disabling public collection still permits the owner to export/revoke and the scheduler to delete expired ciphertext, while anonymous registration fails.

**SEC-REF-003: raw HTTP bypass.** The new publication and visitor clients originally called fetch directly despite the existing guarded client contract. They now use that shared helper. The security scan remains unchanged rather than exempting those components.

**SEC-REF-004: inherited Sharp advisory.** The runtime, rendering package and tooling inherited Sharp 0.35.4. [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) identifies its affected librsvg dependency and the 0.35.5 repair. Direct pins and the existing override now resolve 0.35.5, with the matching version-specific build permission. Registry integrity, frozen installation, raster tests and an explicit patch-floor test were checked. The upgrade does not add SVG upload support.

**SEC-REF-005: inherited SDK advisory.** The development-only Trigger CLI inherited SDK 1.29.0. [GHSA-6qxp-vccf-f47h](https://github.com/advisories/GHSA-6qxp-vccf-f47h) identifies OAuth issuer/credential binding and its 1.31.0 repair. A narrow existing-1.x override takes that patch without a framework/major upgrade or ignored advisory. This is a repository dependency repair, not proof of migration of any external tool's previously stored OAuth credentials.

## Findings, limitations and release conditions

There is no assertion that source examples' lender disclosures or testimonials apply to other clients. Public publishers must supply their own appropriate policy and destination fields. Proof content is hidden without a supplied attribution and permission. [The Pexels license](https://www.pexels.com/license/), checked October 7, permits use in websites and sold templates but not implied endorsement or stock-photo redistribution. The two included lifestyle images are identified as illustrations, not clients, lenders or testimonials; source attribution is recorded beside those assets.

The IP limit relies on the managed ingress supplying the forwarding header. Do not deploy the same origin behind an untrusted proxy without a reviewed header policy. It complements the independent publication-wide quota; it is not a claim of complete bot prevention. Distributed quota and expiration do not prove protection against every high-volume attack.

The static skill CVE reference is dated April 24 and is not current vulnerability intelligence. Fresh package audits and the specific reviewed advisories informed the repair. Scanner hits were existing negative tests, templates, the unchanged theme-bootstrap script and the decorative `cardNumber` class, not payment-card collection. The generic root Next-config check is not monorepo-aware; CSP/proxy and actual `apps/web/next.config.ts` are reviewed separately.

A hosted release must first apply the two additive migrations, retain its dedicated data key, preserve the existing scheduler secret, verify runtime permissions and only then opt in to collection. Rollback disables new collection and restores the prior application while retaining the tables/key; expired data cleanup still needs to run. No production reset, blind key rotation, automatic customer message, billing action, ad spend or unverified HighLevel mapping is authorized by these tests.

## Evidence

The current source and full dependency audits are in `tmp/resume-audit-*-final.log`; production has zero known advisories and full-policy output has one previously ignored High finding. Canonical scanner outputs remain in `reports/scan-output/`, outside the committed deliverable. The eight exported-route PostgreSQL cases and recovered full integration suite pass; final complete CI and hosted results are recorded in the QA/release record, not invented here.
