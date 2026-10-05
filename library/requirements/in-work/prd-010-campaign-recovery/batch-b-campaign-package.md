# Batch B: a private campaign package

Implementation is complete on `chief/campaign-package-2026-10-05`. The complete offline gate passed with four Vitest workers, and 109 selected real-PostgreSQL regression tests passed. See the [Batch B QA report](qa/2026-10-05-package-qa-report.md) and [deployment requirements](deployment.md). This records code and local verification, not hosted deployment or public campaign readiness.

Owner continuation: October 5, 2026, after Jonathan merged PR #76. Verified base: `0b47805e`, merged at 15:04:43 UTC. Branch: `chief/campaign-package-2026-10-05`. Chief implements and reviews directly, without subagents.

## Outcome and boundary

From a saved property campaign, generate a real property-page preview, printable PDF flyer, scannable preview QR, and reusable campaign copy. Every output comes from the exact saved version, retains its branding and permission status, and remains an internal review draft. Generation is not approval, publication, a verified lead-capture path, or authorization to distribute unapproved marketing.

Drafts can be prepared while permission is unconfirmed, but that absence must appear on every output. This lets the owner review the intended package without fabricating consent. All outputs say **DRAFT / INTERNAL REVIEW ONLY**. The QR encodes the configured application origin and the authenticated page-preview route, with no token, personal data, or invented public destination. It is explicitly a private preview requiring sign-in, not a customer-facing QR. Public release belongs to later approval and routing work.

## Implementation decisions

Reuse the existing `pdf-lib` version used by homeowner reports and the existing `qrcode` encoder in the rendering package. A narrow rendering-package export avoids importing browser automation into the web runtime. Do not introduce hosted Chromium, a new rendering service, an AI provider, or an external dependency version upgrade. Page/PDF/copy generation is deterministic for the saved version and a recorded timestamp; the first successfully persisted package wins on retry.

Store the small text/vector-only draft package as one size-bounded, append-only row under the campaign's version, with tenant/version foreign keys, exact source hash, output byte hashes, and forced row-level security. Identity columns support lookups; the sealed JSON document holds outputs that are always read as a package. This is not an image-upload or general object store. Large photos and production publication still belong in the existing private object-storage pipeline. Add one migration; apply it only to a newly isolated disposable local database for this batch, never to hosted/shared databases.

Render all outputs before committing the package. A failed PDF, invalid source, storage refusal, or unsupported glyph produces no ready package. Exact repeats return the stored bytes; concurrent commits return the same first successful row. Bound the package size and in-process rendering concurrency. No stored package is mutated to reflect later profile changes.

## Acceptance

| ID | Required proof |
| --- | --- |
| PKG-001 | A campaign creator can generate the package from the saved screen; the request accepts only campaign/version/hash, not brand, tenant, content, permission, or output overrides. |
| PKG-002 | Page, PDF, QR and copy contain the same saved property/event/identity, retain draft and permission notices, and contain no invented photos, property facts, working lead forms, or paid-ad claims. |
| PKG-003 | PDF bytes parse and render, QR decodes to the actual private page endpoint, and the page/copy preserve text safely. Unsupported PDF glyphs fail explicitly, without silently deleting characters. |
| PKG-004 | Every output is read through authentication and tenant authorization, with private/no-store/noindex headers. HTML has no scripts, remote resources, or unescaped user markup. |
| PKG-005 | No ready package exists until all four outputs persist together. Sequential and concurrent repeated generation return one immutable package with identical hashes and bytes. |
| PKG-006 | Package storage and the prior preparation path are tested against real isolated PostgreSQL, including cross-tenant access, stale hashes, retries and concurrency. No shared local stack is reset. |
| PKG-007 | Saved screens show actual package availability and actions; generation failures preserve the saved campaign and offer an honest retry. Viewer roles can review but cannot generate. |
| PKG-008 | Existing ad, approval, no-CRM, no-publication, homeowner, and source-language guards still pass. No provider spend, billing, customer messaging, or hosted migration occurs. |

## Visual direction

Use the current light interface and existing campaign form/card/link/button tokens, governed by design brief sections 9, 10, 14 and 18. The package panel has one primary generation action, then distinct page/flyer/QR/copy actions only after successful persistence. Downloaded collateral is light, typography-led and uses the saved allowlisted brand accent. With no supplied photo, a text-led flyer is honest; do not substitute a stock home or a large placeholder pretending to be an image.

The PDF uses the same built-in font family as existing downloadable reports, with readable body text, explicit draft footer on every page, and overflow pagination instead of truncation. The private HTML preview is an accessible reading alternative and uses system fonts without remote font requests. Neither output is asserted to be a tagged/PDF-UA document. Display event times explicitly in UTC for now, matching the stored instant; property-time-zone selection remains later scheduling work.

## Verification and release

Add focused handler/rendering tests, real-database tests, and desktop/mobile browser generation and retrieval. Inspect rendered PDF pages and QR decoding. Run the existing offline gate and sequential security then quality self-review. The new migration must be applied through the normal deployment process before hosted package creation works; a missing package table must not break the existing campaign detail page or falsely appear as a successful generation. Public distribution, final approval, HighLevel follow-up and live results remain later batches.
