# Reference-led funnel release

October 6, 2026. Base `e14c4603`. Branch `chief/reference-funnels-2026-10-06`.

## Implementation

The owner-rejected arch/brochure layouts are replaced with source-led webinar, recorded-training, buyer, refinance and resource offers. Live webinar has an invitation-video/cover position, specific learning outcomes, buyer objections, presenter and repeated registration. Buyer and refinance have different goal-led inquiry cards and licensed lifestyle imagery. Optional proof requires genuine supplied text and permission; there are no invented customer testimonials or guaranteed rates/savings.

Existing fields, photos and private drafts remain readable. New sales/policy/video fields are additive and do not silently overwrite edited v1 text. The user never edits HTML or layout. The studio is linked from Home and Campaigns.

Published versions are separate reviewed snapshots with their own URLs. Actual visitor requests are validated, consented and stored before a confirmation, recording or resource page unlocks. Access URLs are stripped from the anonymous landing data. A scoped HttpOnly receipt survives reloads; it is not an appointment confirmation. The actual event calendar differs from the private preview. Booking completes on the supplied scheduling service, never on a fake success button.

## Deployment order

1. Apply `20261006230000_funnel_publication.sql` and `20261006233000_funnel_inquiry_retention.sql` to the intended application database. Do not replay previous migrations or reset a hosted database.
2. Set `OALO_FUNNEL_DATA_KEY` to a new random 32-byte base64url secret, server-only. Keep it for retained requests. Rotate only with a decrypt/re-encrypt plan; simply replacing it loses access to inquiries.
3. Set `CRON_SECRET` to an independent random secret of at least 32 characters. The daily retention endpoint runs at 12:15 UTC and deletes up to 25,000 expired inquiries per invocation in bounded batches. Access expires after 30 days; deletion is performed by that job, not by the timestamp alone.
4. Confirm canonical `OALO_APP_URL`, account/session configuration and the owner's actual privacy policy. Set `OALO_FUNNEL_PUBLICATION=enabled` only in an environment authorized to collect these contact requests. Do not seed fictional customer accounts into production.
5. Deploy and prove signed-in save, review, publication, approved test capture, inquiry download and taking the page offline. Retain the additive tables when rolling back the application.

Optional HighLevel delivery is separate. `OALO_FUNNEL_GHL_DELIVERY=enabled` and `OALO_FUNNEL_GHL_CONNECTIONS_JSON` are both required. The latter maps internal location UUIDs to the matching HighLevel location ID and a server-only token. A connection must match the platform's saved `ghl_location_id`. Contact upsert does not install workflows, modify DND, activate auto-texting, create appointments or send bulk messages. Uncertain external requests are recorded and not automatically replayed. Without a verified connection, inquiries remain securely exportable and the publisher sees that delivery is not connected.

## Boundaries

This provides a platform-hosted `/f/<id>` URL, not guided custom-domain connection. Video, webinar, guide and booking destinations are owner-supplied links. A registered inquiry does not automatically create a Zoom attendee. A video link is not caption or uptime verification. A clicked booking link is not a booked appointment.

CSV exports include the latest 1,000 unexpired requests for a publication, escape spreadsheet-formula prefixes and require the owning signed-in user. Contact requests are encrypted at rest in this table; consent wording is tied to the published brand and hashed. No raw IP is persisted. The public endpoint is same-origin, bounded and database-rate-limited, not unlimited bot protection.

## Evidence

Actual isolated PostgreSQL route tests passed for all five types, encrypted capture, receipt access, export, cross-workspace denial, parallel retries, altered requests, quotas and disabled configuration. Seventeen new pgTAP assertions pass for forced RLS, ownership, fixed function boundaries and no plaintext contact columns. Actual-browser tests submit all five types at desktop/phone sizes, validate confirmation/receipt and next-step links, and refuse unregistered access to gated pages. Full legacy suites and hosted release checks are recorded separately; a new-feature test pass is not a full production-readiness claim.
