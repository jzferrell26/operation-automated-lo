# PRD-007 security review

## Verdict and scope

The implemented report flow was reviewed in the primary implementation session. No independent reviewer is claimed. The reviewed code includes the valuation and HighLevel adapters, authenticated routes, report repository, migration, private links, monthly worker, browser persistence and PDF export. Live provider and hosted customer-data acceptance remain pending the deployment configuration described in the activation runbook.

## Findings resolved

| Finding | Resolution and evidence |
| --- | --- |
| Property lookup unnecessarily depended on a CRM connection | `service.ts` distinguishes property-only reports from verified HighLevel associations. Standalone requests cannot attach an arbitrary unverified contact. Unit, real-Postgres and browser tests cover the separation. |
| Interrupted writes and retries could otherwise repeat paid work | `homeowner-repository.ts` reserves the request and usage in a tenant transaction before network access. An uncertain attempt is retained; same-key replay cannot issue another provider lookup. Tests cover concurrency, failed usage writes, failed snapshot completion and explicit recovery. |
| Deleting reports could reset usage counters | `homeowner.usage_events` survives property deletion and contains no property address or mortgage inputs. Real-Postgres tests verify the allowance is preserved. |
| JSON serialization at the SQL driver boundary | Property and snapshot writes now use the existing `::text::jsonb` convention. Real-Postgres tests reproduced the former object-check failure and pass with correct round trips. |
| Privileged test setup was placed inside the application source tree | The test now uses the existing database test bridge and sanctioned owner-transaction helper. The unchanged privilege-escalation contract passes. No production owner capability was added. |
| Browser requests bypassed the existing internal HTTP helper | Homeowner reads/writes now reuse that helper, preserving CSRF and same-origin behavior. The helper also rejects backslash/control-character origin escapes and refuses redirects. Regression tests prove rejection before network access. |
| PDF value label overlapped the estimate | The PDF layout now uses top-based text positions and measured header height. The regenerated two-page PDF was visually inspected and has no text outside page bounds. |

## Checked boundaries

Authenticated routes use the established session resolution and mutation gate in `apps/web/src/server/homeowners/runtime.ts:39-76` and `http.ts:151-178`. The browser never selects its location or actor. Negative route tests exercise missing CSRF, foreign origin, unauthenticated access, reader writes, cross-location reads and revoked sessions.

`packages/db/src/homeowner-repository.ts` uses `withTenantTransaction`; the seven new tables force RLS. Composite property/report foreign keys are indexed. Report updates are not granted to the app role. Public capability functions have fixed SQL entry points and require an opaque share secret; scheduler leasing exposes only the minimal due-work tuple. Actual database tests confirm policy behavior and deny anonymous broad function execution.

`apps/web/src/server/homeowners/rentcast.ts` fixes the provider hostname/path, uses a server-only header credential, bounds response size, times out, refuses redirects and validates the matched address. It preserves missing values and listing-price semantics. The adapter does not retry uncertain calls or return provider response bodies to the browser.

`highlevel.ts` verifies the mapped location and contact before a handoff, requires confirmed DND status, writes only the configured custom field, verifies readback and activates only the configured workflow. Durable delivery records stop repeated and concurrent contact handoffs. No actual customer message was sent during testing.

Shared reports expose only the chosen snapshot, with the CRM contact identifier redacted. Expiry, revocation, active location and current author access are checked on each read. The proxy and API apply no-store, no-referrer and noindex headers. Review requests are explicit and deduplicated. The UI warns that anyone with the link can read the supplied report details.

Real report data stays in tenant storage and transient page state. Browser storage is limited to the explicitly labeled fictional demo. Reports and PDFs are generated from saved snapshots, not client-selected provider URLs. No secret, database credential or live consumer record was added to source. The only new external runtime dependency is pinned `pdf-lib@1.17.1`; `zod` is now declared by the database package using the existing catalog version.

## Remaining deployment requirements

The inspected Vercel project has only demo settings. It lacks the RentCast key and database/authentication settings. The connected Supabase list did not identify an AutomatedLO database. Accordingly, no live-data security, provider-license, hosted retention or real message-delivery signoff is claimed. The feature is safe to review in its explicit sample preview while these external requirements remain unresolved.

The existing parent PR also has independent screenshot-baseline and authenticated walkthrough focus failures. They are recorded in the quality review and must not be relabeled as this feature's passing checks.
